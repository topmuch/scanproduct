import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import {
  getSettings,
  setSetting,
  SETTING_KEYS,
} from "@/lib/settings";

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

const EDITABLE_KEYS = [...GENERAL_KEYS, ...SEO_KEYS];

/** Trim-or-empty helper for optional string fields. */
const trimmed = z
  .string()
  .max(2000)
  .transform((s) => s.trim())
  .optional();

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
