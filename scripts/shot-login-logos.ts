// Capture les 3 pages de connexion pour vérifier le rendu du logo (fond marine, sans filtre CSS).
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const PAGES = [
  { url: "/login", name: "login-fabricant" },
  { url: "/login/admin", name: "login-admin" },
  { url: "/artisan/login", name: "login-artisan" },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const p of PAGES) {
  await page.goto(`${BASE}${p.url}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/home/z/my-project/scripts/shot-${p.name}.png` });
  // Vérifie que l'image du logo charge réellement (naturalWidth > 0)
  const logoOk = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img[src*="verifscan-logo"]'));
    return imgs.map((i) => ({
      src: i.getAttribute("src"),
      loaded: (i as HTMLImageElement).naturalWidth > 0,
      visible: (i as HTMLElement).offsetWidth > 0,
    }));
  });
  console.log(`${p.url} →`, JSON.stringify(logoOk));
}

await browser.close();
console.log("Captures : scripts/shot-login-*.png");
