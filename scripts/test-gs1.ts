/**
 * ============================================================================
 * VerifScan — Tests unitaires de la bibliothèque GS1 Digital Link
 * ============================================================================
 * Exécution :  bun scripts/test-gs1.ts
 * (ou : npx tsx scripts/test-gs1.ts)
 * ============================================================================
 */

import {
  verifierCheckDigitGtin,
  normaliserGtin,
  validerLot,
  validerSerie,
  genererUrlStandard,
  genererUrlGs1,
  genererNumeroSerie,
  parserUrlGs1,
  estUrlGs1,
  ErreurGs1,
} from "../src/lib/gs1";

let reussis = 0;
let echoues = 0;

/** Mini-assertion lisible avec comptage. */
function verif(nom: string, condition: boolean, extra?: unknown): void {
  if (condition) {
    reussis++;
    console.log(`  ✅ ${nom}`);
  } else {
    echoues++;
    console.error(`  ❌ ${nom}`, extra !== undefined ? extra : "");
  }
}

// ---------------------------------------------------------------------------
// 1. Check digit GTIN (algorithme Modulo 10 GS1)
// ---------------------------------------------------------------------------
console.log("\n▶ Check digit GTIN");
// GTIN valides connus (exemples officiels / produits réels) :
verif("GTIN-12 036000291452 valide", verifierCheckDigitGtin("036000291452"));
verif("GTIN-13 9780201379624 valide", verifierCheckDigitGtin("9780201379624"));
verif("GTIN-13 4006381333931 valide", verifierCheckDigitGtin("4006381333931"));
verif("GTIN-14 00614141000012 valide", verifierCheckDigitGtin("00614141000012"));
verif("Chiffre de contrôle erroné rejeté", !verifierCheckDigitGtin("036000291453"));
verif("Lettres rejetées", !verifierCheckDigitGtin("0360002A1452"));

// ---------------------------------------------------------------------------
// 2. Normalisation GTIN
// ---------------------------------------------------------------------------
console.log("\n▶ Normalisation GTIN");
verif(
  "GTIN-13 padé en GTIN-14",
  normaliserGtin("4006381333931") === "04006381333931",
  normaliserGtin("4006381333931")
);
verif(
  "GTIN-12 padé en GTIN-14",
  normaliserGtin("036000291452") === "00036000291452",
  normaliserGtin("036000291452")
);
verif("Check digit faux → null", normaliserGtin("4006381333932") === null);
verif("Trop court (7 chiffres) → null", normaliserGtin("4006381") === null);
verif("15 chiffres → null", normaliserGtin("40063813339310") === null);

// ---------------------------------------------------------------------------
// 3. Validation lot (AI 10) et série (AI 21) — CSET restreint
// ---------------------------------------------------------------------------
console.log("\n▶ Validation lot / série");
verif("Lot alphanumérique valide", validerLot("LOT-2026-A") === "LOT-2026-A");
verif("Lot avec + $ % espace valide", validerLot("LOT 2026+A%1$") === "LOT 2026+A%1$");
verif("Lot > 20 caractères rejeté", validerLot("A".repeat(21)) === null);
verif("Lot avec <script> rejeté", validerLot("<script>") === null);
verif("Path traversal rejeté", validerLot("../../admin") === null);
verif("Série valide", validerSerie("SN-000001") === "SN-000001");
verif("Série avec guillemets rejetée", validerSerie('SN"01') === null);

// ---------------------------------------------------------------------------
// 4. GÉNÉRATION — QR standard (petits producteurs)
// ---------------------------------------------------------------------------
console.log("\n▶ Génération URL standard");
const urlStd = genererUrlStandard("clx9abcd1234efgh5678", "https://verifscan.pro");
verif(
  "Format https://verifscan.pro/r/<id>",
  urlStd === "https://verifscan.pro/r/clx9abcd1234efgh5678",
  urlStd
);
try {
  genererUrlStandard("../etc/passwd", "https://verifscan.pro");
  verif("ID malveillant rejeté (throw attendu)", false);
} catch (e) {
  verif(
    "ID malveillant rejeté (throw attendu)",
    e instanceof ErreurGs1 && e.code === "ID_PRODUIT_INVALIDE"
  );
}

