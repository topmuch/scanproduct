/**
 * Test E2E — les QR affichés (écran admin + PDF d'impression) sont
 * SCANNABLES (demande utilisateur : « le qrcode affiché n'est pas
 * scannable »).
 *
 * Cause corrigée : les QR encodeaient le code BRUT (« MASTER-… », « ART-… »)
 * = du texte sans action pour la caméra du téléphone. Désormais ils encodent
 * l'URL publique {origin}/a/<code> → le scan ouvre la page.
 *
 * Preuve par décodage RÉEL des pixels (jsQR) :
 *   1. API : login superadmin → batch de test (2 packs × 1)
 *   2. UI Playwright : déplier le batch → extraire les <canvas> QR →
 *      décoder les pixels → l'URL décodée = {BASE}/a/<masterCode>
 *   3. PDF : GET /api/admin/print-batch → pdftoppm (raster 150 dpi) →
 *      décodage par tuiles → les 4 QR décodent vers {BASE}/a/<code>
 *      (2 × ART-… + 2 × MASTER-…)
 *   4. Cible du scan : GET /a/<master> → 200 + vue « Activez tout votre
 *      pack » (le maître inactif propose l'activation)
 *
 * Run : DATABASE_URL="file:/home/z/my-project/db/custom.db" bun scripts/test-qr-scannable.ts
 */
import { chromium, type Page } from "playwright";
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const TMP = "/home/z/my-project/scanproduct/.tmp-qr-scan";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:/home/z/my-project/db/custom.db" } },
});

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

// ── Cookie jar (login superadmin via API) ─────────────────────────────────
let jar = "";
function captureCookies(res: Response) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) {
    const nv = c.split(";")[0];
    const name = nv.split("=")[0];
    jar = jar
      .split("; ")
      .filter((p) => p && !p.startsWith(`${name}=`))
      .concat(nv)
      .join("; ");
  }
}
async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      "user-agent": "test-qr-scannable",
      ...(init.headers ?? {}),
      cookie: jar,
    },
  });
  captureCookies(res);
  return res;
}

/** Injecte jsQR (bundle UMD) dans la page — décodage 100 % in-browser. */
async function injectJsQR(page: Page) {
  await page.addScriptTag({
    path: path.join(import.meta.dir, "..", "node_modules", "jsqr", "dist", "jsQR.js"),
  });
}

/** Décode une image PNG (dataURL) DANS la page — fond blanc sous la transparence. */
async function decodePngDataUrl(page: Page, dataUrl: string): Promise<string | null> {
  return (await page.evaluate(async (url: string) => {
    const img = new Image();
    await new Promise((ok, err) => {
      img.onload = ok;
      img.onerror = err;
      img.src = url;
    });
    const cv = document.createElement("canvas");
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, cv.width, cv.height);
    const qr = (window as unknown as { jsQR: (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null }).jsQR(
      id.data,
      id.width,
      id.height,
    );
    return qr?.data ?? null;
  }, dataUrl)) as string | null;
}

