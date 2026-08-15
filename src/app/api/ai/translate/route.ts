import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { translateText } from "@/lib/ai";

export const runtime = "nodejs";

/**
 * POST /api/ai/translate
 * Auth-required — translates `text` from `from` to `to`.
 *
 * Body:
 *   { text: string, from: "fr"|"en"|"wolof", to: "fr"|"en"|"wolof" }
 *
 * Response:
 *   { translation: string }
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
    namespace: "ai:translate",
    key: session.user.id,
  });
  if (limited) return limited;

  try {
    const body = await request.json();

    if (typeof body?.text !== "string") {
      return NextResponse.json(
        { error: "Paramètre invalide : text est requis." },
        { status: 400 },
      );
    }
    const validLangs = ["fr", "en", "wolof"];
    if (!validLangs.includes(body.from) || !validLangs.includes(body.to)) {
      return NextResponse.json(
        { error: "Paramètre invalide : from et to doivent être 'fr', 'en' ou 'wolof'." },
        { status: 400 },
      );
    }

    const result = await translateText({
      text: body.text,
      from: body.from,
      to: body.to,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/ai/translate] Error:", error);
    return NextResponse.json(
      { error: "Échec de la traduction." },
      { status: 500 },
    );
  }
}