// ---------------------------------------------------------------------------
// 5. GÉNÉRATION — GS1 Digital Link (clients industriels)
// ---------------------------------------------------------------------------
console.log("\n▶ Génération URL GS1 Digital Link");
const urlGs1 = genererUrlGs1(
  { gtin: "4006381333931", lot: "LOT-2026-A", serie: "SN-000001" },
  "https://verifscan.com"
);
verif(
  "Format /01/<GTIN>/10/<LOT>/21/<SERIE>",
  urlGs1 ===
    "https://verifscan.com/01/04006381333931/10/LOT-2026-A/21/SN-000001",
  urlGs1
);
const urlGs1SansSerie = genererUrlGs1(
  { gtin: "4006381333931", lot: "LOT-2026-A" },
  "https://verifscan.com"
);
verif(
  "Sans série → /01/<GTIN>/10/<LOT>",
  urlGs1SansSerie === "https://verifscan.com/01/04006381333931/10/LOT-2026-A",
  urlGs1SansSerie
);
try {
  genererUrlGs1({ gtin: "4006381333932" });
  verif("GTIN check digit faux rejeté", false);
} catch (e) {
  verif(
    "GTIN check digit faux rejeté",
    e instanceof ErreurGs1 && e.code === "GTIN_INVALIDE"
  );
}
try {
  genererUrlGs1({ gtin: "4006381333931", lot: "LOT;DROP" });
  verif("Lot avec ; rejeté", false);
} catch (e) {
  verif(
    "Lot avec ; rejeté",
    e instanceof ErreurGs1 && e.code === "LOT_INVALIDE"
  );
}

// ---------------------------------------------------------------------------
// 6. DÉCODAGE — parser GS1 (les 4 formes du standard)
// ---------------------------------------------------------------------------
console.log("\n▶ Décodage GS1 Digital Link");

// Forme numérique canonique
const d1 = parserUrlGs1(
  "https://verifscan.com/01/04006381333931/10/LOT-2026-A/21/SN-000001"
);
verif(
  "Forme numérique complète",
  !!d1 &&
    d1.gtin === "04006381333931" &&
    d1.lot === "LOT-2026-A" &&
    d1.serie === "SN-000001",
  d1
);

// GTIN + lot sans série
const d2 = parserUrlGs1("/01/04006381333931/10/LOT-2026-A");
verif(
  "Forme numérique sans série",
  !!d2 && d2.gtin === "04006381333931" && d2.lot === "LOT-2026-A" && !d2.serie,
  d2
);

// GTIN seul
const d3 = parserUrlGs1("/01/04006381333931");
verif("GTIN seul", !!d3 && d3.gtin === "04006381333931" && !d3.lot && !d3.serie, d3);

// Forme mots-clés
const d4 = parserUrlGs1(
  "https://verifscan.com/gtin/04006381333931/lot/LOT-2026-A/ser/SN-000001"
);
verif(
  "Forme mots-clés (gtin/lot/ser)",
  !!d4 &&
    d4.gtin === "04006381333931" &&
    d4.lot === "LOT-2026-A" &&
    d4.serie === "SN-000001",
  d4
);

// Forme query params
const d5 = parserUrlGs1(
  "https://verifscan.com/r?01=04006381333931&10=LOT-2026-A&21=SN-000001"
);
verif(
  "Forme query params (?01=&10=&21=)",
  !!d5 &&
    d5.gtin === "04006381333931" &&
    d5.lot === "LOT-2026-A" &&
    d5.serie === "SN-000001",
  d5
);

// AI additionnel ignoré proprement (ex: AI 17 = date de durabilité minimale)
const d6 = parserUrlGs1(
  "https://verifscan.com/01/04006381333931/17/261231/10/LOT-2026-A"
);
verif(
  "AI additionnel (17) ignoré, lot extrait",
  !!d6 && d6.lot === "LOT-2026-A",
  d6
);

