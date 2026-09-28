/**
 * Valide l'AUTO-RÉPARATION (src/lib/ensure-artisan-tables.ts) :
 *
 *  1. copie la DB locale puis DROP des 4 tables artisanales (simule P2021 prod)
 *  2. prouve que batch.findMany échoue et que isTableMissingError() le détecte
 *  3. ensureArtisanTables() #1 → crée les 4 tables à la volée via $executeRawUnsafe
 *  4. ensureArtisanTables() #2 → idempotence (created=[], alreadyOk=4)
 *  5. Prisma lit/écrit ensuite normalement (findMany avec include packs)
 *
 * Usage : DATABASE_URL pointée sur la DB de test par le script lui-même.
 *         bun scripts/test-selfheal.ts
 */
import { copyFileSync, rmSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const SRC_DB = "/home/z/my-project/db/custom.db";
const TEST_DB = path.join(ROOT, "scripts", "tmp-selfheal-test.db");

// 1. DB cassée — AVANT tout import de @/lib/db (PrismaClient lit DATABASE_URL
//    à l'instanciation, i.e. au chargement du module).
rmSync(TEST_DB, { force: true });
copyFileSync(SRC_DB, TEST_DB);
process.env.DATABASE_URL = `file:${TEST_DB}`;

// Import dynamique APRÈS le positionnement de l'env
const { Database } = await import("bun:sqlite");
{
  const raw = new Database(TEST_DB);
  raw.exec("PRAGMA foreign_keys = OFF");
  for (const t of ["ArtisanScan", "PreActivatedLot", "Pack", "Batch"]) {
    raw.exec(`DROP TABLE IF EXISTS "${t}";`);
  }
  raw.close();
}
console.log("1. DB de test préparée : 4 tables artisanales supprimées (simule P2021 prod)");

const { db } = await import("@/lib/db");
const { ensureArtisanTables, isTableMissingError } = await import("@/lib/ensure-artisan-tables");

// 2. findMany échoue + détection
let findError: unknown = null;
try {
  await db.batch.findMany();
} catch (e) {
  findError = e;
}
const detected = findError !== null && isTableMissingError(findError);
console.log(
  `2. batch.findMany échoue: ${findError ? "✓" : "✗ (aurait dû échouer)"} — isTableMissingError: ${detected ? "✓" : "✗"}`
);
if (!detected) process.exit(1);

// 3. Heal #1 — crée les tables
const heal1 = await ensureArtisanTables();
console.log(
  `3. Heal #1: ok=${heal1.ok} created=[${heal1.created.join(", ")}] errors=[${heal1.errors.join(" | ")}]`
);
if (!heal1.ok || heal1.created.length !== 4) {
  console.error("✗ la 1ère réparation aurait dû créer les 4 tables");
  await db.$disconnect();
  process.exit(1);
}

// 4. Heal #2 — idempotence
const heal2 = await ensureArtisanTables();
console.log(
  `4. Heal #2: ok=${heal2.ok} created=[${heal2.created.join(", ") || "∅"}] alreadyOk=${heal2.alreadyOk.length}`
);
if (!heal2.ok || heal2.created.length !== 0 || heal2.alreadyOk.length !== 4) {
  console.error("✗ le 2ème appel aurait dû être un no-op idempotent");
  await db.$disconnect();
  process.exit(1);
}

// 5. Prisma fonctionne normalement (même requête que le GET /api/admin/batches)
const batch = await db.batch.create({
  data: { totalQuantity: 1, packSize: 1, numberOfPacks: 1, status: "pending" },
});
const pack = await db.pack.create({
  data: {
    batchId: batch.id,
    packNumber: 1,
    quantity: 1,
    price: 0,
    masterQrCode: "MASTER-SELFHEALTEST-P01",
    artisanPhone: "+221770000000",
  },
});
await db.preActivatedLot.create({
  data: { packId: pack.id, qrCode: "ART-SELFHEALTEST-P01-0001", isMaster: false },
});
const found = await db.batch.findMany({
  include: { packs: { include: { _count: { select: { lots: true } } } } },
});
console.log(
  `5. Prisma post-réparation: batch.create ✓ pack.create ✓ lot.create ✓ findMany(include packs) ✓ → ${found.length} batch`
);

// Nettoyage (cascade sur pack/lot)
await db.batch.delete({ where: { id: batch.id } });
await db.$disconnect();
rmSync(TEST_DB, { force: true });
console.log("=== AUTO-RÉPARATION VALIDÉE : l'app recrée ses tables via Prisma, sans shell ===");
