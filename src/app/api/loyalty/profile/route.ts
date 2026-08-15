import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getConsumerProfile, BADGE_TIERS, REWARDS_CATALOG } from "@/lib/loyalty";

export const runtime = "nodejs";

/**
 * GET /api/loyalty/profile?anonymousId=...
 * PUBLIC endpoint — returns the consumer's loyalty profile (points, badges,
 * recent scans, redemptions) plus the rewards catalog and badge tiers
 * (so the widget doesn't need to hardcode them).
 *
 * If the consumer doesn't exist yet (first visit), returns an empty profile
 * with zero points — the widget can then call POST /api/loyalty/scan to
 * create the consumer and award the first scan's points.
 *
 * Response:
 *   {
 *     profile: {
 *       id, anonymousId, points, totalScans, badges,
 *       nextBadge: { label, minPoints, pointsRemaining } | null,
 *       recentScans: [{ lotId, productName, scannedAt }],
 *       redemptions: [{ id, rewardLabel, pointsCost, status, createdAt, code }]
 *     } | null,
 *     rewards: REWARDS_CATALOG,
 *     badges: BADGE_TIERS
 *   }
 */
export async function GET(request: NextRequest) {
  // --- Rate limit (IP-based, since this is public) ---
  const limited = applyRateLimit(request, {
    ...RATE_LIMITS.DEFAULT,
    namespace: "loyalty:profile",
    key: "",
  });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const anonymousId = searchParams.get("anonymousId");

    if (!anonymousId || !anonymousId.trim()) {
      return NextResponse.json(
        { error: "Paramètre anonymousId requis." },
        { status: 400 },
      );
    }

    const profile = await getConsumerProfile(anonymousId.trim());

    return NextResponse.json({
      profile,
      rewards: REWARDS_CATALOG,
      badges: BADGE_TIERS,
    });
  } catch (error) {
    console.error("[GET /api/loyalty/profile] Error:", error);
    return NextResponse.json(
      { error: "Échec de la récupération du profil fidélité." },
      { status: 500 },
    );
  }
}
