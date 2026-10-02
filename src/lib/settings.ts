import { db } from "@/lib/db";

/**
 * Site-wide settings persistence (key/value store).
 *
 * Uses the Prisma `Setting` model (key: String @id, value: String).
 * Complex values should be JSON-encoded before storing.
 *
 * All functions are safe to call from server components / API routes.
 */

/** Cache TTL in milliseconds (avoids hitting the DB on every metadata render). */
const CACHE_TTL_MS = 60_000; // 1 minute

const cache = new Map<string, { value: string | null; expiresAt: number }>();

/**
 * Get a single setting by key. Returns `null` when the key doesn't exist.
 * Results are cached for `CACHE_TTL_MS` to avoid excessive DB reads
 * (metadata functions run on every page load).
 */
export async function getSetting(key: string): Promise<string | null> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let value: string | null = null;
  try {
    const row = await db.setting.findUnique({ where: { key } });
    value = row?.value ?? null;
  } catch {
    // DB might not be migrated yet (Setting table missing) — fail gracefully.
    value = null;
  }

  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

/**
 * Set (upsert) a setting value. Invalidates the cache for that key.
 */
export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Get multiple settings at once. Returns a plain object keyed by setting key.
 * Missing keys are simply absent from the result (not null) to make
 * destructuring with defaults ergonomic: `const { faviconUrl } = await getSettings(...)`.
 */
export async function getSettings(
  keys: string[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const uncached: string[] = [];

  for (const key of keys) {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now() && cached.value !== null) {
      result[key] = cached.value;
    } else {
      uncached.push(key);
    }
  }

  if (uncached.length > 0) {
    try {
      const rows = await db.setting.findMany({ where: { key: { in: uncached } } });
      for (const row of rows) {
        result[row.key] = row.value;
        cache.set(row.key, {
          value: row.value,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
      }
      // Cache null for keys that weren't found
      for (const key of uncached) {
        if (!(key in result)) {
          cache.set(key, { value: null, expiresAt: Date.now() + CACHE_TTL_MS });
        }
      }
    } catch {
      // DB not migrated — fail gracefully, return empty result
    }
  }

  return result;
}

// ── Well-known setting keys ────────────────────────────────────────────────

export const SETTING_KEYS = {
  /** Public URL of the site favicon (e.g. "/api/uploads/site/favicon.png"). */
  faviconUrl: "faviconUrl",
  /** Site name shown in the UI + metadata (defaults to "VerifScan"). */
  siteName: "siteName",
  /** Tagline shown in the UI (defaults to "La vérité au bout du scan"). */
  siteSlogan: "siteSlogan",
  /**
   * Canonical public origin of the site, e.g. "https://verifscan.com".
   * Drives metadataBase, canonical URLs, hreflang alternates, the sitemap,
   * JSON-LD and OpenGraph URLs. Falls back to DEFAULT_SITE_URL (lib/seo.ts)
   * when absent.
   */
  siteUrl: "siteUrl",
  /** Public contact email (defaults to "contact@verifscan.com"). */
  contactEmail: "contactEmail",
  /** Public contact phone (defaults to "+221783821822"). */
  contactPhone: "contactPhone",
  /** IANA timezone of the platform (defaults to "Africa/Dakar"). */
  timezone: "timezone",
  /** Default UI language code (defaults to "fr"). */
  defaultLanguage: "defaultLanguage",
  /** Free-form address displayed in the UI / JSON-LD. */
  siteAddress: "siteAddress",
  // ── SEO ──────────────────────────────────────────────────────────────────
  /** <title> default — overrides the static default in layout.tsx. */
  seoTitle: "seoTitle",
  /** Meta description — overrides the static default in layout.tsx. */
  seoDescription: "seoDescription",
  /** Comma-separated keywords — overrides SITE_KEYWORDS when non-empty. */
  seoKeywords: "seoKeywords",
  /** Public URL of the uploaded OpenGraph image (e.g. "/api/uploads/site/og-image.png"). */
  ogImageUrl: "ogImageUrl",
  /** Google Search Console verification token (meta google-site-verification). */
  googleVerification: "googleVerification",
  // ── Email / SMTP (Admin → Paramètres → Email & Notifications) ─────────────
  /** SMTP server hostname (takes priority over SMTP_HOST env when full). */
  smtpHost: "smtpHost",
  /** SMTP port as a string ("587", "465", …). */
  smtpPort: "smtpPort",
  /** SMTP username. */
  smtpUser: "smtpUser",
  /** SMTP password (plain — superadmin-only setting, SQLite local). */
  smtpPass: "smtpPass",
  /** "true" (SSL/direct) or "false" (STARTTLS/plain). Empty = auto (465). */
  smtpSecure: "smtpSecure",
  /** From header, e.g. "VerifScan <no-reply@verifscan.com>". */
  smtpFrom: "smtpFrom",
  // ── Admin notification toggles ────────────────────────────────────────────
  /** Notify admins of new signups ("true"/"false"). */
  notifSignup: "notifSignup",
  /** Notify admins when a subscription/payment is activated. */
  notifPayment: "notifPayment",
  /** Notify admins of new support tickets / consumer reports. */
  notifTicket: "notifTicket",
  /** Notify admins of security events (suspensions, etc.). */
  notifSecurity: "notifSecurity",
  /** Notify admins when a fabricant exceeds its QR quota. */
  notifQuota: "notifQuota",
  /** Recipient of admin notification emails (falls back to first superadmin). */
  notifEmailRecipient: "notifEmailRecipient",
} as const;

/**
 * Returns the current favicon URL, or `null` if no custom favicon has been
 * uploaded (in which case the default `/favicon.ico` is used).
 */
export async function getFaviconUrl(): Promise<string | null> {
  return getSetting(SETTING_KEYS.faviconUrl);
}
