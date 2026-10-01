// Capture /test-qr pour valider le badge sur la page de test GS1.
import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
await page.goto(`${BASE}/test-qr`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const badges = await page.evaluate(
  () => Array.from(document.querySelectorAll('svg circle[fill="#F8E805"]')).length
);
console.log(`✅ /test-qr — cercles badge jaune : ${badges}`);
await page.screenshot({ path: "/home/z/my-project/scripts/shot-test-qr.png", fullPage: true });
await browser.close();
