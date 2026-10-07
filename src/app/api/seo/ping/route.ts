import { NextRequest, NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/seo";
import { db } from "@/lib/db";
import crypto from "crypto";

/**
 * GET|POST /api/seo/ping?secret=<secret>[&baseUrl=<origine>]
 *
 * Automatise l'indexation des lots (sitmap dynamique — voir src/app/sitemap.ts) :
 *
 *   1. Lit le sitemap {siteUrl}/sitemap.xml et compte les URLs (dont les
 *      passeports /p/).
 *   2. IndexNow (canal ACTIF — Bing, Yandex, Seznam, Naver) : POST des URLs
 *      des lots mis à jour depuis ≤ 30 jours vers api.indexnow.org. La clé
 *      est générée au premier appel, stockée en Setting « indexNowKey » et
 *      servie à la racine /{clé}.txt par la route catch-all GS1 (spec IndexNow).
 *   3. Google Indexing API (canal ACTIF Google — OPTIONNEL) : si les vars
 *      GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY sont définies
 *      (compte de service ajouté comme propriétaire dans Search Console),
 *      les URLs des lots récents sont poussées via urlNotifications:publish
 *      (JWT RS256 signé avec node:crypto, zéro dépendance). Quota Google :
 *      200 requêtes/jour → plafonné à 200 URLs par ping.
 *   4. Pings historiques Google/Bing (best effort) : les deux moteurs ont
 *      retiré ces endpoints (Google 404, Bing 410) — conservés pour le
 *      rapport et d'éventuels moteurs tiers.
 *
 * Protection : `secret` DOIT égaliser SEO_PING_SECRET (recommandé) ou à
 * défaut NEXTAUTH_SECRET — comparaison en temps constant. `baseUrl` permet
 * de tester en local (ex. http://localhost:3100) mais exige le secret.
 *
 * Appel conseillé (cron Coolify ou crontab) — voir scripts/ping-google.sh :
 *   0 8 * * * curl -s "https://verifscan.com/api/seo/ping?secret=$SEO_PING_SECRET"
 */

export const dynamic = "force-dynamic";

/** Comparaison en temps constant (anti-timing-attack) de deux secrets. */
function secretsEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** fetch avec timeout court — les pings ne doivent jamais suspendre l'appel. */
async function fetchTimeout(
  url: string,
  ms = 8000,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), ms);
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { "User-Agent": "VerifScan-SEOPing/1.0", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    clearTimeout(t);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Clé IndexNow : générée au premier ping, stockée en Setting « indexNowKey »,
 * servie ensuite à la racine /{clé}.txt par la route catch-all GS1.
 */
async function getOrCreateIndexNowKey(): Promise<string> {
  const existing = await db.setting.findUnique({ where: { key: "indexNowKey" } });
  if (existing?.value) return existing.value;
  const key = crypto.randomBytes(16).toString("hex");
  await db.setting.upsert({
    where: { key: "indexNowKey" },
    update: { value: key },
    create: { key: "indexNowKey", value: key },
  });
  return key;
}

/**
 * Push Google Indexing API — le SEUL canal Google « push » encore actif.
 *
 * Activé UNIQUEMENT si les variables d'environnement suivantes existent :
 *   - GOOGLE_SERVICE_ACCOUNT_EMAIL : e-mail du compte de service
 *     (…@…iam.gserviceaccount.com) ajouté comme PROPRIÉTAIRE dans
 *     Search Console (Paramètres → Utilisateurs et autorisations),
 *     avec l'API « Indexing API » activée dans Google Cloud.
 *   - GOOGLE_PRIVATE_KEY : clé privée du compte de service (les \n
 *     littéraux du JSON sont convertis en retours à la ligne réels).
 *
 * Mécanisme : JWT RS256 signé avec node:crypto (aucune dépendance), échangé
 * contre un access token OAuth2, puis une requête urlNotifications:publish
 * par URL (type URL_UPDATED). Quota officiel Google : 200 requêtes/jour →
 * le nombre d'URLs est plafonné à 200 par ping (cron quotidien = quota).
 *
 * Sans ces variables → { configured: false } et le rapport indique le canal
 * alternatif (sitemap robots.txt + Search Console). L'API Indexing est
 * officiellement documentée pour JobPosting/Livestream ; Google l'accepte
 * largement au-delà (usage standard des SEO), sans garantie de délai.
 */
async function googleIndexingPush(
  urls: string[],
): Promise<{
  configured: boolean;
  ok: boolean;
  status: number;
  submitted: number;
  error?: string;
}> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || "";
  const rawKey = process.env.GOOGLE_PRIVATE_KEY?.trim() || "";
  if (!email || !rawKey || urls.length === 0) {
    return { configured: false, ok: false, status: 0, submitted: 0 };
  }
  try {
    const privateKey = rawKey.replace(/\\n/g, "\n");
    const iat = Math.floor(Date.now() / 1000);
    const entete = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT" }),
    ).toString("base64url");
    const revendications = Buffer.from(
      JSON.stringify({
        iss: email,
        scope: "https://www.googleapis.com/auth/indexing",
        aud: "https://oauth2.googleapis.com/token",
        iat,
        exp: iat + 3600,
      }),
    ).toString("base64url");
    const signature = crypto
      .createSign("RSA-SHA256")
      .update(`${entete}.${revendications}`)
      .sign(privateKey);
    const jwt = `${entete}.${revendications}.${signature.toString("base64url")}`;

    // Échange du JWT contre un access token (grant jwt-bearer).
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12000);
    let accessToken: string | undefined;
    let statusToken = 0;
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }).toString(),
        signal: controller.signal,
        cache: "no-store",
      });
      statusToken = tokenRes.status;
      if (tokenRes.ok) {
        const json = (await tokenRes.json()) as { access_token?: string };
        accessToken = json.access_token;
      }
    } finally {
      clearTimeout(t);
    }
    if (!accessToken) {
      return {
        configured: true,
        ok: false,
        status: statusToken,
        submitted: 0,
        error:
          "token JWT refusé — vérifiez le compte de service (e-mail, clé privée, API Indexing activée)",
      };
    }

    // Push des URLs (plafond 200 = quota journalier Google).
    let submitted = 0;
    let lastStatus = 0;
    let firstError: string | undefined;
    for (const url of urls.slice(0, 200)) {
      const push = await fetchTimeout(
        "https://indexing.googleapis.com/v3/urlNotifications:publish",
        10000,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ url, type: "URL_UPDATED" }),
        },
      );
      lastStatus = push.status;
      if (push.ok) submitted++;
      else if (!firstError)
        firstError = `urlNotifications ${push.status}${push.error ? ` — ${push.error.slice(0, 60)}` : ""}`;
    }
    return {
      configured: true,
      ok: submitted > 0,
      status: lastStatus,
      submitted,
      error: firstError,
    };
  } catch (e) {
    return {
      configured: true,
      ok: false,
      status: 0,
      submitted: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function handle(req: NextRequest) {
  // ── 1. Authentification par secret partagé ──────────────────────────────
  const provided =
    req.nextUrl.searchParams.get("secret") ||
    req.headers.get("x-seo-ping-secret") ||
    "";
  const expected =
    process.env.SEO_PING_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";
  if (!expected || !provided || !secretsEqual(provided, expected)) {
    return NextResponse.json(
      { error: "Secret invalide — définissez SEO_PING_SECRET et passez ?secret=…" },
      { status: 403 },
    );
  }

  // ── 2. Origine à pinger (override local possible) ───────────────────────
  const override = req.nextUrl.searchParams.get("baseUrl")?.trim();
  const origin = override
    ? override.replace(/\/+$/, "")
    : await getSiteUrl();

  // ── 3. Lecture du sitemap + comptage des URLs ───────────────────────────
  let sitemapXml = "";
  try {
    const res = await fetchTimeout(`${origin}/sitemap.xml`, 15000);
    if (res.ok) {
      const r = await fetch(`${origin}/sitemap.xml`, { cache: "no-store" });
      sitemapXml = await r.text();
    }
  } catch {
    /* géré ci-dessous */
  }
  const lotUrls = (sitemapXml.match(/\/p\//g) ?? []).length;
  const totalUrls = (sitemapXml.match(/<loc>/g) ?? []).length;

  if (totalUrls === 0) {
    return NextResponse.json(
      { ok: false, error: `Sitemap illisible ou vide sur ${origin}/sitemap.xml` },
      { status: 502 },
    );
  }

  const sitemapUrl = `${origin}/sitemap.xml`;

  // ── 4. URLs des passeports /p/ récents (≤ 30 jours) — liste partagée
  //     par les canaux IndexNow et Google Indexing API (étiquette : ne pas
  //     renvoyer en boucle des URLs inchangées ; max 1 000 par requête).
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const urlsLotsRecents: string[] = [];
  {
    const blocRe = /<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?/g;
    let m: RegExpExecArray | null;
    while ((m = blocRe.exec(sitemapXml)) !== null) {
      const url = m[1];
      if (!url.includes("/p/")) continue;
      const lastmod = m[2] ? Date.parse(m[2]) : NaN;
      if (!Number.isNaN(lastmod) && lastmod < cutoff) continue;
      urlsLotsRecents.push(url);
      if (urlsLotsRecents.length >= 1000) break;
    }
  }

  // ── 4a. IndexNow — canal ACTIF (Bing/Yandex/Seznam/Naver) ───────────
  let indexNow: { ok: boolean; status: number; submitted: number; error?: string } = {
    ok: false,
    status: 0,
    submitted: 0,
  };
  try {
    if (urlsLotsRecents.length > 0) {
      const key = await getOrCreateIndexNowKey();
      const res = await fetchTimeout("https://api.indexnow.org/indexnow", 12000, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: origin.replace(/^https?:\/\//, ""),
          key,
          keyLocation: `${origin}/${key}.txt`,
          urlList: urlsLotsRecents,
        }),
      });
      indexNow = { ...res, submitted: urlsLotsRecents.length };
    }
  } catch (e) {
    indexNow = {
      ok: false,
      status: 0,
      submitted: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // ── 4b. Google Indexing API — canal push Google (OPTIONNEL) ──────────
  //     Actif si GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY sont
  //     définies ; sinon { configured:false } → procédure alternative
  //     (sitemap robots.txt + Search Console).
  const googleIndexing = await googleIndexingPush(urlsLotsRecents);

  // ── 4c. Pings historiques (best effort — endpoints retirés par les
  //     moteurs : Google 404, Bing 410) ──────────────────────────────────
  const [google, bing] = await Promise.all([
    fetchTimeout(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
    fetchTimeout(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`),
  ]);

  // ── 5. Journalisation Setting (dernier ping — lisible SuperAdmin) ───────
  const pingLog = JSON.stringify({
    at: new Date().toISOString(),
    origin,
    totalUrls,
    lotUrls,
    indexNow: { status: indexNow.status, submitted: indexNow.submitted },
    googleIndexing: {
      configured: googleIndexing.configured,
      status: googleIndexing.status,
      submitted: googleIndexing.submitted,
    },
    google: google.status,
    bing: bing.status,
  });
  try {
    await db.setting.upsert({
      where: { key: "seoLastPing" },
      update: { value: pingLog },
      create: { key: "seoLastPing", value: pingLog },
    });
  } catch {
    /* journalisation facultative */
  }

  return NextResponse.json({
    ok: true,
    origin,
    sitemapUrl,
    totalUrls,
    lotUrls,
    urlsRecentes: urlsLotsRecents.length,
    pings: {
      indexNow:
        indexNow.submitted === 0
          ? "aucun lot récent à soumettre"
          : indexNow.ok
            ? `notifié (${indexNow.submitted} URLs)`
            : `échec (${indexNow.status}${indexNow.error ? ` — ${indexNow.error.slice(0, 80)}` : ""})`,
      googleIndexing: !googleIndexing.configured
        ? "non configuré — définissez GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY (compte de service propriétaire Search Console)"
        : googleIndexing.ok
          ? `poussé (${googleIndexing.submitted} URLs via Indexing API)`
          : `échec (${googleIndexing.status}${googleIndexing.error ? ` — ${googleIndexing.error.slice(0, 80)}` : ""})`,
      google: google.ok ? "notifié" : `endpoint retiré (${google.status})`,
      bing: bing.ok ? "notifié" : `endpoint retiré (${bing.status})`,
    },
    note: "Canaux actifs : IndexNow (Bing/Yandex/Seznam) + Google Indexing API si compte de service configuré. Sinon pour Google : sitemap déclaré dans robots.txt (en place) + Search Console.",
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
