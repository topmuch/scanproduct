// Capture la carte « QR code du produit » de la page détail produit.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill('input[name="email"], input[type="email"]', "sarine@biocosmetique.sn");
await page.fill('input[name="password"], input[type="password"]', "Demo1234!");
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard/i, { timeout: 20000 });
await page.waitForTimeout(1200);

await page.locator("text=Produits").first().click();
await page.waitForTimeout(1500);
// Bouton « Voir » de la première carte produit
await page.locator('button:has-text("Voir")').first().click();
await page.waitForTimeout(2000);

const badgeInProduct = await page.evaluate(
  () => Array.from(document.querySelectorAll('svg circle[fill="#F8E805"]')).length
);
console.log(`✅ Page produit détail — cercles badge jaune : ${badgeInProduct}`);
await page.screenshot({
  path: "/home/z/my-project/scripts/shot-produit-badge.png",
  fullPage: true,
});
await browser.close();
console.log("Capture : scripts/shot-produit-badge.png");
