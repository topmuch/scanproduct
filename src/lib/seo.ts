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
export const DEFAULT_CONTACT_PHONE = "+221784858822";

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
