import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { generateProductDescription } from "@/lib/ai";

export const runtime = "nodejs";

/**
 * POST /api/ai/generate-description
 * Auth-required — generates an SEO-optimized product description + keywords.
 *
 * Body:
 *   { productName: string, brand?: string, category?: string,
 *     features?: string, language?: "fr"|"en"|"wolof" }
 *
 * Response:
 *   { description: string, seoKeywords: string[] }
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
    namespace: "ai:description",
    key: session.user.id,
  });
  if (limited) return limited;

  try {
    const body = await request.json();

    if (typeof body?.productName !== "string" || !body.productName.trim()) {
      return NextResponse.json(
        { error: "Paramètre invalide : productName est requis." },
        { status: 400 },
      );
    }

    const language = body.language;
    const validLanguages = ["fr", "en", "wolof"];
    if (language !== undefined && !validLanguages.includes(language)) {
      return NextResponse.json(
        { error: "Paramètre invalide : language doit être 'fr', 'en' ou 'wolof'." },
        { status: 400 },
      );
    }

    const result = await generateProductDescription({
      productName: body.productName.trim(),
      brand: typeof body.brand === "string" ? body.brand.trim() : undefined,
      category: typeof body.category === "string" ? body.category.trim() : undefined,
      features: typeof body.features === "string" ? body.features.trim() : undefined,
      language: language as "fr" | "en" | "wolof" | undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/ai/generate-description] Error:", error);
    return NextResponse.json(
      { error: "Échec de la génération de la description." },
      { status: 500 },
    );
  }
}
