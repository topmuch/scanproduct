import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import {
  asciiHeader,
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * SuperAdmin — suppression DÉFINITIVE d'un batch ENTIERS de QR codes
 * artisans (bug + demande utilisateur : « je supprime des packs mais le
 * nom du batch et ses infos ne sont pas supprimés »).
 *
 * DELETE /api/admin/batches/<batchId>
 *   → supprime le batch et TOUTES ses données liées, dans l'ordre sûr :
 *     scans → avis → étiquettes (lots) → packs → batch.
 *
 * Deux usages :
 *   1. Bouton « Supprimer » d'une carte batch dans l'UI (suppression en un
 *      clic, au lieu d'effacer les packs un par un).
 *   2. Filet de nettoyage : purge les batchs fantômes déjà présents en DB
 *      (batchs sans aucun pack, restés après les suppressions passées).
 *
 * Suppression EXPLICITE (deleteMany en transaction) plutôt que de compter
 * sur les FK ON DELETE CASCADE : les DB de prod créées par d'anciens DDL
 * n'ont pas toujours les contraintes — Prisma/SQLite n'applique la cascade
 * que si la FK existe réellement dans la table.
 *
 * AUTO-RÉPARATION P2021/P2022 : heal puis rejeu UNE fois (même stratégie
 * que DELETE /api/admin/packs/[packId]).
 */

type RouteCtx = { params: Promise<{ batchId: string }> };

/** Supprime le batch et tout ce qui pend à ses packs. Retourne les compteurs. */
async function deleteBatchCascade(batchId: string) {
  return db.$transaction(async (tx) => {
    const batch = await tx.batch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        totalQuantity: true,
        packs: { select: { id: true, lots: { select: { id: true } } } },
      },
    });
    if (!batch) return null;

    const packIds = batch.packs.map((p) => p.id);
    const lotIds = batch.packs.flatMap((p) => p.lots.map((l) => l.id));

    const scans = lotIds.length
      ? await tx.artisanScan.deleteMany({ where: { lotId: { in: lotIds } } })
      : { count: 0 };
    const reviews = lotIds.length
      ? await tx.artisanReview.deleteMany({ where: { lotId: { in: lotIds } } })
      : { count: 0 };
    const lots = packIds.length
      ? await tx.preActivatedLot.deleteMany({ where: { packId: { in: packIds } } })
      : { count: 0 };
    const packs = await tx.pack.deleteMany({ where: { batchId } });
    await tx.batch.delete({ where: { id: batchId } });

    return {
      packsDeleted: packs.count,
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
  const { batchId } = await ctx.params;

  const run = async () => {
    const result = await deleteBatchCascade(batchId);
    if (!result) {
      return { status: 404, body: { error: "Batch introuvable" } };
    }

    await db.auditLog.create({
      data: {
        userId: session.user?.id ?? null,
        action: "ADMIN_DELETE_BATCH",
        entity: "Batch",
        entityId: batchId,
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
          console.error("[DELETE admin/batches/:id] retry:", retryError);
        }
      } else {
        console.error("[DELETE admin/batches/:id] heal failed:", heal.errors);
      }
    }
    console.error("[DELETE admin/batches/:id]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