// Tableau de segments (format Next.js catch-all)
const d7 = parserUrlGs1(["01", "04006381333931", "10", "LOT-2026-A", "21", "SN-1"]);
verif(
  "Tableau de segments Next.js",
  !!d7 && d7.gtin === "04006381333931" && d7.lot === "LOT-2026-A",
  d7
);

// Cas d'erreur
verif("URL non-GS1 → null", parserUrlGs1("/produits/poudre-gingembre") === null);
try {
  parserUrlGs1("/01/GTIN-FAUX/10/LOT");
  verif("GTIN alphabétique rejeté (throw)", false);
} catch (e) {
  verif("GTIN alphabétique rejeté (throw)", e instanceof ErreurGs1);
}
try {
  parserUrlGs1("/01/04006381333931/10/../../admin");
  verif("Path traversal dans lot rejeté (throw)", false);
} catch {
  verif("Path traversal dans lot rejeté (throw)", true);
}

// ---------------------------------------------------------------------------
// 7. Détection rapide estUrlGs1
// ---------------------------------------------------------------------------
console.log("\n▶ Détection estUrlGs1");
verif("/01/… détecté GS1", estUrlGs1("/01/04006381333931/10/A") === true);
verif("Segments [01,…] détectés GS1", estUrlGs1(["01", "04006381333931"]) === true);
verif("/produits/… non-GS1", estUrlGs1("/produits") === false);
verif("Chemin vide non-GS1", estUrlGs1([]) === false);

// ---------------------------------------------------------------------------
// 8. Numéros de série AI 21 (génération sérialisée des QR imprimés)
// ---------------------------------------------------------------------------
console.log("\n▶ Génération de numéros de série (AI 21)");
const series = new Set<string>();
let tousConformes = true;
for (let i = 0; i < 500; i++) {
  const s = genererNumeroSerie(i);
  if (s.length > 20 || !/^[A-Z0-9]+$/.test(s)) tousConformes = false;
  series.add(s);
}
verif("500 séries : toutes ≤ 20 caractères et alphanumériques", tousConformes);
verif("500 séries : toutes uniques (unicité pratique)", series.size === 500);

// ---------------------------------------------------------------------------
// 9. construireUrlQrPourLot — choix automatique GS1 / standard
// ---------------------------------------------------------------------------
console.log("\n▶ construireUrlQrPourLot (choix automatique)");
const { construireUrlQrPourLot } = await import("../src/lib/gs1-resolver");

const rGs1 = construireUrlQrPourLot({
  produit: { id: "prod1", barcode: "4006381333931" },
  lot: { lotNumber: "LOT-2026-A", reference: "REF-1" },
  serie: "SN-000001",
  fallbackUrl: "https://verifscan.pro/p/lotX?code=ABC",
  origine: "https://verifscan.pro",
});
verif(
  "Barcode GTIN valide → URI GS1",
  rGs1.format === "GS1" &&
    rGs1.url ===
      "https://verifscan.pro/01/04006381333931/10/LOT-2026-A/21/SN-000001",
  rGs1
);

const rStd = construireUrlQrPourLot({
  produit: { id: "prod2", barcode: null },
  lot: { lotNumber: "LOT-B", reference: "REF-2" },
  serie: "SN-000002",
  fallbackUrl: "https://verifscan.pro/p/lotY?code=XYZ",
  origine: "https://verifscan.pro",
});
verif(
  "Sans barcode → fallbackUrl (analytics ?code= conservées)",
  rStd.format === "STANDARD" &&
    rStd.url === "https://verifscan.pro/p/lotY?code=XYZ",
  rStd
);

const rStdSansFallback = construireUrlQrPourLot({
  produit: { id: "prod3xyz789", barcode: "PAS-UN-GTIN" },
  lot: { lotNumber: "LOT-C", reference: "REF-3" },
  origine: "https://verifscan.pro",
});
verif(
  "Barcode non-GTIN → URL standard /r/<id>",
  rStdSansFallback.format === "STANDARD" &&
    rStdSansFallback.url === "https://verifscan.pro/r/prod3xyz789",
  rStdSansFallback
);

