/**
 * VerifScan V3 — AI Intelligence service library
 * =============================================
 *
 * Server-only module that wraps the `z-ai-web-dev-sdk` LLM and exposes 5
 * high-level helpers used by the fabricant dashboard:
 *
 *   1. generateProductDescription — SEO-optimized e-commerce copywriter
 *   2. translateText              — FR / EN / Wolof translator
 *   3. analyzeIngredients         — food-safety allergen / anomaly detector
 *   4. getRecommendations         — best publish time + tips based on scan data
 *   5. chatWithAssistant          — multi-turn conversational assistant
 *                                    (persisted in the `AiConversation` table)
 *
 * Design rules:
 *   - Every public function is wrapped in try/catch and returns a sensible
 *     fallback on LLM failure (the API route never crashes).
 *   - For JSON-returning LLM calls, the model is instructed to return ONLY
 *     valid JSON (no markdown fences). `parseJsonResponse` strips fences if
 *     the model adds them anyway, then JSON.parses safely.
 *   - System prompts are in French (the product targets Senegalese /
 *     West-African manufacturers).
 *   - The SDK is imported dynamically inside each function so a transient
 *     init failure doesn't break the whole module at import time.
 */

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AiLanguage = "fr" | "en" | "wolof";

export interface GenerateDescriptionParams {
  productName: string;
  brand?: string;
  category?: string;
  features?: string;
  language?: AiLanguage;
}

export interface GenerateDescriptionResult {
  description: string;
  seoKeywords: string[];
}

export interface TranslateParams {
  text: string;
  from: AiLanguage;
  to: AiLanguage;
}

export interface TranslateResult {
  translation: string;
}

export interface AnalyzeIngredientsParams {
  ingredients: string;
  productName?: string;
}

