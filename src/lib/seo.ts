import { getSetting, SETTING_KEYS } from "@/lib/settings";

/**
 * Central SEO helpers — single source of truth for the canonical origin.
 *
 * Priority order for the public site URL:
 *   1. Setting "siteUrl"  (editable by the SuperAdmin in Paramètres → Général,
 *      persisted in the Setting table)
 *   2. NEXT_PUBLIC_APP_URL (Coolify env var, set at deploy time)
 *   3. DEFAULT_SITE_URL ("https://verifscan.com")
 *
 * The result is cached for 60s by the settings layer (metadata functions run
 * on every page load — we must not hammer the DB).
 */

/** Fallback canonical origin when nothing is configured. */
export const DEFAULT_SITE_URL = "https://verifscan.com";

/** Fallback public contact email. */
export const DEFAULT_CONTACT_EMAIL = "contact@verifscan.com";

/** Fallback public phone (JSON-LD contactPoint). */
export const DEFAULT_CONTACT_PHONE = "+221783821822";

/**
 * Resolve the canonical public origin of the site.
 * Returns an origin WITHOUT a trailing slash (e.g. "https://verifscan.com").
 */
export async function getSiteUrl(): Promise<string> {
  const stored = await getSetting(SETTING_KEYS.siteUrl);
  const candidate =
    stored?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    DEFAULT_SITE_URL;
  return candidate.replace(/\/+$/, "");
}

/**
 * hreflang target locales — French-speaking markets:
 * France, Belgique, Suisse, Canada (+ Sénégal, marchés d'Afrique de l'Ouest).
 *
 * The site is a single French version, so every locale points to the SAME
 * URL (self-referencing hreflang — the standard pattern for one-language
 * sites targeting several countries). Google uses it as a geo signal,
 * alongside JSON-LD areaServed and the localized keyword coverage.
 */
export const SEO_LOCALES = [
  "x-default",
  "fr",
  "fr-FR",
  "fr-BE",
  "fr-CH",
  "fr-CA",
  "fr-SN",
] as const;

/**
 * Build the `alternates` object for a public page:
 * absolute canonical + hreflang alternates for all francophone locales.
 *
 * Usage in a page's `generateMetadata` / `metadata`:
 *   alternates: await buildAlternates("/produits"),
 */
export async function buildAlternates(path: string): Promise<{
  canonical: string;
  languages: Record<string, string>;
}> {
  const base = await getSiteUrl();
  const clean = path === "/" ? "" : path.replace(/\/+$/, "");
  const url = `${base}${clean}`;
  const languages: Record<string, string> = {};
  for (const locale of SEO_LOCALES) {
    languages[locale] = url;
  }
  return { canonical: url, languages };
}

/**
 * Split the admin-entered keywords string into a clean array.
 * Accepts "a, b" / "a;b" / newlines; returns [] when empty.
 */
export function parseKeywords(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\n]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

/* ── URLs passeports « parlantes » (SEO) ────────────────────────────────────
 * Google favorise les URL descriptives : /p/{lotId}-{nom-produit-marque}.
 *
 *   - Les QR CODES (imprimés, GS1, étiquettes) gardent l'URL courte
 *     /p/{lotId} : stable même si le produit est renommé, plus dense car
 *     plus courte → ne JAMAIS les faire pointer vers l'URL à slug.
 *   - Les URL canoniques / sitemap / liens internes utilisent la forme
 *     parlante ; l'ancienne forme courte reste servie (200) et la balise
 *     canonical consolide les signaux vers la forme parlante (pattern
 *     standard e-commerce).
 *   - Les ids de lots sont des cuid() (jamais de tiret) → « {id}-{slug} »
 *     se découpe sans ambiguïté sur le PREMIER tiret.
 */

/** Slug ASCII français : minuscules, sans accents, tirets, tronqué à 60. */
export function slugifyFr(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diacritiques → lettres de base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * Chemin passeport parlant : /p/{lotId}-{slug nom + marque}.
 * Sans nom exploitable → retombe sur /p/{lotId} (forme courte, toujours
 * valide côté route).
 */
export function buildProductPath(
  lotId: string,
  productName?: string | null,
  brand?: string | null,
): string {
  const slug = slugifyFr(
    [productName, brand].filter((s): s is string => !!s?.trim()).join(" "),
  );
  return slug ? `/p/${lotId}-${slug}` : `/p/${lotId}`;
}

/**
 * Extrait le vrai id de lot d'un param de route qui peut porter un suffixe
 * slug : « cmuv...eua-beurre-de-karite » → « cmuv...eua ». L'entrée courte
 * « cmuv...eua » (QR codes imprimés) passe inchangée. Décodage %XX par
 * sécurité (les URL GS1 encodent le chemin).
 */
export function parseLotIdParam(param: string): string {
  const decoded = decodeURIComponent(param);
  const dash = decoded.indexOf("-");
  return dash > 0 ? decoded.slice(0, dash) : decoded;
}
