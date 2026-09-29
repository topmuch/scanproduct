/**
 * Test E2E — Portail ARTISAN complet (spec PROMPT TECHNIQUE, phases 3-5-7).
 *
 * Couvre le flux complet en 5 étapes du système artisanal :
 *   1. PRODUCTION  : POST /api/admin/batches (6 QR, packs de 3)
 *   2. VENTE       : POST /api/admin/sell-pack (pack vendu à un artisan,
 *                    compte créé avec mot de passe « 0000 », lien wa.me)
 *   3. CONNEXION   : POST /api/artisan/login (mauvais mdp 401, bon mdp
 *                    token JWT, normalisation « 77 600 00 01 » vs
 *                    « +221776000001 »)
 *   4. ACTIVATION  : upload photo (mode masterCode) + activate-pack
 *   5. DASHBOARD   : GET /api/artisan/dashboard (stats, packs, produits
 *                    agrégés) puis ÉDITION EN MASSE (GET préfill + PUT :
 *                    tous les QR du même produit mis à jour, page /a/
 *                    reflète la correction) + changement de mot de passe
 *
 * Sécurité : dashboard sans token 401 ; vente sans session 403 ; double
 * vente 409 ; PUT/upload sur le pack d'un AUTRE artisan → 404.
 *
 * UI Playwright : /artisan/login → /artisan/dashboard (stats + produits) →
 * page édition (bandeau masse + enregistrement) → /superadmin (bouton
 * « Vendre » → modal → étape WhatsApp wa.me).
 *
 * Sorties : shots/artisan-portal-*.png + exit 1 si un check échoue.
 *
 * Run : DATABASE_URL="file:/home/z/my-project/db/custom.db" bun scripts/test-artisan-portal.ts
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
      "user-agent": "test-artisan-portal",
      ...(init.headers ?? {}),
      cookie: jar,
    },
  });
  captureCookies(res);
  return res;
}

const ARTISAN1_PHONE = "77 600 00 01"; // avec espaces → normalisé 776000001
const ARTISAN1_NORM = "776000001";
const ARTISAN2_PHONE = "776000002";
const ARTISAN1_NAME = "Aissata Cosmétiques";
const ARTISAN2_NAME = "Atelier Fatou";

let createdBatchIds: string[] = [];
let createdArtisanPhones = [ARTISAN1_NORM, ARTISAN2_PHONE];

async function main() {
  console.log("\n═══ 1. Setup : login superadmin + batch de test ═══");
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
    body: JSON.stringify({ totalQuantity: 6, packSize: 3, pricePerPack: 5000 }),
  });
  const batchJson = (await batchRes.json()) as {
    success?: boolean;
    batch?: { id: string };
  };
  check("batch créé (6 QR / packs de 3)", batchRes.ok && batchJson.batch?.id != null);
  const batchId = batchJson.batch!.id;
  createdBatchIds.push(batchId);
  // La réponse POST ne renvoie pas les packs → lecture DB directe
  const createdPacks = await prisma.pack.findMany({
    where: { batchId },
    orderBy: { packNumber: "asc" },
  });
  check("2 packs générés avec codes maîtres", createdPacks.length === 2 && createdPacks.every((p) => p.masterQrCode.startsWith("MASTER-")));
  const pack1 = createdPacks.find((p) => p.packNumber === 1)!;
  const pack2 = createdPacks.find((p) => p.packNumber === 2)!;

  console.log("\n═══ 2. VENTE du pack 1 (POST /api/admin/sell-pack) ═══");

  // Sans session → 403
  const noAuthRes = await fetch(`${BASE}/api/admin/sell-pack`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ packId: pack1.id, artisanPhone: ARTISAN1_PHONE, artisanName: ARTISAN1_NAME }),
  });
  check("vente sans session superadmin → 403", noAuthRes.status === 403);

  const sellRes = await req("/api/admin/sell-pack", {
    method: "POST",
    body: JSON.stringify({
      packId: pack1.id,
      artisanPhone: ARTISAN1_PHONE,
      artisanName: ARTISAN1_NAME,
    }),
  });
  const sellJson = (await sellRes.json()) as {
    success?: boolean;
    whatsappLink?: string;
    whatsappMessage?: string;
    loginUrl?: string;
    defaultPassword?: string;
    artisan?: { phone: string; name: string | null };
    pack?: { status: string };
  };
  check("vente réussie (200)", sellRes.ok && sellJson.success === true);
  check("pack passé à 'sold'", sellJson.pack?.status === "sold");
  check(
    "lien wa.me avec indicatif 221 et numéro normalisé",
    (sellJson.whatsappLink ?? "").startsWith(`https://wa.me/221${ARTISAN1_NORM}?text=`)
  );
  check(
    "message WhatsApp contient le nom, le mdp 0000 et le lien login",
    (sellJson.whatsappMessage ?? "").includes("Aissata") &&
      (sellJson.whatsappMessage ?? "").includes("0000") &&
      (sellJson.whatsappMessage ?? "").includes("/artisan/login")
  );
  check(
    "loginUrl construite sur l'origine consultée",
    (sellJson.loginUrl ?? "").startsWith(BASE)
  );

  // Double vente → 409
  const doubleRes = await req("/api/admin/sell-pack", {
    method: "POST",
    body: JSON.stringify({ packId: pack1.id, artisanPhone: ARTISAN1_PHONE, artisanName: ARTISAN1_NAME }),
  });
  check("double vente → 409", doubleRes.status === 409);

  // Compte Artisan créé en DB, mot de passe HASHÉ
  const artisan1 = await prisma.artisan.findUnique({ where: { phone: ARTISAN1_NORM } });
  check("compte Artisan créé (téléphone normalisé)", !!artisan1);
  check(
    "mot de passe stocké HASHÉ (bcrypt, pas '0000' en clair)",
    !!artisan1 && artisan1.password.startsWith("$2") && artisan1.password !== "0000"
  );
  check("nom de l'artisan enregistré", artisan1?.name === ARTISAN1_NAME);
  check("pack lié au compte (artisanId)", !!(await prisma.pack.findFirst({ where: { id: pack1.id, artisanId: artisan1!.id } })));

  console.log("\n═══ 3. CONNEXION artisan (/api/artisan/login) ═══");

  const wrongRes = await fetch(`${BASE}/api/artisan/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: ARTISAN1_NORM, password: "1111" }),
  });
  check("mauvais mot de passe → 401 'Mot de passe incorrect'", wrongRes.status === 401);

  const loginSpaced = await fetch(`${BASE}/api/artisan/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: ARTISAN1_PHONE, password: "0000" }),
  });
  const loginSpacedJson = (await loginSpaced.json()) as {
    token?: string;
    artisan?: { phone: string; name: string | null };
  };
  check("login avec numéro espacé + mdp 0000 → 200", loginSpaced.ok && !!loginSpacedJson.token);
  check("artisan renvoyé avec nom + téléphone normalisé", loginSpacedJson.artisan?.phone === ARTISAN1_NORM && loginSpacedJson.artisan?.name === ARTISAN1_NAME);

  const token1 = loginSpacedJson.token!;

  // Normalisation indicatif international
  const loginIntl = await fetch(`${BASE}/api/artisan/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: `+221${ARTISAN1_NORM}`, password: "0000" }),
  });
  check("login « +221776000001 » = MÊME compte", loginIntl.ok);

  const dashNoAuth = await fetch(`${BASE}/api/artisan/dashboard`);
  check("dashboard sans token → 401", dashNoAuth.status === 401);

  const token1Header = { Authorization: `Bearer ${token1}` };
  const dashEmpty = await fetch(`${BASE}/api/artisan/dashboard`, { headers: token1Header });
  const dashEmptyJson = (await dashEmpty.json()) as {
    artisan?: { phone: string };
    packs?: Array<{ id: string; status: string }>;
    stats?: { totalScans: number; totalProducts: number };
    products?: unknown[];
  };
  check("dashboard (avant activation) → 200", dashEmpty.ok);
  check("pack vendu visible dans le dashboard", dashEmptyJson.packs?.some((p) => p.id === pack1.id && p.status === "sold") === true);
  check("stats à zéro avant activation", dashEmptyJson.stats?.totalProducts === 0 && dashEmptyJson.stats?.totalScans === 0);

  console.log("\n═══ 4. ACTIVATION du pack 1 (upload + activate-pack) ═══");

  // Upload photo — mode masterCode (pack inactif)
  const upForm = new FormData();
  upForm.append("masterCode", pack1.masterQrCode);
  upForm.append("file", new File([PNG_1X1], "produit.png", { type: "image/png" }));
  const uploadRes = await fetch(`${BASE}/api/artisan/upload`, { method: "POST", body: upForm });
  const uploadJson = (await uploadRes.json()) as { url?: string };
  check("upload photo produit (mode masterCode) → 200", uploadRes.ok && !!uploadJson.url);
  const photoUrl = uploadJson.url!;

  const activateRes = await fetch(`${BASE}/api/artisan/activate-pack`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      masterCode: pack1.masterQrCode,
      productData: {
        productName: "Savon au Karité Portal",
        contenance: "250g",
        ingredients: "Beurre de karité, huile de coco",
        manufacturingDate: "2026-09-25",
        expirationDate: "2027-09-25",
        artisanName: ARTISAN1_NAME,
        contactPhone: ARTISAN1_PHONE,
        photoUrl,
        artisanBio: "Savonnerie de Guédiawaye",
        usageTips: "Conserver au sec",
      },
    }),
  });
  const activateJson = (await activateRes.json()) as { activated?: number; firstCode?: string };
  check("activation en masse (3 étiquettes)", activateRes.ok && activateJson.activated === 3);
  const firstCode = activateJson.firstCode!;

  const pack1After = await prisma.pack.findUnique({ where: { id: pack1.id } });
  check("pack activé + lié au compte existant (pas de doublon)", pack1After?.status === "activated" && pack1After?.artisanId === artisan1!.id);
  const artisanCount = await prisma.artisan.count({ where: { phone: ARTISAN1_NORM } });
  check("activation ne duplique pas le compte Artisan", artisanCount === 1);

  console.log("\n═══ 5. DASHBOARD après activation ═══");
  const dashRes = await fetch(`${BASE}/api/artisan/dashboard`, { headers: token1Header });
  const dashJson = (await dashRes.json()) as {
    stats?: { totalScans: number; totalProducts: number; totalQRCodes: number; totalPacks: number };
    products?: Array<{
      id: string;
      name: string;
      qrCount: number;
      scanCount: number;
      photoUrl: string | null;
      viewCode: string;
    }>;
    notifications?: unknown[];
  };
  check("dashboard → 200", dashRes.ok);
  check("stats : 1 produit, 3 QR actifs", dashJson.stats?.totalProducts === 1 && dashJson.stats?.totalQRCodes === 3);
  check(
    "produit agrégé (nom + photo + qrCount 3)",
    dashJson.products?.[0]?.name === "Savon au Karité Portal" &&
      dashJson.products?.[0]?.qrCount === 3 &&
      dashJson.products?.[0]?.photoUrl === photoUrl
  );

  console.log("\n═══ 6. ÉDITION EN MASSE (GET préfill + PUT) ═══");
  const productId = dashJson.products![0].id;

  const prefillRes = await fetch(`${BASE}/api/artisan/products/${productId}`, { headers: token1Header });
  const prefillJson = (await prefillRes.json()) as {
    groupCount?: number;
    product?: { productName: string; contactPhone: string; photoUrl: string };
    pack?: { masterQrCode: string; artisanPhotos: string[] };
  };
  check("pré-remplissage → 200", prefillRes.ok);
  check("groupe produit = 4 QR (3 étiquettes + maître)", prefillJson.groupCount === 4);
  check("champs préremplis (nom, téléphone, photo)", prefillJson.product?.productName === "Savon au Karité Portal" && prefillJson.product?.photoUrl === photoUrl);

  // Upload via mode ÉDITION (token + packId) — nouvelle photo produit
  const upForm2 = new FormData();
  upForm2.append("packId", pack1.id);
  upForm2.append("file", new File([PNG_1X1], "produit-v2.png", { type: "image/png" }));
  const upload2Res = await fetch(`${BASE}/api/artisan/upload`, {
    method: "POST",
    headers: token1Header,
    body: upForm2,
  });
  const upload2Json = (await upload2Res.json()) as { url?: string };
  check("upload en mode ÉDITION (token + packId) → 200", upload2Res.ok && !!upload2Json.url);

  const putRes = await fetch(`${BASE}/api/artisan/products/${productId}`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...token1Header },
    body: JSON.stringify({
      productName: "Savon au Karité SUPRÊME",
      contenance: "300g",
      ingredients: "Beurre de karité pur, huile de coco vierge",
      manufacturingDate: "2026-09-26",
      expirationDate: "2027-09-26",
      artisanName: ARTISAN1_NAME,
      contactPhone: "77 600 11 11",
      photoUrl: upload2Json.url!,
      artisanBio: "Savonnerie artisanale de Guédiawaye, Dakar",
      usageTips: "Conserver au sec\nÉviter le soleil direct",
      instagramUrl: "https://instagram.com/aissata.cosmetiques",
      productPrice: "3 500 FCFA",
      productDesignation: "Karité brut 100% naturel",
    }),
  });
  const putJson = (await putRes.json()) as { updated?: number; success?: boolean };
  check("PUT édition masse → 200, 4 QR mis à jour", putRes.ok && putJson.updated === 4 && putJson.success === true);

  // Vérification DB : tous les lots du groupe mis à jour
  const updatedLots = await prisma.preActivatedLot.findMany({
    where: { packId: pack1.id },
  });
  check(
    "DB : tous les lots portent le nouveau nom + téléphone",
    updatedLots.every((l) => l.productName === "Savon au Karité SUPRÊME") &&
      updatedLots.every((l) => l.contactPhone === "77 600 11 11")
  );
  const packAfterPut = await prisma.pack.findUnique({ where: { id: pack1.id } });
  check(
    "DB : champs pack mis à jour (prix, désignation, insta) + artisanId CONSERVÉ",
    packAfterPut?.productPrice === "3 500 FCFA" &&
      packAfterPut?.productDesignation === "Karité brut 100% naturel" &&
      packAfterPut?.instagramUrl?.includes("aissata") === true &&
      packAfterPut?.artisanId === artisan1!.id
  );

  // La page publique reflète la correction
  const pageRes = await fetch(`${BASE}/a/${firstCode}`);
  const pageHtml = await pageRes.text();
  check("page /a/<code> : nouveau nom visible", pageHtml.includes("Savon au Karité SUPRÊME"));
  check("page /a/<code> : nouvelle photo servie", pageHtml.includes(upload2Json.url!.replace("/api/uploads/", "")) || pageHtml.includes(encodeURIComponent(upload2Json.url!)) || pageHtml.includes(upload2Json.url!.split("/").pop()!));

  console.log("\n═══ 7. SÉCURITÉ inter-artisan ═══");
  // Artisan 2 : première connexion SANS vente → auto-création avec le mdp saisi
  const login2 = await fetch(`${BASE}/api/artisan/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: ARTISAN2_PHONE, password: "motdepasse2" }),
  });
  const login2Json = (await login2.json()) as { token?: string; created?: boolean };
  check("1re connexion d'un nouveau numéro → compte créé (mdp saisi)", login2.ok && login2Json.created === true);
  createdArtisanPhones.push(ARTISAN2_PHONE);

  // L'artisan 2 active le pack 2 (contactPhone différent de son identifiant)
  const act2 = await fetch(`${BASE}/api/artisan/activate-pack`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      masterCode: pack2.masterQrCode,
      productData: {
        productName: "Beurre de karité Voisine",
        contenance: "100g",
        ingredients: "Karité",
        manufacturingDate: "2026-09-25",
        expirationDate: "2027-03-25",
        artisanName: ARTISAN2_NAME,
        contactPhone: ARTISAN2_PHONE,
      },
    }),
  });
  check("activation pack 2 par l'artisan 2", act2.ok);
  const pack2Lots = await prisma.preActivatedLot.findFirst({
    where: { packId: pack2.id, isMaster: false },
  });
  const foreignPut = await fetch(`${BASE}/api/artisan/products/${pack2Lots!.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...token1Header },
    // Corps VOLONTAIREMENT valide (zod) : c'est la garde de PROPRIÉTÉ qui
    // doit répondre 404, pas la validation.
    body: JSON.stringify({
      productName: "PIRATAGE PRODUIT",
      contenance: "xx",
      ingredients: "x y",
      manufacturingDate: "2026-01-01",
      expirationDate: "2027-01-01",
      artisanName: "XX",
      contactPhone: "770000000",
    }),
  });
  check("PUT sur le produit d'un AUTRE artisan → 404", foreignPut.status === 404);

  const foreignUpload = new FormData();
  foreignUpload.append("packId", pack2.id);
  foreignUpload.append("file", new File([PNG_1X1], "hack.png", { type: "image/png" }));
  const fUpRes = await fetch(`${BASE}/api/artisan/upload`, {
    method: "POST",
    headers: token1Header,
    body: foreignUpload,
  });
  check("upload sur le pack d'un AUTRE artisan → 404", fUpRes.status === 404);

  console.log("\n═══ 8. Changement de mot de passe ═══");
  const pwdRes = await fetch(`${BASE}/api/artisan/password`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...token1Header },
    body: JSON.stringify({ currentPassword: "0000", newPassword: "nouveaumdp1" }),
  });
  check("PATCH mot de passe → 200", pwdRes.ok);

  const oldLogin = await fetch(`${BASE}/api/artisan/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: ARTISAN1_NORM, password: "0000" }),
  });
  check("ancien mot de passe → 401", oldLogin.status === 401);

  const newLogin = await fetch(`${BASE}/api/artisan/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: ARTISAN1_NORM, password: "nouveaumdp1" }),
  });
  check("nouveau mot de passe → 200", newLogin.ok);

  console.log("\n═══ 9. UI Playwright — portail artisan ═══");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

  // Page de connexion
  await page.goto(`${BASE}/artisan/login`, { waitUntil: "networkidle" });
  check("page /artisan/login rendue", await page.isVisible("[data-testid='artisan-login-page']"));
  check("aide mot de passe par défaut visible", (await page.textContent("main"))?.includes("0000") === true);

  // Connexion via l'UI (artisan 2 — mot de passe personnalisé)
  await page.fill("[data-testid='login-phone']", ARTISAN2_PHONE);
  await page.fill("[data-testid='login-password']", "motdepasse2");
  await page.click("[data-testid='login-submit']");
  await page.waitForURL("**/artisan/dashboard", { timeout: 15000 });
  await page.waitForSelector("[data-testid='dashboard-stats']", { timeout: 15000 });
  check("redirection + dashboard rendu", await page.isVisible("[data-testid='artisan-dashboard']"));
  check(
    "bienvenue avec le nom de l'artisan 2",
    (await page.textContent("[data-testid='dashboard-welcome']"))?.includes(ARTISAN2_NAME) === true
  );
  check(
    "pack activé visible",
    (await page.textContent("[data-testid='dashboard-packs']"))?.includes("Pack #2") === true
  );
  const prodCard = page.locator("[data-testid='dashboard-products'] .rounded-xl.border");
  check("produit activé affiché", (await prodCard.count()) >= 1);
  await page.screenshot({ path: "shots/artisan-portal-dashboard.png", fullPage: true });

  // Édition via l'UI (produit de l'artisan 2)
  const editLink = page.locator("a[href^='/artisan/products/'][href$='/edit']").first();
  await editLink.click();
  await page.waitForSelector("[data-testid='artisan-edit-page']", { timeout: 15000 });
  await page.waitForSelector("[data-testid='mass-update-banner']", { timeout: 15000 });
  const banner = await page.textContent("[data-testid='mass-update-banner']");
  check("bandeau modification en masse (4 QR codes)", banner?.includes("4 QR code") === true);
  await page.fill("[data-testid='edit-productName']", "Beurre de karité Voisine Deluxe");
  await page.fill("[data-testid='edit-contactPhone']", "77 611 22 33");
  await page.screenshot({ path: "shots/artisan-portal-edit.png", fullPage: true });
  await page.click("[data-testid='edit-submit']");
  await page.waitForSelector("[data-testid='edit-success']", { timeout: 20000 });
  check(
    "succès édition : 4 QR mis à jour",
    (await page.textContent("[data-testid='edit-success']"))?.includes("4 QR code") === true
  );
  const editedLots = await prisma.preActivatedLot.findMany({ where: { packId: pack2.id } });
  check(
    "DB après édition UI : nouveau nom + téléphone sur tout le groupe",
    editedLots.every((l) => l.productName === "Beurre de karité Voisine Deluxe") &&
      editedLots.every((l) => l.contactPhone === "77 611 22 33")
  );

  // Mauvais mot de passe via UI (artisan 1)
  await page.context().clearCookies();
  const page1 = await browser.newPage({ viewport: { width: 420, height: 900 } });
  await page1.goto(`${BASE}/artisan/login`, { waitUntil: "networkidle" });
  await page1.fill("[data-testid='login-phone']", ARTISAN1_NORM);
  await page1.fill("[data-testid='login-password']", "mauvaismdp");
  await page1.click("[data-testid='login-submit']");
  await page1.waitForSelector("[data-testid='login-error']", { timeout: 10000 });
  check(
    "UI : erreur 'Mot de passe incorrect' affichée",
    (await page1.textContent("[data-testid='login-error']"))?.includes("Mot de passe incorrect") === true
  );
  await page1.screenshot({ path: "shots/artisan-portal-login-erreur.png" });
  await page1.close();

  console.log("\n═══ 10. UI Playwright — vente superadmin ═══");
  const admin = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  // Session superadmin : injection du cookie jar via login API dans le navigateur
  await admin.goto(`${BASE}/login/admin`, { waitUntil: "networkidle" });
  await admin.fill("input[type='email']", "admin@verifscan.sn");
  await admin.fill("input[type='password']", process.env.ADMIN_PASSWORD ?? "ChangeMeOnFirstLogin!2025");
  await admin.keyboard.press("Enter");
  await admin.waitForURL("**/superadmin**", { timeout: 20000 });

  // Onglet QR Artisans (sidebar « CONTENU »)
  await admin.click("text=QR Artisans");
  await admin.waitForSelector("text=Production QR Artisans", { timeout: 15000 });

  /** Déplie la carte du batch identifié par son préfixe (bouton « Packs »). */
  const expandBatch = async (prefix: string) => {
    const card = admin
      .locator("div.rounded-xl")
      .filter({ hasText: prefix.toUpperCase() })
      .first();
    await card.locator("button:has-text('Packs')").click();
  };

  // Déplier le batch de test → packs vendus/activés SANS bouton Vendre
  await expandBatch(batchId.slice(0, 8));
  await admin.waitForSelector(`[data-testid='sell-btn-${pack1.id}'], [data-testid='sell-btn-${pack2.id}'], text=Artisan :`, { timeout: 15000 }).catch(() => {});
  const sellBtnCount = await admin.locator(`[data-testid='sell-btn-${pack1.id}']`).count();
  check("pack activé : plus de bouton Vendre", sellBtnCount === 0);
  check(
    "pack activé : artisan affiché",
    (await admin.locator("div.rounded-xl").filter({ hasText: batchId.slice(0, 8).toUpperCase() }).first().textContent())?.includes("Aissata") === true
  );

  // Créer un batch vendable via l'UI pour tester le modal de vente
  await admin.fill("input[type='number']", "3");
  // Le formulaire : totalQuantity / packSize / pricePerPack — on cible les champs par position
  const numberInputs = admin.locator("form input[type='number'], div input[type='number']");
  const inputsCount = await numberInputs.count();
  if (inputsCount >= 3) {
    await numberInputs.nth(0).fill("3");
    await numberInputs.nth(1).fill("3");
    await numberInputs.nth(2).fill("6000");
  }
  await admin.click("button:has-text('Générer')");
  await admin.waitForTimeout(2500);
  // Un nouveau batch avec un pack disponible → bouton Vendre
  const newBatch = await prisma.batch.findFirst({
    orderBy: { createdAt: "desc" },
    include: { packs: { where: { status: "available" } } },
  });
  if (newBatch && newBatch.packs.length > 0) {
    createdBatchIds.push(newBatch.id);
    // Déplier le NOUVEAU batch (bouton « Packs » de sa carte)
    await expandBatch(newBatch.id.slice(0, 8));
    const sellBtn = admin.locator(`[data-testid='sell-btn-${newBatch.packs[0].id}']`);
    await sellBtn.waitFor({ timeout: 15000 });
    await sellBtn.click();
    await admin.waitForSelector("[data-testid='sell-pack-modal']", { timeout: 10000 });
    await admin.fill("[data-testid='sell-phone']", "77 655 44 33");
    await admin.fill("[data-testid='sell-name']", "Marché Sandaga Bio");
    await admin.screenshot({ path: "shots/artisan-portal-vente-modal.png" });
    await admin.click("[data-testid='sell-submit']");
    await admin.waitForSelector("[data-testid='sell-success']", { timeout: 15000 });
    const waHref = await admin.getAttribute("[data-testid='sell-whatsapp']", "href");
    check("étape WhatsApp : lien wa.me pré-rempli", !!waHref && waHref.startsWith("https://wa.me/221776554433"));
    check(
      "message contient le login + mdp 0000",
      decodeURIComponent(waHref ?? "").includes("/artisan/login") &&
        decodeURIComponent(waHref ?? "").includes("0000")
    );
    await admin.screenshot({ path: "shots/artisan-portal-vente-whatsapp.png" });
  } else {
    check("nouveau batch vendable créé via UI", false);
  }

  await browser.close();

  console.log("\n═══ 11. Nettoyage ═══");
  await cleanup();

  console.log("\n════════════════════════════════════════");
  if (failures > 0) {
    console.log(`✗ ${failures} vérification(s) en échec`);
    process.exit(1);
  } else {
    console.log("✓ Toutes les vérifications du portail artisan passent");
  }
}

main()
  .catch(async (e) => {
    console.error("Erreur fatale:", e);
    await cleanup();
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/** Supprime batchs + comptes créés par le test (cascade packs/lots). */
async function cleanup() {
  try {
    for (const id of createdBatchIds) {
      await prisma.batch.delete({ where: { id } }).catch(() => {});
    }
    for (const phone of createdArtisanPhones) {
      await prisma.artisan.delete({ where: { phone } }).catch(() => {});
    }
    console.log(
      `  Nettoyage : ${createdBatchIds.length} batch(s), ${createdArtisanPhones.length} compte(s) artisan`
    );
  } catch {
    /* nettoyage best-effort */
  }
}
