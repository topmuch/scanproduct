// Capture la page QR Codes fabricant pour vérifier que le badge
// « LABEL VERIFSCAN » (cercle jaune, QR noir au centre) s'affiche
// dans la grille de liste + le dialog d'aperçu (bouton Voir).
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

// ── 1. Connexion fabricant (credentials) ────────────────────────────
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"], input[type="email"]', "sarine@biocosmetique.sn");
await page.fill('input[name="password"], input[type="password"]', "Demo1234!");
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard|fabricant/i, { timeout: 20000 });
console.log("✅ Login fabricant OK →", page.url());

// ── 2. Page QR Codes (navigation via sidebar — store client, pas d'URL) ──
await page.locator('text=QR Codes').first().click();
await page.waitForTimeout(2000);

// Compte les badges jaunes rendus (cercles SVG fill #F8E805)
const badges = await page.evaluate(() => {
  const circles = Array.from(
    document.querySelectorAll('svg circle[fill="#F8E805"]')
  );
  return circles.length;
});
console.log(`✅ Badges jaunes visibles dans la grille : ${badges}`);
await page.screenshot({
  path: "/home/z/my-project/scripts/shot-qr-grid-badges.png",
  fullPage: false,
});

// ── 3. Dialog d'aperçu (bouton Voir / œil) ─────────────────────────
const eyeBtn = page.locator('button[title="Voir"]').first();
if (await eyeBtn.count()) {
  await eyeBtn.click();
  await page.waitForTimeout(800);
  const modalBadges = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll('svg circle[fill="#F8E805"]')
    ).length;
  });
  console.log(`✅ Dialog aperçu ouvert — cercles jaunes présents : ${modalBadges}`);
  await page.screenshot({
    path: "/home/z/my-project/scripts/shot-qr-preview-modal.png",
  });
} else {
  console.log("⚠️ Bouton Voir introuvable (page vide ?)");
}

await browser.close();
console.log("Captures : scripts/shot-qr-grid-badges.png + shot-qr-preview-modal.png");

// ── 4. Page Produit (détail) — badge dans la carte « QR code du produit » ──
const browser2 = await chromium.launch();
const page2 = await browser2.newPage({ viewport: { width: 1440, height: 1000 } });
await page2.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page2.fill('input[name="email"], input[type="email"]', "sarine@biocosmetique.sn");
await page2.fill('input[name="password"], input[type="password"]', "Demo1234!");
await page2.click('button[type="submit"]');
await page2.waitForURL(/dashboard/i, { timeout: 20000 });
await page2.waitForTimeout(1200);
await page2.locator("text=Produits").first().click();
await page2.waitForTimeout(1500);
// Ouvre le premier produit de la grille
const firstProduct = page2.locator("text=Poudre de Moringa").first();
if (await firstProduct.count()) {
  await firstProduct.click();
  await page2.waitForTimeout(1800);
  const badgeInProduct = await page2.evaluate(
    () => Array.from(document.querySelectorAll('svg circle[fill="#F8E805"]')).length
  );
  console.log(`✅ Page produit — cercles badge jaune : ${badgeInProduct}`);
  await page2.screenshot({ path: "/home/z/my-project/scripts/shot-produit-badge.png" });
} else {
  console.log("⚠️ Produit test introuvable");
}
await browser2.close();
