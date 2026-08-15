import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import {
  createNotification,
  listNotifications,
  getUnreadCount,
  type NotificationType,
  type NotificationSeverity,
} from "@/lib/notifications";
import { parseJsonArray, parseJsonObject } from "@/lib/utils";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Allowed values for test-notification creation (kept in sync with the
// NotificationType / NotificationSeverity unions exposed by @/lib/notifications).
// ---------------------------------------------------------------------------
const VALID_TYPES: NotificationType[] = [
  "lot_recall",
  "quota_warning",
  "quota_exceeded",
  "new_scan",
  "weekly_report",
  "system",
  "ticket_update",
  "subscription",
];
const VALID_SEVERITIES: NotificationSeverity[] = ["info", "success", "warning", "critical"];

/**
 * GET /api/notifications
 * Auth-required (FABRICANT or SUPERADMIN) — lists the authenticated user's
 * notifications, most recent first.
 *
 * Query params:
 *   limit       — number of items (default 50, max 100)
 *   offset      — pagination offset (default 0)
 *   unreadOnly  — "true" to filter only unread items
 *
 * Response:
 *   { notifications: [...], unreadCount: number, total: number }
 *
 * Each notification item is normalized so that `data` and `channels` are
 * already-parsed JSON values (not raw strings).
 */
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const sp = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(sp.get("limit") || "50", 10) || 50, 1), 100);
    const offset = Math.max(parseInt(sp.get("offset") || "0", 10) || 0, 0);
    const unreadOnly = sp.get("unreadOnly") === "true";

    const [rawNotifications, unreadCount, total] = await Promise.all([
      listNotifications(token.sub, { limit, offset, unreadOnly }),
      getUnreadCount(token.sub),
      db.notification.count({ where: { userId: token.sub } }),
    ]);

    // Normalize each notification: parse the JSON-encoded `data` and
    // `channels` columns into real objects/arrays so the client doesn't
    // have to do it.
    const notifications = rawNotifications.map((n: any) => ({
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
    }));

    return NextResponse.json({ notifications, unreadCount, total });
  } catch (error) {
    console.error("[GET /api/notifications] Error:", error);
    return NextResponse.json(
      { error: "Échec de la récupération des notifications" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/notifications
 * Auth-required — creates a "test" notification for the authenticated user
 * themselves (no admin escalation possible: the recipient is always the
 * caller). Useful for the notification center's "Envoyer une notification
 * de test" button.
 *
 * Body (all optional unless noted):
 *   type      — NotificationType (default "system")
 *   title     — string (required)
 *   message   — string (required)
 *   severity  — NotificationSeverity (default "info")
 *
 * Response:
 *   { success: true, notificationId, emailed, emailStatus }
 *
 * Informal rate-limit observability: if the user has created more than 10
 * test notifications in the past hour, we log a console.warn (no enforcement).
 */
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate required fields.
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Paramètres invalides : title requis" }, { status: 400 });
    }
    if (typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json({ error: "Paramètres invalides : message requis" }, { status: 400 });
    }

    // Validate type / severity if provided.
    const type: NotificationType =
      typeof body.type === "string" && (VALID_TYPES as string[]).includes(body.type)
        ? (body.type as NotificationType)
        : "system";
    const severity: NotificationSeverity =
      typeof body.severity === "string" && (VALID_SEVERITIES as string[]).includes(body.severity)
        ? (body.severity as NotificationSeverity)
        : "info";

    // Informal rate-limit observability: count how many notifications the
    // user created in the past hour, and warn if > 10. No enforcement —
    // the request still goes through.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    try {
      const recentCount = await db.notification.count({
        where: { userId: token.sub, createdAt: { gte: oneHourAgo } },
      });
      if (recentCount > 10) {
        console.warn(
          `[POST /api/notifications] User ${token.sub} has created ${recentCount} notifications in the last hour (rate-limit observability, not enforced).`,
        );
      }
    } catch (countErr) {
      // Don't let the rate-limit check block notification creation.
      console.warn("[POST /api/notifications] Rate-limit check failed:", countErr);
    }

    const result = await createNotification({
      userId: token.sub,
      type,
      title: body.title.trim(),
      message: body.message.trim(),
      severity,
    });

    return NextResponse.json(
      {
        success: true,
        notificationId: result.notificationId,
        emailed: result.emailed,
        emailStatus: result.emailStatus,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/notifications] Error:", error);
    return NextResponse.json(
      { error: "Échec de la création de la notification" },
      { status: 500 },
    );
  }
}
