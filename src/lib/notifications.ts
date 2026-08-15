// ============================================================================
// VerifScan — Notification dispatch service
// ============================================================================
// Pure server-side module. No React, no API routes.
//
// Responsibilities:
//   - Create in-app Notification rows for a user (the notification center).
//   - Optionally fan-out to email (and SMS — stubbed for future).
//   - Respect per-user, per-type NotificationPreference overrides.
//   - Provide helpers for the notification bell UI (unread count, list,
//     mark-as-read, delete).
//
// Email failures are isolated: a failed sendEmail() call never fails the
// notification creation — the Notification row is still created, and the
// emailedAt/emailedTo fields stay null so a future retry job can pick it up.
//
// Used by:
//   - API routes (POST /api/notifications, GET /api/notifications, …)
//   - Other lib modules (plan-limits.ts fires quota_warning / quota_exceeded)
//   - Future workers (lot_recall fan-out, weekly_report digest, etc.)
// ============================================================================

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { parseJsonObject } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | "lot_recall"
  | "quota_warning"
  | "quota_exceeded"
  | "new_scan"
  | "weekly_report"
  | "system"
  | "ticket_update"
  | "subscription";

export type NotificationSeverity = "info" | "success" | "warning" | "critical";

export type NotificationChannel = "in_app" | "email" | "sms";

interface ChannelPrefs {
  in_app: boolean;
  email: boolean;
  sms: boolean;
}

/**
 * Default per-type channel preferences, applied when a user has no
 * NotificationPreference row yet (or when a type is missing from their prefs).
 *
 *   - in_app is always on (notifications are visible in the bell)
 *   - email is on for everything except new_scan (too noisy for milestones)
 *   - sms is off everywhere (SMS gateway not yet wired)
 */
export const DEFAULT_PREFS: Record<NotificationType, ChannelPrefs> = {
  lot_recall: { in_app: true, email: true, sms: false },
  quota_warning: { in_app: true, email: true, sms: false },
  quota_exceeded: { in_app: true, email: true, sms: false },
  new_scan: { in_app: true, email: false, sms: false },
  weekly_report: { in_app: true, email: true, sms: false },
  system: { in_app: true, email: true, sms: false },
  ticket_update: { in_app: true, email: true, sms: false },
  subscription: { in_app: true, email: true, sms: false },
};

export interface UserPrefs {
  /** Global email opt-in (master switch). */
  emailEnabled: boolean;
  /** Global SMS opt-in (master switch — currently unused, SMS not wired). */
  smsEnabled: boolean;
  /** Global in-app opt-in (master switch). */
  pushEnabled: boolean;
  /** Per-type channel prefs (merged with DEFAULT_PREFS). */
  prefs: Record<NotificationType, ChannelPrefs>;
}

// ---------------------------------------------------------------------------
// Preference helpers
// ---------------------------------------------------------------------------

/**
 * Merge stored prefs (partial) over DEFAULT_PREFS so any missing type
 * falls back to the safe default.
 */
function mergePrefs(stored: Record<string, any> | null): Record<NotificationType, ChannelPrefs> {
  const merged: Record<NotificationType, ChannelPrefs> = { ...DEFAULT_PREFS };
  if (!stored || typeof stored !== "object") return merged;
  (Object.keys(merged) as NotificationType[]).forEach((type) => {
    const s = stored[type];
    if (s && typeof s === "object") {
      merged[type] = {
        in_app: typeof s.in_app === "boolean" ? s.in_app : merged[type].in_app,
        email: typeof s.email === "boolean" ? s.email : merged[type].email,
        sms: typeof s.sms === "boolean" ? s.sms : merged[type].sms,
      };
    }
  });
  return merged;
}

/**
 * Fetch a user's NotificationPreference row, creating it on first access with
 * the default prefs. Returns the merged prefs object (master toggles + per-type).
 *
 * Safe: returns a default-shaped object on any DB error so the caller can
 * continue (e.g. createNotification always proceeds with at least in_app).
 */
export async function getUserPrefs(userId: string): Promise<UserPrefs> {
  try {
    const row = await getOrCreateNotificationPreference(userId);
    const stored = parseJsonObject<Record<string, any>>(row.prefs);
    return {
      emailEnabled: row.emailEnabled,
      smsEnabled: row.smsEnabled,
      pushEnabled: row.pushEnabled,
      prefs: mergePrefs(stored),
    };
  } catch (err) {
    console.error("[notifications] getUserPrefs failed:", err);
    return {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      prefs: { ...DEFAULT_PREFS },
    };
  }
}

/**
 * Find a user's NotificationPreference row, or create one with default prefs
 * if none exists yet (upsert-style first-access pattern).
 *
 * Exposed for API routes (GET/PATCH /api/notifications/preferences).
 */
export async function getOrCreateNotificationPreference(userId: string) {
  const existing = await db.notificationPreference.findFirst({
    where: { userId },
  });
  if (existing) return existing;

  return db.notificationPreference.create({
    data: {
      userId,
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      prefs: JSON.stringify(DEFAULT_PREFS),
    },
  });
}

