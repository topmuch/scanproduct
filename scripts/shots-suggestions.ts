/**
 * Captures mobile de la page artisan avec les 11 suggestions visibles.
 * Utilise le dernier lot activé par test-suggestions.ts (.batchA master).
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:/home/z/my-project/db/custom.db" } },
});

async function main() {
  const lot = await prisma.preActivatedLot.findFirst({
    where: { status: "active", isMaster: true, productName: { contains: "suggestions" } },
    orderBy: { activatedAt: "desc" },
  });
  if (!lot) {
    console.error("Aucun lot 'suggestions' activé trouvé");
    process.exit(1);
  }
  const url = `http://localhost:3000/a/${lot.qrCode}`;
  console.log("URL:", url);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto(url, { waitUntil: "networkidle" });

  // 1. Hero + badge + alerte éventuelle
  await page.screenshot({ path: "shots/suggestions-hero.png" });

  // 2. Carte produit (compteur de scans + partager + étoiles)
  await page.evaluate(() =>
    document
      .querySelector("h1")
      ?.scrollIntoView({ block: "start" })
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/suggestions-carte.png" });

  // 3. Histoire + galerie
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find((p) =>
      p.textContent?.includes("atelier en images")
    );
    el?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/suggestions-galerie.png" });

  // 4. Contact + réseaux sociaux
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("h3")].find((h) =>
      h.textContent?.includes("Coordonnées")
    );
    el?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/suggestions-contact.png" });

  // 5. Avis clients (réel)
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("h2")].find((h) =>
      h.textContent?.includes("Avis des clients")
    );
    el?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/suggestions-avis.png" });

  await browser.close();
  console.log("Captures OK → shots/suggestions-*.png");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
