/**
 * Test E2E — Suppression de packs + batchs (bug utilisateur : « je supprime
 * un pack mais le nom du batch et ses infos ne sont pas supprimés ») +
 * protection auto-heal de la page scannée /a/<code>.
 *
 * Scénario :
 *   1. Login superadmin → batchs de test (A : 1 pack ; M : 2 packs de 1)
 *   2. Activation artisan du pack A + 1 scan + 1 avis (données liées)
 *   3. Sécurité : DELETE sans session → 403 (pack ET batch)
 *   4. DELETE pack A (dernier pack du batch) → 200 + batchDeleted=true →
 *      le BATCH A DISPARAÎT AUSSI (plus de batch fantôme « 0/1 packs ») ;
 *      pages /a/<code> des étiquettes → 404 ; re-DELETE → 404
 *   4b. Batch multi-packs M : DELETE pack 1 → batchDeleted=false (batch
 *       reste, 1 pack restant) ; DELETE pack 2 → batchDeleted=true (batch M
 *       disparu) ; liste GET sans fantôme
 *   4c. DELETE /api/admin/batches/<id> (batch entier) → 200 avec compteurs,
 *       packs+lots disparus ; re-DELETE → 404
 *   5. Purge : sans confirmation → 400 ; mauvaise phrase → 400 ;
 *      { confirmation: "TOUT SUPPRIMER" } → 200 et DB artisanale VIDE
 *      (batchs, packs, lots, scans, avis = 0)
 *   6. UI Playwright : boutons « Supprimer » (pack, BATCH, tout) +
 *      suppression d'un pack via UI → toast succès → pack ET batch disparus
 *   7. Nettoyage : purge finale (DB artisanale vide)
 *
 * Sorties : shots/pack-deletion-*.png + exit 1 si un check échoue.
 *
 * Run : BASE=http://localhost:3100 DATABASE_URL="file:.../custom.db"
 *       ADMIN_PASSWORD="..." bun scripts/test-pack-deletion.ts
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE ?? "http://localhost:3000";
const DB_URL =
  process.env.DATABASE_URL?.replace("file:", "file:") ??
  "file:/home/z/my-project/db/custom.db";

const prisma = new PrismaClient({
  datasources: { db: { url: DB_URL } },
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
      "user-agent": "test-pack-deletion",
      ...(init.headers ?? {}),
      cookie: jar,
    },
  });
  captureCookies(res);
  return res;
}

async function main() {
  // Purge initiale : partir d'une base artisanale vide (indépendance des runs)
  await prisma.artisanScan.deleteMany({});
  await prisma.artisanReview.deleteMany({});
  await prisma.preActivatedLot.deleteMany({});
  await prisma.pack.deleteMany({});
  await prisma.batch.deleteMany({});

  const dbCount = async () => ({
    b: await prisma.batch.count(),
    p: await prisma.pack.count(),
    l: await prisma.preActivatedLot.count(),
  });
  console.log("[trace] après purge initiale:", JSON.stringify(await dbCount()));

  // ── 1. Login + batchs de test ────────────────────────────────────────────
  console.log("1. Login superadmin + création des données de test");
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

  const mkBatch = async (
    opts: { totalQuantity: number; packSize: number } = { totalQuantity: 1, packSize: 1 }
  ) => {
    const res = await req("/api/admin/batches", {
      method: "POST",
      body: JSON.stringify({ ...opts, pricePerPack: 0 }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      batch?: { id: string };
      masterCodes?: string[];
      error?: string;
      details?: string;
    };
    if (!res.ok) {
      console.error(
        `  mkBatch échec HTTP ${res.status}: ${json.error ?? ""} ${json.details ?? ""}`.trim()
      );
    }
    return json;
  };
  const batchA = await mkBatch();
  const batchB = await mkBatch();
  const batchM = await mkBatch({ totalQuantity: 2, packSize: 1 }); // 2 packs de 1
  const packA = batchA.masterCodes?.[0];
  const packB = batchB.masterCodes?.[0];
  check("batch A créé (pack A)", !!packA);
  check("batch B créé (pack B)", !!packB);
  check("batch M créé (2 packs)", (batchM.masterCodes?.length ?? 0) === 2);
  if (!packA || !packB || (batchM.masterCodes?.length ?? 0) !== 2) process.exit(1);
  console.log("[trace] après mkBatch A+B:", JSON.stringify(await dbCount()));

  const packARow = await prisma.pack.findUnique({
    where: { masterQrCode: packA },
    include: { lots: true },
  });
  check("pack A : 2 étiquettes (maître + produit)", packARow?.lots.length === 2);

  // ── 2. Activation artisan pack A + scan + avis liés ─────────────────────
  console.log("2. Activation artisan du pack A (+ scan + avis liés)");
  const act = await fetch(`${BASE}/api/artisan/activate-pack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      masterCode: packA,
      artisanName: "Astou Diop",
      productData: {
        productName: "Beurre de karité test suppression",
        contenance: "200 g",
        ingredients: "Karité pur",
        manufacturingDate: "2026-01-15",
        expirationDate: "2027-01-15",
        artisanName: "Astou Diop",
        contactPhone: "+221770000001",
      },
    }),
  });
  check("activation pack A (200/201)", act.status === 200 || act.status === 201);

  const lotsAfter = await prisma.preActivatedLot.findMany({
    where: { packId: packARow?.id },
    select: { id: true, qrCode: true },
  });
  const productLot = lotsAfter.find((l) => !l.qrCode.startsWith("MASTER-"));
  if (productLot) {
    await prisma.artisanScan.create({
      data: { lotId: productLot.id, country: "Sénégal", city: "Dakar", deviceType: "mobile" },
    });
    await prisma.artisanReview.create({
      data: { lotId: productLot.id, authorName: "Client Test", rating: 5, comment: "Excellent produit" },
    });
    check("scan + avis liés au produit du pack A", true);
  } else {
    check("scan + avis liés au produit du pack A (lot introuvable)", false);
  }

  const pageActive = await fetch(`${BASE}/a/${productLot?.qrCode}`);
  check("page /a/<code> du produit actif → 200 (avant suppression)", pageActive.status === 200);

  // ── 3. Sécurité : sans session admin → 403 ───────────────────────────────
  console.log("3. Sécurité");
  const noAuth = await fetch(`${BASE}/api/admin/packs/${packARow?.id}`, { method: "DELETE" });
  check("DELETE pack sans session → 403", noAuth.status === 403);
  const noAuthAll = await fetch(`${BASE}/api/admin/packs`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmation: "TOUT SUPPRIMER" }),
  });
  check("DELETE tout sans session → 403", noAuthAll.status === 403);
  const batchBRow = await prisma.pack.findUnique({ where: { masterQrCode: packB } });
  const noAuthBatch = await fetch(`${BASE}/api/admin/batches/${batchBRow?.batchId}`, {
    method: "DELETE",
  });
  check("DELETE batch sans session → 403", noAuthBatch.status === 403);

  // ── 4. Suppression d'un pack DERNIER de son batch → batch supprimé aussi ─
  console.log("4. DELETE /api/admin/packs/<id> (pack A, dernier de son batch)");
  const batchARow = await prisma.pack.findUnique({ where: { masterQrCode: packA } });
  const del = await req(`/api/admin/packs/${packARow?.id}`, { method: "DELETE" });
  const delJson = (await del.json()) as {
    success?: boolean;
    lotsDeleted?: number;
    scansDeleted?: number;
    reviewsDeleted?: number;
    batchDeleted?: boolean;
  };
  check("DELETE pack A → 200", del.status === 200);
  check("lotsDeleted = 2 (maître + produit)", delJson.lotsDeleted === 2);
  check("scansDeleted = 1", delJson.scansDeleted === 1);
  check("reviewsDeleted = 1", delJson.reviewsDeleted === 1);
  check("batchDeleted = true (dernier pack)", delJson.batchDeleted === true);

  const packAGone = await prisma.pack.findUnique({ where: { id: packARow?.id } });
  check("pack A absent de la DB", packAGone === null);
  const batchAGone = await prisma.batch.findUnique({
    where: { id: batchARow?.batchId ?? "" },
  });
  check("batch A AUSSI supprimé (plus de fantôme)", batchAGone === null);
  const autoAudit = await prisma.auditLog.findFirst({
    where: { action: "ADMIN_DELETE_BATCH_AUTO" },
  });
  check("audit log ADMIN_DELETE_BATCH_AUTO écrit", autoAudit !== null);
  const lotsGone = await prisma.preActivatedLot.count({ where: { packId: packARow?.id } });
  check("étiquettes du pack A supprimées", lotsGone === 0);
  const pageGone = await fetch(`${BASE}/a/${productLot?.qrCode}`);
  check("page /a/<code> du produit supprimé → 404", pageGone.status === 404);
  const batchBStill = await prisma.pack.count({ where: { masterQrCode: packB } });
  check("pack B INTACT après suppression du pack A", batchBStill === 1);

  const delAgain = await req(`/api/admin/packs/${packARow?.id}`, { method: "DELETE" });
  check("re-DELETE pack A → 404 (introuvable)", delAgain.status === 404);

  // ── 4b. Batch multi-packs : le batch NE disparaît QUE au dernier pack ────
  console.log("4b. Batch multi-packs M (2 packs) — suppression progressive");
  const mCodes = batchM.masterCodes as string[];
  const mPackRows = await prisma.pack.findMany({
    where: { masterQrCode: { in: mCodes } },
    orderBy: { masterQrCode: "asc" },
  });
  const mBatchId = mPackRows[0]?.batchId;
  const delM1 = await req(`/api/admin/packs/${mPackRows[0]?.id}`, { method: "DELETE" });
  const delM1Json = (await delM1.json()) as { batchDeleted?: boolean };
  check("DELETE pack M.1 → 200", delM1.status === 200);
  check("batchDeleted = false (1 pack restant)", delM1Json.batchDeleted === false);
  const mStill = await prisma.batch.findUnique({ where: { id: mBatchId ?? "" } });
  check("batch M toujours présent (1 pack restant)", mStill !== null);

  const delM2 = await req(`/api/admin/packs/${mPackRows[1]?.id}`, { method: "DELETE" });
  const delM2Json = (await delM2.json()) as { batchDeleted?: boolean };
  check(
    "DELETE pack M.2 (dernier) → 200 + batchDeleted=true",
    delM2.status === 200 && delM2Json.batchDeleted === true
  );
  const mGone = await prisma.batch.findUnique({ where: { id: mBatchId ?? "" } });
  check("batch M supprimé au dernier pack", mGone === null);

  // ── 4c. DELETE /api/admin/batches/<id> — batch entier en un clic ────────
  console.log("4c. DELETE /api/admin/batches/<id> (batch B entier)");
  const delBatch = await req(`/api/admin/batches/${batchBRow?.batchId}`, { method: "DELETE" });
  const delBatchJson = (await delBatch.json()) as {
    success?: boolean;
    packsDeleted?: number;
    lotsDeleted?: number;
  };
  check("DELETE batch B → 200", delBatch.status === 200);
  check("packsDeleted = 1", delBatchJson.packsDeleted === 1);
  check("lotsDeleted = 2 (maître + produit)", delBatchJson.lotsDeleted === 2);
  const batchBGone = await prisma.batch.findUnique({
    where: { id: batchBRow?.batchId ?? "" },
  });
  check("batch B absent de la DB", batchBGone === null);
  const packsBGone = await prisma.pack.count({ where: { batchId: batchBRow?.batchId ?? "" } });
  check("packs du batch B supprimés", packsBGone === 0);
  const delBatchAgain = await req(`/api/admin/batches/${batchBRow?.batchId}`, {
    method: "DELETE",
  });
  check("re-DELETE batch B → 404", delBatchAgain.status === 404);
  const delBatch404 = await req("/api/admin/batches/batch-inexistant-xyz", { method: "DELETE" });
  check("DELETE batch inconnu → 404", delBatch404.status === 404);
  const batchAudit = await prisma.auditLog.findFirst({ where: { action: "ADMIN_DELETE_BATCH" } });
  check("audit log ADMIN_DELETE_BATCH écrit", batchAudit !== null);

  console.log("[trace] avant purge finale:", JSON.stringify(await dbCount()));
  const orphanPacks = await prisma.pack.findMany({ select: { masterQrCode: true, batchId: true } });
  console.log("[trace] packs restants:", JSON.stringify(orphanPacks));

  const audit = await prisma.auditLog.findFirst({ where: { action: "ADMIN_DELETE_PACK" } });
  check("audit log ADMIN_DELETE_PACK écrit", audit !== null);

  // ── 5. Purge totale ──────────────────────────────────────────────────────
  console.log("5. DELETE /api/admin/packs (purge totale)");
  const purgeNoBody = await req("/api/admin/packs", { method: "DELETE" });
  check("purge sans corps → 400", purgeNoBody.status === 400);
  const purgeBad = await req("/api/admin/packs", {
    method: "DELETE",
    body: JSON.stringify({ confirmation: "oui" }),
  });
  check("purge mauvaise confirmation → 400", purgeBad.status === 400);

  const purge = await req("/api/admin/packs", {
    method: "DELETE",
    body: JSON.stringify({ confirmation: "TOUT SUPPRIMER" }),
  });
  const purgeJson = (await purge.json()) as {
    success?: boolean;
    batchesDeleted?: number;
    packsDeleted?: number;
    lotsDeleted?: number;
  };
  check("purge confirmée → 200", purge.status === 200);
  console.log(`   purge: ${JSON.stringify(purgeJson)}`);
  // Le batch A est déjà parti (auto-suppression au dernier pack, étape 4)
  // et le batch B aussi (étape 4c) → la purge ne doit rien laisser passer.
  check("batchsDeleted = 0 (aucun fantôme en amont)", (purgeJson.batchesDeleted ?? -1) === 0);
  check("aucun pack restant à purger", (purgeJson.packsDeleted ?? -1) === 0);

  const remaining = {
    batches: await prisma.batch.count(),
    packs: await prisma.pack.count(),
    lots: await prisma.preActivatedLot.count(),
    scans: await prisma.artisanScan.count(),
    reviews: await prisma.artisanReview.count(),
  };
  check(
    `DB artisanale VIDE (b=${remaining.batches} p=${remaining.packs} l=${remaining.lots} s=${remaining.scans} r=${remaining.reviews})`,
    Object.values(remaining).every((n) => n === 0)
  );

  // ── 6. UI Playwright : boutons Supprimer / Tout supprimer ───────────────
  console.log("6. UI Playwright — boutons de suppression");
  const batchUI = await mkBatch();
  const uiPackRow = await prisma.pack.findUnique({
    where: { masterQrCode: batchUI.masterCodes?.[0] ?? "" },
  });
  const uiPackId = uiPackRow?.id;
  const uiBatchId = uiPackRow?.batchId;

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  // Injection directe des cookies de session (pattern test-admin-qr-modify :
  // le login par formulaire dépend du markup de /login, le jar suffit)
  await ctx.addCookies(
    jar
      .split("; ")
      .filter(Boolean)
      .map((pair) => {
        const eq = pair.indexOf("=");
        return { name: pair.slice(0, eq), value: pair.slice(eq + 1), url: BASE };
      })
  );
  const page = await ctx.newPage();
  await page.goto(`${BASE}/superadmin`, { waitUntil: "networkidle" });
  const dialogs: string[] = [];
  page.on("dialog", async (d) => {
    dialogs.push(d.message().slice(0, 60));
    await d.accept();
  });

  // Onglet « Production QR Artisans » via la sidebar (clé batches)
  const navItem = page.locator("text=QR Artisans").first();
  await navItem.waitFor({ state: "visible", timeout: 20_000 });
  await navItem.click();
  await page.waitForSelector("text=Production QR Artisans", { timeout: 20_000 });
  // Attendre le chargement client de la liste (le fetch démarre après hydratation)
  await page.getByRole("button", { name: "Packs" }).first().waitFor({ state: "visible", timeout: 30_000 });

  const deleteAllVisible = await page.getByTestId("delete-all-packs").isVisible().catch(() => false);
  check("bouton « Tout supprimer » visible dans le header", deleteAllVisible);

  const deleteBatchBtn = uiBatchId ? page.getByTestId(`delete-batch-${uiBatchId}`) : null;
  const deleteBatchVisible = deleteBatchBtn
    ? await deleteBatchBtn.isVisible().catch(() => false)
    : false;
  check("bouton « Supprimer » visible sur la carte BATCH", deleteBatchVisible);

  // déplier le batch pour voir la carte pack
  const packsToggle = page.getByRole("button", { name: /Packs/ }).first();
  await packsToggle.click().catch(() => {});
  await page.waitForTimeout(400);

  const deletePackBtn = uiPackId ? page.getByTestId(`delete-pack-${uiPackId}`) : null;
  const deletePackVisible = deletePackBtn ? await deletePackBtn.isVisible().catch(() => false) : false;
  check("bouton « Supprimer » visible sur la carte pack", deletePackVisible);

  if (deletePackBtn && (await deletePackBtn.isVisible().catch(() => false))) {
    await deletePackBtn.click();
    await page.waitForTimeout(1200);
    const stillThere = await prisma.pack.findUnique({ where: { id: uiPackId ?? "" } });
    check("suppression via UI : pack retiré de la DB", stillThere === null);
    const uiBatchGone = await prisma.batch.findUnique({ where: { id: uiBatchId ?? "" } });
    check("suppression via UI : batch fantôme AUSSI retiré", uiBatchGone === null);
    check("confirmation window.confirm affichée", dialogs.length >= 1);
    await page.screenshot({ path: "shots/pack-deletion-ui.png", fullPage: false }).catch(() => {});
  }

  await page.screenshot({ path: "shots/pack-deletion-buttons.png", fullPage: false }).catch(() => {});
  await browser.close();

  // ── 7. Nettoyage final ───────────────────────────────────────────────────
  console.log("7. Nettoyage");
  const cleanup = await req("/api/admin/packs", {
    method: "DELETE",
    body: JSON.stringify({ confirmation: "TOUT SUPPRIMER" }),
  });
  check("nettoyage final → 200", cleanup.status === 200);

  await prisma.$disconnect();
  console.log(
    failures === 0
      ? "\n══════════ RÉSULTAT : TOUS LES CHECKS OK ══════════"
      : `\n══════════ RÉSULTAT : ${failures} ÉCHEC(S) ══════════`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
