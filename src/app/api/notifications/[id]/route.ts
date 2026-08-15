import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { markAsRead, deleteNotification } from "@/lib/notifications";
import { parseJsonArray, parseJsonObject } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * Shape a raw notification row (with JSON-encoded `data` / `channels`
 * strings) into the API response shape used by all notification endpoints.
 */
function shapeNotification(n: any) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    severity: n.severity,
    data: parseJsonObject(n.data),
    channels: parseJsonArray<string>(n.channels),
    readAt: n.readAt,
    createdAt: n.createdAt,
    emailedAt: n.emailedAt,
  };
}

/**
 * PATCH /api/notifications/[id]
 * Auth-required — marks a single notification as read (or unread).
 *
 * Body:
 *   read — boolean (default true). When `false`, the notification's
 *          `readAt` is cleared (marked as unread).
 *
 * Security: the notification must belong to the authenticated user.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Parse body — tolerate empty bodies (default to read=true).
    let body: { read?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      // Empty / invalid JSON body → default behavior (read=true).
    }
    const wantRead = body.read !== false;

    if (wantRead) {
      // markAsRead returns either `boolean` (per spec) or `{ count: number }`
      // (per the actual lib implementation). Handle both shapes robustly.
      const res: unknown = await markAsRead(id, token.sub);
      const success =
        typeof res === "boolean" ? res : ((res as { count?: number } | null)?.count ?? 0) > 0;
      if (!success) {
        return NextResponse.json(
          { error: "Notification non trouvée" },
          { status: 404 },
        );
      }
    } else {
      // Mark as unread — direct db update with explicit userId check so
      // we never accidentally clear readAt on someone else's notification.
      const existing = await db.notification.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!existing || existing.userId !== token.sub) {
        return NextResponse.json(
          { error: "Notification non trouvée" },
          { status: 404 },
        );
      }
      await db.notification.update({
        where: { id },
        data: { readAt: null },
      });
    }

    // Re-fetch the (updated) notification so we can return it in the
    // same shape as the list endpoint.
    const updated = await db.notification.findUnique({ where: { id } });
    if (!updated) {
      // Should not happen since we just updated it, but be defensive.
      return NextResponse.json(
        { error: "Notification non trouvée" },
        { status: 404 },
      );
    }

    return NextResponse.json(shapeNotification(updated));
  } catch (error) {
    console.error("[PATCH /api/notifications/[id]] Error:", error);
    return NextResponse.json(
      { error: "Échec de la mise à jour de la notification" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/notifications/[id]
 * Auth-required — deletes a notification owned by the authenticated user.
 *
 * Response: { success: true }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // deleteNotification returns either `boolean` (per spec) or
    // `{ count: number }` (per the actual lib implementation).
    const res: unknown = await deleteNotification(id, token.sub);
    const success =
      typeof res === "boolean" ? res : ((res as { count?: number } | null)?.count ?? 0) > 0;
    if (!success) {
      return NextResponse.json(
        { error: "Notification non trouvée" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/notifications/[id]] Error:", error);
    return NextResponse.json(
      { error: "Échec de la suppression de la notification" },
      { status: 500 },
    );
  }
}
