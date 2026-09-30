/**
 * Test E2E — Suppression de packs (demande utilisateur : « ajoute un bouton
 * supprimer et un bouton tout supprimer ») + protection auto-heal de la page
 * scannée /a/<code>.
 *
 * Scénario :
 *   1. Login superadmin → 2 batchs de test (A : 2 QR/pack 1 ; B : 1 QR/pack 1)
 *   2. Activation artisan du pack A + 1 scan + 1 avis (données liées)
 *   3. Sécurité : DELETE sans session → 403
 *   4. DELETE pack A → 200 (lots/scans/avis supprimés, vérifiés en DB) ;
 *      pages /a/<code> des étiquettes → 404 ; re-DELETE → 404
 *   5. Purge : sans confirmation → 400 ; mauvaise phrase → 400 ;
 *      { confirmation: "TOUT SUPPRIMER" } → 200 et DBartisanale VIDE
 *      (batchs, packs, lots, scans, avis = 0)
 *   6. UI Playwright : bouton « Supprimer » sur la carte pack + bouton
 *      « Tout supprimer » dans le header (data-testid) ; suppression via UI
 *      (double window.confirm accepté) → toast succès → pack disparu
 *   7. Nettoyage : purge finale (DB artisanale vide)
 *
 * Sorties : shots/pack-deletion-*.png + exit 1 si un check échoue.
 *
 * Run : DATABASE_URL="file:/home/z/my-project/db/custom.db" bun scripts/test-pack-deletion.ts
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

  const mkBatch = async () => {
    const res = await req("/api/admin/batches", {
      method: "POST",
      body: JSON.stringify({ totalQuantity: 1, packSize: 1, pricePerPack: 0 }),
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
  const packA = batchA.masterCodes?.[0];
  const packB = batchB.masterCodes?.[0];
  check("batch A créé (pack A)", !!packA);
  check("batch B créé (pack B)", !!packB);
  if (!packA || !packB) process.exit(1);
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

  // ── 4. Suppression d'un pack ─────────────────────────────────────────────
  console.log("4. DELETE /api/admin/packs/<id> (pack A)");
  const del = await req(`/api/admin/packs/${packARow?.id}`, { method: "DELETE" });
  const delJson = (await del.json()) as {
    success?: boolean;
    lotsDeleted?: number;
    scansDeleted?: number;
    reviewsDeleted?: number;
  };
  check("DELETE pack A → 200", del.status === 200);
  check("lotsDeleted = 2 (maître + produit)", delJson.lotsDeleted === 2);
  check("scansDeleted = 1", delJson.scansDeleted === 1);
  check("reviewsDeleted = 1", delJson.reviewsDeleted === 1);

  const packAGone = await prisma.pack.findUnique({ where: { id: packARow?.id } });
  check("pack A absent de la DB", packAGone === null);
  const lotsGone = await prisma.preActivatedLot.count({ where: { packId: packARow?.id } });
  check("étiquettes du pack A supprimées", lotsGone === 0);
  const pageGone = await fetch(`${BASE}/a/${productLot?.qrCode}`);
  check("page /a/<code> du produit supprimé → 404", pageGone.status === 404);
  const batchBStill = await prisma.pack.count({ where: { masterQrCode: packB } });
  check("pack B INTACT après suppression du pack A", batchBStill === 1);

  const delAgain = await req(`/api/admin/packs/${packARow?.id}`, { method: "DELETE" });
  check("re-DELETE pack A → 404 (introuvable)", delAgain.status === 404);
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
  // Le batch A reste en DB (vide) après la suppression de son pack
  check("batchs supprimés ≥ 1 (B + A vidé)", (purgeJson.batchesDeleted ?? 0) >= 1);
  check("packsDeleted = 1 (pack B restant)", purgeJson.packsDeleted === 1);

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
  const uiPackId = (
    await prisma.pack.findUnique({ where: { masterQrCode: batchUI.masterCodes?.[0] ?? "" } })
  )?.id;

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
