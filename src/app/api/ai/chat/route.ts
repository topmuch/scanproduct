import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { chatWithAssistant } from "@/lib/ai";

export const runtime = "nodejs";

/**
 * POST /api/ai/chat
 * Auth-required — sends a message to the VerifScan AI assistant and persists
 * the exchange in an AiConversation.
 *
 * Body:
 *   { message: string, conversationId?: string }
 *
 * Response:
 *   { response: string, conversationId: string }
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
    namespace: "ai:chat",
    key: session.user.id,
  });
  if (limited) return limited;

  try {
    const body = await request.json();

    if (typeof body?.message !== "string" || !body.message.trim()) {
      return NextResponse.json(
        { error: "Paramètre invalide : message est requis." },
        { status: 400 },
      );
    }

    const conversationId =
      typeof body.conversationId === "string" && body.conversationId.trim()
        ? body.conversationId.trim()
        : undefined;

    const result = await chatWithAssistant({
      userId: session.user.id,
      message: body.message,
      conversationId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/ai/chat] Error:", error);
    return NextResponse.json(
      { error: "Échec de la conversation avec l'assistant IA." },
      { status: 500 },
    );
  }
}
