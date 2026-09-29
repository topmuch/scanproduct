/**
 * Test E2E — PhotoPicker à l'activation du QR code
 * (demande utilisateur : « télécharger la photo OU prendre une photo
 * avec son téléphone »).
 *
 * Scénario :
 *   1. Login superadmin → création d'un batch → code maître
 *   2. Playwright ouvre /activer-pack/<master> :
 *      - boutons « Prendre une photo » (caméra) + « Télécharger » présents
 *        sur le picker photo principale ET le picker photos atelier
 *      - photo principale via l'input CAMÉRA (capture=environment) → aperçu
 *      - 2 photos atelier via l'input GALERIE (multiple) → aperçus
 *      - dépassement de limite (3+2) → avertissement + cap respecté
 *      - retrait d'une photo via ✗ → compteur à jour
 *      - activation complète → écran succès → « Voir le produit activé »
 *   3. Vérifications serveur : photoUrl + artisanPhotos persistés en base,
 *      fichiers servis en HTTP 200 avec le bon Content-Type.
 *
 * Sorties : shots/photo-picker-*.png + exit 1 si une assertion échoue.
 *
 * Run : DATABASE_URL="file:/home/z/my-project/db/custom.db" bun scripts/test-photo-picker.ts
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

/** PNG 1×1 réel (magic bytes 89 50 4E 47) — reconnu par detectFormatFromBytes. */
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

