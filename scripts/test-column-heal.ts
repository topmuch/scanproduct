/**
 * Valide l'AUTO-RÉPARATION DES COLONNES (src/lib/ensure-artisan-tables.ts) :
 *
 * Reproduit EXACTEMENT la panne prod du 29/09 :
 *   PreActivatedLot existe (créée par une ancienne version du schéma) mais
 *   SANS artisanBio/usageTips (ajoutés par la page artisan v2) →
 *   `prisma.preActivatedLot.create()` échoue en P2022 "The column artisanBio
 *   does not exist" (Prisma insère TOUTES les colonnes du schéma généré, même
 *   celles absentes des data).
 *
 *  1. copie la DB locale puis DROP COLUMN artisanBio/usageTips (PreActivatedLot)
 *     + artisanPhone (Pack) → simule le volume prod resté au schéma v1
 *  2. prouve que preActivatedLot.create échoue et que isTableMissingError() le détecte
 *  3. ensureArtisanTables() #1 → ALTER TABLE ADD COLUMN via $executeRawUnsafe
 *  4. ensureArtisanTables() #2 → idempotence (columnsAdded=[], created=[])
 *  5. Prisma écrit ensuite normalement : create (champs de base — l'INSERT
 *     Prisma référence quand même TOUTES les colonnes) + update avec
 *     artisanBio/usageTips (chemin activate-pack) + pack avec artisanPhone
 *
 * Usage : bun scripts/test-column-heal.ts
 */
