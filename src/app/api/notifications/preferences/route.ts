import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getOrCreateNotificationPreference,
  updateNotificationPreference,
} from "@/lib/notifications";
import { parseJsonObject } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * Shape a raw NotificationPreference row (with JSON-encoded `prefs` string)
 * into the API response shape.
 */
function shapePreference(p: any) {
  return {
    emailEnabled: p.emailEnabled,
    smsEnabled: p.smsEnabled,
    pushEnabled: p.pushEnabled,
    prefs: parseJsonObject<Record<string, any>>(p.prefs) ?? {},
  };
}

/**
 * GET /api/notifications/preferences
 * Auth-required — returns the user's notification preferences. Creates a
 * default row on first access (lazy initialization handled by the lib).
 *
 * Response: { emailEnabled, smsEnabled, pushEnabled, prefs }
 */
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const pref = await getOrCreateNotificationPreference(token.sub);
    return NextResponse.json(shapePreference(pref));
  } catch (error) {
    console.error("[GET /api/notifications/preferences] Error:", error);
    return NextResponse.json(
      { error: "Échec de la récupération des préférences" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/notifications/preferences
 * Auth-required — partially updates the user's notification preferences.
 *
 * Body (all optional):
 *   emailEnabled — boolean (global email opt-in)
 *   smsEnabled   — boolean (global SMS opt-in)
 *   pushEnabled  — boolean (in-app opt-in)
 *   prefs        — Record<string, { in_app?: boolean; email?: boolean; sms?: boolean }>
 *                  per-notification-type channel overrides
 *
 * Response: same shape as GET.
 */
export async function PATCH(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate the top-level fields. Unknown keys are ignored.
    const updates: {
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      pushEnabled?: boolean;
      prefs?: Record<string, any>;
    } = {};

    if (typeof body.emailEnabled === "boolean") updates.emailEnabled = body.emailEnabled;
    if (typeof body.smsEnabled === "boolean") updates.smsEnabled = body.smsEnabled;
    if (typeof body.pushEnabled === "boolean") updates.pushEnabled = body.pushEnabled;

    if (body.prefs !== undefined) {
      if (typeof body.prefs !== "object" || body.prefs === null || Array.isArray(body.prefs)) {
        return NextResponse.json(
          { error: "Paramètres invalides : prefs doit être un objet" },
          { status: 400 },
        );
      }
      // Sanitize each per-type entry — only keep known channel booleans.
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(body.prefs as Record<string, any>)) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const entry: { in_app?: boolean; email?: boolean; sms?: boolean } = {};
          if (typeof value.in_app === "boolean") entry.in_app = value.in_app;
          if (typeof value.email === "boolean") entry.email = value.email;
          if (typeof value.sms === "boolean") entry.sms = value.sms;
          sanitized[key] = entry;
        }
      }
      updates.prefs = sanitized;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Paramètres invalides : aucun champ à mettre à jour" },
        { status: 400 },
      );
    }

    const updated = await updateNotificationPreference(token.sub, updates);
    return NextResponse.json(shapePreference(updated));
  } catch (error) {
    console.error("[PATCH /api/notifications/preferences] Error:", error);
    return NextResponse.json(
      { error: "Échec de la mise à jour des préférences" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/notifications/preferences
 * Auth-required — alias for PATCH (full-replace semantics are handled at
 * the lib level: the same `updateNotificationPreference` helper is used,
 * which merges the provided prefs object into the existing JSON column).
 */
export async function PUT(request: NextRequest) {
  // Delegate to PATCH so behavior stays identical.
  return PATCH(request);
}