// ---------------------------------------------------------------------------
// 10. construireUrlQrClient — helper dashboard (qr-url.ts, client-safe)
// ---------------------------------------------------------------------------
console.log("\n▶ construireUrlQrClient (helper client)");
process.env.NEXT_PUBLIC_SCAN_URL = "https://verifscan.pro"; // origine déterministe
const { construireUrlQrClient } = await import("../src/lib/qr-url");

// 10a. GTIN valide + code d'impression court (série AI 21) → GS1 unitaire
const c1 = construireUrlQrClient({
  barcode: "4006381333931",
  numeroLot: "SAR-BAO-250-001",
  lotId: "lot123",
  code: "SMUG01YJT0PWWV",
});
verif(
  "GTIN + code court → GS1 avec série AI 21",
  c1.format === "GS1" &&
    c1.url ===
      "https://verifscan.pro/01/04006381333931/10/SAR-BAO-250-001/21/SMUG01YJT0PWWV",
  c1
);

// 10b. GTIN valide + code long (QR historique pré-GS1) → GS1 sans AI 21
const c2 = construireUrlQrClient({
  barcode: "4006381333931",
  numeroLot: "SAR-BAO-250-001",
  lotId: "lot123",
  code: "SAR-BAO-250-001-1735689600000-0-AB3F9X",
});
verif(
  "GTIN + code long → GS1 sans AI 21 (GTIN+LOT)",
  c2.format === "GS1" &&
    c2.url === "https://verifscan.pro/01/04006381333931/10/SAR-BAO-250-001",
  c2
);

// 10c. GTIN valide, pas de code → QR générique de lot (GS1 sans série)
const c3 = construireUrlQrClient({
  barcode: "4006381333931",
  numeroLot: "SAR-BAO-250-001",
  lotId: "lot123",
});
verif(
  "GTIN sans code → GS1 générique (GTIN+LOT)",
  c3.format === "GS1" &&
    c3.url === "https://verifscan.pro/01/04006381333931/10/SAR-BAO-250-001",
  c3
);

// 10d. Sans barcode + code → URL standard avec analytics ?code=
const c4 = construireUrlQrClient({
  barcode: null,
  numeroLot: "LOT-LIBRE",
  lotId: "lot456",
  code: "LOT-LIBRE-1735689600000-3-XY77QZ",
});
verif(
  "Sans GTIN + code → standard /p/<lotId>?code=",
  c4.format === "STANDARD" &&
    c4.url ===
      "https://verifscan.pro/p/lot456?code=LOT-LIBRE-1735689600000-3-XY77QZ",
  c4
);

// 10e. Sans barcode, sans code → /p/<lotId> nu
const c5 = construireUrlQrClient({
  barcode: undefined,
  numeroLot: "LOT-LIBRE",
  lotId: "lot456",
});
verif(
  "Sans GTIN ni code → /p/<lotId>",
  c5.format === "STANDARD" && c5.url === "https://verifscan.pro/p/lot456",
  c5
);

// 10f. LotNumber hors CSET 82 (caractères accentués) → repli standard sûr
const c6 = construireUrlQrClient({
  barcode: "4006381333931",
  numeroLot: "LOT ÉTÉ 2026", // É hors charset → ErreurGs1 → repli
  lotId: "lot789",
  code: "SMUG01YJT0PWWV",
});
verif(
  "LotNumber hors CSET → repli standard (pas de throw)",
  c6.format === "STANDARD" &&
    c6.url ===
      "https://verifscan.pro/p/lot789?code=SMUG01YJT0PWWV",
  c6
);

// 10g. GTIN invalide (check digit faux) → traité comme sans GTIN
const c7 = construireUrlQrClient({
  barcode: "4006381333932", // dernier chiffre faux
  numeroLot: "LOT-D",
  lotId: "lot999",
});
verif(
  "GTIN check-digit invalide → standard",
  c7.format === "STANDARD" && c7.url === "https://verifscan.pro/p/lot999",
  c7
);

// ---------------------------------------------------------------------------
// Bilan
// ---------------------------------------------------------------------------
console.log(
  `\n${"=".repeat(60)}\nBilan : ${reussis} test(s) réussi(s), ${echoues} échec(s)\n${"=".repeat(60)}`
);
if (echoues > 0) process.exit(1);