import { copyFileSync, rmSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const SRC_DB = "/home/z/my-project/db/custom.db";
const TEST_DB = path.join(ROOT, "scripts", "tmp-column-heal-test.db");

// 1. DB au schéma v1 — AVANT tout import de @/lib/db (PrismaClient lit
//    DATABASE_URL à l'instanciation, i.e. au chargement du module).
rmSync(TEST_DB, { force: true });
copyFileSync(SRC_DB, TEST_DB);
process.env.DATABASE_URL = `file:${TEST_DB}`;

const { Database } = await import("bun:sqlite");
{
  const raw = new Database(TEST_DB);
  const version = (raw.query("SELECT sqlite_version() AS v").get() as { v: string }).v;
  const [maj, min] = version.split(".").map(Number);
  if (maj < 3 || (maj === 3 && min < 35)) {
    console.error(`✗ SQLite ${version} trop ancienne pour DROP COLUMN (>= 3.35 requis)`);
    process.exit(1);
  }
  raw.exec(`ALTER TABLE "PreActivatedLot" DROP COLUMN "artisanBio";`);
  raw.exec(`ALTER TABLE "PreActivatedLot" DROP COLUMN "usageTips";`);
  raw.exec(`ALTER TABLE "Pack" DROP COLUMN "artisanPhone";`);
  const cols = (raw.query(`SELECT name FROM pragma_table_info('PreActivatedLot')`).all() as Array<{ name: string }>).map((c) => c.name);
  if (cols.includes("artisanBio") || cols.includes("usageTips")) {
    console.error("✗ colonnes toujours présentes après DROP");
    process.exit(1);
  }
  raw.close();
  console.log(`1. DB de test préparée (SQLite ${version}) : PreActivatedLot - artisanBio/-usageTips, Pack - artisanPhone (simule prod schéma v1)`);
}

// Import dynamique APRÈS le positionnement de l'env
const { db } = await import("@/lib/db");
const { ensureArtisanTables, isTableMissingError } = await import("@/lib/ensure-artisan-tables");

// 2. create échoue + détection — reproduit l'erreur prod exacte. NOTE : on ne
//    passe PAS artisanBio dans data : Prisma référence quand même TOUTES les
//    colonnes du schéma généré dans l'INSERT → P2022 comme en prod.
//    (Un SELECT Prisma référence aussi toutes les colonnes — on récupère donc
//    le packId en SQL brut pour atteindre le create.)
const packsRaw = await db.$queryRawUnsafe<Array<{ id: string }>>(
  `SELECT id FROM "Pack" LIMIT 1`
);
let packId: string | undefined = packsRaw[0]?.id;
if (!packId) {
  const batchRaw = await db.$executeRawUnsafe(
    `INSERT INTO "Batch" ("id","totalQuantity","packSize","numberOfPacks","status","createdAt","updatedAt")
     VALUES ('batch-colheal', 1, 1, 1, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  );
  void batchRaw;
  await db.$executeRawUnsafe(
    `INSERT INTO "Pack" ("id","batchId","packNumber","quantity","price","masterQrCode","status","createdAt","updatedAt")
     VALUES ('pack-colheal', 'batch-colheal', 1, 1, 0, 'MASTER-COLHEAL-PROBE-P01', 'available', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  );
  packId = "pack-colheal";
}
let createError: unknown = null;
try {
  await db.preActivatedLot.create({
    data: { packId, qrCode: "ART-COLHEAL-PROBE-0001", isMaster: false },
  });
} catch (e) {
  createError = e;
}
const detected = createError !== null && isTableMissingError(createError);
const errMsg = createError instanceof Error ? createError.message : String(createError ?? "");
console.log(
  `2. preActivatedLot.create échoue: ${createError ? "✓" : "✗ (aurait dû échouer)"} — isTableMissingError: ${detected ? "✓" : "✗"}`
);
console.log(`   message: ${errMsg.split("\n").slice(-2).join(" ").slice(0, 140)}`);
if (!detected) {
  console.error("✗ l'erreur P2022 n'a pas été détectée → le heal ne se déclencherait pas");
  await db.$disconnect();
  process.exit(1);
}

// 3. Heal #1 — ajoute les colonnes
const heal1 = await ensureArtisanTables();
console.log(
  `3. Heal #1: ok=${heal1.ok} columnsAdded=[${heal1.columnsAdded.join(", ")}] created=[${heal1.created.join(", ") || "∅"}] errors=[${heal1.errors.join(" | ") || "∅"}]`
);
const expected = ["PreActivatedLot.artisanBio", "PreActivatedLot.usageTips", "Pack.artisanPhone"];
const allAdded = expected.every((c) => heal1.columnsAdded.includes(c));
if (!heal1.ok || !allAdded) {
  console.error("✗ le heal aurait dû ajouter les 3 colonnes manquantes");
  await db.$disconnect();
  process.exit(1);
}

// 4. Heal #2 — idempotence
const heal2 = await ensureArtisanTables();
console.log(
  `4. Heal #2: ok=${heal2.ok} columnsAdded=[${heal2.columnsAdded.join(", ") || "∅"}] created=[${heal2.created.join(", ") || "∅"}]`
);
if (!heal2.ok || heal2.columnsAdded.length !== 0 || heal2.created.length !== 0) {
  console.error("✗ le 2ème appel aurait dû être un no-op idempotent");
  await db.$disconnect();
  process.exit(1);
}

// 5. Prisma fonctionne normalement — les 2 chemins d'écriture réels
//    5a. génération de batch (insertLotsChunked : create champs de base)
const batch = await db.batch.create({
  data: { totalQuantity: 1, packSize: 1, numberOfPacks: 1, status: "pending" },
});
const pack = await db.pack.create({
  data: {
    batchId: batch.id,
    packNumber: 1,
    quantity: 1,
    price: 0,
    masterQrCode: "MASTER-COLHEALTEST-P01",
  },
});
const lot = await db.preActivatedLot.create({
  data: { packId: pack.id, qrCode: "ART-COLHEALTEST-P01-0001", isMaster: false },
});
//    5b. activation de pack (update avec les nouveaux champs — chemin /api/artisan/activate-pack)
await db.preActivatedLot.update({
  where: { id: lot.id },
  data: {
    status: "active",
    activatedAt: new Date(),
    productName: "Beurre de karité bio",
    artisanBio: "Fabrication artisanale à Dakar depuis 2015.",
    usageTips: "Conserver au frais\nAppliquer sur peau humide",
  },
});
await db.pack.update({
  where: { id: pack.id },
  data: { status: "activated", soldTo: "Test", artisanPhone: "+221771234567" },
});
const check = await db.preActivatedLot.findUniqueOrThrow({ where: { id: lot.id } });
const roundtrip =
  check.artisanBio === "Fabrication artisanale à Dakar depuis 2015." &&
  check.usageTips === "Conserver au frais\nAppliquer sur peau humide" &&
  check.status === "active";
console.log(
  `5. Prisma post-réparation: batch.create ✓ lot.create ✓ update(bio+tips) ✓ pack(artisanPhone) ✓ roundtrip bio/tips: ${roundtrip ? "✓" : "✗"}`
);

// Nettoyage (cascade sur pack/lot)
await db.batch.delete({ where: { id: batch.id } });
await db.$disconnect();
rmSync(TEST_DB, { force: true });
if (!roundtrip) process.exit(1);
console.log("=== AUTO-RÉPARATION COLONNES VALIDÉE : P2022 détecté → ALTER TABLE ADD COLUMN → écritures OK ===");