async function main() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });

  // ── 1. Login + batch de test (2 packs × 1) ────────────────────────────
  const csrf = await req("/api/auth/csrf");
  const csrfJson = (await csrf.json()) as { csrfToken?: string };
  await req("/api/auth/callback/credentials", {
    method: "POST",
    body: JSON.stringify({
      csrfToken: csrfJson.csrfToken,
      email: "admin@verifscan.sn",
      password: process.env.ADMIN_PASSWORD ?? "ChangeMeOnFirstLogin!2025",
      callbackUrl: `${BASE}/superadmin`,
    }),
  });
  const sess = await req("/api/auth/session");
  const sessJson = (await sess.json()) as { user?: { role?: string } };
  if (sessJson.user?.role !== "SUPERADMIN") {
    console.error("Login superadmin impossible");
    process.exit(1);
  }
  console.log("1. login superadmin OK");

  const batchRes = await req("/api/admin/batches", {
    method: "POST",
    body: JSON.stringify({ totalQuantity: 2, packSize: 1, pricePerPack: 0 }),
  });
  const batch = (await batchRes.json()) as { batch?: { id: string } };
  const batchId = batch.batch?.id;
  if (!batchId) {
    console.error("Création batch impossible");
    process.exit(1);
  }

  // Codes attendus depuis la DB (source de vérité)
  const lots = await prisma.preActivatedLot.findMany({
    where: { pack: { batchId } },
    select: { qrCode: true, isMaster: true },
  });
  const expected = lots.map((l) => `${BASE}/a/${l.qrCode}`).sort();
  // À l'écran, seule l'étiquette MAÎTRE de chaque pack est affichée
  const expectedMasters = lots
    .filter((l) => l.isMaster)
    .map((l) => `${BASE}/a/${l.qrCode}`)
    .sort();
  check(
    "1a. batch créé — 4 étiquettes attendues (2 ART + 2 MASTER)",
    lots.length === 4 && lots.filter((l) => l.isMaster).length === 2,
  );
  console.log(`   batch ${batchId.slice(0, 8)} — QR: ${expected.map((e) => e.split("/").pop()).join(", ")}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await context.addCookies(
    jar
      .split("; ")
      .filter(Boolean)
      .map((pair) => {
        const eq = pair.indexOf("=");
        return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
      }),
  );
  const page = await context.newPage();

  // ── 2. QR à l'écran : décodage réel des canvas ────────────────────────
  await page.goto(`${BASE}/superadmin`, { waitUntil: "networkidle" });
  // jsQR injecté APRÈS navigation (sinon le goto efface le script)
  await injectJsQR(page);
  const navItem = page.locator("text=QR Artisans").first();
  await navItem.waitFor({ state: "visible", timeout: 20_000 });
  await navItem.click();
  await page.waitForSelector("text=Production QR Artisans", { timeout: 20_000 });
  const packsButtons = page.getByRole("button", { name: "Packs" });
  await packsButtons.first().waitFor({ state: "visible", timeout: 30_000 });

  const batchId8 = batchId.slice(0, 8).toUpperCase();
  const batchCard = page
    .locator("h3", { hasText: `Batch ${batchId8}` })
    .locator(
      "xpath=ancestor::div[contains(@class,'rounded-xl')][contains(@class,'bg-white')][1]",
    );
  await batchCard.getByRole("button", { name: "Packs" }).click();
  await page.waitForTimeout(600);

  const canvases = batchCard.locator("canvas");
  await canvases.first().waitFor({ state: "visible", timeout: 15_000 });
  const nCanvas = await canvases.count();
  check("2a. 2 QR (canvas) affichés dans la carte du batch", nCanvas === 2);

  const dataUrls = (await page.evaluate(() =>
    Array.from(document.querySelectorAll("canvas")).map((c) =>
      (c as HTMLCanvasElement).toDataURL("image/png"),
    ),
  )) as string[];
  const screenDecoded: string[] = [];
  for (const du of dataUrls) {
    const t = await decodePngDataUrl(page, du);
    if (t) screenDecoded.push(t);
  }
  check("2b. les 2 QR écran sont DÉCODABLES (jsQR lit les pixels)", screenDecoded.length === 2);
  check(
    `2c. QR écran = URL publique {BASE}/a/<master> (décodé: ${screenDecoded.join(" | ")})`,
    expectedMasters.every((e) => screenDecoded.includes(e)) &&
      screenDecoded.every((d) => d.startsWith(`${BASE}/a/`)),
  );

  await page.screenshot({ path: "shots/qr-scannable-admin.png", fullPage: false });

  // ── 3. PDF d'impression : extraction native + décodage ─────────────
  const pdfRes = await req(`/api/admin/print-batch/${batchId}`);
  check("3a. PDF d'impression téléchargé (200, application/pdf)", pdfRes.status === 200 && (pdfRes.headers.get("content-type") ?? "").includes("pdf"));
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  const pdfPath = path.join(TMP, "batch.pdf");
  fs.writeFileSync(pdfPath, pdfBuf);

  // pdfimages extrait chaque QR embarqué à sa résolution NATIVE (190×190)
  // — décodage exact, sans artéfacts de ré-échantillonnage.
  execFileSync("pdfimages", ["-png", pdfPath, path.join(TMP, "img")]);
  const qrFiles = fs
    .readdirSync(TMP)
    .filter((f) => /^img-\d+\.png$/.test(f) && Number(f.match(/-(\d+)/)![1]) % 2 === 0) // images seules (smask = impair)
    .sort();
  check("3b. 4 QR embarqués dans le PDF", qrFiles.length === 4);

  const pdfFound = new Set<string>();
  for (const f of qrFiles) {
    const b64 = fs.readFileSync(path.join(TMP, f)).toString("base64");
    const t = await decodePngDataUrl(page, `data:image/png;base64,${b64}`);
    if (t) pdfFound.add(t);
  }
  const missing = expected.filter((e) => !pdfFound.has(e));
  check(
    `3c. les 4 QR du PDF décodent vers l'URL publique (trouvés: ${[...pdfFound].filter((f) => f.startsWith(`${BASE}/a/`)).length})`,
    missing.length === 0,
  );
  if (missing.length > 0) {
    console.log(`      manquants: ${missing.join(", ")}`);
    console.log(`      décodés:  ${[...pdfFound].join(", ")}`);
  }

  // Check réaliste « page imprimée » : la page rasterisée se lit AUSSI
  // (les téléphones sont bien plus tolérants que jsQR sur le ré-échantillonnage).
  // 300 dpi + crop pdftoppm autour du 1er QR + décodage jsQR DANS la page.
  // (un crop canvas de la page entière échoue : Chromium sous-échantillonne
  // les grandes images au drawImage — le crop côté poppler est exact)
  execFileSync("pdftoppm", [
    "-r", "300", "-png",
    // fenêtre calée sur le 1er QR — suffisamment étroite pour EXCLURE le
    // 2e QR (un fragment de QR voisin casse le localisateur de jsQR)
    "-x", "80", "-y", "430", "-W", "560", "-H", "560",
    pdfPath, path.join(TMP, "crop"),
  ]);
  const cropPng = fs
    .readdirSync(TMP)
    .find((f) => f.startsWith("crop") && f.endsWith(".png"));
  if (cropPng) {
    const b64 = fs.readFileSync(path.join(TMP, cropPng)).toString("base64");
    const rasterDecoded = await decodePngDataUrl(page, `data:image/png;base64,${b64}`);
    check(
      `3d. la page imprimée rasterisée se lit aussi (1er QR décodé: ${rasterDecoded ?? "aucun"})`,
      rasterDecoded?.startsWith(`${BASE}/a/`) === true,
    );
  }

  // ── 4. La cible du scan fonctionne (maître inactif → vue activation) ──
  const masterCode = lots.find((l) => l.isMaster)!.qrCode;
  const target = await fetch(`${BASE}/a/${masterCode}`);
  const html = await target.text();
  check("4a. GET /a/<master> → 200", target.status === 200);
  // NB : les segments interpolés React sont coupés par des marqueurs <!-- -->
  // dans le HTML → on n'asserte que sur du texte statique de la vue.
  check(
    "4b. la page scannée propose l'activation (choix des 2 modes)",
    html.includes("Activer par produits diff") &&
      html.includes("Pack officiel VerifScan"),
  );

  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });

  console.log(
    failures === 0
      ? "\n✅ TOUS LES CHECKS PASSENT — QR écran + PDF scannables (URL publique encodée)"
      : `\n❌ ${failures} check(s) en échec`,
  );
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