// ── Cookie jar (login superadmin) ─────────────────────────────────────────
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
      "user-agent": "test-photo-picker",
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
  const login = await req("/api/auth/callback/credentials", {
    method: "POST",
    body: JSON.stringify({
      csrfToken: csrfJson.csrfToken,
      email: "admin@verifscan.sn",
      password: process.env.ADMIN_PASSWORD ?? "ChangeMeOnFirstLogin!2025",
      callbackUrl: `${BASE}/superadmin`,
    }),
  });
  const sess = await req("/api/auth/session");
  const sessJson = (await sess.json()) as { user?: unknown };
  if (!sessJson.user) {
    console.error("Login superadmin impossible");
    process.exit(1);
  }
  console.log(`1. login: ${login.status} — OK`);

  const batchRes = await req("/api/admin/batches", {
    method: "POST",
    body: JSON.stringify({ totalQuantity: 2, packSize: 1, pricePerPack: 0 }),
  });
  const batch = (await batchRes.json()) as { masterCodes?: string[] };
  const master = batch.masterCodes?.[0];
  if (!master) {
    console.error("Création batch impossible");
    process.exit(1);
  }
  console.log(`   batch créé — master: ${master}`);

  // ── 2. Playwright : formulaire d'activation ──────────────────────────
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });

  await page.goto(`${BASE}/activer-pack/${master}`, { waitUntil: "networkidle" });

  // 2a. Les deux modes sont proposés sur les deux pickers
  const cameraButtons = page.getByRole("button", { name: "Prendre une photo" });
  const downloadButtons = page.getByRole("button", { name: "Télécharger" });
  check("2a. boutons « Prendre une photo » (×2)", (await cameraButtons.count()) === 2);
  check("2b. boutons « Télécharger » (×2)", (await downloadButtons.count()) === 2);

  // Inputs cachés : caméra (capture) / galerie (multiple)
  const mainCameraInput = page.locator('input[type="file"][capture]').first();
  const galleryGalleryInput = page
    .locator('input[type="file"]:not([capture])[multiple]')
    .first();
  check("2c. input caméra principal présent", (await mainCameraInput.count()) >= 1);
  check("2d. input galerie multiple présent", (await galleryGalleryInput.count()) === 1);

  // 2e. Photo principale VIA L'INPUT CAMÉRA → aperçu immédiat
  await mainCameraInput.setInputFiles([
    { name: "photo-camera.png", mimeType: "image/png", buffer: PNG_1X1 },
  ]);
  await page.waitForSelector('img[alt^="Aperçu"]');
  check("2e. photo principale (caméra) → aperçu visible", true);

  // 2f. 2 photos atelier VIA L'INPUT GALERIE (multiple) → 2 aperçus + compteur
  await galleryGalleryInput.setInputFiles([
    { name: "atelier-1.png", mimeType: "image/png", buffer: PNG_1X1 },
    { name: "atelier-2.png", mimeType: "image/png", buffer: PNG_1X1 },
  ]);
  await page.waitForSelector('text=2 photos prêtes sur 3');
  check("2f. 2 photos atelier (galerie) → « 2 photos prêtes sur 3 »", true);

  // 2g. Dépassement de limite : +2 alors qu'il reste 1 place → cap + avertissement
  await galleryGalleryInput.setInputFiles([
    { name: "atelier-3.png", mimeType: "image/png", buffer: PNG_1X1 },
    { name: "atelier-4.png", mimeType: "image/png", buffer: PNG_1X1 },
  ]);
  await page.waitForSelector("text=Maximum 3 photos");
  check("2g. limite 3 respectée + avertissement affiché", true);
  check(
    "2h. compteur bloqué à « 3 photos prêtes sur 3 »",
    await page.isVisible('text=3 photos prêtes sur 3'),
  );

  // 2i. Retrait d'une photo atelier (3e aperçu de la page = galerie) via ✗
  await page.locator('button[aria-label="Retirer cette photo"]').nth(2).click();
  await page.waitForSelector('text=2 photos prêtes sur 3');
  check(
    "2i. retrait ✗ → avertissement effacé + « 2 photos prêtes sur 3 »",
    !(await page.isVisible("text=Maximum 3 photos")),
  );

  await page.screenshot({ path: "shots/photo-picker-form.png", fullPage: true });

  // ── 3. Remplissage du formulaire + activation ────────────────────────
  await page.fill("#productName", "Savon karité photo-picker");
  await page.fill("#contenance", "250g");
  await page.fill("#ingredients", "Karité, miel, huile de coco");
  await page.fill("#manufacturingDate", "2026-09-01");
  await page.fill("#expirationDate", "2027-09-01");
  await page.fill("#artisanName", "Artisan PhotoPicker Test");
  await page.fill("#contactPhone", "771234567");

  await page.getByRole("button", { name: "Activer tous mes produits" }).click();
  await page.waitForSelector("text=Pack activé avec succès", { timeout: 30_000 });
  check("3. activation complète (upload caméra + galerie inclus)", true);

  // 3b. Le bouton « Voir le produit activé » mène bien au produit
  await page.getByRole("button", { name: "Voir le produit activé" }).click();
  await page.waitForURL(/\/a\//, { timeout: 15_000 });
  const productUrl = page.url();
  const firstCode = productUrl.split("/a/")[1]?.split(/[?#]/)[0] ?? "";
  check("3b. « Voir le produit activé » → page produit", firstCode.length > 0);
  await page.waitForSelector("text=Savon karité photo-picker", { timeout: 15_000 });
  await page.screenshot({ path: "shots/photo-picker-product.png", fullPage: true });

  await browser.close();

  // ── 4. Vérifications base + fichiers servis ──────────────────────────
  const lot = await prisma.preActivatedLot.findUnique({ where: { qrCode: firstCode } });
  check("4a. lot activé trouvé en base", !!lot);
  check(
    "4b. photoUrl persistée = upload artisan",
    !!lot?.photoUrl?.startsWith("/api/uploads/artisan-"),
  );
  // Les photos atelier vivent sur le PACK (colonne String? = JSON string),
  // parsée par la page produit — même logique ici.
  const pack = lot
    ? await prisma.pack.findUnique({ where: { id: lot.packId } })
    : null;
  const gallery = (() => {
    const raw = pack?.artisanPhotos;
    if (!raw || typeof raw !== "string") return [];
    try {
      const arr = JSON.parse(raw) as unknown;
      return Array.isArray(arr) ? (arr as string[]) : [];
    } catch {
      return [];
    }
  })();
  check(
    "4c. 2 photos atelier persistées (pack.artisanPhotos JSON)",
    gallery.length === 2 && gallery.every((u) => u.startsWith("/api/uploads/artisan-")),
  );

  if (lot?.photoUrl) {
    const imgRes = await fetch(`${BASE}${lot.photoUrl}`);
    check(
      "4d. photo principale servie 200 + image/png",
      imgRes.status === 200 &&
        (imgRes.headers.get("content-type") ?? "").includes("image/png"),
    );
  }
  if (gallery.length === 2) {
    const g1 = await fetch(`${BASE}${gallery[0]}`);
    const g2 = await fetch(`${BASE}${gallery[1]}`);
    check(
      "4e. photos atelier servies 200",
      g1.status === 200 && g2.status === 200,
    );
  }

  // ── 5. Nettoyage : désactive le lot de test pour ne pas polluer ──────
  await prisma.preActivatedLot.updateMany({
    where: { packId: lot?.packId ?? "__none__" },
    data: { status: "inactive" },
  });
  console.log("5. lots de test désactivés (pack " + (lot?.packId ?? "?") + ")");

  await prisma.$disconnect();

  console.log(failures === 0 ? "\n✅ TOUS LES TESTS PASSENT" : `\n❌ ${failures} ÉCHEC(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
