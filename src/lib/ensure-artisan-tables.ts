import { db } from "@/lib/db";

/**
 * Auto-réparation des tables du système artisanal (Batch/Pack/PreActivatedLot/ArtisanScan).
 *
 * CONTEXTE — pourquoi ce module existe :
 *   En prod (Coolify), `prisma db push` échoue parfois silencieusement au boot
 *   (historique : P2022 "column barcode does not exist", puis P2021 "The table
 *   main.Batch does not exist"). Le fallback shell de docker-entrypoint.sh
 *   (sqlite3 CLI) peut lui-même ne pas atteindre la DB selon l'environnement.
 *
 *   Solution définitive : l'APPLICATION répare sa propre base au moment de
 *   l'erreur. Si une requête échoue avec P2021, on exécute le DDL
 *   `CREATE TABLE IF NOT EXISTS` via `$executeRawUnsafe` (le même canal Prisma
 *   qui a causé l'erreur — ne peut pas rater la DB), puis on rejoue la requête.
 *
 *   Aucune dépendance shell/sqlite3/child_process → compatible bundle client
 *   (même contraintes que db.ts, voir son AUTO-MIGRATION).
 *
 * Le DDL est l'EXTRAIT EXACT de ce que Prisma crée (dumpé d'une DB réelle via
 * sqlite_master), identique au heredoc ARTISAN_DDL de docker-entrypoint.sh.
 * Tout est idempotent (IF NOT EXISTS) → sans risque à chaque appel.
 */

export const ARTISAN_TABLES = ["Batch", "Pack", "PreActivatedLot", "ArtisanScan"] as const;

/** DDL artisana — une instruction par élément (Prisma = 1 statement par appel). */
export const ARTISAN_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "totalQuantity" INTEGER NOT NULL,
    "packSize" INTEGER NOT NULL,
    "numberOfPacks" INTEGER NOT NULL,
    "printedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS "Batch_status_idx" ON "Batch"("status")`,
  `CREATE TABLE IF NOT EXISTS "Pack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "packNumber" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "masterQrCode" TEXT NOT NULL,
    "soldTo" TEXT,
    "soldAt" DATETIME,
    "artisanPhone" TEXT,
    "artisanEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pack_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Pack_masterQrCode_key" ON "Pack"("masterQrCode")`,
  `CREATE INDEX IF NOT EXISTS "Pack_batchId_idx" ON "Pack"("batchId")`,
  `CREATE INDEX IF NOT EXISTS "Pack_status_idx" ON "Pack"("status")`,
  `CREATE INDEX IF NOT EXISTS "Pack_masterQrCode_idx" ON "Pack"("masterQrCode")`,
  `CREATE TABLE IF NOT EXISTS "PreActivatedLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packId" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "isMaster" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "activatedAt" DATETIME,
    "productName" TEXT,
    "contenance" TEXT,
    "ingredients" TEXT,
    "manufacturingDate" DATETIME,
    "expirationDate" DATETIME,
    "artisanName" TEXT,
    "contactPhone" TEXT,
    "photoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PreActivatedLot_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PreActivatedLot_qrCode_key" ON "PreActivatedLot"("qrCode")`,
  `CREATE INDEX IF NOT EXISTS "PreActivatedLot_packId_idx" ON "PreActivatedLot"("packId")`,
  `CREATE INDEX IF NOT EXISTS "PreActivatedLot_qrCode_idx" ON "PreActivatedLot"("qrCode")`,
  `CREATE INDEX IF NOT EXISTS "PreActivatedLot_status_idx" ON "PreActivatedLot"("status")`,
  `CREATE INDEX IF NOT EXISTS "PreActivatedLot_isMaster_idx" ON "PreActivatedLot"("isMaster")`,
  `CREATE TABLE IF NOT EXISTS "ArtisanScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "country" TEXT,
    "city" TEXT,
    "deviceType" TEXT,
    CONSTRAINT "ArtisanScan_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "PreActivatedLot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS "ArtisanScan_lotId_idx" ON "ArtisanScan"("lotId")`,
  `CREATE INDEX IF NOT EXISTS "ArtisanScan_scannedAt_idx" ON "ArtisanScan"("scannedAt")`,
];

/** Détecte une erreur « table inexistante » (P2021 Prisma ou SQLite brut). */
export function isTableMissingError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /P2021|does not exist in the current database|no such table/i.test(msg);
}

export type HealResult = {
  ok: boolean;
  /** Tables qui MANQUAIENT et ont été créées par cet appel. */
  created: string[];
  /** Tables déjà en place (rien à faire). */
  alreadyOk: string[];
  /** Erreurs par instruction si le DDL a échoué (ex. DB read-only). */
  errors: string[];
};

async function listTables(): Promise<string[]> {
  const rows = await db.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table'"
  );
  return rows.map((r) => r.name);
}

/**
 * Crée les tables artisanales manquantes. Idempotent et bon marché :
 * à appeler dès qu'une erreur « table does not exist » est détectée.
 */
export async function ensureArtisanTables(): Promise<HealResult> {
  const result: HealResult = { ok: true, created: [], alreadyOk: [], errors: [] };

  let before: string[];
  try {
    before = await listTables();
  } catch (error) {
    // Même sqlite_master est inaccessible → la DB elle-même est cassée
    // (ex. fichier illisible, volume non monté). On expose l'erreur brute.
    result.ok = false;
    result.errors.push(
      `sqlite_master inaccessible: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`
    );
    return result;
  }

  for (const sql of ARTISAN_DDL) {
    try {
      await db.$executeRawUnsafe(sql);
    } catch (error) {
      const msg = (error instanceof Error ? error.message : String(error)).slice(0, 200);
      // "table already exists" = course bénigne entre deux appels concurrents
      if (!/already exists/i.test(msg)) {
        result.ok = false;
        result.errors.push(msg);
      }
    }
  }

  const after = await listTables().catch(() => [] as string[]);
  for (const t of ARTISAN_TABLES) {
    const had = before.includes(t);
    const has = after.includes(t);
    if (has && !had) result.created.push(t);
    else if (has && had) result.alreadyOk.push(t);
    else if (has === false) {
      result.ok = false;
      result.errors.push(`${t} toujours absente après DDL`);
    }
  }

  if (result.created.length > 0) {
    console.log(`[ensure-artisan-tables] Tables créées à la volée : ${result.created.join(", ")}`);
  }
  return result;
}
