import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/ai/conversations/[id]
 * Auth-required — returns a conversation with all its messages.
 *
 * Verifies the conversation belongs to the authenticated user (403 otherwise).
 *
 * Response:
 *   { id, title, messages: Array<{ id, role, content, createdAt }> }
 */
export async function GET(request: NextRequest, context: RouteContext) {
  // --- Auth ---
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // --- Rate limit ---
  const limited = applyRateLimit(request, {
    ...RATE_LIMITS.DEFAULT,
    namespace: "ai:conversation-detail",
    key: session.user.id,
  });
  if (limited) return limited;

  try {
    const { id } = await context.params;

    const conversation = await db.aiConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation introuvable." },
        { status: 404 },
      );
    }

    // Ownership check — 403 (not 404) so users can't probe for other users' IDs.
    if (conversation.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Accès interdit à cette conversation." },
        { status: 403 },
      );
    }

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      tool: conversation.tool,
      messages: conversation.messages,
    });
  } catch (error) {
    console.error("[GET /api/ai/conversations/[id]] Error:", error);
    return NextResponse.json(
      { error: "Échec de la récupération de la conversation." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/ai/conversations/[id]
 * Auth-required — deletes a conversation (and all its messages, cascaded).
 *
 * Verifies ownership first (403 otherwise). Returns 200 on success.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  // --- Auth ---
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // --- Rate limit ---
  const limited = applyRateLimit(request, {
    ...RATE_LIMITS.DEFAULT,
    namespace: "ai:conversation-delete",
    key: session.user.id,
  });
  if (limited) return limited;

  try {
    const { id } = await context.params;

    const conversation = await db.aiConversation.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation introuvable." },
        { status: 404 },
      );
    }

    if (conversation.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Accès interdit à cette conversation." },
        { status: 403 },
      );
    }

    // Cascade delete will remove all AiMessage rows for this conversation
    // (defined as `onDelete: Cascade` in the Prisma schema).
    await db.aiConversation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/ai/conversations/[id]] Error:", error);
    return NextResponse.json(
      { error: "Échec de la suppression de la conversation." },
      { status: 500 },
    );
  }
}
