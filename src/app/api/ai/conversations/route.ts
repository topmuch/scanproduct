import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/ai/conversations
 * Auth-required — lists the user's conversations (most recent first).
 *
 * Response:
 *   { conversations: Array<{ id, title, tool, updatedAt, messageCount }> }
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
    namespace: "ai:conversations",
    key: session.user.id,
  });
  if (limited) return limited;

  try {
    const conversations = await db.aiConversation.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        _count: { select: { messages: true } },
      },
    });

    const mapped = conversations.map((c) => ({
      id: c.id,
      title: c.title,
      tool: c.tool,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("[GET /api/ai/conversations] Error:", error);
    return NextResponse.json(
      { error: "Échec de la récupération des conversations." },
      { status: 500 },
    );
  }
}
