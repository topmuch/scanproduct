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
 *     scans → avis → étiquettes (lots) → pack.
 *
 * NETTOYAGE DU BATCH (bug signalé : « je supprime un pack mais le nom du
 * batch et ses infos restent ») : si le batch parent n'a PLUS AUCUN pack
 * après la suppression, il est supprimé aussi — plus de batch fantôme
 * « 0/5 packs activés · 0 QR actifs » qui traîne dans la liste.
 * La réponse porte batchDeleted=true pour que l'UI le signale.
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

/**
 * Supprime le pack, tout ce qui pend à ses lots, ET le batch parent si
 * celui-ci se retrouve vide (plus aucun pack). Retourne les compteurs.
 */
async function deletePackCascade(packId: string) {
  return db.$transaction(async (tx) => {
    const pack = await tx.pack.findUnique({
      where: { id: packId },
      select: {
        id: true,
        masterQrCode: true,
        quantity: true,
        batchId: true,
        lots: { select: { id: true } },
      },
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

    // Batch fantôme : dernier pack supprimé → le batch (et son nom, ses
    // infos « 0/N packs ») n'a plus de raison d'exister. Dans la MÊME
    // transaction → aucune fenêtre où un batch vide est visible.
    let batchDeleted = false;
    const remaining = await tx.pack.count({ where: { batchId: pack.batchId } });
    if (remaining === 0) {
      await tx.batch.delete({ where: { id: pack.batchId } });
      batchDeleted = true;
    }

    return {
      masterQrCode: pack.masterQrCode,
      lotsDeleted: lots.count,
      scansDeleted: scans.count,
      reviewsDeleted: reviews.count,
      batchDeleted,
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

    if (result.batchDeleted) {
      await db.auditLog.create({
        data: {
          userId: session.user?.id ?? null,
          action: "ADMIN_DELETE_BATCH_AUTO",
          entity: "Batch",
          entityId: null,
          metadata: JSON.stringify({
            reason: "dernier pack supprimé — batch vidé puis supprimé",
            viaPackId: packId,
            ...result,
          }),
        },
      });
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
