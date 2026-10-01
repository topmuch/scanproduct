// Vérifie le bouton « Exporter tout (ZIP) » sur la page QR Codes
// (sans cliquer : l'export déclenche un vrai rendu serveur, testé à part).
import { chromium } from "playwright";

const BASE = "http://localhost:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"], input[type="email"]', "sarine@biocosmetique.sn");
await page.fill('input[name="password"], input[type="password"]', "Demo1234!");
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard|fabricant/i, { timeout: 20000 });

await page.locator('text=QR Codes').first().click();
await page.waitForTimeout(2000);

const btn = page.locator('button:has-text("Exporter tout (ZIP)")');
const nb = await btn.count();
console.log(nb > 0 ? "✅ Bouton « Exporter tout (ZIP) » présent" : "❌ Bouton introuvable");

// Barre d'actions groupées : sélectionner 1 QR → bouton « Exporter ZIP »
const firstCheckbox = page.locator('input[type="checkbox"]').nth(1); // 0 = select-all
if (await firstCheckbox.count()) {
  await firstCheckbox.check();
  await page.waitForTimeout(500);
  const zipSel = page.locator('button:has-text("Exporter ZIP")');
  console.log((await zipSel.count()) > 0
    ? "✅ Bouton « Exporter ZIP » (sélection) présent dans la barre d'actions"
    : "❌ Bouton « Exporter ZIP » sélection introuvable");
}

await page.screenshot({ path: "/home/z/my-project/scripts/shot-export-zip-ui.png", fullPage: false });
await browser.close();
console.log("Capture : scripts/shot-export-zip-ui.png");
