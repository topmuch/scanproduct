import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getAdminStats } from "@/lib/admin-server-data";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { statsCache } from "@/lib/cache";

/**
 * GET /api/admin/stats
 * SuperAdmin-only — returns platform-wide counters (users, products, lots,
 * scans, MRR, ARR, ticket counts, retention/churn).
 *
 * Phase 4:
 *   - Rate-limited at 100 req/min per admin (defence-in-depth; the dashboard
 *     polls every 30–60s, so this is mostly a guard against runaway clients).
 *   - Result cached for 30s via statsCache.getOrSet so concurrent dashboard
 *     refreshes don't all hit SQLite. Cache key is fixed ("admin:stats")
 *     because the stats are global — every admin sees the same numbers.
 */
export async function GET(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate-limit — keyed by the authenticated admin's user id (equivalent to
  // token.sub in the JWT, but this route uses getServerSession via
  // requireSuperAdmin so we read it from the session).
  const adminId = session.user?.id || "admin";
  const limited = applyRateLimit(request, {
    ...RATE_LIMITS.DEFAULT,
    namespace: "admin:stats",
    key: adminId,
  });
  if (limited) return limited;

  try {
    // Cache the stats for 30s — getAdminStats() fans out into ~15+ Prisma
    // queries (counts, sums, group-bys), so memoising avoids SQLite thrash
    // when the dashboard auto-refreshes.
    const stats = await statsCache.getOrSet(
      "admin:stats",
      async () => getAdminStats(),
      30_000,
    );
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[GET /api/admin/stats] Error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