/**
 * Upsert a user's NotificationPreference row with the provided updates.
 *
 *   - Master toggles (emailEnabled / smsEnabled / pushEnabled) are optional
 *     booleans; only the provided ones are changed.
 *   - `prefs` is optional; when provided, it REPLACES the per-type prefs JSON
 *     (callers should send the full merged object).
 *
 * Returns the updated/created row.
 */
export async function updateNotificationPreference(
  userId: string,
  updates: {
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    pushEnabled?: boolean;
    prefs?: Record<string, any>;
  },
): Promise<{ id: string; userId: string; emailEnabled: boolean; smsEnabled: boolean; pushEnabled: boolean; prefs: string; updatedAt: Date }> {
  // Ensure a row exists.
  await getOrCreateNotificationPreference(userId);

  const data: Record<string, unknown> = {};
  if (typeof updates.emailEnabled === "boolean") data.emailEnabled = updates.emailEnabled;
  if (typeof updates.smsEnabled === "boolean") data.smsEnabled = updates.smsEnabled;
  if (typeof updates.pushEnabled === "boolean") data.pushEnabled = updates.pushEnabled;
  if (updates.prefs && typeof updates.prefs === "object") {
    data.prefs = JSON.stringify(updates.prefs);
  }

  // updateMany + return: Prisma SQLite supports upsert via findFirst-or-create,
  // but the simplest path here is update by unique userId.
  const updated = await db.notificationPreference.update({
    where: { userId },
    data,
  });
  return updated;
}

// ---------------------------------------------------------------------------
// Main dispatch function
// ---------------------------------------------------------------------------

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  /** Stored as JSON on the Notification row (contextual payload). */
  data?: Record<string, unknown>;
  /**
   * Override the default channels. If omitted, channels are derived from the
   * user's per-type prefs + master toggles. If provided, the final set is the
   * intersection of the requested channels and what the user allows.
   */
  channels?: NotificationChannel[];
}

export interface CreateNotificationResult {
  notificationId: string;
  emailed: boolean;
  emailStatus?: "sent" | "failed" | "skipped";
}

/**
 * Create a notification for a user, then optionally fan-out to email.
 *
 * Behaviour:
 *   1. Fetch the user's prefs (creating the row on first access if needed).
 *   2. Compute the effective channels:
 *        - For each of in_app / email / sms, the per-type pref must be true
 *          AND the corresponding master toggle must be on.
 *        - If `input.channels` is provided, intersect with the above.
 *   3. Create the Notification row (always — even if no channels remain, so
 *      the user has an audit trail).
 *   4. If "email" is in the effective channels, fetch the user's email and
 *      call sendEmail. Email failures are caught and DO NOT fail the
 *      notification creation. emailedAt/emailedTo are set only on success or
 *      skip (not on failure → leaves room for retry).
 *   5. Return `{ notificationId, emailed, emailStatus }`.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<CreateNotificationResult> {
  const { userId, type, title, message } = input;
  const severity: NotificationSeverity = input.severity ?? "info";
  const dataJson = JSON.stringify(input.data ?? {});

  // 1) Fetch prefs (safe — never throws, defaults on error).
  const prefs = await getUserPrefs(userId);

  // 2) Compute effective channels.
  const typePrefs = prefs.prefs[type] ?? DEFAULT_PREFS[type];
  const allowedByPrefs: NotificationChannel[] = [];
  if (typePrefs.in_app && prefs.pushEnabled) allowedByPrefs.push("in_app");
  if (typePrefs.email && prefs.emailEnabled) allowedByPrefs.push("email");
  if (typePrefs.sms && prefs.smsEnabled) allowedByPrefs.push("sms");

  let effectiveChannels: NotificationChannel[];
  if (input.channels && input.channels.length > 0) {
    effectiveChannels = input.channels.filter((c) => allowedByPrefs.includes(c));
  } else {
    effectiveChannels = allowedByPrefs;
  }

  // 3) Create the Notification row.
  const notification = await db.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      severity,
      data: dataJson,
      channels: JSON.stringify(effectiveChannels),
    },
  });

  // 4) Optional email fan-out.
  let emailed = false;
  let emailStatus: "sent" | "failed" | "skipped" | undefined;

  if (effectiveChannels.includes("email")) {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      const to = user?.email;
      if (!to) {
        // No email on file — silently skip (not a failure, just nothing to do).
        emailStatus = "skipped";
      } else {
        const html = renderNotificationEmail(title, message, severity);
        const result = await sendEmail({
          to,
          subject: title,
          html,
          text: message,
          userId,
        });

        emailed = result.success;
        emailStatus = result.status;

        // Only stamp emailedAt/emailedTo on success or skip — leave them
        // null on failure so a retry job can pick it up later.
        if (result.success) {
          try {
            await db.notification.update({
              where: { id: notification.id },
              data: {
                emailedAt: new Date(),
                emailedTo: to,
              },
            });
          } catch (err) {
            console.error("[notifications] Failed to stamp emailedAt:", err);
          }
        }
      }
    } catch (err) {
      // sendEmail itself never throws, but the user lookup / DB update might.
      // Isolate the failure — the Notification row is still created.
      console.error(
        `[notifications] Email fan-out failed for notification ${notification.id}:`,
        err,
      );
      emailed = false;
      emailStatus = "failed";
    }
  }

  return {
    notificationId: notification.id,
    emailed,
    emailStatus,
  };
}

// ---------------------------------------------------------------------------
// Read helpers (notification bell UI)
// ---------------------------------------------------------------------------

/**
 * Count a user's unread notifications (readAt is null).
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    return await db.notification.count({
      where: { userId, readAt: null },
    });
  } catch (err) {
    console.error("[notifications] getUnreadCount failed:", err);
    return 0;
  }
}

/**
 * List a user's notifications, newest first.
 *
 * Options:
 *   - limit      (default 50)
 *   - offset     (default 0)
 *   - unreadOnly (default false)
 */
