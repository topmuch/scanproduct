# Task 2c — Rate Limiter + TTL Cache Lib Modules

**Agent:** sub-agent (general-purpose)
**Date:** Phase 4 optimizations
**Status:** ✅ Complete

## Goal

Create 2 reusable backend lib modules (pure TypeScript, server-side, no React) for Phase 4 optimizations:
1. `src/lib/rate-limit.ts` — in-memory fixed-window rate limiter
2. `src/lib/cache.ts` — TTL in-memory cache

## Reference files read

- `/home/z/my-project/worklog.md` — prior context (Tasks 1 → 7-8-favicon → wow-product-page → 5-b exports)
- `/home/z/my-project/src/app/api/lots/[id]/route.ts` — public lot endpoint (PUBLIC_SCAN target); confirmed it already reads `x-forwarded-for` / `x-real-ip` for scan recording (same IP-detection pattern reused)
- `/home/z/my-project/src/app/api/qr-codes/generate/route.ts` — auth-required endpoint (QR_GENERATE target)
- `/home/z/my-project/src/lib/utils.ts` — existing helper style (cn, formatDate, parseJsonArray…)
- `/home/z/my-project/src/lib/settings.ts` — existing 60s in-memory cache pattern (Map + lazy expiration), generalised into TTLCache
- `/home/z/my-project/tsconfig.json` — strict mode, `@/*` → `./src/*`
- `/home/z/my-project/package.json` — confirmed `next/server` available for NextResponse import

## Files created

### 1. `/home/z/my-project/src/lib/rate-limit.ts` (167 lines)

**Exports:**
- `interface RateLimitOptions { key, windowMs, max, namespace? }`
- `interface RateLimitResult { success, limit, remaining, resetAt, retryAfter }`
- `function rateLimit(options: RateLimitOptions): RateLimitResult`
- `function getRateLimitKey(request: Request): string` — X-Forwarded-For (first IP) > x-real-ip > "anonymous"
- `function applyRateLimit(request: Request, options: RateLimitOptions): NextResponse | null` — returns 429 on deny, null on allow
- `const RATE_LIMITS = { PUBLIC_SCAN: 60/60s, AUTH: 10/60s, QR_GENERATE: 20/60s, DEFAULT: 100/60s } as const`

**Implementation:**
- Module-level `buckets = new Map<string, { count, resetAt }>()`
- Lazy cleanup when `buckets.size > 10_000` (sweeps `resetAt < now`)
- bucketKey = `${namespace || "default"}:${key}`
- 3 branches: new/expired bucket → success, count<max → success+increment, count>=max → failure with retryAfter
- `applyRateLimit` overrides `options.key` with `getRateLimitKey(request)` and returns 429 with `Retry-After` + `X-RateLimit-*` headers and French body `"Trop de requêtes. Réessayez dans {retryAfter}s."`

### 2. `/home/z/my-project/src/lib/cache.ts` (158 lines)

**Exports:**
- `interface CacheEntry<T> { value: T, expiresAt: number }`
- `class TTLCache<T = unknown>` with `get / set / delete / clear / getOrSet / clearExpired / stats`
- `const statsCache = new TTLCache(30_000)` — 30s, dashboard stats
- `const publicCache = new TTLCache(60_000)` — 60s, public lot data
- `const configCache = new TTLCache(300_000)` — 5min, settings/config
- `function invalidatePrefix(cache: TTLCache, prefix: string): number`

