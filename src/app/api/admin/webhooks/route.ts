import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { WEBHOOK_EVENTS, generateWebhookSecret } from "@/lib/webhooks";
import {
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * Webhooks sortants — gestion SuperAdmin.
 *
 * ── GET /api/admin/webhooks ─────────────────────────────────────
 * Liste tous les webhooks. Le secret est masqué (whsec_••••) — il n'est
 * affiché EN CLAIR qu'à la création (et lors d'une régénération).
 *
 * ── POST /api/admin/webhooks { url, events } ────────────────────
 * Crée un webhook : url https(s) obligatoire, events = liste parmi
 * WEBHOOK_EVENTS ou ["*"]. Retourne le secret EN CLAIR une seule fois.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eventValues = [...WEBHOOK_EVENTS, "*"] as const;

/**
 * URL http(s) valide — validation 100% manuelle (try/catch sur new URL) :
 * en zod v4, `.url()` ne rejette plus « pas-une-url » et le refine final
 * crashait en 500 au lieu de renvoyer 400.
 */
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

const createSchema = z.object({
  url: httpUrl,
  events: z
    .array(z.enum(eventValues))
    .min(1, "sélectionnez au moins un événement")
    .max(eventValues.length),
});

function toPublic(w: {
  id: string;
  url: string;
  events: string;
  secret: string;
  active: boolean;
  createdAt: Date;
}) {
  return {
    id: w.id,
    url: w.url,
    events: w.events.split(",").map((s) => s.trim()).filter(Boolean),
    secretMasked: `${w.secret.slice(0, 6)}${"•".repeat(12)}`,
    active: w.active,
    createdAt: w.createdAt,
  };
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const listWebhooks = () =>
    db.webhook.findMany({ orderBy: { createdAt: "desc" } });

  let webhooks;
  try {
    webhooks = await listWebhooks();
  } catch (error) {
    if (!isTableMissingError(error)) throw error;
    const heal = await ensureArtisanTables();
    if (!heal.ok) {
      return NextResponse.json(
        { error: "Erreur base de données." },
        { status: 500 },
      );
    }
    webhooks = await listWebhooks();
  }

  return NextResponse.json({ webhooks: webhooks.map(toPublic) });
}

export async function POST(request: NextRequest) {
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path?.join(".") ?? "";
    return NextResponse.json(
      { error: `${path ? `${path} : ` : ""}${issue?.message ?? "invalide"}` },
      { status: 400 },
    );
  }

  const secret = generateWebhookSecret();
  const eventsCsv = parsed.data.events.join(",");

  const createWebhook = () =>
    db.webhook.create({
      data: { url: parsed.data.url, events: eventsCsv, secret },
    });

  let webhook;
  try {
    webhook = await createWebhook();
  } catch (error) {
    if (!isTableMissingError(error)) throw error;
    const heal = await ensureArtisanTables();
    if (!heal.ok) {
      return NextResponse.json(
        { error: "Erreur base de données." },
        { status: 500 },
      );
    }
    webhook = await createWebhook();
  }

  try {
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_WEBHOOK",
        entity: "Webhook",
        entityId: webhook.id,
        metadata: JSON.stringify({ url: webhook.url, events: eventsCsv }),
      },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json(
    {
      webhook: toPublic(webhook),
      secret,
      message:
        "Copiez le secret maintenant — il ne sera plus jamais affiché.",
    },
    { status: 201 },
  );
}
