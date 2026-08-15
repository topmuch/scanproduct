import { NextResponse } from "next/server";

/**
 * In-memory fixed-window rate limiter (server-side only).
 *
 * Phase 4 optimization — used by public & auth API routes to prevent abuse
 * (brute-force, QR-scan flooding, scraper storms). Each bucket is keyed by
 * `namespace:identifier` (typically IP or userId) and tracked in a module-level
 * Map. Lazy cleanup prevents unbounded memory growth.
 *
 * NOTE: This is a per-process limiter. In a multi-instance deployment you
 * would back it with Redis or an external store; for the VerifScan single-node
 * deployment this is sufficient and adds zero latency.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitOptions {
  /** Identifier for the bucket (usually IP or userId). */
  key: string;
  /** Window size in milliseconds. */
  windowMs: number;
  /** Max requests per window. */
  max: number;
  /** Optional namespace to avoid key collisions (e.g. "api:scan", "api:auth"). */
  namespace?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
  /** Seconds until reset (for HTTP `Retry-After` header). */
  retryAfter: number;
}

// ---------------------------------------------------------------------------
// Pre-configured presets
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  /** Public scan endpoint — allow bursts from QR scans. */
  PUBLIC_SCAN: { windowMs: 60_000, max: 60 },
  /** Auth endpoints — strict to prevent brute force. */
  AUTH: { windowMs: 60_000, max: 10 },
  /** QR generation — moderate (auth required, but expensive). */
  QR_GENERATE: { windowMs: 60_000, max: 20 },
  /** Default API. */
  DEFAULT: { windowMs: 60_000, max: 100 },
} as const;

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

type Bucket = { count: number; resetAt: number };

/** Module-level bucket store (shared across all callers in the same process). */
const buckets = new Map<string, Bucket>();

/** Hard cap above which we proactively sweep expired buckets. */
const MAX_BUCKETS_BEFORE_CLEANUP = 10_000;

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

/**
 * Check (and increment) the rate-limit bucket for the given key.
 *
 * - If the bucket doesn't exist OR its window has expired: create a fresh
 *   bucket with `count=1`, return `success=true`, `remaining=max-1`.
 * - If it exists and `count < max`: increment, return `success=true`,
 *   `remaining=max-count`.
 * - If `count >= max`: return `success=false`, `remaining=0`,
 *   `retryAfter=ceil((resetAt-now)/1000)`.
 */
export function rateLimit(options: RateLimitOptions): RateLimitResult {
  const { key, windowMs, max, namespace } = options;
  const bucketKey = `${namespace || "default"}:${key}`;
  const now = Date.now();

  // Lazy cleanup: avoid memory leak when many distinct IPs accumulate.
  if (buckets.size > MAX_BUCKETS_BEFORE_CLEANUP) {
    for (const [k, b] of buckets) {
      if (b.resetAt < now) {
        buckets.delete(k);
      }
    }
  }

  const existing = buckets.get(bucketKey);

  // Case 1: no bucket, or window already expired → start fresh.
  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(bucketKey, { count: 1, resetAt });
    return {
      success: true,
      limit: max,
      remaining: Math.max(0, max - 1),
      resetAt,
      retryAfter: 0,
    };
  }

  // Case 2: bucket exists and still has capacity.
  if (existing.count < max) {
    existing.count += 1;
    return {
      success: true,
      limit: max,
      remaining: Math.max(0, max - existing.count),
      resetAt: existing.resetAt,
      retryAfter: 0,
    };
  }

  // Case 3: bucket exhausted — deny.
  const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
  return {
    success: false,
    limit: max,
    remaining: 0,
    resetAt: existing.resetAt,
    retryAfter,
  };
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

/**
 * Extract a rate-limit key from a Request.
 *
 * Priority: `X-Forwarded-For` (first IP) > `x-real-ip` > `"anonymous"`.
 *
 * We use the first IP in X-Forwarded-For because that is the original client
 * IP as reported by the upstream proxy (Caddy in our deployment). Subsequent
 * IPs are intermediate proxies and shouldn't be used for keying.
 */
export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "anonymous";
}

/**
 * Apply rate limiting to a Request.
 *
 * Returns `null` when the request is allowed (caller continues normally),
 * or a ready-to-send `NextResponse` (429) when the limit is exceeded.
 *
 * Usage in an API route:
 *
 * ```ts
 * const limited = applyRateLimit(request, {
 *   ...RATE_LIMITS.PUBLIC_SCAN,
 *   key: "", // overridden by getRateLimitKey(request)
 *   namespace: "api:scan",
 * });
 * if (limited) return limited;
 * ```
 *
 * NOTE: the `key` field of `options` is intentionally overridden with
 * `getRateLimitKey(request)` — the caller only needs to supply `windowMs`,
 * `max`, and optionally `namespace`.
 */
export function applyRateLimit(
  request: Request,
  options: RateLimitOptions,
): NextResponse | null {
  const result = rateLimit({
    ...options,
    key: getRateLimitKey(request),
  });

  if (!result.success) {
    return NextResponse.json(
      { error: `Trop de requêtes. Réessayez dans ${result.retryAfter}s.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfter),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetAt),
        },
      },
    );
  }

  return null;
}
