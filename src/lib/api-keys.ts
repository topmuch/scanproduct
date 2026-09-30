import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import {
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * Clés d'accès à l'API publique v1 — gérées depuis Paramètres → API & Intégrations.
 *
 * Principe (pattern Stripe) :
 *   - la clé complète `sk_live_<43 chars base64url>` n'est retournée qu'UNE
 *     fois, à la création ;
 *   - la base ne stocke QUE son SHA-256 (une fuite de la DB ne compromet pas
 *     les clés) et son préfixe (affichable sans danger dans l'UI) ;
 *   - l'authentification v1 accepte `Authorization: Bearer sk_live_...` ou
 *     `X-API-Key: sk_live_...`, en comparaison timing-safe ;
 *   - `lastUsedAt` / `lastUsedIp` sont mis à jour à chaque usage (fire-and-
 *     forget, jamais bloquant).
 *
 * Auto-réparation : si la table ApiKey n'existe pas encore (DB de prod créée
 * avant ce module, prisma db push raté au boot — historique P2021/P2022),
 * ensureArtisanTables() crée la table puis la requête est rejouée.
 */

export const API_KEY_PREFIX = "sk_live_";

/** Génère une nouvelle clé API complète (à ne JAMAIS stocker en clair). */
export function generateApiKey(): string {
  // 32 octets → 43 caractères base64url ≈ 192 bits d'entropie
  return API_KEY_PREFIX + randomBytes(32).toString("base64url");
}

/** Empreinte SHA-256 hex de la clé — c'est CE qui est stocké en DB. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Préfixe affichable : les 20 premiers caractères ("sk_live_" + 12 chars). */
export function apiKeyPrefix(key: string): string {
  return key.slice(0, 20);
}

/** Extrait la clé brute d'une requête (Bearer OU X-API-Key). */
export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token.startsWith(API_KEY_PREFIX)) return token;
    return null;
  }
  const header = request.headers.get("x-api-key");
  if (header?.trim().startsWith(API_KEY_PREFIX)) return header.trim();
  return null;
}

export type ApiKeyAuthResult =
  | { ok: true; keyId: string; keyName: string }
  | { ok: false; status: 401 | 403 | 500; error: string };

/**
 * Authentifie une requête de l'API v1 par sa clé.
 * Retourne { ok:false, status } exploitable tel quel par NextResponse.json.
 */
export async function authenticateApiKey(
  request: Request
): Promise<ApiKeyAuthResult> {
  const raw = extractApiKey(request);
  if (!raw) {
    return {
      ok: false,
      status: 401,
      error:
        "Clé API manquante ou mal formée — fournissez l'en-tête Authorization: Bearer sk_live_…",
    };
  }

  const findKey = () =>
    db.apiKey.findUnique({ where: { keyHash: hashApiKey(raw) } });

  let key: Awaited<ReturnType<typeof findKey>> = null;
  try {
    key = await findKey();
  } catch (error) {
    if (!isTableMissingError(error)) throw error;
    const heal = await ensureArtisanTables();
    if (!heal.ok) {
      return { ok: false, status: 500, error: "Erreur base de données." };
    }
    try {
      key = await findKey();
    } catch {
      return { ok: false, status: 500, error: "Erreur base de données." };
    }
  }

  if (!key) {
    return { ok: false, status: 401, error: "Clé API invalide." };
  }

  // Comparaison timing-safe du hash (défense en profondeur : la lookup par
  // index ne fuit rien, mais on standardise la pratique).
  const provided = Buffer.from(hashApiKey(raw));
  const stored = Buffer.from(key.keyHash);
  if (provided.length !== stored.length || !timingSafeEqual(provided, stored)) {
    return { ok: false, status: 401, error: "Clé API invalide." };
  }

  if (!key.active || key.revokedAt) {
    return {
      ok: false,
      status: 403,
      error: "Clé API révoquée — générez-en une nouvelle dans les paramètres.",
    };
  }

  // Compteur d'usage — fire-and-forget, ne JAMAIS ralentir la réponse.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;
  db.apiKey
    .update({
      where: { id: key.id },
      data: { lastUsedAt: new Date(), ...(ip ? { lastUsedIp: ip } : {}) },
    })
    .catch(() => {});

  return { ok: true, keyId: key.id, keyName: key.name };
}
