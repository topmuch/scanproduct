/**
 * Test lightbox galerie (fix revue #5) + captures finales des 6 fixes.
 * 1. Clic sur une photo d'atelier → overlay plein écran visible
 * 2. Clic sur le bouton fermer → overlay disparu
 * 3. Captures : carte bleue avec prix, bannière avec lien WhatsApp, lightbox
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:/home/z/my-project/db/custom.db" } },
});

async function main() {
  const lot = await prisma.preActivatedLot.findFirst({
    where: { qrCode: { startsWith: "MASTER-CMUMOBXS" } },
  });
  if (!lot) throw new Error("lot de test introuvable");
  const url = `http://localhost:3000/a/${lot.qrCode}`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto(url, { waitUntil: "networkidle" });

  // ── Lightbox : ouvrir ──────────────────────────────────────────────
  const galleryBtn = page.locator('button[aria-label^="Agrandir la photo"]').first();
  await galleryBtn.scrollIntoViewIfNeeded();
  await galleryBtn.click();
  await page.waitForTimeout(400);
  const dialogOpen = await page.locator('div[role="dialog"][aria-modal="true"]').count();
  console.log(`lightbox ouverte: ${dialogOpen} (attendu 1)`);
  await page.screenshot({ path: "shots/fix-lightbox.png" });

  // ── Lightbox : fermer ──────────────────────────────────────────────
  await page.locator('button[aria-label="Fermer"]').click();
  await page.waitForTimeout(300);
  const dialogClosed = await page.locator('div[role="dialog"][aria-modal="true"]').count();
  console.log(`lightbox après fermeture: ${dialogClosed} (attendu 0)`);

  // ── Bannière : lien de signalement WhatsApp cliquable ──────────────
  const reportLink = await page
    .locator('a:has-text("signalez-le à l’artisan sur WhatsApp")')
    .count();
  console.log(`lien signalement WhatsApp: ${reportLink} (attendu 1)`);

  // ── Captures finales ───────────────────────────────────────────────
  await page.evaluate(() => document.querySelector("h1")?.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/fix-carte-prix.png" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/fix-hero.png" });

  await browser.close();

  if (dialogOpen !== 1 || dialogClosed !== 0 || reportLink !== 1) process.exit(1);
  console.log("=== LIGHTBOX + SIGNALEMENT VALIDÉS ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
