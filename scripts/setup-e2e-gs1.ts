/**
 * Prépare les données de test E2E pour le resolver GS1 :
 *  - assigne un GTIN valide à un produit seedé (si besoin)
 *  - affiche un JSON récapitulatif { produitId, gtin, lot, lotId }
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// GTIN-13 valide (check digit vérifié) pour le produit de test.
const GTIN_TEST = "4006381333931";

async function main() {
  // 1) Un produit seedé (public, avec au moins un lot).
  const produit = await db.product.findFirst({
    where: { isPublic: true, status: "ACTIVE" },
    include: {
      lots: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!produit || produit.lots.length === 0) {
    throw new Error("Aucun produit public avec lot actif dans la base.");
  }

  // 2) Assigne le GTIN de test (champ barcode).
  const produitGtin = await db.product.update({
    where: { id: produit.id },
    data: { barcode: GTIN_TEST },
    select: { id: true, name: true, barcode: true },
  });

  const lot = produit.lots[0];

  console.log(
    JSON.stringify(
      {
        produitId: produitGtin.id,
        nomProduit: produitGtin.name,
        gtin: produitGtin.barcode,
        gtin14: GTIN_TEST.padStart(14, "0"),
        lotId: lot.id,
        lotNumber: lot.lotNumber ?? lot.reference,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
