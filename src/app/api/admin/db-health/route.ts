import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import {
  ARTISAN_TABLES,
  ensureArtisanTables,
} from "@/lib/ensure-artisan-tables";

/**
 * Diagnostic + réparation de la base — SuperAdmin uniquement.
 *
 * GET  /api/admin/db-health → état : DATABASE_URL, liste des tables,
 *                              présence des 4 tables artisanales.
 * POST /api/admin/db-health → exécute l'auto-réparation (CREATE TABLE IF
 *                              NOT EXISTS via Prisma) puis renvoie le nouvel état.
 *
 * Utile quand le volume de prod n'a pas reçu `prisma db push` (P2021) et que
 * le fallback shell de l'entrypoint n'a pas pu atteindre la DB.
 */

async function buildReport() {
  const report: {
    databaseUrl: string;
    checkedAt: string;
    totalTables?: number;
    tables?: string[];
    artisanal?: Record<string, boolean>;
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
    report.allGood = ARTISAN_TABLES.every((t) => names.includes(t));
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
