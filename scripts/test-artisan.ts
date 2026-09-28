/**
 * E2E — Système hybride artisanal VerifScan
 *
 * Scénario complet :
 *   1. Login SuperAdmin (NextAuth credentials + cookie jar)
 *   2. POST /api/admin/batches     → batch 20 QR / packs de 10 (2 packs)
 *   3. GET  /api/admin/batches     → vérifier structure + codes
 *   4. GET  /api/admin/print-batch → PDF valide (%PDF, taille > 10 Ko)
 *   5. Pages AVANT activation :
 *        /a/<MASTER> → vue maître inactive
 *        /a/<ART-…>  → vue produit en attente
 *   6. POST /api/artisan/activate-pack → 10 produits activés
 *   7. Ré-activation → 409 (double activation bloquée)
 *   8. Pages APRÈS activation : /a/<ART> → page produit artisan
 *   9. Vérifier ArtisanScan enregistré après une vue + scan d'un produit
 *
 * Usage : bun run scripts/test-artisan.ts
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@verifscan.sn";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ChangeMeOnFirstLogin!2025";

let cookieJar = "";
let failures = 0;

function ok(label: string, condition: boolean, detail = "") {
  const icon = condition ? "✅" : "❌";
  console.log(`${icon} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures++;
}

async function req(
  path: string,
  init: RequestInit = {}
): Promise<{ status: number; body: any; headers: Headers }> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), cookie: cookieJar },
    redirect: "manual",
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    const pair = c.split(";")[0];
    if (!cookieJar.includes(pair.split("=")[0] + "=")) {
      cookieJar = cookieJar ? `${cookieJar}; ${pair}` : pair;
    } else {
      cookieJar = cookieJar.replace(new RegExp(`${pair.split("=")[0]}=[^;]*`), pair);
    }
  }
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text), headers: res.headers };
  } catch {
    return { status: res.status, body: text, headers: res.headers };
  }
}

async function login(): Promise<boolean> {
  const csrfRes = await req("/api/auth/csrf");
  const csrfToken = csrfRes.body?.csrfToken;
  if (!csrfToken) return false;
  const loginRes = await req("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      json: "true",
    }).toString(),
  });
  return loginRes.status === 200 || loginRes.status === 302;
}

async function main() {
  console.log(`\n🔧 E2E artisan — ${BASE}\n`);

  // ── 1. Login ────────────────────────────────────────────────────────────
  ok("Login SuperAdmin", await login());

  // ── 2. Création du batch (20 QR, 2 packs de 10) ────────────────────────
  const createRes = await req("/api/admin/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ totalQuantity: 20, packSize: 10, pricePerPack: 70000 }),
  });
  ok("POST /api/admin/batches → 201", createRes.status === 201, `status=${createRes.status}`);
  const batchId: string | undefined = createRes.body?.batch?.id;
  ok("Batch id retourné", Boolean(batchId), batchId ?? "absent");

  // Validation : total non divisible
  const badRes = await req("/api/admin/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ totalQuantity: 25, packSize: 10, pricePerPack: 70000 }),
  });
  ok("Total non divisible → 400", badRes.status === 400, `status=${badRes.status}`);

  // ── 3. Liste des batches ────────────────────────────────────────────────
  const listRes = await req("/api/admin/batches");
  const batch = (listRes.body as any[])?.find((b) => b.id === batchId);
  ok("GET /api/admin/batches → liste contient le batch", Boolean(batch));
  ok("2 packs créés", batch?.packs?.length === 2, `packs=${batch?.packs?.length}`);
  ok("Chaque pack a 11 lots (10 + maître)", batch?.packs?.every((p: any) => p.lotsCount === 11));
  const masterCode: string = batch?.packs?.[0]?.masterQrCode ?? "";
  ok("Format code maître", /^MASTER-[A-Z0-9]+-P01$/.test(masterCode), masterCode);
  const artCode = masterCode.replace("MASTER", "ART").replace(/-P01$/, "-P01-0001");
  ok("Format code produit dérivé", /^ART-/.test(artCode), artCode);

  // Accès non authentifié refusé
  const savedJar = cookieJar;
  cookieJar = "";
  const anonRes = await req("/api/admin/batches");
  ok("Sans session → 403", anonRes.status === 403, `status=${anonRes.status}`);
  cookieJar = savedJar;

  // ── 4. PDF d'impression ────────────────────────────────────────────────
  const pdfRes = await fetch(`${BASE}/api/admin/print-batch/${batchId}`, {
    headers: { cookie: cookieJar },
  });
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  const isPdf = pdfBuf.subarray(0, 5).toString() === "%PDF-";
  ok("PDF généré (Content-Type)", pdfRes.headers.get("content-type") === "application/pdf");
  ok("PDF valide (%PDF-)", isPdf, `${pdfBuf.length} octets`);
  ok("PDF raisonnable (> 10 Ko)", pdfBuf.length > 10_000, `${pdfBuf.length} octets`);

  // ── 5. Pages AVANT activation ───────────────────────────────────────────
  const masterPage = await fetch(`${BASE}/a/${masterCode}`, { headers: { cookie: cookieJar } });
  const masterHtml = await masterPage.text();
  ok("/a/<MASTER> → 200 vue activation", masterPage.status === 200);
  ok("Vue maître contient le CTA activation", masterHtml.includes("Activer mes") || masterHtml.includes("activer-pack"), "");

  const artPageInactive = await fetch(`${BASE}/a/${artCode}`);
  const artHtmlInactive = await artPageInactive.text();
  ok("/a/<ART> inactif → 200 page d'attente", artPageInactive.status === 200);
  ok("Page d'attente affiche le bon message", artHtmlInactive.includes("Bientôt disponible"));

  const unknownPage = await fetch(`${BASE}/a/ART-INCONNU-0000`);
  ok("Code inconnu → 404", unknownPage.status === 404, `status=${unknownPage.status}`);

  // ── 6. Activation en masse ──────────────────────────────────────────────
  const payload = {
    masterCode,
    productData: {
      productName: "Savon au karité pur",
      contenance: "250g",
      ingredients: "Beurre de karité, huile de coco, soude, eau",
      manufacturingDate: "2026-09-01",
      expirationDate: "2027-09-01",
      artisanName: "Aïssata Cosmétiques",
      contactPhone: "77 123 45 67",
      photoUrl: "",
    },
  };
  const activateRes = await req("/api/artisan/activate-pack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  ok(
    "Activation → 200, 10 produits activés",
    activateRes.status === 200 && activateRes.body?.activated === 10,
    `status=${activateRes.status} activated=${activateRes.body?.activated}`
  );

  // ── 7. Double activation bloquée ────────────────────────────────────────
  const reActivate = await req("/api/artisan/activate-pack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  ok("Ré-activation → 409", reActivate.status === 409, `status=${reActivate.status}`);

  // Validation : dates incohérentes
  const badDates = await req("/api/artisan/activate-pack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      masterCode: masterCode.replace("P01", "P02"),
      productData: { ...payload.productData, manufacturingDate: "2027-09-01", expirationDate: "2026-09-01" },
    }),
  });
  ok("Péremption avant fabrication → 400", badDates.status === 400, `status=${badDates.status}`);

  // ── 8. Pages APRÈS activation ───────────────────────────────────────────
  const productPage = await fetch(`${BASE}/a/${artCode}`, {
    headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
  });
  const productHtml = await productPage.text();
  ok("/a/<ART> actif → 200 page produit", productPage.status === 200);
  ok("Nom du produit affiché", productHtml.includes("Savon au karité pur"));
  ok("Nom de l'artisan affiché", productHtml.includes("Aïssata Cosmétiques"));
  ok("Lien WhatsApp présent", productHtml.includes("wa.me/221771234567"));
  ok("Badge Fait main", productHtml.includes("Fait main"));
  ok("Page maître devenue page produit", (await (await fetch(`${BASE}/a/${masterCode}`)).text()).includes("Savon au karité pur"));

  // ── 9. Scan journalisé ──────────────────────────────────────────────────
  // Attendre la fin de recordArtisanScan (fire-and-forget)
  await new Promise((r) => setTimeout(r, 1500));

  const { PrismaClient } = await import("@prisma/client");
  const checkDb = new PrismaClient();
  const scans = await checkDb.artisanScan.findMany({
    where: { lot: { qrCode: artCode } },
  });
  ok("ArtisanScan enregistré", scans.length >= 1, `${scans.length} scan(s)`);
  ok(
    "deviceType = mobile (UA iPhone)",
    scans[0]?.deviceType === "mobile",
    scans[0]?.deviceType ?? "null"
  );
  const activatedCount = await checkDb.preActivatedLot.count({
    where: { pack: { masterQrCode: masterCode }, status: "active" },
  });
  ok("11 lots actifs dans le pack (10 + maître)", activatedCount === 11, `${activatedCount}`);
  const pack = await checkDb.pack.findUnique({ where: { masterQrCode: masterCode } });
  ok("Pack passé 'activated' + artisan enregistré", pack?.status === "activated" && pack?.soldTo === "Aïssata Cosmétiques");
  await checkDb.$disconnect();

  // ── Bilan ───────────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════");
  if (failures === 0) {
    console.log("🎉 E2E ARTISAN : TOUT EST VERT");
  } else {
    console.log(`💥 ${failures} test(s) en échec`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Erreur fatale E2E:", e);
  process.exit(1);
});
