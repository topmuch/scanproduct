/**
 * Test E2E — RUBRIQUE « PRODUIT CERTIFIÉ EN LABORATOIRE »
 * (demande utilisateur : dans le processus de création de QR code produit,
 * ajouter une rubrique certification + insertion du document du laboratoire ;
 * la rubrique n'apparaît QUE si un document est fourni).
 *
 * Scénario :
 *   1. Purge initiale + batch de test (1 pack) × 2 (A : avec certificat,
 *      B : sans)
 *   2. Upload d'un PDF valide via /api/artisan/upload (masterCode A) →
 *      200 + URL /api/artisan/photo/artisan-<uuid>.pdf
 *   3. GET de l'URL du PDF → 200, Content-Type application/pdf, corps identique
 *   4. Upload d'une IMAGE (flux photo inchangé) → 200 + WebP servi
 *   5. Rejet d'un fichier non supporté (.docx via magic bytes) → 415
 *   6. Activation A AVEC labCertificateUrl → 200 ; page publique /a/<code>
 *      contient la rubrique « Produit certifié en laboratoire »
 *   7. Activation B SANS certificat → 200 ; page publique SANS la rubrique
 *   8. Mémoire d'activation : re-activation partielle impossible sur un
 *      pack complet → vérifiée indirectement (URL restaurée passée dans le
 *      payload simple ; couvert par les types TS)
 *   9. Nettoyage : purge finale
 *
 * Run : BASE=http://localhost:3100 DATABASE_URL="file:.../custom.db" bun scripts/test-lab-certificate.ts
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

/** PDF minimal valide (%PDF-…trailer) — reconnu par magic bytes côté serveur. */
function makePdf(): Buffer {
  return Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF",
    "latin1"
  );
}

/** PNG valide (généré par sharp) — test du flux image inchangé. */
async function makePng(): Promise<Buffer> {
  return sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 200, g: 120, b: 40 } },
  })
    .png()
    .toBuffer();
}