export interface IngredientAnomaly {
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface AnalyzeIngredientsResult {
  allergens: string[];
  anomalies: IngredientAnomaly[];
  recommendations: string[];
}

export interface GetRecommendationsParams {
  userId: string;
}

export interface GetRecommendationsResult {
  bestPublishTime: { day: string; hour: string; reason: string };
  tips: string[];
  predictions: string[];
}

export interface ChatWithAssistantParams {
  userId: string;
  message: string;
  conversationId?: string;
}

export interface ChatWithAssistantResult {
  response: string;
  conversationId: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Strip markdown code fences (```json ... ``` or ``` ... ```) from an LLM
 * response, then trim. Used before JSON.parse so a model that wraps its JSON
 * output in fences doesn't break parsing.
 */
function stripMarkdownFences(raw: string): string {
  let text = raw.trim();
  // Remove leading ```json, ```JSON, ```JS, or plain ``` and trailing ```
  const fenceMatch = text.match(/^```[a-zA-Z]*\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  } else {
    // Sometimes the model only adds an opening fence (no closing) — strip it.
    text = text.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "");
  }
  return text.trim();
}

/**
 * Safely parse a JSON object out of an LLM response.
 *
 * Strategy:
 *   1. Strip markdown fences.
 *   2. Try to locate the outermost `{ ... }` block (in case the model added
 *      extra commentary before/after the JSON).
 *   3. JSON.parse with try/catch.
 *
 * Returns `null` if parsing fails — callers decide what fallback to use.
 */
function parseJsonObjectSafe<T = Record<string, unknown>>(raw: string): T | null {
  if (!raw) return null;
  const cleaned = stripMarkdownFences(raw);

  // Direct parse first (model followed instructions perfectly).
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // fall through
  }

  // Extract the outermost { ... } block.
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const slice = cleaned.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(slice) as T;
    } catch {
      // fall through
    }
  }

  return null;
}

/**
 * Get a configured ZAI client. Wrapped in try/catch so a transient init
 * failure surfaces as a thrown Error that callers can catch and fallback.
 */
async function getZai() {
  const ZAI = (await import("z-ai-web-dev-sdk")).default;
  return await ZAI.create();
}

/**
 * Call the LLM with a system + user message and return the raw text response.
 * `thinking` is disabled by default (we want direct answers, not chain-of-
 * thought — saves tokens and latency for these focused tasks).
 */
async function callLlm(systemPrompt: string, userMessage: string): Promise<string> {
  const zai = await getZai();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    thinking: { type: "disabled" },
  });
  const text = completion.choices[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Réponse vide du modèle IA");
  }
  return text;
}

const LANGUAGE_LABELS: Record<AiLanguage, string> = {
  fr: "français",
  en: "anglais",
  wolof: "wolof (langue nationale sénégalaise)",
};

// ---------------------------------------------------------------------------
// 1. generateProductDescription
// ---------------------------------------------------------------------------

/**
 * Generate an SEO-optimized product description + a list of SEO keywords.
 *
 * The LLM is instructed to return STRICT JSON:
 *   { "description": "...", "seoKeywords": ["...", "..."] }
 *
 * On parse failure, returns the raw text as the description and an empty
 * keyword list (so the UI still shows something useful).
 */
export async function generateProductDescription(
  params: GenerateDescriptionParams,
): Promise<GenerateDescriptionResult> {
  const {
    productName,
    brand,
    category,
    features,
    language = "fr",
  } = params;

  const systemPrompt = `Tu es un expert en rédaction e-commerce spécialisé dans les produits alimentaires et cosmétiques d'Afrique de l'Ouest (Sénégal, CEDEAO).
Ta mission : rédiger des descriptions de produits SEO-optimisées, engageantes et professionnelles.
Mets en valeur :
- l'authenticité et l'origine du produit,
- la traçabilité (contrôle qualité, lot, certification éventuelle),
- les bénéfices pour le consommateur final.
Évite le jargon technique, sois concret et chaleureux.
Tu DOIS répondre UNIQUEMENT en JSON valide (aucun texte hors JSON, aucun markdown, aucun backtick), au format :
{"description": "...", "seoKeywords": ["...", "..."]}
La description doit faire entre 80 et 200 mots. Les seoKeywords doivent contenir 5 à 10 mots-clés pertinents.
Réponds en ${LANGUAGE_LABELS[language]}.`;

  const userParts: string[] = [`Nom du produit : ${productName}`];
  if (brand) userParts.push(`Marque : ${brand}`);
  if (category) userParts.push(`Catégorie : ${category}`);
  if (features) userParts.push(`Caractéristiques : ${features}`);
  const userMessage = userParts.join("\n");

  try {
    const raw = await callLlm(systemPrompt, userMessage);
    const parsed = parseJsonObjectSafe<{ description?: string; seoKeywords?: string[] }>(raw);

    if (parsed && typeof parsed.description === "string" && Array.isArray(parsed.seoKeywords)) {
      return {
        description: parsed.description.trim(),
        seoKeywords: parsed.seoKeywords
          .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
          .map((k) => k.trim())
          .slice(0, 15),
      };
    }

    // Partial parse: description only, no keywords
    if (parsed && typeof parsed.description === "string") {
      return { description: parsed.description.trim(), seoKeywords: [] };
    }

    // Could not parse — return raw text as description
    return { description: stripMarkdownFences(raw), seoKeywords: [] };
  } catch (error) {
    console.error("[ai.generateProductDescription] Error:", error);
    return {
      description:
        `${productName}${brand ? ` — ${brand}` : ""}. Produit authentique ` +
        `d'Afrique de l'Ouest, traçable du producteur au consommateur via VerifScan.`,
      seoKeywords: [],
    };
  }
}

// ---------------------------------------------------------------------------
// 2. translateText
// ---------------------------------------------------------------------------

/**
 * Translate `text` from `from` to `to`. Supports FR / EN / Wolof.
 *
 * Wolof is Senegal's most-spoken national language — the model is instructed
 * to preserve product/marketing tone (so brand names and food terminology
 * stay natural).
 */
export async function translateText(params: TranslateParams): Promise<TranslateResult> {
  const { text, from, to } = params;

  if (from === to) {
    return { translation: text };
  }

  if (!text.trim()) {
    return { translation: "" };
  }

  const systemPrompt = `Tu es un traducteur professionnel spécialisé en ${LANGUAGE_LABELS[from]} et ${LANGUAGE_LABELS[to]}.
Tu traduis le texte fourni en ${LANGUAGE_LABELS[to]} en conservant :
- le ton commercial et marketing,
- les noms de marque et de produits (translittération si nécessaire),
- les termes techniques liés à l'alimentation et à la cosmétique.
Réponds UNIQUEMENT par la traduction, sans commentaire ni guillemets.`;

  const userMessage = `Texte à traduire (${LANGUAGE_LABELS[from]} → ${LANGUAGE_LABELS[to]}) :\n\n${text}`;

  try {
    const raw = await callLlm(systemPrompt, userMessage);
    return { translation: raw.trim() };
  } catch (error) {
    console.error("[ai.translateText] Error:", error);
    // Fallback: return the original text (better than crashing the UI)
    return { translation: text };
  }
}

// ---------------------------------------------------------------------------
// 3. analyzeIngredients
// ---------------------------------------------------------------------------

/**
 * Analyze a list of ingredients for undeclared allergens, suspicious
 * ingredients, and missing origin info.
 *
 * Returns STRICT JSON:
 *   {
 *     "allergens": ["gluten", "lactose", ...],
 *     "anomalies": [{ "type": "...", "severity": "info|warning|critical", "message": "..." }],
 *     "recommendations": ["...", "..."]
 *   }
 */
export async function analyzeIngredients(
  params: AnalyzeIngredientsParams,
): Promise<AnalyzeIngredientsResult> {
  const { ingredients, productName } = params;

  if (!ingredients.trim()) {
    return {
      allergens: [],
      anomalies: [
        {
          type: "missing_ingredients",
          severity: "warning",
          message: "Aucun ingrédient fourni pour l'analyse.",
        },
      ],
      recommendations: ["Renseignez la liste des ingrédients pour permettre l'analyse."],
    };
  }

  const systemPrompt = `Tu es un expert en sécurité alimentaire et conformité réglementaire (CEDEAO, UE).
Ta mission : analyser une liste d'ingrédients pour un produit alimentaire ou cosmétique.

Tu dois détecter :
1. Les ALLERGÈNES présents (parmi : gluten, lactose, fruits à coque, soja, œufs, poisson, sésame, sulfites, arachide, moutarde, céleri).
2. Les ANOMALIES (ingrédients suspects, incohérents, interdits, ou manquants comme l'origine).
3. Des RECOMMANDATIONS pratiques au fabricant.

Pour chaque anomalie, indique :
- "type" : catégorie courte (ex. "undeclared_allergen", "missing_origin", "suspicious_additive", "regulatory_risk")
- "severity" : "info" | "warning" | "critical"
- "message" : explication claire en français

Tu DOIS répondre UNIQUEMENT en JSON valide (aucun markdown, aucun backtick), au format :
{"allergens": ["..."], "anomalies": [{"type":"...","severity":"...","message":"..."}], "recommendations": ["..."]}
Réponds en français.`;

  const userParts: string[] = [`Ingrédients à analyser :\n${ingredients}`];
  if (productName) userParts.push(`Nom du produit : ${productName}`);
  const userMessage = userParts.join("\n\n");

  try {
    const raw = await callLlm(systemPrompt, userMessage);
    const parsed = parseJsonObjectSafe<{
      allergens?: unknown;
      anomalies?: unknown;
      recommendations?: unknown;
    }>(raw);

    const allergens = Array.isArray(parsed?.allergens)
      ? (parsed!.allergens as unknown[])
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .map((x) => x.trim())
      : [];

    const anomalies = Array.isArray(parsed?.anomalies)
      ? (parsed!.anomalies as unknown[])
          .map((a): IngredientAnomaly | null => {
            if (!a || typeof a !== "object") return null;
            const obj = a as Record<string, unknown>;
            const type = typeof obj.type === "string" ? obj.type : "unknown";
            const severityRaw = typeof obj.severity === "string" ? obj.severity : "info";
            const severity: IngredientAnomaly["severity"] =
              severityRaw === "warning" || severityRaw === "critical" ? severityRaw : "info";
            const message = typeof obj.message === "string" ? obj.message : "";
            if (!message) return null;
            return { type, severity, message };
          })
          .filter((a): a is IngredientAnomaly => a !== null)
      : [];

    const recommendations = Array.isArray(parsed?.recommendations)
      ? (parsed!.recommendations as unknown[])
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .map((x) => x.trim())
      : [];

    return { allergens, anomalies, recommendations };
  } catch (error) {
    console.error("[ai.analyzeIngredients] Error:", error);
    return {
      allergens: [],
      anomalies: [
        {
          type: "analysis_failed",
          severity: "warning",
          message:
            "L'analyse automatique des ingrédients est temporairement indisponible. Vérifiez manuellement la présence des allergènes réglementaires.",
        },
      ],
      recommendations: [
        "Vérifiez manuellement les 9 allergènes réglementaires (gluten, lactose, fruits à coque, soja, œufs, poisson, sésame, sulfites, moutarde).",
        "Indiquez l'origine des matières premières sur l'étiquette.",
      ],
    };
  }
}

// ---------------------------------------------------------------------------
// 4. getRecommendations
// ---------------------------------------------------------------------------

const WEEKDAY_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/**
 * Compute the user's best publish time + actionable tips based on their scan
 * history.
 *
 * Strategy:
 *   - Fetch all scans for the user's lots.
 *   - If < 10 scans: return sensible defaults (Tuesday 10h + generic tips)
 *     — not enough signal to compute a real peak.
 *   - Otherwise: group scans by weekday + hour, find the peak, then call the
 *     LLM with the scan summary to generate tailored tips & predictions.
 */
export async function getRecommendations(
  params: GetRecommendationsParams,
): Promise<GetRecommendationsResult> {
  const { userId } = params;

  // ---- Defaults (returned when there is not enough data) ----
  const defaults: GetRecommendationsResult = {
    bestPublishTime: {
      day: "Mardi",
      hour: "10h",
      reason:
        "Heure recommandée par défaut — pas encore assez de scans pour personnaliser.",
    },
    tips: [
      "Ajoutez des photos de qualité à vos fiches produits (les produits avec photo reçoivent 2x plus de scans).",
      "Renseignez la date d'expiration et les certifications sur vos lots pour renforcer la confiance.",
      "Partagez vos QR codes sur vos emballages et réseaux sociaux.",
      "Plus vos lots sont scannés, plus nos recommandations deviendront précises.",
    ],
    predictions: [
      "Vos données de scan seront analysées dès que vous aurez atteint 10 scans.",
    ],
  };

  let scans: { scannedAt: Date }[];
  try {
    scans = await db.scan.findMany({
      where: { lot: { fabricantId: userId } },
      select: { scannedAt: true },
    });
  } catch (error) {
    console.error("[ai.getRecommendations] DB error:", error);
    return defaults;
  }

  if (scans.length < 10) {
    return defaults;
  }

  // ---- Compute peak weekday + hour ----
  const weekdayCounts = new Array(7).fill(0);
  const hourCounts = new Array(24).fill(0);
  // 2D matrix: weekday × hour (for finer-grained peak)
  const matrix: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));

  for (const s of scans) {
    const d = s.scannedAt;
    const w = d.getDay(); // 0=Sun
    const h = d.getHours();
    weekdayCounts[w]++;
    hourCounts[h]++;
    matrix[w][h]++;
  }

  // Find peak weekday
  let peakWeekday = 2; // default Tuesday
  let peakWeekdayCount = -1;
  for (let i = 0; i < 7; i++) {
    if (weekdayCounts[i] > peakWeekdayCount) {
      peakWeekdayCount = weekdayCounts[i];
      peakWeekday = i;
    }
  }

  // Find peak hour within the peak weekday (fallback: global peak hour)
  let peakHour = 10;
  let peakHourCount = -1;
  for (let h = 0; h < 24; h++) {
    const c = matrix[peakWeekday][h];
    if (c > peakHourCount) {
      peakHourCount = c;
      peakHour = h;
    }
  }
  // Fallback: if no scans on peak weekday × hour, use global peak hour
  if (peakHourCount === 0) {
    for (let h = 0; h < 24; h++) {
      if (hourCounts[h] > peakHourCount) {
        peakHourCount = hourCounts[h];
        peakHour = h;
      }
    }
  }

  const peakDayLabel = WEEKDAY_FR[peakWeekday];
  const peakHourLabel = `${String(peakHour).padStart(2, "0")}h`;

  // ---- Build summary for the LLM ----
  const totalScans = scans.length;
  const weekdaySummary = WEEKDAY_FR.map(
    (name, i) => `${name}: ${weekdayCounts[i]}`,
  ).join(", ");
  const top3Hours = hourCounts
    .map((c, h) => ({ h, c }))
    .sort((a, b) => b.c - a.c)
    .slice(0, 3)
    .map((x) => `${String(x.h).padStart(2, "0")}h (${x.c})`)
    .join(", ");

  const systemPrompt = `Tu es un consultant en marketing digital pour des PME agroalimentaires sénégalaises.
Tu analyses les données de scan QR d'un fabricant et tu proposes des recommandations concrètes.
Réponds UNIQUEMENT en JSON valide (aucun markdown), au format :
{
  "reason": "explication courte (1 phrase) du créneau recommandé",
  "tips": ["conseil 1", "conseil 2", "conseil 3", "conseil 4"],
  "predictions": ["prediction 1", "prediction 2"]
}
Les tips doivent être pratiques et adaptés au contexte (4 maximum).
Les predictions doivent être des anticipations chiffrées ou stratégiques (2 maximum).
Réponds en français.`;

  const userMessage = `Données de scan du fabricant :
- Nombre total de scans : ${totalScans}
- Répartition par jour de semaine : ${weekdaySummary}
- Top 3 heures de scan : ${top3Hours}
- Créneau détecté comme pic : ${peakDayLabel} à ${peakHourLabel}

Génère des recommandations pour aider ce fabricant à maximiser ses scans et ses ventes.`;

  try {
    const raw = await callLlm(systemPrompt, userMessage);
    const parsed = parseJsonObjectSafe<{
      reason?: string;
      tips?: unknown;
      predictions?: unknown;
    }>(raw);

    const reason =
      parsed && typeof parsed.reason === "string" && parsed.reason.trim()
        ? parsed.reason.trim()
        : `Pic d'activité observé : ${peakDayLabel} à ${peakHourLabel} (${peakHourCount} scans).`;

    const tips =
      parsed && Array.isArray(parsed.tips)
        ? (parsed.tips as unknown[])
            .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            .map((x) => x.trim())
            .slice(0, 4)
        : defaults.tips;

    const predictions =
      parsed && Array.isArray(parsed.predictions)
        ? (parsed.predictions as unknown[])
            .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            .map((x) => x.trim())
            .slice(0, 2)
        : defaults.predictions;

    return {
      bestPublishTime: { day: peakDayLabel, hour: peakHourLabel, reason },
      tips,
      predictions,
    };
  } catch (error) {
    console.error("[ai.getRecommendations] LLM error:", error);
    return {
      bestPublishTime: {
        day: peakDayLabel,
        hour: peakHourLabel,
        reason: `Pic d'activité observé : ${peakDayLabel} à ${peakHourLabel}.`,
      },
      tips: defaults.tips,
      predictions: defaults.predictions,
    };
  }
}

// ---------------------------------------------------------------------------
// 5. chatWithAssistant
// ---------------------------------------------------------------------------

/**
 * Multi-turn conversational assistant. Loads (or creates) an AiConversation,
 * pulls the last 10 messages for context, calls the LLM, and persists both
 * the user's message and the assistant's response.
 */
export async function chatWithAssistant(
  params: ChatWithAssistantParams,
): Promise<ChatWithAssistantResult> {
  const { userId, message, conversationId } = params;

  if (!message.trim()) {
    throw new Error("Le message ne peut pas être vide.");
  }

  // ---- Load or create the conversation ----
  let conversation: { id: string };
  try {
    if (conversationId) {
      const existing = await db.aiConversation.findFirst({
        where: { id: conversationId, userId },
        select: { id: true },
      });
      if (!existing) {
        // Don't leak existence: create a fresh one instead of 403'ing here.
        // (The dedicated GET /conversations/[id] endpoint enforces ownership.)
        const created = await db.aiConversation.create({
          data: {
            userId,
            title: message.slice(0, 50),
            tool: "chat",
          },
          select: { id: true },
        });
        conversation = created;
      } else {
        conversation = existing;
      }
    } else {
      const created = await db.aiConversation.create({
        data: {
          userId,
          title: message.slice(0, 50),
          tool: "chat",
        },
        select: { id: true },
      });
      conversation = created;
    }
  } catch (error) {
    console.error("[ai.chatWithAssistant] DB conversation error:", error);
    throw new Error("Impossible de créer ou charger la conversation.");
  }

  // ---- Load last 10 messages for context ----
  let history: { role: string; content: string }[] = [];
  try {
    const dbMessages = await db.aiMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { role: true, content: true },
    });
    // Reverse so oldest → newest
    history = dbMessages.reverse().map((m) => ({ role: m.role, content: m.content }));
  } catch (error) {
    console.error("[ai.chatWithAssistant] DB history error:", error);
    history = [];
  }

