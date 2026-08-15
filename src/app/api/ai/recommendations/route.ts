import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getRecommendations } from "@/lib/ai";

export const runtime = "nodejs";

/**
 * GET /api/ai/recommendations
 * Auth-required — returns best publish time + tips based on the user's scans.
 *
 * Response:
 *   {
 *     bestPublishTime: { day: string, hour: string, reason: string },
 *     tips: string[],
 *     predictions: string[]
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
    namespace: "ai:recommendations",
    key: session.user.id,
  });
  if (limited) return limited;

  try {
    const result = await getRecommendations({ userId: session.user.id });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/ai/recommendations] Error:", error);
    return NextResponse.json(
      { error: "Échec de la récupération des recommandations." },
      { status: 500 },
    );
  }
}
