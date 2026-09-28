import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import {
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * Système artisanal — gestion des batches de QR codes pré-imprimés.
 *
 * POST /api/admin/batches        → génère un batch (packs + QR codes)
 * GET  /api/admin/batches        → liste tous les batches (avec stats packs)
 *
 * Conception :
 * - SQLite : pas d'insert massif → chaque pack est créé dans SA transaction
 *   avec des chunks de 200 requêtes maximum (évite le timeout SQLite).
 * - Codes générés :
 *     Maître  : MASTER-<batch8>-P01
 *     Produit : ART-<batch8>-P01-0001 … -0200
 * - Audit log à chaque génération (traçabilité SuperAdmin).
 *
 * AUTO-RÉPARATION : si une requête échoue avec P2021 (table manquante = db
 * push raté en prod), on crée les tables via $executeRawUnsafe puis on rejoue
 * UNE fois — l'utilisateur voit simplement la page qui fonctionne.
 */

const CreateBatchSchema = z.object({
  // min 1 → permet un batch de TEST (1 seul QR produit + son QR Maître).
  totalQuantity: z.number().int().min(1).max(5000).default(1000),
  packSize: z.number().int().min(1).max(500).default(200),
  pricePerPack: z.number().int().min(0).max(10_000_000).default(70000),
});

const CHUNK_SIZE = 200;

type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** Insère des PreActivatedLot par chunks (SQLite-friendly). */
async function insertLotsChunked(
  tx: TxClient,
  rows: Array<{ packId: string; qrCode: string; isMaster: boolean }>
) {
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map((row) => tx.preActivatedLot.create({ data: row })));
  }
}

