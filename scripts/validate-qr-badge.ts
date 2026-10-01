/**
 * Validation du design badge « LABEL VERIFSCAN » avec le module réel.
 * Rend 3 PNG dans download/qr-concepts/ puis affiche les infos.
 * Le test de décodage 3 cm est fait ensuite via pyzbar (script Python).
 *
 *   bun scripts/validate-qr-badge.ts
 */
import { renderBadgeQR } from "../src/lib/qr-badge";
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";

const OUT = "/home/z/my-project/download/qr-concepts";
mkdirSync(OUT, { recursive: true });

// URL GS1 réaliste : 63 caractères (pire cas réaliste de densité)
const GS1_URL = "https://verifscan.com/01/03760085432107/10/LOT2026A/21/A1B2C3D5";
const DEMO_URL = "https://verifscan.com/p/lot-demo?code=EXEMPLE-3CM";

async function main() {
  // 1. Visuel principal — URL démo, ECC Q (design fidèle au modèle)
  const demo = await renderBadgeQR(DEMO_URL, { size: 1200 });
  writeFileSync(`${OUT}/badge-final-demo.png`, demo.buffer);
  console.log(`badge-final-demo.png        ${demo.width}px  (${(demo.buffer.length / 1024).toFixed(0)} Ko)`);

  // 2. Pire cas densité — URL GS1 63 chars, ECC Q (défaut)
  const gs1q = await renderBadgeQR(GS1_URL, { size: 1200 });
  writeFileSync(`${OUT}/badge-gs1-Q.png`, gs1q.buffer);
  console.log(`badge-gs1-Q.png             ${gs1q.width}px  (${(gs1q.buffer.length / 1024).toFixed(0)} Ko)`);

  // 3. URL GS1, ECC M (modules encore plus grands)
  const gs1m = await renderBadgeQR(GS1_URL, { size: 1200, errorCorrectionLevel: "M" });
  writeFileSync(`${OUT}/badge-gs1-M.png`, gs1m.buffer);
  console.log(`badge-gs1-M.png             ${gs1m.width}px  (${(gs1m.buffer.length / 1024).toFixed(0)} Ko)`);

  // 4. Simulation impression 3 cm : 1200px → 354px (300 DPI) pour test pyzbar
  for (const [name, buf] of [
    ["badge-final-demo", demo.buffer],
    ["badge-gs1-Q", gs1q.buffer],
    ["badge-gs1-M", gs1m.buffer],
  ] as const) {
    const at3cm = await sharp(buf).resize(354, 354).png().toBuffer();
    writeFileSync(`${OUT}/${name}-3cm-sim.png`, at3cm);
  }
  console.log("Simulations 3cm (354px = 300 DPI) écrites.");
}

main().catch((e) => {
  console.error("ÉCHEC:", e);
  process.exit(1);
});
