/**
 * Test E2E — SLIDERS PAGE PRODUIT PUBLIQUE
 * (demande utilisateur :
 *   1. photos de l'atelier → défilent en slides (diaporama auto)
 *   2. en bas de page → « autres produits du créateur » défilent en slide)
 *
 * Scénario :
 *   1. Purge initiale + 3 batchs (1 pack × 1 QR) — MÊME artisan
 *      (même nom + même téléphone) : A « Beurre de karité bio » (prix +
 *      photo produit + 2 photos d'atelier), B « Savon noir » (prix + photo),
 *      C « Jus de bissap » (sans prix, sans photo).
 *   2. Activation des 3 produits via /api/artisan/activate-groups.
 *   3. Page /a/<codeA> :
 *      - section « Autres produits de … » PRÉSENTE (2 slides : B, C)
 *      - testids similar-product-slide-0 / slide-1 (carrousel, PAS la grille)
 *      - l'ancienne grille `grid grid-cols-2 gap-4` a DISPARU
 *      - cartes carrousel « Voir le produit » + badge prix « 1 500 FCFA »
 *      - AtelierSlider : photos atelier présentes, flèches ‹ › (diaporama)
 *   4. Page /a/<codeC> (produit sans photo) : le carrousel montre A + B.
 *   5. Nettoyage : purge finale.
 *
 * Run : BASE=http://localhost:3100 DATABASE_URL="file:.../custom.db" bun scripts/test-product-sliders.ts
 */
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

const BASE = process.env.BASE ?? "http://localhost:3100";
const DB_URL =
  process.env.DATABASE_URL ?? "file:/home/z/my-project/db/custom.db";

const prisma = new PrismaClient({
  datasources: { db: { url: DB_URL } },
});

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failures++;
}

/** PNG valide (généré par sharp) — photo produit / photo atelier. */
async function makePng(color: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({
    create: { width: 64, height: 64, channels: 3, background: color },
  })
    .png()
    .toBuffer();
}

async function uploadPhoto(
  buf: Buffer,
  name: string,
  masterCode: string
): Promise<string> {
  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(buf)], { type: "image/png" }), name);
  fd.append("masterCode", masterCode);
  const res = await fetch(`${BASE}/api/artisan/upload`, { method: "POST", body: fd });
  const json = (await res.json()) as { url?: string; error?: string };
  if (res.status !== 200 || !json.url) {
    throw new Error(`upload ${name} → ${res.status} ${json.error ?? ""}`);
  }
  return json.url;
}