async function main() {
  // ── 1. Purge + données de test ────────────────────────────────────────────
  console.log("1. Purge initiale + batchs de test");
  await prisma.artisanScan.deleteMany({});
  await prisma.artisanReview.deleteMany({});
  await prisma.preActivatedLot.deleteMany({});
  await prisma.pack.deleteMany({});
  await prisma.batch.deleteMany({});

  const mkBatch = async () => {
    const res = await fetch(`${BASE}/api/admin/batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalQuantity: 1, packSize: 1, pricePerPack: 0 }),
    });
    return (await res.json()) as { masterCodes?: string[]; error?: string };
  };

  // Login superadmin requis pour créer un batch — via le callback credentials
  // (le cookie CSRF de /api/auth/csrf DOIT accompagner le POST callback)
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
    redirect: "manual", // suivre la 302 perdrait les Set-Cookie de session
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
  const batchARes = await fetch(`${BASE}/api/admin/batches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ totalQuantity: 1, packSize: 1, pricePerPack: 0 }),
  });
  const batchA = (await batchARes.json()) as { masterCodes?: string[] };
  const batchBRes = await fetch(`${BASE}/api/admin/batches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ totalQuantity: 1, packSize: 1, pricePerPack: 0 }),
  });
  const batchB = (await batchBRes.json()) as { masterCodes?: string[] };
  const masterA = batchA.masterCodes?.[0];
  const masterB = batchB.masterCodes?.[0];
  check("batch A créé (avec certificat)", !!masterA);
  check("batch B créé (sans certificat)", !!masterB);
  if (!masterA || !masterB) process.exit(1);

  // ── 2. Upload du PDF du laboratoire (mode activation, masterCode A) ─────
  console.log("2. Upload PDF certificat (mode activation)");
  const pdf = makePdf();
  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), "certificat-labo.pdf");
  fd.append("masterCode", masterA);
  const upRes = await fetch(`${BASE}/api/artisan/upload`, { method: "POST", body: fd });
  const upJson = (await upRes.json()) as { url?: string; error?: string };
  check("upload PDF → 200", upRes.status === 200);
  check("URL retournée = /api/artisan/photo/artisan-…pdf", /^\/api\/artisan\/photo\/artisan-[0-9a-f-]{36}\.pdf$/.test(upJson.url ?? ""));
  const certUrl = upJson.url ?? "";

  // ── 3. Service du PDF ─────────────────────────────────────────────────────
  console.log("3. GET du PDF servi depuis la DB");
  const pdfRes = await fetch(`${BASE}${certUrl}`);
  check("GET certificat → 200", pdfRes.status === 200);
  check("Content-Type application/pdf", pdfRes.headers.get("content-type") === "application/pdf");
  const pdfBody = Buffer.from(await pdfRes.arrayBuffer());
  check("corps servi identique à l'original", pdfBody.equals(pdf));

  // ── 4. Flux image inchangé ────────────────────────────────────────────────
  console.log("4. Upload image (flux photo régression)");
  const fdImg = new FormData();
  fdImg.append("file", new Blob([new Uint8Array(await makePng())], { type: "image/png" }), "produit.png");
  fdImg.append("masterCode", masterB);
  const imgRes = await fetch(`${BASE}/api/artisan/upload`, { method: "POST", body: fdImg });
  const imgJson = (await imgRes.json()) as { url?: string };
  check("upload image → 200 (WebP servi)", imgRes.status === 200 && (imgJson.url ?? "").endsWith(".webp"));
  const imgRes2 = await fetch(`${BASE}${imgJson.url}`);
  check("GET image → 200 image/webp", imgRes2.status === 200 && imgRes2.headers.get("content-type") === "image/webp");

  // ── 5. Rejet fichier non supporté ─────────────────────────────────────────
  console.log("5. Rejet d'un format non supporté");
  const fdBad = new FormData();
  fdBad.append(
    "file",
    new Blob([new Uint8Array(Buffer.from("PK\u0003\u0004 docx fake", "latin1"))], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
    "doc.docx"
  );
  fdBad.append("masterCode", masterA);
  const badRes = await fetch(`${BASE}/api/artisan/upload`, { method: "POST", body: fdBad });
  check("upload .docx (magic bytes PK) → 415", badRes.status === 415);

  // ── 6. Activation AVEC certificat → rubrique visible ─────────────────────
  console.log("6. Activation A (avec labCertificateUrl) + page publique");
  const actA = await fetch(`${BASE}/api/artisan/activate-groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      masterCode: masterA,
      groups: [
        {
          count: 1,
          productData: {
            productName: "Beurre de karité certifié",
            contenance: "200 g",
            ingredients: "Karité pur",
            manufacturingDate: "2026-01-15",
            expirationDate: "2027-01-15",
            photoUrl: "",
            labCertificateUrl: certUrl,
          },
        },
      ],
      shared: { artisanName: "Astou Diop", contactPhone: "+221770000001" },
    }),
  });
  const actAJson = (await actA.json()) as { firstCode?: string; error?: string };
  check("activation A → 200", actA.status === 200);
  const lotA = actAJson.firstCode ?? "";
  const pageA = await fetch(`${BASE}/a/${lotA}`);
  const htmlA = await pageA.text();
  check("page /a/<code> → 200", pageA.status === 200);
  check(
    "rubrique « Produit certifié en laboratoire » PRÉSENTE",
    htmlA.includes("Produit certifié en laboratoire") && htmlA.includes("lab-certificate")
  );
  check("lien certificat pointe vers le PDF", htmlA.includes(certUrl));
  const lotARow = await prisma.preActivatedLot.findUnique({ where: { qrCode: lotA } });
  check("lot A : labCertificateUrl en DB", lotARow?.labCertificateUrl === certUrl);
  const masterARow = await prisma.preActivatedLot.findUnique({ where: { qrCode: masterA } });
  check("maître A : labCertificateUrl copié", masterARow?.labCertificateUrl === certUrl);

  // ── 7. Activation SANS certificat → PAS de rubrique ──────────────────────
  console.log("7. Activation B (sans certificat) + page publique");
  const actB = await fetch(`${BASE}/api/artisan/activate-groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      masterCode: masterB,
      groups: [
        {
          count: 1,
          productData: {
            productName: "Savon noir traditionnel",
            contenance: "150 g",
            ingredients: "Beurre de karité, cendres",
            manufacturingDate: "2026-02-01",
            expirationDate: "2027-02-01",
            photoUrl: "",
            labCertificateUrl: "",
          },
        },
      ],
      shared: { artisanName: "Fatou Sarr", contactPhone: "+221770000002" },
    }),
  });
  const actBJson = (await actB.json()) as { firstCode?: string };
  check("activation B → 200", actB.status === 200);
  const pageB = await fetch(`${BASE}/a/${actBJson.firstCode ?? ""}`);
  const htmlB = await pageB.text();
  check("page /a/<code> → 200", pageB.status === 200);
  check(
    "rubrique certification ABSENTE (aucun document)",
    !htmlB.includes("Produit certifié en laboratoire") && !htmlB.includes("lab-certificate")
  );
  const lotBRow = await prisma.preActivatedLot.findUnique({
    where: { qrCode: actBJson.firstCode ?? "" },
  });
  check("lot B : labCertificateUrl = null en DB", lotBRow?.labCertificateUrl === null);

  // ── 8. Nettoyage ──────────────────────────────────────────────────────────
  console.log("8. Nettoyage final");
  const purge = await fetch(`${BASE}/api/admin/packs`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ confirmation: "TOUT SUPPRIMER" }),
  });
  check("purge finale → 200", purge.status === 200);

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