**Implementation:**
- Private `store: Map<string, CacheEntry<T>>`, private `hits` / `misses` counters
- `get()`: missing → misses++, undefined; expired → delete + misses++, undefined; fresh → hits++, value (lazy expiration)
- `set()`: stores `{ value, expiresAt: now + (ttlMs ?? defaultTtlMs) }`; auto-triggers `clearExpired()` when size > 5,000; does NOT touch hits/misses
- `getOrSet<R>()`: calls `get()` first (handles accounting); on miss calls `factory()`, `set()`s result, returns it — does NOT double-count
- `clearExpired()`: scans store, deletes expired entries; also auto-called from `set()` when size > 5,000
- `stats()`: `{ size, hits, misses, hitRate }` where `hitRate = hits/(hits+misses)` or 0 when total=0
- `invalidatePrefix()`: accesses private store via typed shape assertion (`cache as unknown as { store: Map<...> }`), iterates `Array.from(store.keys())`, deletes those starting with prefix, returns count

## Verification

| Check | Result |
|---|---|
| `bun run lint` | ✅ 0 errors, 0 warnings (full project) |
| `bunx eslint src/lib/rate-limit.ts src/lib/cache.ts` | ✅ exit 0 |
| `bunx tsc --noEmit` | ✅ 0 errors in new files (pre-existing errors in examples/, scripts/, skills/, src/lib/auth.ts, src/components/admin/* etc. untouched) |

### Runtime sanity (inline `bun -e`, no test files created)

**rate-limit.ts:**
- 3 calls within max=3 succeed (remaining 2→1→0), 4th returns `success:false, retryAfter:1`
- Different key starts fresh bucket
- `getRateLimitKey`: parses `"1.2.3.4, 5.6.7.8"` → `"1.2.3.4"`, `x-real-ip` → `"9.9.9.9"`, no headers → `"anonymous"`
- `applyRateLimit` returns `null` on allow; on deny returns 429 with headers `Retry-After:60, X-RateLimit-Limit:10, X-RateLimit-Remaining:0, X-RateLimit-Reset:<epoch>` and body `{"error":"Trop de requêtes. Réessayez dans 60s."}`
- `RATE_LIMITS` presets match spec exactly

**cache.ts:**
- `get()` missing → undefined + miss; fresh → value + hit; expired → undefined + miss (entry deleted)
- `stats()`: hitRate = 1/(1+2) = 0.333
- `getOrSet`: factory called exactly once across 2 invocations (2nd returns cached)
- `invalidatePrefix("lot:")`: removes 2 of 3 keys (lot:1, lot:2 deleted; user:1 kept)
- All 3 singletons are `TTLCache` instances

## Integration plan (for downstream agents)

- **Public lot endpoint** (`src/app/api/lots/[id]/route.ts` GET): add at top of handler
  ```ts
  const limited = applyRateLimit(request, { ...RATE_LIMITS.PUBLIC_SCAN, key: "", namespace: "api:scan" });
  if (limited) return limited;
  ```
- **Auth endpoints** (login, register): wrap with `applyRateLimit(request, { ...RATE_LIMITS.AUTH, key: "", namespace: "api:auth" })`
- **QR generation** (`src/app/api/qr-codes/generate/route.ts` POST): wrap with `applyRateLimit(request, { ...RATE_LIMITS.QR_GENERATE, key: "", namespace: "api:qr" })`
- **Dashboard stats**: wrap expensive DB aggregation in `statsCache.getOrSet("dashboard:stats", () => computeStats())`
- **Public lot data**: wrap `getLotWithDetails(id)` in `publicCache.getOrSet(\`lot:\${id}\`, () => getLotWithDetails(id))` — 60s TTL absorbs QR-scan traffic bursts
- **Lot updates**: after PATCH/DELETE in `src/app/api/lots/[id]/route.ts`, call `invalidatePrefix(publicCache, \`lot:\`)` to bust stale entries
- **Settings**: existing `src/lib/settings.ts` could be refactored to use `configCache` (currently has its own Map — left as-is for backward compat)

## Constraints honored

- ✅ Pure TypeScript, server-side, no React/JSX
- ✅ No existing files modified
- ✅ No test files created (inline `bun -e` for verification only)
- ✅ All public APIs match the spec signatures exactly
- ✅ French error message in 429 response (matches project locale)
- ✅ Pattern aligned with existing `src/lib/settings.ts` cache style
