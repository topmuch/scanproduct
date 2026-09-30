import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import {
  asciiHeader,
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * SuperAdmin — suppression DÉFINITIVE d'un pack de QR codes artisans
 * (demande utilisateur : « ajoute un bouton supprimer » — pour nettoyer
 * les anciens packs, ex. données de test ou packs cassés).
 *
 * DELETE /api/admin/packs/<packId>
 *   → supprime le pack ET toutes ses données liées, dans l'ordre sûr :
 *     scans → avis → étiquettes (lots) → pack. Les Batch restent intacts
 *     (le pack disparaît simplement de la liste).
 *
 * Suppression EXPLICITE (deleteMany en transaction) plutôt que de compter
 * sur les FK ON DELETE CASCADE : les DB de prod créées par d'anciens DDL
 * n'ont pas toujours les contraintes — Prisma/SQLite n'applique la cascade
 * que si la FK existe réellement dans la table.
 *
 * AUTO-RÉPARATION P2021/P2022 : heal puis rejeu UNE fois (même stratégie
 * que PATCH …/product).
 */

type RouteCtx = { params: Promise<{ packId: string }> };

/** Supprime le pack et tout ce qui pend à ses lots. Retourne les compteurs. */
async function deletePackCascade(packId: string) {
  return db.$transaction(async (tx) => {
    const pack = await tx.pack.findUnique({
      where: { id: packId },
      select: { id: true, masterQrCode: true, quantity: true, lots: { select: { id: true } } },
    });
    if (!pack) return null;

    const lotIds = pack.lots.map((l) => l.id);
    const scans = lotIds.length
      ? await tx.artisanScan.deleteMany({ where: { lotId: { in: lotIds } } })
      : { count: 0 };
    const reviews = lotIds.length
      ? await tx.artisanReview.deleteMany({ where: { lotId: { in: lotIds } } })
      : { count: 0 };
    const lots = await tx.preActivatedLot.deleteMany({ where: { packId } });
    await tx.pack.delete({ where: { id: packId } });

    return {
      masterQrCode: pack.masterQrCode,
      lotsDeleted: lots.count,
      scansDeleted: scans.count,
      reviewsDeleted: reviews.count,
    };
  });
}

export async function DELETE(_request: NextRequest, ctx: RouteCtx) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { packId } = await ctx.params;

  const run = async () => {
    const result = await deletePackCascade(packId);
    if (!result) {
      return { status: 404, body: { error: "Pack introuvable" } };
    }

    await db.auditLog.create({
      data: {
        userId: session.user?.id ?? null,
        action: "ADMIN_DELETE_PACK",
        entity: "Pack",
        entityId: packId,
        metadata: JSON.stringify(result),
      },
    });

    return { status: 200, body: { success: true, ...result } };
  };

  try {
    const result = await run();
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          const result = await run();
          const res = NextResponse.json(result.body, { status: result.status });
          res.headers.set("x-db-healed", asciiHeader("heal ok") || "ok");
          return res;
        } catch (retryError) {
          console.error("[DELETE admin/packs/:id] retry:", retryError);
        }
      } else {
        console.error("[DELETE admin/packs/:id] heal failed:", heal.errors);
      }
    }
    console.error("[DELETE admin/packs/:id]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
