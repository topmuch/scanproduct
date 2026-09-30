/** Captures des 3 vues /a/<code> pour vérifier le logo officiel VerifScan. */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const codes = {
  actif: "ART-CMUNZAAP-P01-0001",
  etiqInactive: "ART-CMUNZ82B-P02-0001",
  maitreInactif: "MASTER-CMUNZ82B-P02",
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 420, height: 900 },
    deviceScaleFactor: 2,
  });

  for (const [name, code] of Object.entries(codes)) {
    const res = await page.goto(`${BASE}/a/${code}`, { waitUntil: "networkidle" });
    console.log(name, code, "HTTP", res?.status());
    await page.waitForTimeout(800);
    const logoCount = await page.locator('img[src*="verifscan-logo"]').count();
    const logoVisible = logoCount > 0 && (await page.locator('img[src*="verifscan-logo"]').first().isVisible());
    console.log(`  → logo officiel présent: ${logoCount} img, visible: ${logoVisible}`);
    await page.screenshot({ path: `shots/logo-scan-${name}.png`, fullPage: name === "actif" ? false : true });
  }

  await browser.close();
  console.log("captures ok");
})();
