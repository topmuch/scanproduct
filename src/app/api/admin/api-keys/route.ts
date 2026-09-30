import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import {
  apiKeyPrefix,
  generateApiKey,
  hashApiKey,
} from "@/lib/api-keys";
import {
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * Clés API publique v1 — gestion SuperAdmin.
 *
 * ── GET /api/admin/api-keys ─────────────────────────────────────
 * Liste TOUTES les clés (actives + révoquées) SANS jamais exposer le hash
 * ni la clé complète — uniquement le préfixe masquable.
 *
 * ── POST /api/admin/api-keys { name } ───────────────────────────
 * Génère une nouvelle clé. La clé complète n'est retournée qu'UNE fois
 * (champ `key` de la réponse) — la DB ne garde que son SHA-256.
 * La clé est présentée masquée ensuite via `masked`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z
    .string()
    .min(2, "le libellé doit contenir au moins 2 caractères")
    .max(60, "le libellé ne peut pas dépasser 60 caractères")
    .transform((s) => s.trim()),
});

/** shape commune d'une clé côté UI (jamais de hash, jamais de clé complète). */
function toPublic(key: {
  id: string;
  name: string;
  prefix: string;
  active: boolean;
  lastUsedAt: Date | null;
  lastUsedIp: string | null;
  createdAt: Date;
  revokedAt: Date | null;
}) {
  return {
    id: key.id,
    name: key.name,
    masked: `${key.prefix}${"•".repeat(16)}`,
    active: key.active && !key.revokedAt,
    lastUsedAt: key.lastUsedAt,
    lastUsedIp: key.lastUsedIp,
    createdAt: key.createdAt,
    revokedAt: key.revokedAt,
  };
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const listKeys = () =>
    db.apiKey.findMany({ orderBy: { createdAt: "desc" } });

  let keys;
  try {
    keys = await listKeys();
  } catch (error) {
    if (!isTableMissingError(error)) throw error;
    const heal = await ensureArtisanTables();
    if (!heal.ok) {
      return NextResponse.json(
        { error: "Erreur base de données." },
        { status: 500 },
      );
    }
    keys = await listKeys();
  }

  return NextResponse.json({ keys: keys.map(toPublic) });
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
    return NextResponse.json(
      { error: `name : ${issue?.message ?? "invalide"}` },
      { status: 400 },
    );
  }

  // La clé complète n'existe que dans CETTE réponse — jamais stockée en clair.
  const fullKey = generateApiKey();

  const createKey = () =>
    db.apiKey.create({
      data: {
        name: parsed.data.name,
        prefix: apiKeyPrefix(fullKey),
        keyHash: hashApiKey(fullKey),
      },
    });

  let key;
  try {
    key = await createKey();
  } catch (error) {
    if (!isTableMissingError(error)) throw error;
    const heal = await ensureArtisanTables();
    if (!heal.ok) {
      return NextResponse.json(
        { error: "Erreur base de données." },
        { status: 500 },
      );
    }
    key = await createKey();
  }

  try {
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_API_KEY",
        entity: "ApiKey",
        entityId: key.id,
        metadata: JSON.stringify({ name: key.name, prefix: key.prefix }),
      },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json(
    {
      key: { ...toPublic(key), key: fullKey },
      message:
        "Copiez cette clé maintenant — elle ne sera plus jamais affichée.",
    },
    { status: 201 },
  );
}
