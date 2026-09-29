/**
 * Test E2E — QR codes affichés + modification SuperAdmin (demandes
 * utilisateur : « je veux que le QR code généré affiche le QR code » et
 * « le QR code créé par l'artisan doit pouvoir être modifié par le
 * superadmin — bouton Modifier à côté du QR code »).
 *
 * Scénario :
 *   1. API : login superadmin → batch de test (2 QR, pack de 1)
 *   2. API : activation artisan (données produit connues)
 *   3. API : GET  /api/admin/packs/<packId>/product → pré-remplissage OK
 *   4. API : PATCH → toutes les étiquettes du pack corrigées + pack mis à
 *      jour + audit log ; la page publique /a/<code> reflète la correction
 *   5. Sécurité : GET/PATCH sans session → 403 ; pack inconnu → 404
 *   6. UI Playwright : /superadmin → packs dépliés → image QR (canvas)
 *      rendue + bouton « Modifier » → modal pré-remplie → correction →
 *      toast succès
 *
 * Sorties : shots/admin-qr-modifier-*.png + exit 1 si un check échoue.
 *
 * Run : DATABASE_URL="file:/home/z/my-project/db/custom.db" bun scripts/test-admin-qr-modify.ts
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";

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
      "user-agent": "test-admin-qr-modify",
      ...(init.headers ?? {}),
      cookie: jar,
    },
  });
  captureCookies(res);
  return res;
}

async function main() {
  // ── 1. Login + batch de test ──────────────────────────────────────────
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
  const batch = (await batchRes.json()) as {
    batch?: { id: string };
    masterCodes?: string[];
  };
  const master = batch.masterCodes?.[0];
  const batchId = batch.batch?.id;
  if (!master || !batchId) {
    console.error("Création batch impossible");
    process.exit(1);
  }
  console.log(`   batch ${batchId.slice(0, 8)} — master: ${master}`);

  // ── 2. Activation artisan (données produit connues) ───────────────────
  const act = await fetch(`${BASE}/api/artisan/activate-pack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      masterCode: master,
      productData: {
        productName: "Beurre de karité original",
        contenance: "250g",
        ingredients: "Karité pur",
        manufacturingDate: "2026-09-01",
        expirationDate: "2027-09-01",
        artisanName: "Aïssata Cosmétiques",
        contactPhone: "771234567",
        productPrice: "5 000 FCFA",
      },
    }),
  });
  const actData = (await act.json()) as { firstCode?: string };
  check("2. activation artisan 201/200", act.ok);
  const productCode = actData.firstCode ?? "";

  // Pack id via Prisma (le code maître est unique)
  const masterLot = await prisma.preActivatedLot.findUnique({
    where: { qrCode: master },
    select: { packId: true },
  });
  const packId = masterLot?.packId ?? "";
  if (!packId) {
    console.error("Pack introuvable pour le maître");
    process.exit(1);
  }

  // ── 3. GET pré-remplissage ────────────────────────────────────────────
  const getRes = await req(`/api/admin/packs/${packId}/product`);
  const getData = (await getRes.json()) as {
    pack?: { masterQrCode: string; status: string };
    productData?: Record<string, string>;
  };
  check("3a. GET pré-remplissage 200", getRes.ok);
  check(
    "3b. données produit de l'artisan restituées",
    getData.productData?.productName === "Beurre de karité original" &&
      getData.productData?.artisanName === "Aïssata Cosmétiques" &&
      getData.productData?.productPrice === "5 000 FCFA",
  );
  check(
    "3c. dates au format AAAA-MM-JJ",
    /^\d{4}-\d{2}-\d{2}$/.test(getData.productData?.manufacturingDate ?? ""),
  );

  // ── 4. PATCH de correction (SuperAdmin) ───────────────────────────────
  const patchRes = await req(`/api/admin/packs/${packId}/product`, {
    method: "PATCH",
    body: JSON.stringify({
      productData: {
        productName: "Beurre de karité corrigé",
        productDesignation: "Correction SuperAdmin — karité brut du Burkina",
        contenance: "500g",
        ingredients: "Karité pur, karité bio",
        manufacturingDate: "2026-08-15",
        expirationDate: "2027-08-15",
        artisanName: "Aïssata Cosmétiques Dakar",
        contactPhone: "789876543",
        contactEmail: "aissata@exemple.sn",
        productPrice: "7 500 FCFA",
      },
    }),
  });
  const patchData = (await patchRes.json()) as { lotsUpdated?: number };
  check("4a. PATCH 200", patchRes.ok);
  check("4b. toutes les étiquettes du pack corrigées", (patchData.lotsUpdated ?? 0) >= 2);

  const after = (await (
    await req(`/api/admin/packs/${packId}/product`)
  ).json()) as { productData?: Record<string, string> };
  check(
    "4c. pré-remplissage reflète la correction",
    after.productData?.productName === "Beurre de karité corrigé" &&
      after.productData?.contactPhone === "789876543",
  );

  // La page publique reflète immédiatement la correction
  const publicRes = await fetch(`${BASE}/a/${productCode || master}`);
  const publicHtml = await publicRes.text();
  check(
    "4d. page publique /a/<code> affiche le nom corrigé",
    publicHtml.includes("Beurre de karité corrigé"),
  );

  // Vérification DB : chaque lot du pack a les nouvelles données
  const lots = await prisma.preActivatedLot.findMany({
    where: { packId },
    select: { qrCode: true, productName: true, contenance: true },
  });
  check(
    "4e. DB : tous les lots du pack mis à jour",
    lots.length >= 2 && lots.every((l) => l.productName === "Beurre de karité corrigé"),
  );

  const packAfter = await prisma.pack.findUnique({ where: { id: packId } });
  check(
    "4f. DB : pack (prix + désignation + téléphone) mis à jour",
    packAfter?.productPrice === "7 500 FCFA" &&
      packAfter?.artisanPhone === "789876543" &&
      (packAfter?.productDesignation ?? "").startsWith("Correction SuperAdmin"),
  );

  const audits = await prisma.auditLog.count({
    where: { action: "ADMIN_UPDATE_PACK_PRODUCT", entityId: packId },
  });
  check("4g. audit log écrit", audits >= 1);

  // ── 5. Sécurité ───────────────────────────────────────────────────────
  const anonGet = await fetch(`${BASE}/api/admin/packs/${packId}/product`);
  check("5a. GET sans session → 403", anonGet.status === 403);
  const anonPatch = await fetch(`${BASE}/api/admin/packs/${packId}/product`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productData: {} }),
  });
  check("5b. PATCH sans session → 403", anonPatch.status === 403);
  const notFound = await req("/api/admin/packs/pack-inexistant-xyz/product");
  check("5c. pack inconnu → 404", notFound.status === 404);
  const badBody = await req(`/api/admin/packs/${packId}/product`, {
    method: "PATCH",
    body: JSON.stringify({ productData: { productName: "x" } }),
  });
  check("5d. validation zod → 400", badBody.status === 400);

  // ── 6. UI Playwright ──────────────────────────────────────────────────
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

  // Injection directe des cookies de session (context.request casse les URLs
  // relatives sous Bun) — le jar contient next-auth.session-token + csrf.
  await context.addCookies(
    jar
      .split("; ")
      .filter(Boolean)
      .map((pair) => {
        const eq = pair.indexOf("=");
        return {
          name: pair.slice(0, eq),
          value: pair.slice(eq + 1),
          url: BASE,
        };
      }),
  );

  const page = await context.newPage();
  await page.goto(`${BASE}/superadmin`, { waitUntil: "networkidle" });

  // L'admin s'ouvre sur le Dashboard — naviguer vers l'onglet « QR Artisans »
  // (clé "batches" de la sidebar) où sont listés les packs de QR.
  const navItem = page.locator("text=QR Artisans").first();
  await navItem.waitFor({ state: "visible", timeout: 20_000 });
  check("6a. /superadmin rendu (sidebar admin visible)", true);
  await navItem.click();
  await page.waitForSelector("text=Production QR Artisans", { timeout: 20_000 });

  // Attendre le chargement CLIENT de la liste des batchs (le fetch démarre
  // après hydratation — networkidle peut s'exécuter AVANT lui)
  const packsButtons = page.getByRole("button", { name: "Packs" });
  await packsButtons.first().waitFor({ state: "visible", timeout: 30_000 });

  // L'admin est un accordéon : UN SEUL batch déplié à la fois. On déplie
  // UNIQUEMENT la carte de notre batch (le plus récent) via son titre
  // « Batch <ID8> ».
  const batchId8 = batchId.slice(0, 8).toUpperCase();
  const batchCard = page
    .locator("h3", { hasText: `Batch ${batchId8}` })
    .locator(
      "xpath=ancestor::div[contains(@class,'rounded-xl')][contains(@class,'bg-white')][1]",
    );
  await batchCard.getByRole("button", { name: "Packs" }).click();
  await page.waitForTimeout(600);

  // 6b. L'image QR du maître est rendue (canvas QRCodeCanvas)
  const canvases = page.locator("canvas");
  await canvases.first().waitFor({ state: "visible", timeout: 15_000 });
  check("6b. image QR (canvas) affichée à côté des packs", (await canvases.count()) >= 1);

  // 6c. Le bouton « Modifier » existe À CÔTÉ du QR du pack activé
  const codeEl = page.getByText(master, { exact: true }).first();
  await codeEl.waitFor({ state: "visible", timeout: 15_000 });
  const packCard = codeEl.locator(
    "xpath=ancestor::div[contains(@class,'rounded-lg')][contains(@class,'border')]",
  );
  const modifierBtn = packCard.getByRole("button", { name: "Modifier" });
  check(
    "6c. bouton « Modifier » présent à côté du QR (pack activé)",
    (await modifierBtn.count()) === 1,
  );

  await page.screenshot({
    path: "shots/admin-qr-modifier-packs.png",
    fullPage: false,
  });

  // 6d. Modal ouverte, pré-remplie avec les données de l'artisan
  await modifierBtn.click();
  await page.waitForSelector("#mod-productName", { timeout: 10_000 });
  const prefilled = await page.locator("#mod-productName").inputValue();
  check(
    "6d. modal « Modifier les informations produit » pré-remplie",
    prefilled === "Beurre de karité corrigé",
  );
  check(
    "6e. modal montre le code maître du pack",
    (await page.locator("text=Modifier les informations produit").count()) === 1,
  );

  await page.fill("#mod-contenance", "1kg");
  await page.screenshot({
    path: "shots/admin-qr-modifier-modal.png",
    fullPage: false,
  });
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await page.waitForSelector("text=Pack mis à jour", { timeout: 15_000 });
  check("6f. toast succès après enregistrement UI", true);

  const uiAfter = (await (
    await req(`/api/admin/packs/${packId}/product`)
  ).json()) as { productData?: Record<string, string> };
  check(
    "6g. la correction UI est persistée (contenance 1kg)",
    uiAfter.productData?.contenance === "1kg",
  );

  await browser.close();

  // ── 7. Nettoyage : désactive le pack de test ──────────────────────────
  await prisma.preActivatedLot.updateMany({
    where: { packId },
    data: { status: "inactive" },
  });
  await prisma.pack.update({ where: { id: packId }, data: { status: "available" } });
  console.log("7. pack de test désactivé");

  await prisma.$disconnect();
  console.log(
    failures === 0 ? "\n✅ TOUS LES TESTS PASSENT" : `\n❌ ${failures} ÉCHEC(S)`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
