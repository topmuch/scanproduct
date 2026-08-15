/**
 * Simple TTL in-memory cache (server-side only).
 *
 * Phase 4 optimization — used to memoize expensive DB queries (dashboard
 * stats, public lot data, site config) so we don't hit SQLite on every
 * request. Lazy expiration keeps reads fast; periodic bulk sweeps keep
 * the store bounded.
 *
 * Pattern matches `src/lib/settings.ts` (60s in-memory cache), generalised
 * to a reusable class with stats and invalidation helpers.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CacheEntry<T> {
  value: T;
  /** Epoch ms when this entry expires. */
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// TTLCache
// ---------------------------------------------------------------------------

export class TTLCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  constructor(private readonly defaultTtlMs: number = 60_000) {}

  /**
   * Get a value, or `undefined` if not cached or expired.
   *
   * Stale entries are deleted on read (lazy expiration).
   * Increments `misses` on miss/expired, `hits` on fresh hit.
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (entry.expiresAt < Date.now()) {
      // Lazy expiration: drop stale entry to keep the store clean.
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  /**
   * Set a value with optional custom TTL.
   *
   * If `ttlMs` is omitted, falls back to `defaultTtlMs` from the constructor.
   * Sets do NOT count as hits or misses.
   */
  set(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.store.set(key, { value, expiresAt });

    // Opportunistic cleanup when the store grows large.
    if (this.store.size > 5_000) {
      this.clearExpired();
    }
  }

  /** Delete a specific key. No-op if not present. */
  delete(key: string): void {
    this.store.delete(key);
  }

  /** Clear all entries (resets the store, NOT the hit/miss counters). */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get-or-compute pattern: returns the cached value if fresh, else calls
   * `factory()`, caches the result, and returns it.
   *
   * Useful for expensive DB queries:
   *
   * ```ts
   * const stats = await statsCache.getOrSet("dashboard:stats", () =>
   *   computeDashboardStats(),
   * );
   * ```
   *
   * Hit/miss accounting happens inside `get()` — `getOrSet` does NOT
   * double-count. On a miss that we resolve via `factory`, the miss is
   * already recorded; we do not increment hits for the resolved value.
   */
  async getOrSet<R>(
    key: string,
    factory: () => Promise<R>,
    ttlMs?: number,
  ): Promise<R> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached as R;
    }
    // Miss already counted by get() — compute, cache, return.
    const value = await factory();
    this.set(key, value as unknown as T, ttlMs);
    return value;
  }

  /**
   * Scan and remove all expired entries. Called automatically when the
   * store grows past 5k entries; can also be invoked manually (e.g. on
   * a cron or after bulk invalidations).
   *
   * @returns nothing — use `stats().size` to observe.
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [k, entry] of this.store) {
      if (entry.expiresAt < now) {
        this.store.delete(k);
      }
    }
  }

  /**
   * Observability stats for monitoring / debug dashboards.
   *
   * `hitRate` is `hits / (hits + misses)`, or `0` when no requests have
   * been made yet (avoids NaN).
   */
  stats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton caches for common use cases
// ---------------------------------------------------------------------------

/** 30s — dashboard stats (fresh enough for live updates, avoids DB thrash). */
export const statsCache = new TTLCache(30_000);

/** 60s — public lot data (the busiest endpoint, big JSON payloads). */
export const publicCache = new TTLCache(60_000);

/** 5min — settings/config (rarely changes, read on every metadata render). */
export const configCache = new TTLCache(300_000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Invalidate all cache entries whose key starts with `prefix`.
 *
 * Example: when a lot is updated, clear all `lot:*` keys so the next request
 * re-fetches fresh data.
 *
 * @returns the number of entries removed.
 */
export function invalidatePrefix(cache: TTLCache, prefix: string): number {
  // The cache's internal `store` is private to keep the public API narrow;
  // we access it through a typed shape assertion (same module, controlled use).
  const internal = cache as unknown as {
    store: Map<string, CacheEntry<unknown>>;
  };
  let count = 0;
  // Snapshot keys before mutating — deleting during Map iteration is safe in
  // JS but iterating via Array.from makes the intent explicit.
  for (const key of Array.from(internal.store.keys())) {
    if (key.startsWith(prefix)) {
      internal.store.delete(key);
      count++;
    }
  }
  return count;
}
