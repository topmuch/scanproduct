import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getFabricantLoyaltyStats, REWARDS_CATALOG, BADGE_TIERS } from "@/lib/loyalty";

export const runtime = "nodejs";

/**
 * GET /api/loyalty/stats
 * AUTH-REQUIRED (fabricant) — returns aggregate loyalty analytics for the
 * fabricant dashboard:
 *   - totalConsumers: distinct consumers who scanned this fabricant's lots
 *   - totalPointsDistributed: sum of points held by those consumers
 *   - totalScans: scans of this fabricant's lots
 *   - topBadges: count of consumers per badge tier
 *   - recentRedemptions: last 10 redemptions (this fabricant's products)
 *   - topConsumers: top 5 consumers by points (with masked labels)
 *
 * Response:
 *   {
 *     stats: FabricantLoyaltyStats,
 *     rewards: REWARDS_CATALOG,
 *     badges: BADGE_TIERS
 *   }
 */
export async function GET(request: NextRequest) {
  // --- Auth ---
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // --- Rate limit ---
  const limited = applyRateLimit(request, {
    ...RATE_LIMITS.DEFAULT,
    namespace: "loyalty:stats",
    key: session.user.id,
  });
  if (limited) return limited;

  try {
    const stats = await getFabricantLoyaltyStats(session.user.id);

    return NextResponse.json({
      stats,
      rewards: REWARDS_CATALOG,
      badges: BADGE_TIERS,
    });
  } catch (error) {
    console.error("[GET /api/loyalty/stats] Error:", error);
    return NextResponse.json(
      { error: "Échec de la récupération des statistiques fidélité." },
      { status: 500 },
    );
  }
}