  // ---- Persist the user message FIRST (so it's saved even if LLM fails) ----
  try {
    await db.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });
  } catch (error) {
    console.error("[ai.chatWithAssistant] DB save user msg error:", error);
    // Continue anyway — we still want to try the LLM call.
  }

  // ---- Build the messages payload for the LLM ----
  const systemPrompt = `Tu es "VerifScan AI Assistant", l'assistant intelligent de la plateforme VerifScan — une solution de traçabilité alimentaire par QR codes destinée aux fabricants sénégalais et ouest-africains.

Tu aides les fabricants sur :
- la rédaction de descriptions produits et de fiches techniques,
- la traçabilité et la conformité (lots, dates, certifications),
- le marketing et le référencement de leurs produits,
- la réglementation (CEDEAO, UE, étiquetage, allergènes),
- l'analyse des ingrédients et la sécurité alimentaire,
- l'interprétation de leurs statistiques de scan.

Règles :
- Réponds toujours en français, sauf si l'utilisateur demande explicitement une autre langue.
- Sois concis, pratique et encourageant.
- Donne des exemples concrets et des étapes actionnables.
- Si tu ne sais pas, dis-le honnêtement plutôt que d'inventer.
- N'invente jamais de chiffres réglementaires précis — oriente vers un expert ou un organisme officiel (ANSD, Sénégal Conformité, etc.).`;

  // Map DB roles → SDK roles (DB stores "user"|"assistant" which match).
  const llmMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  let responseText: string;
  try {
    const zai = await getZai();
    const completion = await zai.chat.completions.create({
      messages: llmMessages,
      thinking: { type: "disabled" },
    });
    responseText = completion.choices[0]?.message?.content?.trim() || "";
    if (!responseText) {
      responseText =
        "Je n'ai pas pu générer de réponse. Pouvez-vous reformuler votre question ?";
    }
  } catch (error) {
    console.error("[ai.chatWithAssistant] LLM error:", error);
    responseText =
      "Désolé, je rencontre un problème technique pour le moment. " +
      "Veuillez réessayer dans quelques instants. Si le problème persiste, " +
      "contactez le support VerifScan.";
  }

  // ---- Persist the assistant response ----
  try {
    await db.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: responseText,
      },
    });
    // Bump conversation.updatedAt (Prisma does this automatically with @updatedAt,
    // but only if we actually mutate a field — touch it explicitly).
    await db.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
  } catch (error) {
    console.error("[ai.chatWithAssistant] DB save assistant msg error:", error);
    // The response was already generated — return it even if persistence failed.
  }

  return { response: responseText, conversationId: conversation.id };
}
