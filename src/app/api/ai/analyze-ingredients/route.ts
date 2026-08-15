import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { analyzeIngredients } from "@/lib/ai";

export const runtime = "nodejs";

/**
 * POST /api/ai/analyze-ingredients
 * Auth-required — analyzes a list of ingredients for allergens & anomalies.
 *
 * Body:
 *   { ingredients: string, productName?: string }
 *
 * Response:
 *   { allergens: string[],
 *     anomalies: Array<{ type: string, severity: "info"|"warning"|"critical", message: string }>,
 *     recommendations: string[] }
 */
export async function POST(request: NextRequest) {
  // --- Auth ---
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // --- Rate limit ---
  const limited = applyRateLimit(request, {
    ...RATE_LIMITS.DEFAULT,
    namespace: "ai:analyze",
    key: session.user.id,
  });
  if (limited) return limited;

  try {
    const body = await request.json();

    if (typeof body?.ingredients !== "string") {
      return NextResponse.json(
        { error: "Paramètre invalide : ingredients est requis." },
        { status: 400 },
      );
    }

    const result = await analyzeIngredients({
      ingredients: body.ingredients,
      productName:
        typeof body.productName === "string" ? body.productName.trim() : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/ai/analyze-ingredients] Error:", error);
    return NextResponse.json(
      { error: "Échec de l'analyse des ingrédients." },
      { status: 500 },
    );
  }
}
