/**
 * Test visuel du fallback image (fix revue #1) :
 * pose une photoUrl cassée sur le lot de test, charge la page au navigateur,
 * vérifie que le hero affiche le placeholder (div aria-label) et PAS le
 * texte alt brut d'une image cassée, capture, puis restaure l'URL.
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:/home/z/my-project/db/custom.db" } },
});
const BROKEN = "/api/uploads/CASSEE-404.jpg";

async function main() {
  const lot = await prisma.preActivatedLot.findFirst({
    where: { qrCode: { startsWith: "MASTER-CMUMOBXS" } },
  });
  if (!lot) throw new Error("lot de test introuvable");
  const url = `http://localhost:3000/a/${lot.qrCode}`;

  // 1. casser l'image
  await prisma.preActivatedLot.update({ where: { id: lot.id }, data: { photoUrl: BROKEN } });

  // 2. charger au navigateur et laisser onError basculer
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const brokenVisible = await page.locator(`img[src="${BROKEN}"]`).count();
  const fallbackVisible = await page
    .locator(`div[role="img"][aria-label="${lot.productName}"]`)
    .count();
  console.log(`img cassée encore dans le DOM: ${brokenVisible} (attendu 0)`);
  console.log(`placeholder dégradé affiché: ${fallbackVisible} (attendu 1)`);
  await page.screenshot({ path: "shots/fix-fallback-hero.png" });
  await browser.close();

  // 3. restaure
  await prisma.preActivatedLot.update({
    where: { id: lot.id },
    data: { photoUrl: "/api/uploads/artisan-test-suggestions.jpg" },
  });
  console.log("photoUrl restaurée");

  if (brokenVisible !== 0 || fallbackVisible < 1) process.exit(1);
  console.log("=== FALLBACK IMAGE VALIDÉ ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