async function main() {
  // ── 1. Purge + 3 batchs du MÊME artisan ───────────────────────────────────
  console.log("1. Purge initiale + 3 batchs (même artisan)");
  await prisma.artisanScan.deleteMany({});
  await prisma.artisanReview.deleteMany({});
  await prisma.preActivatedLot.deleteMany({});
  await prisma.pack.deleteMany({});
  await prisma.batch.deleteMany({});

  let jar = "";
  const capture = (res: Response) => {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const nv = c.split(";")[0];
      const name = nv.split("=")[0];
      jar = jar
        .split("; ")
        .filter((p) => p && !p.startsWith(`${name}=`))
        .concat(nv)
        .join("; ");
    }
  };
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  capture(csrfRes);
  const csrf = (await csrfRes.json()) as { csrfToken: string };
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/json", cookie: jar },
    body: JSON.stringify({
      csrfToken: csrf.csrfToken,
      email: "admin@verifscan.sn",
      password: process.env.ADMIN_PASSWORD ?? "Admin123!2025",
      callbackUrl: `${BASE}/superadmin`,
    }),
  });
  capture(loginRes);
  const adminCookie = jar;

  const masters: string[] = [];
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`${BASE}/api/admin/batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ totalQuantity: 1, packSize: 1, pricePerPack: 0 }),
    });
    const json = (await res.json()) as { masterCodes?: string[] };
    if (!json.masterCodes?.[0]) {
      console.error(`  ✗ batch ${i + 1} non créé`);
      process.exit(1);
    }
    masters.push(json.masterCodes[0]);
  }
  const [masterA, masterB, masterC] = masters;
  check("3 batchs créés (A, B, C)", masters.length === 3);

  // ── 2. Uploads (photos produit + photos atelier) ─────────────────────────
  console.log("2. Uploads photos produit + atelier");
  const photoA = await uploadPhoto(
    await makePng({ r: 200, g: 150, b: 60 }),
    "karite.png",
    masterA
  );
  const photoB = await uploadPhoto(
    await makePng({ r: 60, g: 60, b: 60 }),
    "savon.png",
    masterB
  );
  const atelier1 = await uploadPhoto(
    await makePng({ r: 120, g: 80, b: 40 }),
    "atelier-1.png",
    masterA
  );
  const atelier2 = await uploadPhoto(
    await makePng({ r: 80, g: 120, b: 40 }),
    "atelier-2.png",
    masterA
  );
  check("photo produit A uploadée", photoA.endsWith(".webp"));
  check("photo produit B uploadée", photoB.endsWith(".webp"));
  check("2 photos atelier uploadées", atelier1.endsWith(".webp") && atelier2.endsWith(".webp"));

  // ── 3. Activations (même artisanName + même contactPhone) ────────────────
  console.log("3. Activation des 3 produits (même artisan)");
  const activate = async (
    masterCode: string,
    productName: string,
    productPrice: string | null,
    photoUrl: string
  ) => {
    const res = await fetch(`${BASE}/api/artisan/activate-groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        masterCode,
        groups: [
          {
            count: 1,
            productData: {
              productName,
              contenance: "200 g",
              ingredients: "Naturel",
              manufacturingDate: "2026-01-15",
              expirationDate: "2027-01-15",
              photoUrl,
              ...(productPrice ? { productPrice } : {}),
            },
          },
        ],
        shared: {
          artisanName: "Awa Ndiaye",
          contactPhone: "+221771234567",
          ...(masterCode === masterA
            ? { artisanPhotos: [atelier1, atelier2] }
            : {}),
        },
      }),
    });
    const json = (await res.json()) as { firstCode?: string; error?: string };
    if (res.status !== 200 || !json.firstCode) {
      throw new Error(`activation ${productName} → ${res.status} ${json.error ?? ""}`);
    }
    return json.firstCode;
  };

  const codeA = await activate(masterA, "Beurre de karité bio", "2 500 FCFA", photoA);
  const codeB = await activate(masterB, "Savon noir traditionnel", "1 500 FCFA", photoB);
  const codeC = await activate(masterC, "Jus de bissap naturel", null, "");
  check("produit A activé", !!codeA);
  check("produit B activé", !!codeB);
  check("produit C activé (sans prix ni photo)", !!codeC);

  // ── 4. Page A : carrousel « Autres produits » + slider atelier ───────────
  console.log("4. Page /a/<A> — carrousels");
  const pageA = await fetch(`${BASE}/a/${codeA}`);
  const htmlA = await pageA.text();
  check("page A → 200", pageA.status === 200);
  check("section « Autres produits de » présente", htmlA.includes("Autres produits de"));
  check(
    "carrousel : slide produit B présente",
    htmlA.includes(`similar-product-slide-0`) && htmlA.includes(codeB)
  );
  check(
    "carrousel : slide produit C présente",
    htmlA.includes(`similar-product-slide-1`) && htmlA.includes(codeC)
  );
  check(
    "ancienne grille 2 colonnes SUPPRIMÉE",
    !htmlA.includes('grid grid-cols-2 gap-4')
  );
  check("cartes carrousel « Voir le produit »", htmlA.includes("Voir le produit"));
  check("badge prix du produit B sur la carte", htmlA.includes("1 500 FCFA"));
  check(
    "slider atelier : photos présentes",
    htmlA.includes("Agrandir la photo 1") && htmlA.includes("atelier de Awa Ndiaye")
  );
  check(
    "slider atelier : flèches diaporama (‹ ›)",
    htmlA.includes('aria-label="Photo précédente"') &&
      htmlA.includes('aria-label="Photo suivante"')
  );

  // ── 5. Page C (produit sans photo) : carrousel montre A + B ──────────────
  console.log("5. Page /a/<C> — carrousel depuis l'autre produit");
  const pageC = await fetch(`${BASE}/a/${codeC}`);
  const htmlC = await pageC.text();
  check("page C → 200", pageC.status === 200);
  check(
    "carrousel page C : produit A présent",
    htmlC.includes(`similar-product-slide-0`) && htmlC.includes(codeA)
  );
  check(
    "carrousel page C : produit B présent",
    htmlC.includes(codeB)
  );
  check("badge prix du produit A visible sur page C", htmlC.includes("2 500 FCFA"));

  // ── 6. Nettoyage ──────────────────────────────────────────────────────────
  console.log("6. Purge finale");
  await prisma.artisanScan.deleteMany({});
  await prisma.artisanReview.deleteMany({});
  await prisma.preActivatedLot.deleteMany({});
  await prisma.pack.deleteMany({});
  await prisma.batch.deleteMany({});
  check("purge finale OK", true);

  console.log(`\n${failures === 0 ? "✅ TOUS OK" : `❌ ${failures} ÉCHEC(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error("💥 Erreur fatale:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
