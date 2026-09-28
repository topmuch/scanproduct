/**
 * Valide le fallback SQL nu (NUCLEAR) de docker-entrypoint.sh.
 *
 * Simule la prod cassée (P2021 "The table main.Batch does not exist") :
 *  1. copie la DB locale puis DROP des 4 tables artisanales
 *  2. extrait le DDL du heredoc ARTISAN_DDL de docker-entrypoint.sh
 *     (on teste le TEXTE EXACT déployé, pas une copie)
 *  3. l'applique 2× → prouve l'idempotence
 *  4. vérifie que Prisma peut créer/lire Batch + Pack + PreActivatedLot
 *     avec les mêmes requêtes que l'API (/api/admin/batches)
 *
 * Usage : bun scripts/test-nuclear-ddl.ts
 */
import { Database } from "bun:sqlite";
import { readFileSync, copyFileSync, rmSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const ENTRY = path.join(ROOT, "docker-entrypoint.sh");
const SRC_DB = "/home/z/my-project/db/custom.db";
const TEST_DB = path.join(ROOT, "scripts", "tmp-nuclear-test.db");

// ── 1. Simuler la prod cassée ────────────────────────────────────────────
rmSync(TEST_DB, { force: true });
copyFileSync(SRC_DB, TEST_DB);
const db = new Database(TEST_DB);
db.exec("PRAGMA foreign_keys = OFF");
for (const t of ["ArtisanScan", "PreActivatedLot", "Pack", "Batch"]) {
  db.exec(`DROP TABLE IF EXISTS "${t}";`);
}
const remaining = db
  .query(
    "SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('Batch','Pack','PreActivatedLot','ArtisanScan')"
  )
  .get() as { n: number };
console.log(
  `1. Tables artisanales supprimées: ${remaining.n === 0 ? "✓ (simule P2021 prod)" : `✗ restantes=${remaining.n}`}`
);
if (remaining.n !== 0) process.exit(1);

// ── 2. Extraire le DDL EXACT de l'entrypoint ────────────────────────────
const entry = readFileSync(ENTRY, "utf8");
const m = entry.match(/<<'ARTISAN_DDL'\n([\s\S]*?)\nARTISAN_DDL\n/);
if (!m) {
  console.error("✗ heredoc ARTISAN_DDL introuvable dans docker-entrypoint.sh");
  process.exit(1);
}
const ddl = m[1];
console.log(`2. DDL extrait de l'entrypoint: ${ddl.length} caractères ✓`);

// ── 3. Appliquer 2× (idempotence) ────────────────────────────────────────
db.exec(ddl);
db.exec(ddl);
const tables = db
  .query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('Batch','Pack','PreActivatedLot','ArtisanScan') ORDER BY name"
  )
  .all()
  .map((r) => (r as { name: string }).name);
const packCols = (db.query("PRAGMA table_info(Pack)").all() as Array<{ name: string }>).map(
  (c) => c.name
);
db.close();
console.log(`3. DDL appliqué 2× ✓ — tables: ${tables.join(", ")}`);
console.log(`   Colonnes Pack: ${packCols.join(" ")}`);
if (tables.length !== 4) {
  console.error("✗ tables manquantes après fallback");
  process.exit(1);
}
if (!packCols.includes("artisanPhone") || !packCols.includes("artisanEmail")) {
  console.error("✗ colonnes Pack artisanPhone/artisanEmail manquantes");
  process.exit(1);
}

// ── 4. Prisma lit/écrit comme l'API ──────────────────────────────────────
process.env.DATABASE_URL = `file:${TEST_DB}`;
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${TEST_DB}` } },
});

const batch = await prisma.batch.create({
  data: { totalQuantity: 2, packSize: 1, numberOfPacks: 2, status: "pending" },
});
const pack = await prisma.pack.create({
  data: {
    batchId: batch.id,
    packNumber: 1,
    quantity: 1,
    price: 0,
    masterQrCode: "MASTER-NUCLEARTEST-P01",
    artisanPhone: "+221770000000",
    artisanEmail: "test@example.com",
  },
});
await prisma.preActivatedLot.create({
  data: { packId: pack.id, qrCode: "ART-NUCLEARTEST-P01-0001", isMaster: false },
});
// Même requête que le GET /api/admin/batches
const found = await prisma.batch.findMany({
  include: { packs: { include: { _count: { select: { lots: true } } } } },
});
const count = await prisma.preActivatedLot.count({ where: { status: "active" } });
console.log(
  `4. Prisma sur DB réparée: Batch.create ✓ Pack.create ✓ Lot.create ✓ findMany(include packs) ✓ → ${found.length} batch, lots actifs=${count}`
);

// Nettoyage (cascade supprime pack + lot)
await prisma.batch.delete({ where: { id: batch.id } });
await prisma.$disconnect();
rmSync(TEST_DB, { force: true });
console.log("=== NUCLEAR DDL VALIDÉ — l'entrypoint réparera la prod au redéploiement ===");
