import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import {
  asciiHeader,
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * SuperAdmin — PURGE TOTALE du système QR artisanal (demande utilisateur :
 * « un bouton tout supprimer » — reset complet : batchs, packs, étiquettes,
 * scans et avis).
 *
 * DELETE /api/admin/packs   (collection)
 * Body obligatoire : { confirmation: "TOUT SUPPRIMER" }
 *   → garde-fou anti-clic malheureux : le client doit renvoyer EXACTEMENT
 *     cette phrase (l'UI la fait retaper/valider via window.confirm en deux
 *     temps). Sans elle → 400, jamais de purge accidentelle.
 *
 * Ordre de suppression EXPLICITE (deleteMany en transaction) : scans →
 * avis → étiquettes → packs → batchs. On ne compte PAS sur les FK
 * ON DELETE CASCADE : les DB de prod créées par d'anciens DDL n'ont pas
 * toujours les contraintes en base.
 *
 * AUTO-RÉPARATION P2021/P2022 : heal puis rejeu UNE fois.
 */

const PurgeSchema = z.object({
  confirmation: z.literal("TOUT SUPPRIMER"),
});

async function purgeAll() {
  return db.$transaction(async (tx) => {
    // Les tables ArtisanScan/ArtisanReview/PreActivatedLot/Pack/Batch peuvent
    // être individuellement absentes (P2021 partiel) → deleteMany silencieux
    // si la table manque (try/catch par table, compteurs à 0).
    const safeDeleteMany = async <T extends object>(
      model: {
        deleteMany: (args?: { where?: T }) => Promise<{ count: number }>;
      },
      where?: { lotId?: { in: string[] } }
    ): Promise<number> => {
      try {
        return (await model.deleteMany({ where: where as never })).count;
      } catch {
        return 0;
      }
    };

    const lotIds = (
      await tx.preActivatedLot.findMany({ select: { id: true } }).catch(() => [])
    ).map((l) => l.id);

    const scans = await safeDeleteMany(tx.artisanScan, { lotId: { in: lotIds } });
    const reviews = await safeDeleteMany(tx.artisanReview, { lotId: { in: lotIds } });
    const lots = await tx.preActivatedLot.deleteMany().catch(() => ({ count: 0 }));
    const packs = await tx.pack.deleteMany().catch(() => ({ count: 0 }));
    const batches = await tx.batch.deleteMany().catch(() => ({ count: 0 }));

    return {
      scansDeleted: scans,
      reviewsDeleted: reviews,
      lotsDeleted: lots.count,
      packsDeleted: packs.count,
      batchesDeleted: batches.count,
    };
  });
}

export async function DELETE(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  let confirmation: string;
  try {
    const parsed = PurgeSchema.parse(await request.json());
    confirmation = parsed.confirmation;
  } catch (e) {
    const details =
      e instanceof z.ZodError
        ? `confirmation requise : envoyer { "confirmation": "TOUT SUPPRIMER" }`
        : "Corps invalide";
    return NextResponse.json({ error: "Confirmation manquante", details }, { status: 400 });
  }

  const run = async () => {
    const result = await purgeAll();

    await db.auditLog.create({
      data: {
        userId: session.user?.id ?? null,
        action: "ADMIN_PURGE_ALL_PACKS",
        entity: "Batch",
        entityId: null,
        metadata: JSON.stringify({ ...result, confirmation }),
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
          console.error("[DELETE admin/packs] retry:", retryError);
        }
      } else {
        console.error("[DELETE admin/packs] heal failed:", heal.errors);
      }
    }
    console.error("[DELETE admin/packs]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
