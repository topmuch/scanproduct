/**
 * E2E GS1 — prépare une ligne QRCode (série GS1 imprimée) puis affiche les
 * données nécessaires aux tests curl de liaison scan→QRCode.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const produit = await db.product.findFirst({
    where: { barcode: "4006381333931" },
    include: {
      lots: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!produit || !produit.lots[0]) throw new Error("Produit GTIN introuvable");
  const lot = produit.lots[0];

  // Simule un QR imprimé généré par VerifScan (série courte conforme AI 21).
  const serie = "SN-E2E-TEST1";
  await db.qRCode.upsert({
    where: { code: serie },
    update: { lotId: lot.id },
    create: { code: serie, lotId: lot.id, status: "ACTIVE" },
  });

  // Un produit SANS barcode pour le test standard.
  const produitStd = await db.product.findFirst({
    where: { barcode: null, status: "ACTIVE" },
    include: {
      lots: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  console.log(
    JSON.stringify(
      {
        serieImprimee: serie,
        gtinLot: "SAR-BAO-250-001",
        produitStdId: produitStd?.id ?? null,
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
