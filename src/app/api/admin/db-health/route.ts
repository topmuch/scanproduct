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
 *                              présence des 4 tables artisanales, colonnes
 *                              manquantes (ex. PreActivatedLot sans
 *                              artisanBio/usageTips = schéma v1 en prod).
 * POST /api/admin/db-health → exécute l'auto-réparation (CREATE TABLE IF
 *                              NOT EXISTS + ALTER TABLE ADD COLUMN via
 *                              Prisma) puis renvoie le nouvel état.
 *
 * Utile quand le volume de prod n'a pas reçu `prisma db push` (P2021/P2022)
 * et que le fallback shell de l'entrypoint n'a pas pu atteindre la DB.
 */

async function buildReport() {
  const report: {
    databaseUrl: string;
    checkedAt: string;
    totalTables?: number;
    tables?: string[];
    artisanal?: Record<string, boolean>;
    missingColumns?: string[];
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

export async function POST() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const heal = await ensureArtisanTables();
  const report = await buildReport();
  return NextResponse.json({ heal, report });
}
