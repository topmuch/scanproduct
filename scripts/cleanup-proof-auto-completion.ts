/**
 * Nettoyage des données de preuve auto-complétion (local uniquement).
 *   bun scripts/cleanup-proof-auto-completion.ts
 */
import { db } from "@/lib/db";

// Pack artisan de preuve (cascade vers packs + lots)
const batches = await db.batch.findMany({
  where: { packs: { some: { masterQrCode: { startsWith: "MASTER-PROOF-" } } } },
  select: { id: true },
});
for (const b of batches) {
  await db.batch.delete({ where: { id: b.id } });
}
console.log(`Batches preuve supprimés : ${batches.length}`);

// Produit + lot de démo
const prods = await db.product.findMany({
  where: { name: { contains: "démo assistant" } },
  select: { id: true, name: true },
});
for (const p of prods) {
  await db.lot.deleteMany({ where: { productId: p.id } });
  await db.product.delete({ where: { id: p.id } });
}
console.log(`Produits démo supprimés : ${prods.length}`);

// Packs de test du script e2e (MASTER-AC-*)
const acBatches = await db.batch.findMany({
  where: { packs: { some: { masterQrCode: { startsWith: "MASTER-AC-" } } } },
  select: { id: true },
});
for (const b of acBatches) {
  await db.batch.delete({ where: { id: b.id } });
}
console.log(`Batches e2e supprimés : ${acBatches.length}`);

await db.$disconnect();
