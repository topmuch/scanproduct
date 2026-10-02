/**
 * Setup des données pour les PREUVES VISUELLES de l'auto-complétion :
 *   - 1 pack artisan de test (maître + 3 étiquettes) — NON activé
 *   - 1 produit classique avec template (beurre de karité) + 1 lot
 * Retourne les identifiants à utiliser dans le navigateur.
 *   bun scripts/setup-proof-auto-completion.ts
 */
import { db } from "@/lib/db";
import { getProductTemplateById } from "@/lib/product-templates";

const stamp = Date.now();
const MASTER = `MASTER-PROOF-${stamp}`;

const batch = await db.batch.create({
  data: { totalQuantity: 3, packSize: 1, numberOfPacks: 1, status: "pending" },
});
const pack = await db.pack.create({
  data: {
    batchId: batch.id,
    packNumber: 1,
    quantity: 3,
    price: 0,
    masterQrCode: MASTER,
  },
});
await db.preActivatedLot.create({
  data: { packId: pack.id, qrCode: MASTER, isMaster: true },
});
for (const i of [1, 2, 3]) {
  await db.preActivatedLot.create({
    data: { packId: pack.id, qrCode: `ART-PROOF-${stamp}-000${i}`, isMaster: false },
  });
}

// Produit classique avec template (fabriquant de démo)
const fabricant = await db.user.findUnique({ where: { email: "sarine@biocosmetique.sn" } });
const karite = getProductTemplateById("beurre-karite-pur")!;
const product = await db.product.create({
  data: {
    name: "Beurre de karité pur (démo assistant)",
    fabricantId: fabricant!.id,
    templateId: karite.id,
    shelfLifeMonths: karite.shelfLifeMonths,
    usageTips: JSON.stringify(karite.usageTips),
    precautions: JSON.stringify(karite.precautions),
    storageConditions: karite.storageConditions,
  },
});
const lot = await db.lot.create({
  data: {
    reference: `REF-PROOF-${stamp}`,
    productId: product.id,
    fabricantId: fabricant!.id,
    quantity: 1,
    manufactureDate: new Date("2026-08-01"),
    expiryDate: new Date("2028-08-01"),
    ingredients: "Beurre de karité brut",
  },
});

console.log(JSON.stringify({
  masterCode: MASTER,
  firstArt: `ART-PROOF-${stamp}-0001`,
  productId: product.id,
  lotId: lot.id,
}, null, 2));
await db.$disconnect();
