/**
 * Génère les QR Codes d'exemple VerifScan (PNG) pour /home/z/my-project/download/ :
 *  - QR GS1 Digital Link complet (GTIN + lot + série) — client industriel
 *  - QR GS1 GTIN seul
 *  - QR standard (petit producteur)
 * Domaines de production (GS1_DOMAIN / NEXT_PUBLIC_SCAN_URL).
 */
const QR = require("qrcode").default || require("qrcode");
const fs = require("fs");
const path = require("path");

const OUT = "/home/z/my-project/download/qrs-verifscan";
fs.mkdirSync(OUT, { recursive: true });

const GS1_DOMAIN = "https://verifscan.pro";
const STD_DOMAIN = "https://verifscan.pro";

const cibles = [
  {
    fichier: "qr-gs1-complet-huile-baobab.png",
    url: `${GS1_DOMAIN}/01/04006381333931/10/SAR-BAO-250-001/21/SN-DEMO-001`,
    legende: "GS1 Digital Link complet (GTIN + lot + série)",
  },
  {
    fichier: "qr-gs1-gtin-seul.png",
    url: `${GS1_DOMAIN}/01/04006381333931`,
    legende: "GS1 Digital Link GTIN seul",
  },
  {
    fichier: "qr-standard-produit-local.png",
    url: `${STD_DOMAIN}/r/cmufxevns0020kwx0f5zplbj9`,
    legende: "QR standard (petit producteur)",
  },
];

(async () => {
  for (const c of cibles) {
    await QR.toFile(path.join(OUT, c.fichier), c.url, {
      type: "png",
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0F172A", light: "#FFFFFF" },
    });
    console.log(`✅ ${c.fichier} — ${c.legende}`);
    console.log(`   ${c.url}`);
  }
  console.log(`\nDossier de sortie : ${OUT}`);
})();
