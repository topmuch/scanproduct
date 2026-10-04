/**
 * Test E2E — SLIDERS PAGE PRODUIT PUBLIQUE (v2)
 * (demandes utilisateur :
 *   1. photos de l'atelier → défilent en slides — BUG corrigé : la page
 *      « monte et descend toute seule » (scrollIntoView vertical) ;
 *   2. « autres produits du créateur » en carrousel — BUG corrigé :
 *      seulement 2 produits affichés alors que l'artisan en a 6+.
 *
 * Reproduction du bug 2 :
 *   - artisan « Awa Ndiaye » (+221771234567) active 7 produits DISTINCTS ;
 *   - puis active 25 unités d'un MÊME produit « spam » (plus récent) ;
 *   - ANCIEN code : take:20 → les 20 lots spam dominent la fenêtre
 *     (dédoublonnage → 1 carte) + matching nom EXACT exclut la variante
 *     « AWA NDIAYE » → ~1-2 slides seulement ;
 *   - NOUVEAU code : take:200 + OR (nom OU 9 chiffres du téléphone) +
 *     dédoublonnage normalisé → 7 slides (spam = 1 seule carte).
 *
 * Scénario :
 *   1. Purge + 8 batchs : A..G (1 QR chacun) + SPAM (1 pack de 25 QR).
 *   2. Activations A→G même artisan (G : nom « AWA NDIAYE », même tel),
 *      puis SPAM : 25 lots « Savon artisanal en promo ».
 *   3. Page /a/<codeA> :
 *      - les 7 autres produits présents (codes B..G dans le HTML) ;
 *      - testid similar-product-slide-6 (7 slides) ;
      - PAS de slide-7 (le spam 25 lots = UNE seule carte → dédoublonnage) ;
 *      - photos atelier + flèches (slider atelier conservé).
 *   4. Page /a/<codeC> : produit A visible (vue depuis un autre produit).
 *   5. Purge finale.
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
  // ── 1. Purge + batchs de test ─────────────────────────────────────────────
  console.log("1. Purge initiale + batchs (A..G 1 QR + SPAM 25 QR)");
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

  const createBatch = async (totalQuantity: number, packSize: number) => {
    const res = await fetch(`${BASE}/api/admin/batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ totalQuantity, packSize, pricePerPack: 0 }),
    });
    const json = (await res.json()) as { masterCodes?: string[] };
    if (!json.masterCodes?.[0]) throw new Error(`batch non créé (${totalQuantity}/${packSize})`);
    return json.masterCodes[0];
  };

  const masterA = await createBatch(1, 1);
  const mastersMid = [
    await createBatch(1, 1),
    await createBatch(1, 1),
    await createBatch(1, 1),
    await createBatch(1, 1),
    await createBatch(1, 1),
  ]; // B..F
  const masterG = await createBatch(1, 1);
  const masterSpam = await createBatch(25, 25);
  check("8 batchs créés (A..G + SPAM de 25)", true);

  // ── 2. Uploads (photos produit A/B + photos atelier A) ───────────────────
  console.log("2. Uploads photos");
  const photoA = await uploadPhoto(await makePng({ r: 200, g: 150, b: 60 }), "karite.png", masterA);
  const atelier1 = await uploadPhoto(await makePng({ r: 120, g: 80, b: 40 }), "atelier-1.png", masterA);
  const atelier2 = await uploadPhoto(await makePng({ r: 80, g: 120, b: 40 }), "atelier-2.png", masterA);
  check("photo produit A + 2 photos atelier uploadées", photoA.endsWith(".webp"));

  // ── 3. Activations — même artisan, puis spam 25 unités ───────────────────
  console.log("3. Activations A→G (même artisan) + SPAM");
  const activate = async (
    masterCode: string,
    productName: string,
    opts: { price?: string; photoUrl?: string; artisanName?: string; count?: number } = {}
  ) => {
    const res = await fetch(`${BASE}/api/artisan/activate-groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        masterCode,
        groups: [
          {
            count: opts.count ?? 1,
            productData: {
              productName,
              contenance: "200 g",
              ingredients: "Naturel",
              manufacturingDate: "2026-01-15",
              expirationDate: "2027-01-15",
              photoUrl: opts.photoUrl ?? "",
              ...(opts.price ? { productPrice: opts.price } : {}),
            },
          },
        ],
        shared: {
          artisanName: opts.artisanName ?? "Awa Ndiaye",
          contactPhone: "+221771234567",
          ...(masterCode === masterA ? { artisanPhotos: [atelier1, atelier2] } : {}),
        },
      }),
    });
    const json = (await res.json()) as { firstCode?: string; error?: string };
    if (res.status !== 200 || !json.firstCode) {
      throw new Error(`activation ${productName} → ${res.status} ${json.error ?? ""}`);
    }
    return json.firstCode;
  };

  const codeA = await activate(masterA, "Beurre de karité bio", { price: "2 500 FCFA", photoUrl: photoA });
  const namesMid = ["Savon noir traditionnel", "Jus de bissap naturel", "Mangue séchée", "Poudre de baobab", "Café Touba moulu"];
  const codesMid: string[] = [];
  for (let i = 0; i < mastersMid.length; i++) {
    codesMid.push(await activate(mastersMid[i], namesMid[i], { price: "1 500 FCFA" }));
  }
  const codeG = await activate(masterG, "Gingembre confit", { artisanName: "AWA NDIAYE" }); // variante nom, même tel
  await activate(masterSpam, "Savon artisanal en promo", { count: 25 }); // 25 lots récents « spam »
  check("7 produits distincts + 25 lots spam activés", true);

  // ── 4. Page A : 7 slides, spam dédoublonné, slider atelier ───────────────
  console.log("4. Page /a/<A> — carrousel 7 produits + atelier");
  const pageA = await fetch(`${BASE}/a/${codeA}`);
  const htmlA = await pageA.text();
  check("page A → 200", pageA.status === 200);
  check("section « Autres produits de » présente", htmlA.includes("Autres produits de"));
  check("code B présent", codesMid[0] && htmlA.includes(codesMid[0]));
  check("code C présent", codesMid[1] && htmlA.includes(codesMid[1]));
  check("code D présent", codesMid[2] && htmlA.includes(codesMid[2]));
  check("code E présent", codesMid[3] && htmlA.includes(codesMid[3]));
  check("code F présent", codesMid[4] && htmlA.includes(codesMid[4]));
  check(
    "code G présent (variante nom « AWA NDIAYE », matching par téléphone)",
    htmlA.includes(codeG)
  );
  check(
    "7 slides (testid similar-product-slide-6)",
    htmlA.includes("similar-product-slide-6")
  );
  check(
    "spam 25 lots = UNE seule carte (pas de slide-7)",
    !htmlA.includes("similar-product-slide-7")
  );
  check("badge prix visible", htmlA.includes("1 500 FCFA"));
  check(
    "slider atelier : photos présentes",
    htmlA.includes("Agrandir la photo 1") && htmlA.includes("atelier de Awa Ndiaye")
  );
  check(
    "slider atelier : flèches diaporama (‹ ›)",
    htmlA.includes('aria-label="Photo précédente"') &&
      htmlA.includes('aria-label="Photo suivante"')
  );

  // ── 5. Page C (vue depuis un autre produit) ──────────────────────────────
  console.log("5. Page /a/<C> — carrousel vu depuis un autre produit");
  const pageC = await fetch(`${BASE}/a/${codesMid[1]}`);
  const htmlC = await pageC.text();
  check("page C → 200", pageC.status === 200);
  check("produit A visible depuis C", htmlC.includes(codeA));
  check("produit G visible depuis C", htmlC.includes(codeG));
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
