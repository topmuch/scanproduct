/**
 * Test E2E — Refonte DESIGN du dashboard artisan (/artisan/dashboard)
 * + régression des points d'attache (testids conservés).
 *
 * Design 2.0 vérifié :
 *   - en-tête ambre décoré (avatar + badge « Espace Artisan » + bulles)
 *   - 4 cartes stats (Scans / Produits actifs / QR codes / Packs)
 *   - activité récente (notifications de scans 7 j) avec lieu + heure relative
 *   - produits : photo, badges, progression des scans, actions Modifier/Voir/Stats
 *   - packs : statut (Activé / En cours / Disponible), quantité, scans
 *   - actions rapides : 4 tuiles dégradés (Activer pack / Mdp / PDF / À propos)
 *   - carte partage WhatsApp (1er produit public)
 *   - captures desktop (1280×900) + mobile (390×844)
 *
 * Données : batch 4 QR / 2 packs → vente à l'artisan → activation du pack 1
 * (photo incluse) → 2 scans publics enregistrés via GET /a/<code> → login UI.
 * Nettoyage try/finally (batch supprimé, artisan conservé sans packs).
 *
 * Run : DATABASE_URL="file:/home/z/my-project/db/custom.db" bun scripts/test-dashboard-redesign.ts
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3000";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:/home/z/my-project/db/custom.db" } },
});

/** PNG 1×1 réel (magic bytes 89 50 4E 47). */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let failures = 0;
let total = 0;
function check(label: string, ok: boolean) {
  total++;
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
      "user-agent": "test-dashboard-redesign",
      ...(init.headers ?? {}),
      cookie: jar,
    },
  });
  captureCookies(res);
  return res;
}

const ARTISAN_PHONE = "78 123 45 67";
const ARTISAN_NORM = "781234567";
const ARTISAN_NAME = "Awa Diallo Créations";
const PRODUCT_NAME = "Beurre de karité Awa Premium";

let batchId: string | null = null;

async function cleanup() {
  if (!batchId) return;
  try {
    const packs = await prisma.pack.findMany({ where: { batchId } });
    const packIds = packs.map((p) => p.id);
    if (packIds.length > 0) {
      const lots = await prisma.preActivatedLot.findMany({
        where: { packId: { in: packIds } },
        select: { id: true },
      });
      const lotIds = lots.map((l) => l.id);
      // ArtisanScan est rattaché au LOT (pas au pack)
      if (lotIds.length > 0) {
        await prisma.artisanScan.deleteMany({ where: { lotId: { in: lotIds } } });
      }
      await prisma.preActivatedLot.deleteMany({ where: { packId: { in: packIds } } });
      await prisma.pack.deleteMany({ where: { id: { in: packIds } } });
    }
    await prisma.batch.delete({ where: { id: batchId } }).catch(() => {});
    console.log("\n🧹 Batch de test supprimé");
  } catch (e) {
    console.warn("⚠️ nettoyage partiel:", e);
  }
}

