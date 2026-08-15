import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  redeemReward,
  getOrCreateConsumer,
  getConsumerProfile,
  REWARDS_CATALOG,
  InsufficientPointsError,
} from "@/lib/loyalty";

export const runtime = "nodejs";

/**
 * POST /api/loyalty/redeem
 * PUBLIC endpoint — consumer spends points on a reward.
 *
 * Body:
 *   { anonymousId: string, rewardType: string }
 *
 * Behavior:
 *   1. Rate-limit by IP.
 *   2. Get-or-create the consumer (the widget always sends an anonymousId).
 *   3. Validate `rewardType` against the REWARDS_CATALOG.
 *   4. Call `redeemReward` — deducts points + creates a LoyaltyRedemption
 *      with a unique code.
 *   5. Returns the redemption + refreshed profile.
 *
 * Status codes:
 *   200 — success
 *   400 — invalid body (missing anonymousId / unknown rewardType)
 *   402 — insufficient points
 *   429 — rate-limited
 *   500 — unexpected error
 */
export async function POST(request: NextRequest) {
  // --- Rate limit ---
  const limited = applyRateLimit(request, {
    ...RATE_LIMITS.DEFAULT,
    namespace: "loyalty:redeem",
    key: "",
  });
  if (limited) return limited;

  try {
    const body = await request.json();

    // --- Validate input ---
    if (
      typeof body?.anonymousId !== "string" ||
      !body.anonymousId.trim()
    ) {
      return NextResponse.json(
        { error: "Paramètre anonymousId requis." },
        { status: 400 },
      );
    }

    if (
      typeof body?.rewardType !== "string" ||
      !body.rewardType.trim()
    ) {
      return NextResponse.json(
        { error: "Paramètre rewardType requis." },
        { status: 400 },
      );
    }

    const anonymousId = body.anonymousId.trim();
    const rewardType = body.rewardType.trim();

    // --- Validate rewardType against catalog ---
    const reward = REWARDS_CATALOG.find((r) => r.type === rewardType);
    if (!reward) {
      return NextResponse.json(
        {
          error: `Type de récompense inconnu : ${rewardType}.`,
          validTypes: REWARDS_CATALOG.map((r) => r.type),
        },
        { status: 400 },
      );
    }

    // --- Get-or-create the consumer ---
    const consumer = await getOrCreateConsumer(anonymousId);

    // --- Pre-check points for a better error message ---
    if (consumer.points < reward.pointsCost) {
      return NextResponse.json(
        {
          error: `Points insuffisants. Cette récompense coûte ${reward.pointsCost} pts, vous en avez ${consumer.points}.`,
          pointsNeeded: reward.pointsCost,
          pointsAvailable: consumer.points,
        },
        { status: 402 },
      );
    }

    // --- Redeem (atomic, with race-condition guard) ---
    let redemption;
    try {
      redemption = await redeemReward(consumer.id, rewardType);
    } catch (error) {
      if (error instanceof InsufficientPointsError) {
        return NextResponse.json(
          {
            error: "Points insuffisants pour cette récompense.",
            pointsNeeded: reward.pointsCost,
            pointsAvailable: consumer.points,
          },
          { status: 402 },
        );
      }
      throw error;
    }

    // --- Refresh profile ---
    const profile = await getConsumerProfile(anonymousId);

    return NextResponse.json({
      redemption: {
        id: redemption.id,
        rewardType: redemption.rewardType,
        rewardLabel: redemption.rewardLabel,
        pointsCost: redemption.pointsCost,
        code: redemption.code,
        status: redemption.status,
        createdAt: redemption.createdAt.toISOString(),
      },
      profile,
    });
  } catch (error) {
    console.error("[POST /api/loyalty/redeem] Error:", error);
    return NextResponse.json(
      { error: "Échec de l'échange de points." },
      { status: 500 },
    );
  }
}