export async function listNotifications(
  userId: string,
  opts?: { limit?: number; offset?: number; unreadOnly?: boolean },
) {
  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;
  const where: Record<string, unknown> = { userId };
  if (opts?.unreadOnly) where.readAt = null;

  try {
    return await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  } catch (err) {
    console.error("[notifications] listNotifications failed:", err);
    return [];
  }
}

/**
 * Mark a single notification as read. Security: only updates if the row
 * belongs to `userId` — otherwise returns 0 (no row touched).
 */
export async function markAsRead(notificationId: string, userId: string) {
  try {
    return await db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { readAt: new Date() },
    });
  } catch (err) {
    console.error("[notifications] markAsRead failed:", err);
    return { count: 0 };
  }
}

/**
 * Mark all unread notifications for a user as read.
 */
export async function markAllRead(userId: string) {
  try {
    return await db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  } catch (err) {
    console.error("[notifications] markAllRead failed:", err);
    return { count: 0 };
  }
}

/**
 * Delete a single notification. Security: only deletes if the row belongs to
 * `userId` — otherwise returns 0 (no row touched).
 */
export async function deleteNotification(notificationId: string, userId: string) {
  try {
    return await db.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  } catch (err) {
    console.error("[notifications] deleteNotification failed:", err);
    return { count: 0 };
  }
}

// ---------------------------------------------------------------------------
// Email template (inline-styled, mobile-friendly)
// ---------------------------------------------------------------------------

/**
 * Render a simple HTML wrapper for a notification email.
 *
 * Layout (all inline styles for email client compatibility):
 *   - Top blue band (#2563EB) with "VerifScan" wordmark
 *   - Severity-tinted content card (warning=amber, critical=red,
 *     success=green, info=gray)
 *   - Title + message body
 *   - Footer: "© 2026 VerifScan — La vérité au bout du scan"
 *
 * Responsive: max-width 560px container, viewport meta assumed by client.
 */
export function renderNotificationEmail(
  title: string,
  message: string,
  severity?: string,
): string {
  const sev = (severity || "info") as NotificationSeverity;

  const accentColor =
    sev === "critical"
      ? "#DC2626"
      : sev === "warning"
        ? "#F59E0B"
        : sev === "success"
          ? "#10B981"
          : "#2563EB";

  const accentBg =
    sev === "critical"
      ? "#FEF2F2"
      : sev === "warning"
        ? "#FFFBEB"
        : sev === "success"
          ? "#ECFDF5"
          : "#EFF6FF";

  // Escape HTML special chars in user-provided content to avoid breaking the
  // email layout or injecting markup.
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const safeTitle = esc(title);
  const safeMessage = esc(message).replace(/\n/g, "<br/>");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9FAFB;min-height:100%;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header band -->
          <tr>
            <td style="background-color:#2563EB;padding:20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.01em;">
                    VerifScan
                  </td>
                  <td align="right" style="font-size:12px;color:#DBEAFE;">
                    La vérité au bout du scan
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Severity accent strip -->
          <tr>
            <td style="background-color:${accentColor};height:4px;line-height:4px;font-size:4px;">&nbsp;</td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 24px 8px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${accentBg};border-radius:8px;">
                <tr>
                  <td style="padding:12px 16px;font-size:12px;font-weight:600;color:${accentColor};text-transform:uppercase;letter-spacing:0.06em;">
                    ${sev === "critical" ? "Alerte critique" : sev === "warning" ? "Avertissement" : sev === "success" ? "Succès" : "Information"}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 4px 24px;">
              <h1 style="margin:0 0 12px 0;font-size:20px;line-height:1.3;font-weight:700;color:#111827;">
                ${safeTitle}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 32px 24px;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
                ${safeMessage}
              </p>
            </td>
          </tr>
          <!-- CTA spacer (no button — notifications are informational) -->
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E5E7EB;">
                <tr>
                  <td style="padding-top:16px;font-size:13px;color:#6B7280;">
                    Connectez-vous à votre tableau de bord VerifScan pour plus de détails.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#F9FAFB;padding:20px 24px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:12px;color:#6B7280;text-align:center;line-height:1.5;">
                © 2026 VerifScan — La vérité au bout du scan
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-size:11px;color:#9CA3AF;text-align:center;">
          Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