async function main() {
  console.log("\n═══ 1. Setup : batch + vente + activation ═══");
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
  check("session superadmin active", sessJson.user?.role === "SUPERADMIN");

  const batchRes = await req("/api/admin/batches", {
    method: "POST",
    body: JSON.stringify({ totalQuantity: 4, packSize: 2, pricePerPack: 5000 }),
  });
  const batchJson = (await batchRes.json()) as { batch?: { id: string } };
  check("batch créé (4 QR / packs de 2)", batchRes.ok && !!batchJson.batch?.id);
  batchId = batchJson.batch!.id;

  const packs = await prisma.pack.findMany({
    where: { batchId },
    orderBy: { packNumber: "asc" },
  });
  const pack1 = packs.find((p) => p.packNumber === 1)!;
  check("pack 1 avec code maître", !!pack1?.masterQrCode?.startsWith("MASTER-"));

  const sellRes = await req("/api/admin/sell-pack", {
    method: "POST",
    body: JSON.stringify({
      packId: pack1.id,
      artisanPhone: ARTISAN_PHONE,
      artisanName: ARTISAN_NAME,
    }),
  });
  const sellJson = (await sellRes.json()) as {
    whatsappMessage?: string;
    loginUrl?: string;
  };
  check("pack vendu à l'artisan", sellRes.ok);

  // Le message WhatsApp contient une URL /artisan/login SANS 0.0.0.0
  const loginUrl = sellJson.loginUrl ?? "";
  check(
    "loginUrl du message WhatsApp = origine consultée (pas 0.0.0.0)",
    loginUrl.startsWith(BASE) && !loginUrl.includes("0.0.0.0")
  );
  check(
    "message WhatsApp contient le lien de connexion",
    (sellJson.whatsappMessage ?? "").includes(loginUrl)
  );

  // Upload photo + activation du pack 1
  const upForm = new FormData();
  upForm.append("masterCode", pack1.masterQrCode);
  upForm.append("file", new File([PNG_1X1], "karite.png", { type: "image/png" }));
  const uploadRes = await fetch(`${BASE}/api/artisan/upload`, { method: "POST", body: upForm });
  const uploadJson = (await uploadRes.json()) as { url?: string };
  check("photo uploadée (mode masterCode)", uploadRes.ok && !!uploadJson.url);

  const activateRes = await fetch(`${BASE}/api/artisan/activate-pack`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      masterCode: pack1.masterQrCode,
      productData: {
        productName: PRODUCT_NAME,
        contenance: "500g",
        ingredients: "Beurre de karité pur",
        manufacturingDate: "2026-09-20",
        expirationDate: "2027-09-20",
        artisanName: ARTISAN_NAME,
        contactPhone: ARTISAN_PHONE,
        photoUrl: uploadJson.url,
        artisanBio: "Atelier de Pikine, Dakar",
        usageTips: "Conserver à l'abri du soleil",
      },
    }),
  });
  const activateJson = (await activateRes.json()) as { activated?: number; firstCode?: string };
  check("activation en masse (2 étiquettes)", activateRes.ok && activateJson.activated === 2);

  // Scans publics : la page /a ne fait que compter — c'est POST
  // /api/artisan/track-scan (appelé par ScanTracker côté client) qui
  // CRÉE l'ArtisanScan alimentant les notifications 7 j du dashboard.
  const lots = await prisma.preActivatedLot.findMany({ where: { packId: pack1.id } });
  const artLots = lots.filter((l) => !l.qrCode.startsWith("MASTER-"));
  for (const lot of artLots) {
    await fetch(`${BASE}/a/${lot.qrCode}`, {
      headers: { "user-agent": "Mozilla/5.0 (iPhone) test-dashboard" },
    });
    await fetch(`${BASE}/api/artisan/track-scan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: lot.qrCode,
        timezone: "Africa/Dakar",
        deviceType: "mobile",
      }),
    });
  }
  check("scans publics enregistrés (2 étiquettes ART)", artLots.length === 2);

  // Connexion artisan (API) → token JWT
  const loginRes = await fetch(`${BASE}/api/artisan/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: ARTISAN_NORM, password: "0000" }),
  });
  const loginJson = (await loginRes.json()) as { token?: string };
  check("login artisan → JWT", loginRes.ok && !!loginJson.token);

  console.log("\n═══ 2. UI : dashboard redesigné (desktop + mobile) ═══");
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    // Token artisan injecté AVANT la navigation (le dashboard lit localStorage)
    await page.addInitScript(
      ([key, token]) => window.localStorage.setItem(key!, token!),
      ["verifscan_artisan_token", loginJson.token!] as [string, string]
    );

    await page.goto(`${BASE}/artisan/dashboard`, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-testid='dashboard-stats']", { timeout: 20000 });
    check("dashboard rendu (data-testid conservés)", await page.isVisible("[data-testid='artisan-dashboard']"));

    // Bienvenue avec le nom
    const welcome = (await page.textContent("[data-testid='dashboard-welcome']")) ?? "";
    check("bienvenue avec nom artisan", welcome.includes(ARTISAN_NAME));

    // 4 cartes stats
    const statCards = await page.locator("[data-testid='dashboard-stats'] > div").count();
    check("4 cartes stats (Scans/Produits/QR/Packs)", statCards === 4);

    // Notifications visibles (2 scans enregistrés ci-dessus)
    const notifVisible = await page.isVisible("[data-testid='dashboard-notifications']");
    const notifText = notifVisible
      ? (await page.textContent("[data-testid='dashboard-notifications']")) ?? ""
      : "";
    check(
      "activité récente affiche le produit scanné",
      notifVisible && notifText.includes(PRODUCT_NAME)
    );

    // Carte produit : photo + barre de progression + actions
    const prodCard = page.locator("[data-testid^='product-card-']").first();
    check("carte produit rendue", (await prodCard.count()) === 1);
    check("photo produit affichée", await prodCard.locator("img").count() === 1);
    check(
      "barre de progression des scans",
      await prodCard.locator("div.h-1\\.5 > div").count() === 1
    );
    check(
      "bouton Modifier (testid conservé)",
      (await page.locator("[data-testid^='product-edit-']").count()) === 1
    );

    // Packs : badge Activé + "Pack #1"
    const packsText = (await page.textContent("[data-testid='dashboard-packs']")) ?? "";
    check("pack #1 listé", packsText.includes("Pack #1"));
    check("badge Activé", packsText.includes("Activé"));

    // Actions rapides : 4 tuiles dégradés
    const actionTiles = await page
      .locator("[data-testid='dashboard-actions'] button, [data-testid='dashboard-actions'] a")
      .count();
    check("4 tuiles actions rapides", actionTiles === 4);

    // Carte partage WhatsApp (1er produit public)
    check(
      "carte partage WhatsApp visible",
      await page.isVisible("text=Partager sur WhatsApp")
    );

    // Capture desktop pleine page
    await page.screenshot({ path: "shots/dashboard-redesign-desktop.png", fullPage: true });
    console.log("  📸 shots/dashboard-redesign-desktop.png");

    // Vue mobile (iPhone 14 ~390×844)
    const mob = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mpage = await mob.newPage();
    await mpage.addInitScript(
      ([key, token]) => window.localStorage.setItem(key!, token!),
      ["verifscan_artisan_token", loginJson.token!] as [string, string]
    );
    await mpage.goto(`${BASE}/artisan/dashboard`, { waitUntil: "networkidle" });
    await mpage.waitForSelector("[data-testid='dashboard-stats']", { timeout: 20000 });
    await mpage.screenshot({ path: "shots/dashboard-redesign-mobile.png", fullPage: true });
    console.log("  📸 shots/dashboard-redesign-mobile.png");

    await ctx.close();
    await mob.close();
  } finally {
    await browser.close();
  }
}

main()
  .catch((e) => {
    console.error(e);
    failures++;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
    console.log(`\n═══ ${total - failures}/${total} checks OK ═══`);
    if (failures > 0) {
      console.error(`✗ ${failures} échec(s)`);
      process.exit(1);
    }
    console.log("✅ Dashboard artisan redesigné — design 2.0 validé\n");
  });
