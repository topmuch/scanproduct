import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import {
  ARTISAN_TABLES,
  REQUIRED_COLUMNS,
  ensureArtisanTables,
} from "@/lib/ensure-artisan-tables";

/**
 * Diagnostic + réparation de la base — SuperAdmin uniquement.
 *
 * GET  /api/admin/db-health → état : DATABASE_URL, liste des tables,
 *                              présence des 5 tables artisanales, colonnes
 *                              manquantes, batchs DUPLIQUÉS (relances
 *                              pendant les incidents 500).
 * POST /api/admin/db-health → sans corps : exécute l'auto-réparation
 *                              (CREATE TABLE IF NOT EXISTS + ALTER TABLE
 *                              ADD COLUMN) puis renvoie le nouvel état.
 *                              corps {action:"dedupe", dryRun?} : supprime
 *                              les batchs dupliqués (le plus ancien de
 *                              chaque groupe est conservé — les copies
 *                              vides de scans/activations seulement).
 *
 * Utile quand le volume de prod n'a pas reçu `prisma db push` (P2021/P2022)
 * et que le fallback shell de l'entrypoint n'a pas pu atteindre la DB.
 */

const DUPLICATE_WINDOW_MS = 90 * 1000; // créations à moins de 90 s d'écart

async function detectDuplicateBatches(): Promise<
  Array<{ keepId: string; duplicates: Array<{ id: string; createdAt: string; hasScans: boolean; hasActiveLots: boolean }>; totalQuantity: number; packSize: number; numberOfPacks: number; createdAt: string }>
> {
  const rows = await db.batch.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      totalQuantity: true,
      packSize: true,
      numberOfPacks: true,
      createdAt: true,
    },
  });

  // Regroupe par signature (quantité/pack/taille) puis par fenêtre temporelle
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.totalQuantity}|${r.packSize}|${r.numberOfPacks}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }

  const result: Awaited<ReturnType<typeof detectDuplicateBatches>> = [];
  for (const [, arr] of groups) {
    let cluster: typeof rows = [];
    const flush = async () => {
      if (cluster.length > 1) {
        const details: Array<{ id: string; createdAt: string; hasScans: boolean; hasActiveLots: boolean }> = [];
        for (const c of cluster.slice(1)) {
          const [scans, activeLots] = await Promise.all([
            db.artisanScan.count({ where: { lot: { pack: { batchId: c.id } } } }),
            db.preActivatedLot.count({
              where: { pack: { batchId: c.id }, status: "active" },
            }),
          ]);
          details.push({
            id: c.id,
            createdAt: c.createdAt.toISOString(),
            hasScans: scans > 0,
            hasActiveLots: activeLots > 0,
          });
        }
        result.push({
          keepId: cluster[0].id,
          duplicates: details,
          totalQuantity: cluster[0].totalQuantity,
          packSize: cluster[0].packSize,
          numberOfPacks: cluster[0].numberOfPacks,
          createdAt: cluster[0].createdAt.toISOString(),
        });
      }
      cluster = [];
    };
    for (const r of arr) {
      if (
        cluster.length === 0 ||
        r.createdAt.getTime() - cluster[cluster.length - 1].createdAt.getTime() <=
          DUPLICATE_WINDOW_MS
      ) {
        cluster.push(r);
      } else {
        await flush();
        cluster = [r];
      }
    }
    await flush();
  }
  return result;
}

async function buildReport() {
  const report: {
    databaseUrl: string;
    checkedAt: string;
    totalTables?: number;
    tables?: string[];
    artisanal?: Record<string, boolean>;
    missingColumns?: string[];
    duplicateBatches?: Array<{
      keepId: string;
      duplicates: Array<{ id: string; createdAt: string; hasScans: boolean; hasActiveLots: boolean }>;
      totalQuantity: number;
      packSize: number;
      numberOfPacks: number;
      createdAt: string;
    }>;
    allGood?: boolean;
    queryError?: string;
  } = {
    databaseUrl: process.env.DATABASE_URL ?? "(non définie)",
    checkedAt: new Date().toISOString(),
  };

  try {
    const rows = await db.$queryRawUnsafe<Array<{ name: string }>>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );
    const names = rows.map((r) => r.name);
    report.totalTables = names.length;
    report.tables = names;
    report.artisanal = Object.fromEntries(
      ARTISAN_TABLES.map((t) => [t, names.includes(t)])
    );

    // Colonnes attendues sur les tables existantes (schéma le plus récent)
    const missingColumns: string[] = [];
    for (const [table, cols] of Object.entries(REQUIRED_COLUMNS)) {
      if (!names.includes(table)) continue; // table absente → déjà signalée
      const existing = await db
        .$queryRawUnsafe<Array<{ name: string }>>(
          `SELECT name FROM pragma_table_info('${table}')`
        )
        .catch(() => [] as Array<{ name: string }>);
      for (const col of cols) {
        if (!existing.some((c) => c.name === col.name)) {
          missingColumns.push(`${table}.${col.name}`);
        }
      }
    }
    report.missingColumns = missingColumns;

    // Batchs dupliqués (relances SuperAdmin pendant les incidents 500)
    report.duplicateBatches = await detectDuplicateBatches().catch(() => []);

    report.allGood =
      ARTISAN_TABLES.every((t) => names.includes(t)) && missingColumns.length === 0;
  } catch (error) {
    // La DB elle-même est injoignable/cassée — exposer l'erreur brute.
    report.queryError =
      error instanceof Error ? error.message.slice(0, 400) : String(error).slice(0, 400);
    report.allGood = false;
  }
  return report;
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  return NextResponse.json(await buildReport());
}

export async function POST(request: Request) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Action optionnelle : dédoublonnage des batchs (corps {action:"dedupe"})
  let action = "heal";
  let dryRun = true;
  try {
    const body = (await request.json()) as { action?: string; dryRun?: boolean };
    if (body?.action === "dedupe") {
      action = "dedupe";
      dryRun = body.dryRun !== false; // défaut : dry-run (sécurité)
    }
  } catch {
    // pas de corps → heal classique
  }

  if (action === "dedupe") {
    const groups = await detectDuplicateBatches().catch(() => []);
    const deleted: string[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];
    for (const g of groups) {
      for (const dup of g.duplicates) {
        if (dup.hasScans) {
          skipped.push({ id: dup.id, reason: "scans enregistrés — suppression manuelle" });
          continue;
        }
        if (dup.hasActiveLots) {
          skipped.push({ id: dup.id, reason: "produits activés — suppression manuelle" });
          continue;
        }
        if (dryRun) {
          deleted.push(dup.id);
          continue;
        }
        try {
          await db.batch.delete({ where: { id: dup.id } }); // cascade packs/lots
          deleted.push(dup.id);
        } catch (e) {
          skipped.push({
            id: dup.id,
            reason: `échec suppression: ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`,
          });
        }
      }
    }
    return NextResponse.json({
      action: "dedupe",
      dryRun,
      deleted,
      skipped,
      groupsFound: groups.length,
      report: await buildReport(),
    });
  }

  const heal = await ensureArtisanTables();
  const report = await buildReport();
  return NextResponse.json({ heal, report });
}
