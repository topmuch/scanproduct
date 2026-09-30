import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import {
  WEBHOOK_EVENTS,
  generateWebhookSecret,
} from "@/lib/webhooks";
import {
  ensureArtisanTables,
  isRecordMissingError,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * ── PATCH /api/admin/webhooks/[id] { url?, events?, active?, regenerateSecret? }
 * Édite un webhook. `regenerateSecret: true` renvoie un NOUVEAU secret en
 * clair (l'ancien cesse immédiatement de valider les signatures).
 *
 * ── DELETE /api/admin/webhooks/[id]
 * Supprime DÉFINITIVEMENT le webhook.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eventValues = [...WEBHOOK_EVENTS, "*"] as const;

/** URL http(s) valide — validation manuelle try/catch (zod v4 : .url() inopérant). */
const httpUrl = z
  .string()
  .max(500)
  .refine((u) => {
    try {
      const parsed = new URL(u);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "URL invalide — http(s) attendu");

const patchSchema = z.object({
  url: httpUrl.optional(),
  events: z
    .array(z.enum(eventValues))
    .min(1, "sélectionnez au moins un événement")
    .max(eventValues.length)
    .optional(),
  active: z.boolean().optional(),
  regenerateSecret: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requête invalide (JSON attendu)." },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path?.join(".") ?? "";
    return NextResponse.json(
      { error: `${path ? `${path} : ` : ""}${issue?.message ?? "invalide"}` },
      { status: 400 },
    );
  }

  const data: {
    url?: string;
    events?: string;
    active?: boolean;
    secret?: string;
  } = {};
  if (parsed.data.url !== undefined) data.url = parsed.data.url;
  if (parsed.data.events !== undefined)
    data.events = parsed.data.events.join(",");
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  let newSecret: string | null = null;
  if (parsed.data.regenerateSecret) {
    newSecret = generateWebhookSecret();
    data.secret = newSecret;
  }

  const patch = () => db.webhook.update({ where: { id }, data });

  let webhook;
  try {
    webhook = await patch();
  } catch (error) {
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (!heal.ok) {
        return NextResponse.json(
          { error: "Erreur base de données." },
          { status: 500 },
        );
      }
      try {
        webhook = await patch();
      } catch {
        return NextResponse.json(
          { error: "Webhook introuvable." },
          { status: 404 },
        );
      }
    } else if (isRecordMissingError(error)) {
      return NextResponse.json(
        { error: "Webhook introuvable." },
        { status: 404 },
      );
    } else {
      throw error;
    }
  }

  try {
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_WEBHOOK",
        entity: "Webhook",
        entityId: webhook.id,
        metadata: JSON.stringify({ fields: Object.keys(data) }),
      },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({
    webhook: {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events.split(",").map((s) => s.trim()).filter(Boolean),
      secretMasked: `${webhook.secret.slice(0, 6)}${"•".repeat(12)}`,
      active: webhook.active,
      createdAt: webhook.createdAt,
    },
    ...(newSecret ? { secret: newSecret } : {}),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const remove = () => db.webhook.delete({ where: { id } });

  let webhook;
  try {
    webhook = await remove();
  } catch (error) {
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (!heal.ok) {
        return NextResponse.json(
          { error: "Erreur base de données." },
          { status: 500 },
        );
      }
      try {
        webhook = await remove();
      } catch {
        return NextResponse.json(
          { error: "Webhook introuvable." },
          { status: 404 },
        );
      }
    } else if (isRecordMissingError(error)) {
      return NextResponse.json(
        { error: "Webhook introuvable." },
        { status: 404 },
      );
    } else {
      throw error;
    }
  }

  try {
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_WEBHOOK",
        entity: "Webhook",
        entityId: webhook.id,
        metadata: JSON.stringify({ url: webhook.url }),
      },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, id: webhook.id });
}
