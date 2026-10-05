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
 *   3. Pings historiques Google/Bing (best effort) : les deux moteurs ont
 *      retiré ces endpoints (Google 404, Bing 410) — conservés pour le
 *      rapport et d'éventuels moteurs tiers. Pour Google, les canaux fiables
 *      restent : sitemap déclaré dans robots.txt (en place) + Search Console.
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

  // ── 4a. IndexNow — canal ACTIF (Bing/Yandex/Seznam/Naver) ───────────
  // On soumet les passeports /p/ mis à jour depuis ≤ 30 jours (étiquette
  // IndexNow : ne pas renvoyer en boucle des URLs inchangées ; max 1 000
  // par requête, limite API 10 000).
  let indexNow: { ok: boolean; status: number; submitted: number; error?: string } = {
    ok: false,
    status: 0,
    submitted: 0,
  };
  try {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const locs: string[] = [];
    const blocRe = /<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?/g;
    let m: RegExpExecArray | null;
    while ((m = blocRe.exec(sitemapXml)) !== null) {
      const url = m[1];
      if (!url.includes("/p/")) continue;
      const lastmod = m[2] ? Date.parse(m[2]) : NaN;
      if (!Number.isNaN(lastmod) && lastmod < cutoff) continue;
      locs.push(url);
      if (locs.length >= 1000) break;
    }
    if (locs.length > 0) {
      const key = await getOrCreateIndexNowKey();
      const res = await fetchTimeout("https://api.indexnow.org/indexnow", 12000, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host: origin.replace(/^https?:\/\//, ""),
          key,
          keyLocation: `${origin}/${key}.txt`,
          urlList: locs,
        }),
      });
      indexNow = { ...res, submitted: locs.length };
    }
  } catch (e) {
    indexNow = {
      ok: false,
      status: 0,
      submitted: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // ── 4b. Pings historiques (best effort — endpoints retirés par les
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
    pings: {
      indexNow:
        indexNow.submitted === 0
          ? "aucun lot récent à soumettre"
          : indexNow.ok
            ? `notifié (${indexNow.submitted} URLs)`
            : `échec (${indexNow.status}${indexNow.error ? ` — ${indexNow.error.slice(0, 80)}` : ""})`,
      google: google.ok ? "notifié" : `endpoint retiré (${google.status})`,
      bing: bing.ok ? "notifié" : `endpoint retiré (${bing.status})`,
    },
    note: "Canal actif : IndexNow (Bing/Yandex/Seznam). Pour Google : sitemap déjà déclaré dans robots.txt + Search Console — Google n'offre plus d'API de ping sans OAuth.",
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
