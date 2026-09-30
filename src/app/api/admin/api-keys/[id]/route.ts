import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import {
  ensureArtisanTables,
  isRecordMissingError,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * ── DELETE /api/admin/api-keys/[id] ─────────────────────────────
 * Révoque une clé API (soft-revoke : active=false + revokedAt). La ligne est
 * conservée pour l'historique d'audit et les traces d'usage (lastUsedAt/IP).
 * Une clé révoquée renvoie 403 sur /api/v1/* immédiatement.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const revoke = () =>
    db.apiKey.update({
      where: { id },
      data: { active: false, revokedAt: new Date() },
    });

  let key;
  try {
    key = await revoke();
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
        key = await revoke();
      } catch {
        return NextResponse.json({ error: "Clé introuvable." }, { status: 404 });
      }
    } else if (isRecordMissingError(error)) {
      return NextResponse.json({ error: "Clé introuvable." }, { status: 404 });
    } else {
      throw error;
    }
  }

  try {
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "REVOKE_API_KEY",
        entity: "ApiKey",
        entityId: key.id,
        metadata: JSON.stringify({ name: key.name, prefix: key.prefix }),
      },
    });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true, id: key.id });
}
