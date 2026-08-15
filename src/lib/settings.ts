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
  /** Optional: site name override (defaults to "VerifScan"). */
  siteName: "siteName",
} as const;

/**
 * Returns the current favicon URL, or `null` if no custom favicon has been
 * uploaded (in which case the default `/favicon.ico` is used).
 */
export async function getFaviconUrl(): Promise<string | null> {
  return getSetting(SETTING_KEYS.faviconUrl);
}