/** Répare la DB si l'erreur est « table manquante » ; retourne le descriptif. */
async function healIfTableMissing(error: unknown): Promise<string | null> {
  if (!isTableMissingError(error)) return null;
  const heal = await ensureArtisanTables();
  if (!heal.ok) {
    console.error("[batches] Auto-réparation échouée:", heal.errors);
    return null;
  }
  return heal.created.length > 0
    ? `tables créées automatiquement : ${heal.created.join(", ")}`
    : "tables déjà en place";
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const load = async () => {
    const batches = await db.batch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        packs: {
          orderBy: { packNumber: "asc" },
          include: {
            _count: { select: { lots: true } },
          },
        },
      },
    });

    // Résumé par batch : packs activés, QR actifs
    const enriched = await Promise.all(
      batches.map(async (b) => {
        const activatedPacks = b.packs.filter((p) => p.status === "activated").length;
        const activeLots = await db.preActivatedLot.count({
          where: { packId: { in: b.packs.map((p) => p.id) }, status: "active" },
        });
        return {
          id: b.id,
          totalQuantity: b.totalQuantity,
          packSize: b.packSize,
          numberOfPacks: b.numberOfPacks,
          status: b.status,
          printedAt: b.printedAt,
          createdAt: b.createdAt,
          packs: b.packs.map((p) => ({
            id: p.id,
            packNumber: p.packNumber,
            quantity: p.quantity,
            price: p.price,
            masterQrCode: p.masterQrCode,
            status: p.status,
            soldTo: p.soldTo,
            soldAt: p.soldAt,
            artisanPhone: p.artisanPhone,
            lotsCount: p._count.lots,
          })),
          stats: {
            activatedPacks,
            activeLots,
          },
        };
      })
    );

    return NextResponse.json(enriched);
  };

  try {
    return await load();
  } catch (error) {
    // Auto-réparation puis rejeu unique — le prochain chargement passe seul.
    const healed = await healIfTableMissing(error);
    if (healed) {
      try {
        const res = await load();
        res.headers.set("x-db-healed", healed);
        console.log(`[batches] GET réussi après auto-réparation (${healed})`);
        return res;
      } catch (retryError) {
        error = retryError;
      }
    }
    console.error("[batches] Erreur lecture liste:", error);
    // Détail renvoyé au SuperAdmin (endpoint protégé) — l'UI l'affiche
    // dans le toast, ce qui rend un 500 de liste auto-diagnostiquable.
    const details =
      error instanceof Error ? error.message.slice(0, 400) : String(error).slice(0, 400);
    return NextResponse.json(
      { error: "Erreur serveur pendant le chargement des batches", details, healed },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = CreateBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { totalQuantity, packSize, pricePerPack } = parsed.data;

  if (totalQuantity % packSize !== 0) {
    return NextResponse.json(
      {
        error: `Le nombre total (${totalQuantity}) doit être divisible par la taille du pack (${packSize})`,
      },
      { status: 400 }
    );
  }

  const numberOfPacks = totalQuantity / packSize;

  const run = async (): Promise<NextResponse> => {
    const masterCodes: string[] = [];

    // NOTE : batch.create DOIT être dans le try — c'est précisément lui qui
    // renvoyait P2021 non géré (⨯ dans les logs) quand la table manquait.
    const batch = await db.batch.create({
      data: {
        totalQuantity,
        packSize,
        numberOfPacks,
        status: "pending",
      },
    });

    try {
      const batchIdShort = batch.id.slice(0, 8).toUpperCase();

      // Un pack = une transaction (atomicité du pack, chunks SQLite-friendly)
      for (let packNum = 1; packNum <= numberOfPacks; packNum++) {
        const packSuffix = `P${String(packNum).padStart(2, "0")}`;
        const masterCode = `MASTER-${batchIdShort}-${packSuffix}`;
        masterCodes.push(masterCode);

        await db.$transaction(async (tx) => {
          const pack = await tx.pack.create({
            data: {
              batchId: batch.id,
              packNumber: packNum,
              quantity: packSize,
              price: pricePerPack,
              masterQrCode: masterCode,
            },
          });

          const rows: Array<{ packId: string; qrCode: string; isMaster: boolean }> = [];
          for (let i = 1; i <= packSize; i++) {
            rows.push({
              packId: pack.id,
              qrCode: `ART-${batchIdShort}-${packSuffix}-${String(i).padStart(4, "0")}`,
              isMaster: false,
            });
          }
          // Le QR Code Maître fait partie du pack (isMaster=true)
          rows.push({ packId: pack.id, qrCode: masterCode, isMaster: true });

          await insertLotsChunked(tx, rows);
        });
      }

      await db.auditLog.create({
        data: {
          userId: session.user?.id ?? null,
          action: "CREATE_BATCH",
          entity: "Batch",
          entityId: batch.id,
          metadata: JSON.stringify({ totalQuantity, packSize, numberOfPacks, pricePerPack }),
        },
      });

      return NextResponse.json(
        {
          success: true,
          batch: {
            id: batch.id,
            totalQuantity,
            packSize,
            numberOfPacks,
            pricePerPack,
          },
          // Codes maîtres renvoyés direct → permet de tester le workflow
          // immédiatement après création (batch de test 1 QR notamment).
          masterCodes,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("[batches] Erreur génération:", error);
      // Nettoyage : un batch partiellement généré est invalide
      try {
        await db.batch.delete({ where: { id: batch.id } });
      } catch {
        /* ignore */
      }
      throw error;
    }
  };

  try {
    return await run();
  } catch (error) {
    // Auto-réparation puis rejeu unique (P2021 : tables recréées à la volée)
    const healed = await healIfTableMissing(error);
    if (healed) {
      try {
        const res = await run();
        res.headers.set("x-db-healed", healed);
        console.log(`[batches] POST réussi après auto-réparation (${healed})`);
        return res;
      } catch (retryError) {
        error = retryError;
      }
    }
    // Détail renvoyé au SuperAdmin (endpoint protégé) — indispensable pour
    // diagnostiquer un 500 en prod (ex. "Table main.Batch does not exist"
    // = prisma db push n'a pas tourné sur le volume persistant).
    const details =
      error instanceof Error ? error.message.slice(0, 400) : String(error).slice(0, 400);
    return NextResponse.json(
      { error: "Erreur serveur pendant la génération du batch", details, healed },
      { status: 500 }
    );
  }
}
