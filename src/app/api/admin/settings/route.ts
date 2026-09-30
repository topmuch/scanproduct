import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import {
  getSettings,
  setSetting,
  SETTING_KEYS,
} from "@/lib/settings";
import { resetEmailTransporter } from "@/lib/email";

/**
 * Site settings API for the SuperAdmin dashboard.
 *
 * ── GET /api/admin/settings ─────────────────────────────────────
 * Returns every editable general + SEO setting as a flat object.
 * Missing keys are returned with their "" default so the UI can bind
 * controlled inputs directly.
 *
 * ── PUT /api/admin/settings ─────────────────────────────────────
 * Body (JSON): any subset of the editable keys. Validates with zod,
 * upserts each provided key into the Setting table, writes ONE audit
 * log entry with the list of updated keys, and returns the saved object.
 *
 * NOTE: the favicon and the OpenGraph image are managed through their
 * dedicated multipart endpoints (/api/admin/settings/favicon and
 * /api/admin/settings/og-image) — they are returned read-only here.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every key the UI can read/write, grouped for clarity. */
const GENERAL_KEYS = [
  SETTING_KEYS.siteName,
  SETTING_KEYS.siteSlogan,
  SETTING_KEYS.siteUrl,
  SETTING_KEYS.contactEmail,
  SETTING_KEYS.contactPhone,
  SETTING_KEYS.timezone,
  SETTING_KEYS.defaultLanguage,
  SETTING_KEYS.siteAddress,
] as const;

const SEO_KEYS = [
  SETTING_KEYS.seoTitle,
  SETTING_KEYS.seoDescription,
  SETTING_KEYS.seoKeywords,
  SETTING_KEYS.ogImageUrl,
  SETTING_KEYS.googleVerification,
] as const;

const EMAIL_KEYS = [
  SETTING_KEYS.smtpHost,
  SETTING_KEYS.smtpPort,
  SETTING_KEYS.smtpUser,
  SETTING_KEYS.smtpPass,
  SETTING_KEYS.smtpSecure,
  SETTING_KEYS.smtpFrom,
] as const;

const NOTIF_KEYS = [
  SETTING_KEYS.notifSignup,
  SETTING_KEYS.notifPayment,
  SETTING_KEYS.notifTicket,
  SETTING_KEYS.notifSecurity,
  SETTING_KEYS.notifQuota,
  SETTING_KEYS.notifEmailRecipient,
] as const;

const EDITABLE_KEYS = [
  ...GENERAL_KEYS,
  ...SEO_KEYS,
  ...EMAIL_KEYS,
  ...NOTIF_KEYS,
];

/** Setting keys that require a transporter rebuild after an update. */
const SMTP_TRANSPORTER_KEYS: string[] = [...EMAIL_KEYS];

/** Trim-or-empty helper for optional string fields. */
const trimmed = z
  .string()
  .max(2000)
  .transform((s) => s.trim())
  .optional();

/** Boolean settings are stored as "true"/"false" strings (Setting.value is String). */
const boolSetting = z.enum(["true", "false"]).optional();

/** SMTP port: "" clears it, otherwise an integer 1–65535 (stored as string). */
const portSetting = z
  .union([z.literal(""), z.coerce.number().int().min(1).max(65535)])
  .optional()
  .transform((v) => (v === undefined ? undefined : String(v)));

const putSchema = z
  .object({
    siteName: trimmed,
    siteSlogan: trimmed,
    siteUrl: trimmed,
    contactEmail: z
      .union([z.literal(""), z.string().email()])
      .optional(),
    contactPhone: trimmed,
    timezone: trimmed,
    defaultLanguage: trimmed,
    siteAddress: trimmed,
    seoTitle: z.string().max(120).transform((s) => s.trim()).optional(),
    seoDescription: z
      .string()
      .max(320)
      .transform((s) => s.trim())
      .optional(),
    seoKeywords: z.string().max(2000).transform((s) => s.trim()).optional(),
    googleVerification: z
      .string()
      .max(200)
      .transform((s) => s.trim())
      .optional(),
    // ── SMTP ──────────────────────────────────────────────────────────────
    smtpHost: z.string().max(255).transform((s) => s.trim()).optional(),
    smtpPort: portSetting,
    smtpUser: z.string().max(255).transform((s) => s.trim()).optional(),
    smtpPass: z.string().max(255).transform((s) => s.trim()).optional(),
    smtpSecure: boolSetting,
    smtpFrom: z.string().max(320).transform((s) => s.trim()).optional(),
    // ── Admin notifications ───────────────────────────────────────────────
    notifSignup: boolSetting,
    notifPayment: boolSetting,
    notifTicket: boolSetting,
    notifSecurity: boolSetting,
    notifQuota: boolSetting,
    notifEmailRecipient: z
      .union([z.literal(""), z.string().email()])
      .optional(),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: "Aucun champ fourni.",
  });

function fieldError(result: { error: z.ZodError }): string {
  const issue = result.error.issues[0];
  const path = issue?.path?.join(".") ?? "";
  return path ? `${path} : ${issue.message}` : (issue?.message ?? "invalide");
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stored = await getSettings([...EDITABLE_KEYS]);

  // Bind-friendly defaults: absent keys become "".
  const result: Record<string, string> = {};
  for (const key of EDITABLE_KEYS) {
    result[key] = stored[key] ?? "";
  }

  return NextResponse.json({ settings: result });
}

export async function PUT(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requête invalide (JSON attendu)." },
      { status: 400 },
    );
  }

  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Validation échouée — ${fieldError(parsed)}` },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Validate siteUrl is a proper absolute http(s) URL when provided.
  if (data.siteUrl) {
    try {
      const u = new URL(data.siteUrl);
      if (!["http:", "https:"].includes(u.protocol)) {
        throw new Error("protocole invalide");
      }
    } catch {
      return NextResponse.json(
        {
          error:
            "siteUrl : URL invalide — utilisez une adresse absolue comme https://verifscan.com",
        },
        { status: 400 },
      );
    }
  }

  // Upsert each provided key; remember which ones changed for the audit log.
  const updatedKeys: string[] = [];
  try {
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      await setSetting(key, value);
      updatedKeys.push(key);
    }
  } catch (error) {
    console.error("[PUT /api/admin/settings] DB error:", error);
    return NextResponse.json(
      { error: "Erreur base de données lors de l'enregistrement." },
      { status: 500 },
    );
  }

  // SMTP settings changed → force sendEmail() to rebuild its transporter.
  if (updatedKeys.some((k) => SMTP_TRANSPORTER_KEYS.includes(k))) {
    resetEmailTransporter();
  }

  if (updatedKeys.length > 0) {
    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_SETTINGS",
          entity: "Setting",
          entityId: updatedKeys.join(","),
          metadata: JSON.stringify({ keys: updatedKeys }),
        },
      });
    } catch {
      // non-fatal — settings are saved, audit is best-effort
    }
  }

  // Return the fresh state (mirrors GET).
  const stored = await getSettings([...EDITABLE_KEYS]);
  const result: Record<string, string> = {};
  for (const key of EDITABLE_KEYS) {
    result[key] = stored[key] ?? "";
  }

  return NextResponse.json({
    settings: result,
    updatedKeys,
  });
}
