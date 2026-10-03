/**
 * test-flexible-activation.ts — E2E de l'ACTIVATION FLEXIBLE (2 modes).
 *
 * Couvre la demande utilisateur :
 *   1. Un pack de 200 QR peut contenir PLUSIEURS produits différents
 *   2. Activation par groupes (100 karité + 50 lavande + 50 miel)
 *   3. Barre de progression (X/Y activés, restants)
 *   4. Dashboard artisan : tous les produits avec QR + scans
 *   5. Modification en masse par produit (ne touche que LE produit)
 *   + Mode 1 conservé : tout le pack d'un coup (+ restant sur pack partiel)
 *
 * Usage : bun scripts/test-flexible-activation.ts
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE ?? "http://localhost:3100";
const prisma = new PrismaClient();
const SHOTS = "shots";

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, extra = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${extra ? ` — ${extra}` : ""}`);
  }
}

// ── Cookie jar cumulatif (NextAuth pose plusieurs cookies) ────────────────
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
      ...(init.headers ?? {}),
      cookie: jar,
    },
  });
  captureCookies(res);
  return res;
}

async function cleanupBatch(batchId: string) {
  const packs = await prisma.pack.findMany({ where: { batchId } });
  const packIds = packs.map((p) => p.id);
  const lots = await prisma.preActivatedLot.findMany({
    where: { packId: { in: packIds } },
    select: { id: true },
  });
  if (lots.length > 0) {
    await prisma.artisanScan.deleteMany({ where: { lotId: { in: lots.map((l) => l.id) } } });
    await prisma.artisanReview.deleteMany({ where: { lotId: { in: lots.map((l) => l.id) } } });
  }
  await prisma.preActivatedLot.deleteMany({ where: { packId: { in: packIds } } });
  await prisma.pack.deleteMany({ where: { id: { in: packIds } } });
  await prisma.batch.delete({ where: { id: batchId } }).catch(() => {});
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  let batchA = "";
  let batchB = "";

  try {
    // ═══ SETUP : batch A = 1 pack de 200 ══════════════════════════════════
    console.log("\n── SETUP : batch A (1 pack de 200 QR) ──");
    const csrf = (await (await req("/api/auth/csrf")).json()) as { csrfToken: string };
    await req("/api/auth/callback/credentials", {
      method: "POST",
      body: JSON.stringify({
        csrfToken: csrf.csrfToken,
        email: "admin@verifscan.sn",
        password: process.env.ADMIN_PASSWORD ?? "ChangeMeOnFirstLogin!2025",
        callbackUrl: `${BASE}/superadmin`,
      }),
    });
    const batchRes = await req("/api/admin/batches", {
      method: "POST",
      body: JSON.stringify({ totalQuantity: 200, packSize: 200, pricePerPack: 70000 }),
    });
    const batchJson = (await batchRes.json()) as { batch?: { id: string } };
    batchA = batchJson.batch!.id;
    check("batch A créé (200 QR, 1 pack)", batchRes.status === 201 || batchRes.status === 200);

    const packA = (await prisma.pack.findFirst({ where: { batchId: batchA } }))!;
    const masterA = packA.masterQrCode;
    check("maître A présent", Boolean(masterA), masterA);

    const sellRes = await req("/api/admin/sell-pack", {
      method: "POST",
      body: JSON.stringify({
        packId: packA.id,
        artisanPhone: "775001122",
        artisanName: "Atelier Flexible",
      }),
    });
    check("pack A vendu à l'artisan", sellRes.ok || sellRes.status === 409);

    // ═══ 1. ÉTAT INITIAL + ÉCRAN DE CHOIX ═════════════════════════════════
    console.log("\n── État initial + écran de choix des 2 modes ──");
    const st0 = (await (await fetch(`${BASE}/api/artisan/pack-status?masterCode=${masterA}`)).json()) as {
      quantity: number; activatedCount: number; remaining: number; status: string;
    };
    check("pack-status : 0/200 activé", st0.activatedCount === 0 && st0.quantity === 200);
    check("pack-status : status sold", st0.status === "sold", st0.status);

    const choiceRes = await page.goto(`${BASE}/activer-pack/${masterA}`, { waitUntil: "networkidle" });
    check("page /activer-pack HTTP 200", choiceRes?.status() === 200);
    check("choix MODE 1 visible", await page.getByTestId("choose-simple").isVisible());
    check("choix MODE 2 visible", await page.getByTestId("choose-flexible").isVisible());
    await page.screenshot({ path: `${SHOTS}/flexible-choice.png`, fullPage: true });

    // ═══ 2. ACTIVATION FLEXIBLE PAR L'UI : 100 + 50 + 50 ══════════════════
    console.log("\n── Mode flexible via UI : 100 karité + 50 lavande + 50 miel ──");
    await page.getByTestId("choose-flexible").click();

    // É1/6 — Marque (infos communes)
    await page.waitForSelector("#sharedName", { timeout: 10000 });
    await page.fill("#sharedName", "Atelier Flexible");
    await page.fill("#sharedPhone", "775001122");
    await page.getByTestId("wizard-next").click();

    const groupsData = [
      { count: "100", name: "Savon Karité", cont: "250 g", ing: "Beurre de karité, huile de coco", price: "5 000 FCFA" },
      { count: "50", name: "Savon Lavande", cont: "150 g", ing: "Huile essentielle de lavande, soude", price: "3 000 FCFA" },
      { count: "50", name: "Savon Miel", cont: "100 g", ing: "Miel, glycérine végétale", price: "4 000 FCFA" },
    ];
    // É2/6 — Produits (répartition)
    for (let i = 0; i < groupsData.length; i++) {
      if (i > 0) await page.getByTestId("add-group").click();
      const g = groupsData[i];
      await page.getByTestId(`group-count-${i}`).fill(g.count);
      await page.getByTestId(`group-name-${i}`).fill(g.name);
    }
    await page.getByTestId("wizard-next").click();
    // É3/6 — Ingrédients (par produit)
    for (let i = 0; i < groupsData.length; i++) {
      await page.getByTestId(`group-ingredients-${i}`).fill(groupsData[i].ing);
    }
    await page.getByTestId("wizard-next").click();
    // É4/6 — Fraîcheur & détails (par produit)
    for (let i = 0; i < groupsData.length; i++) {
      await page.getByTestId(`group-contenance-${i}`).fill(groupsData[i].cont);
      await page.getByTestId(`group-price-${i}`).fill(groupsData[i].price);
      await page.getByTestId(`group-mfg-${i}`).fill("2026-01-15");
      await page.getByTestId(`group-exp-${i}`).fill("2027-01-15");
    }
    await page.getByTestId("wizard-next").click();
    // É5/6 — Photos & logo (optionnel) → passer
    await page.getByTestId("wizard-next").click();
    // É6/6 — Récapitulatif
    check("récapitulatif répartition 200/200", (await page.getByTestId("flex-summary").textContent())?.includes("200/200") ?? false);
    await page.screenshot({ path: `${SHOTS}/flexible-form.png`, fullPage: true });

    await page.getByTestId("flexible-submit").click();
    await page.waitForSelector("text=QR codes activés", { timeout: 30000 });
    const successText = await page.textContent("body");
    check("succès : 200 QR activés", successText?.includes("200 QR codes activés") ?? false);
    check("succès : progression 200/200", successText?.includes("200/200") ?? false);
    await page.screenshot({ path: `${SHOTS}/flexible-success.png`, fullPage: true });

    // ═══ 3. VÉRIFICATIONS DB : groupes, ordre, prix par lot ═══════════════
    console.log("\n── DB : répartition déterministe + prix par lot ──");
    const lotsA = await prisma.preActivatedLot.findMany({
      where: { packId: packA.id },
      orderBy: { qrCode: "asc" },
    });
    const byName = new Map<string, number>();
    for (const l of lotsA) if (!l.isMaster) byName.set(l.productName ?? "", (byName.get(l.productName ?? "") ?? 0) + 1);
    check("100 karité", byName.get("Savon Karité") === 100, JSON.stringify([...byName]));
    check("50 lavande", byName.get("Savon Lavande") === 50);
    check("50 miel", byName.get("Savon Miel") === 50);
    const labelsA = lotsA.filter((l) => !l.isMaster);
    const first = labelsA[0];
    check("karité = étiquettes 0001-0100 (ordre asc)", first?.productName === "Savon Karité" && first.qrCode.endsWith("-0001"));
    const mid = labelsA.find((l) => l.qrCode.endsWith("-0125"));
    check("étiquette 0125 = lavande", mid?.productName === "Savon Lavande");
    const last = labelsA[labelsA.length - 1];
    check("étiquette 0200 = miel", last?.productName === "Savon Miel");
    const masterLotA = lotsA.find((l) => l.isMaster);
    check("maître A activé (données 1er groupe)", masterLotA?.status === "active" && masterLotA?.productName === "Savon Karité");
    const packAAfter = await prisma.pack.findUnique({ where: { id: packA.id } });
    check("pack A status activated", packAAfter?.status === "activated", packAAfter?.status);
    const kariteLot = labelsA.find((l) => l.productName === "Savon Karité")!;
    check("prix PAR LOT : karité 5 000", kariteLot.productPrice === "5 000 FCFA", kariteLot.productPrice ?? "null");
    const mielLot = labelsA.find((l) => l.productName === "Savon Miel")!;
    check("prix PAR LOT : miel 4 000", mielLot.productPrice === "4 000 FCFA", mielLot.productPrice ?? "null");

    // ═══ 4. PAGES PUBLIQUES : chaque scan montre LE bon produit ═══════════
    console.log("\n── Pages publiques /a/<code> par produit ──");
    const pKarite = await page.goto(`${BASE}/a/${first.qrCode}`, { waitUntil: "networkidle" });
    check("page karité HTTP 200", pKarite?.status() === 200);
    const kariteBody = (await page.textContent("body")) ?? "";
    check("page karité : nom + prix du lot", kariteBody.includes("Savon Karité") && kariteBody.includes("5 000 FCFA"));
    const pMiel = await page.goto(`${BASE}/a/${last.qrCode}`, { waitUntil: "networkidle" });
    const mielBody = (await page.textContent("body")) ?? "";
    check("page miel : nom + prix du lot", pMiel?.status() === 200 && mielBody.includes("Savon Miel") && mielBody.includes("4 000 FCFA"));
    const pMaster = await page.goto(`${BASE}/a/${masterA}`, { waitUntil: "networkidle" });
    const masterBody = (await page.textContent("body")) ?? "";
    check("page maître activé = produit (1er groupe)", pMaster?.status() === 200 && masterBody.includes("Savon Karité"));

    // ═══ 5. DASHBOARD : les 3 produits avec QR + scans ════════════════════
    console.log("\n── Dashboard artisan : 3 produits, comptes QR, scans ──");
    // Un scan client sur le produit miel (preuve de scan distinct)
    await fetch(`${BASE}/api/artisan/track-scan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: last.qrCode, timezone: "Africa/Dakar", deviceType: "mobile" }),
    });
    const loginRes = await fetch(`${BASE}/api/artisan/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "775001122", password: "0000" }),
    });
    const loginJson = (await loginRes.json()) as { token?: string };
    check("login artisan 775001122", loginRes.ok && Boolean(loginJson.token));
    const dashJson = (await (await fetch(`${BASE}/api/artisan/dashboard`, {
      headers: { authorization: `Bearer ${loginJson.token}` },
    })).json()) as {
      products: Array<{ name: string; qrCount: number; scanCount: number }>;
      packs: Array<{ status: string; activatedCount: number; quantity: number }>;
    };
    const prodK = dashJson.products.find((p) => p.name === "Savon Karité");
    const prodL = dashJson.products.find((p) => p.name === "Savon Lavande");
    const prodM = dashJson.products.find((p) => p.name === "Savon Miel");
    check("dashboard : karité 100 QR", prodK?.qrCount === 100, String(prodK?.qrCount));
    check("dashboard : lavande 50 QR", prodL?.qrCount === 50);
    // ≥1 : la page /a/<miel> visitée au §4 auto-tracke un scan (ScanTracker)
    // + le scan manuel ci-dessus → au moins 2 sources, on vérifie non-nul.
    check("dashboard : miel 50 QR + scans comptés", prodM?.qrCount === 50 && (prodM?.scanCount ?? 0) >= 1);
    check("dashboard : pack activated 200/200", dashJson.packs[0]?.status === "activated" && dashJson.packs[0]?.activatedCount === 200);

    // UI dashboard (vue artisan)
    await page.goto(`${BASE}/artisan/login`, { waitUntil: "networkidle" });
    await page.fill("[data-testid='login-phone']", "775001122");
    await page.fill("[data-testid='login-password']", "0000");
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/artisan/dashboard", { timeout: 20000 });
    await page.waitForSelector("text=Savon Karité", { timeout: 20000 });
    const dashBody = (await page.textContent("body")) ?? "";
    check("UI dashboard : 3 produits affichés", dashBody.includes("Savon Karité") && dashBody.includes("Savon Lavande") && dashBody.includes("Savon Miel"));
    await page.screenshot({ path: `${SHOTS}/flexible-dashboard.png`, fullPage: true });

    // ═══ 6. MODIFICATION EN MASSE PAR PRODUIT ═════════════════════════════
    console.log("\n── Édition masse : modifier karité ne touche PAS lavande/miel ──");
    const putRes = await fetch(`${BASE}/api/artisan/products/${kariteLot.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: `Bearer ${loginJson.token}` },
      body: JSON.stringify({
        productName: "Savon Karité Bio",
        contenance: "250 g",
        ingredients: "Beurre de karité bio, huile de coco",
        manufacturingDate: "2026-01-15",
        expirationDate: "2027-01-15",
        artisanName: "Atelier Flexible",
        contactPhone: "775001122",
        productPrice: "6 000 FCFA",
      }),
    });
    const putJson = (await putRes.json()) as { updated?: number; error?: string };
    // 101 = 100 étiquettes + le maître (qui représente le 1er produit du
    // pack — il suit son groupe, cf. doc « maître inclus » de l'API).
    check("PUT karité : 101 QR mis à jour (100 étiquettes + maître)", putRes.ok && putJson.updated === 101, putJson.error ?? String(putJson.updated));
    const kariteAfter = await prisma.preActivatedLot.findMany({
      where: { packId: packA.id, productName: "Savon Karité Bio" },
    });
    check("100 étiquettes renommées karité Bio", kariteAfter.filter((l) => !l.isMaster).length === 100);
    check("maître suit le groupe karité", kariteAfter.some((l) => l.isMaster));
    check("prix karité mis à jour (par lot)", kariteAfter.every((l) => l.productPrice === "6 000 FCFA"));
    const lavandeAfter = await prisma.preActivatedLot.count({ where: { packId: packA.id, productName: "Savon Lavande" } });
    const mielAfter = await prisma.preActivatedLot.count({ where: { packId: packA.id, productName: "Savon Miel" } });
    check("lavande INTACTE (50)", lavandeAfter === 50);
    check("miel INTACT (50)", mielAfter === 50);
    await page.goto(`${BASE}/a/${first.qrCode}`, { waitUntil: "networkidle" });
    const karitePage2 = (await page.textContent("body")) ?? "";
    check("page publique : karité Bio + 6 000 FCFA", karitePage2.includes("Savon Karité Bio") && karitePage2.includes("6 000 FCFA"));

    // ═══ 7. SÉCURITÉ ══════════════════════════════════════════════════════
    console.log("\n── Sécurité ──");
    const again = await fetch(`${BASE}/api/artisan/activate-groups`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        masterCode: masterA,
        groups: [{ count: 10, productData: { productName: "Produit Test", contenance: "1", ingredients: "abc", manufacturingDate: "2026-01-01", expirationDate: "2027-01-01" } }],
        shared: { artisanName: "Atelier X", contactPhone: "770000000" },
      }),
    });
    check("ré-activation pack complet → 409", again.status === 409, String(again.status));
    const unknown = await fetch(`${BASE}/api/artisan/activate-groups`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        masterCode: "MASTER-UNKNOWN-000",
        groups: [{ count: 1, productData: { productName: "Produit Test", contenance: "1", ingredients: "abc", manufacturingDate: "2026-01-01", expirationDate: "2027-01-01" } }],
        shared: { artisanName: "Atelier X", contactPhone: "770000000" },
      }),
    });
    check("maître inconnu → 404", unknown.status === 404, String(unknown.status));

    // ═══ 8. PACK PARTIEL + MODE 1 SUR LE RESTANT ══════════════════════════
    console.log("\n── Pack partiel : progression + reprise par Mode 1 ──");
    const batchBRes = await req("/api/admin/batches", {
      method: "POST",
      body: JSON.stringify({ totalQuantity: 4, packSize: 2, pricePerPack: 5000 }),
    });
    const batchBJ = (await batchBRes.json()) as { batch?: { id: string } };
    batchB = batchBJ.batch!.id;
    const packsB = await prisma.pack.findMany({ where: { batchId: batchB }, orderBy: { packNumber: "asc" } });
    const packB1 = packsB[0];
    await req("/api/admin/sell-pack", {
      method: "POST",
      body: JSON.stringify({ packId: packB1.id, artisanPhone: "775003344", artisanName: "Atelier Partiel" }),
    });
    const partRes = await fetch(`${BASE}/api/artisan/activate-groups`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        masterCode: packB1.masterQrCode,
        groups: [{ count: 1, productData: { productName: "Savon Partiel", contenance: "200 g", ingredients: "Base neutre", manufacturingDate: "2026-02-01", expirationDate: "2027-02-01" } }],
        shared: { artisanName: "Atelier Partiel", contactPhone: "775003344" },
      }),
    });
    const partJson = (await partRes.json()) as { activatedTotal?: number; remaining?: number; fullyActivated?: boolean };
    check("activation 1/2 : partial, remaining 1", partRes.ok && partJson.activatedTotal === 1 && partJson.remaining === 1 && partJson.fullyActivated === false);

    const stB = (await (await fetch(`${BASE}/api/artisan/pack-status?masterCode=${packB1.masterQrCode}`)).json()) as {
      status: string; activatedCount: number; remaining: number; masterActive: boolean;
    };
    check("pack-status : partial 1/2, maître inactif", stB.status === "partial" && stB.activatedCount === 1 && stB.remaining === 1 && stB.masterActive === false);

    // Scan client pendant que le pack est PARTIEL
    const lotB1 = await prisma.preActivatedLot.findFirst({ where: { packId: packB1.id, isMaster: false, status: "active" } });
    const scanRes = await fetch(`${BASE}/api/artisan/track-scan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: lotB1!.qrCode, timezone: "Africa/Dakar", deviceType: "mobile" }),
    });
    const scansB = await prisma.artisanScan.count({ where: { lotId: lotB1!.id } });
    check("scan tracké sur pack partiel", scanRes.ok && scansB === 1, `scans=${scansB}`);

    // Page maître : barre de progression 1/2 + 2 modes
    await page.goto(`${BASE}/a/${packB1.masterQrCode}`, { waitUntil: "networkidle" });
    const masterBBody = (await page.textContent("body")) ?? "";
    check("maître partiel : progression 1/2 visible", masterBBody.includes("1/2") && masterBBody.includes("restant"));
    check("maître partiel : 2 modes proposés", (await page.getByTestId("mode-simple").isVisible()) && (await page.getByTestId("mode-flexible").isVisible()));
    await page.screenshot({ path: `${SHOTS}/flexible-partial-master.png`, fullPage: true });

    // Dashboard partiel : pill + barre + CTA continuer
    await page.goto(`${BASE}/artisan/login`, { waitUntil: "networkidle" });
    await page.fill("[data-testid='login-phone']", "775003344");
    await page.fill("[data-testid='login-password']", "0000");
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/artisan/dashboard", { timeout: 20000 });
    await page.waitForSelector("text=Partiel", { timeout: 20000 });
    check("dashboard : pill « Partiel »", (await page.getByText("Partiel").first().isVisible()));
    check("dashboard : barre progression pack", await page.getByTestId("pack-progress").isVisible());
    check("dashboard : CTA continuer l'activation", await page.getByTestId("continue-pack-activation").isVisible());
    await page.screenshot({ path: `${SHOTS}/flexible-dashboard-partial.png`, fullPage: true });

    // Mode 1 (ancien endpoint) : active le RESTANT du pack partiel
    const restRes = await fetch(`${BASE}/api/artisan/activate-pack`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        masterCode: packB1.masterQrCode,
        productData: {
          productName: "Savon Restant",
          contenance: "200 g",
          ingredients: "Base neutre",
          manufacturingDate: "2026-02-01",
          expirationDate: "2027-02-01",
          artisanName: "Atelier Partiel",
          contactPhone: "775003344",
        },
      }),
    });
    const restJson = (await restRes.json()) as { activated?: number; error?: string };
    check("Mode 1 sur pack partiel : active le restant (1)", restRes.ok && restJson.activated === 1, restJson.error ?? String(restJson.activated));
    const packB1After = await prisma.pack.findUnique({ where: { id: packB1.id } });
    const masterB1 = await prisma.preActivatedLot.findUnique({ where: { qrCode: packB1.masterQrCode } });
    check("pack B1 activated + maître actif", packB1After?.status === "activated" && masterB1?.status === "active");

    const againB = await fetch(`${BASE}/api/artisan/activate-pack`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        masterCode: packB1.masterQrCode,
        productData: { productName: "Produit Test", contenance: "1", ingredients: "abc", manufacturingDate: "2026-01-01", expirationDate: "2027-01-01", artisanName: "Atelier X", contactPhone: "770000000" },
      }),
    });
    check("re-activation Mode 1 → 409", againB.status === 409, String(againB.status));

    // ═══ RÉSUMÉ ═══════════════════════════════════════════════════════════
    console.log(`\n══════════ RÉSULTAT : ${passed} OK / ${failed} KO ══════════`);
    process.exitCode = failed > 0 ? 1 : 0;
  } catch (e) {
    console.error("ERREUR TEST:", e);
    process.exitCode = 1;
  } finally {
    // Nettoyage des batchs de test
    if (batchA) await cleanupBatch(batchA);
    if (batchB) await cleanupBatch(batchB);
    console.log("batchs de test supprimés");
    await browser.close();
    await prisma.$disconnect();
  }
}

main();
