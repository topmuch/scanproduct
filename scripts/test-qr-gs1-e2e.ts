/**
 * ============================================================================
 * E2E — Génération de QR Codes avec choix automatique GS1 / standard
 * ============================================================================
 * Valide la chaîne complète :
 *   1. Login fabricant (NextAuth credentials)
 *   2. POST /api/qr-codes/generate      → format GS1 attendu (produit GTIN)
 *   3. Série AI 21 persistée dans QRCode.code
 *   4. Scan simulé (UA smartphone) de l'URI GS1 → 302 + Scan.metadata
 *   5. POST /api/qr-codes/bulk-generate → format GS1 + PNG rendu (imageUrl)
 *   6. POST /api/qr-codes/labels-pdf    → 200 application/pdf
 *   7. Repli : lot d'un produit SANS barcode → format STANDARD
 *
 * Usage : bun scripts/test-qr-gs1-e2e.ts
 * ============================================================================
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.E2E_EMAIL || "sarine@biocosmetique.sn";
const PASSWORD = process.env.E2E_PASSWORD || "Demo1234!";
const GTIN_ATTENDU_14 = "04006381333931"; // 4006381333931 normalisé GTIN-14

const db = new PrismaClient();

let ok = 0;
let ko = 0;
function check(nom: string, condition: boolean, detail?: string) {
  if (condition) {
    ok++;
    console.log(`  ✅ ${nom}`);
  } else {
    ko++;
    console.log(`  ❌ ${nom}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Cookie jar minimal (NextAuth session). */
let cookies: Record<string, string> = {};

function garderCookies(res: Response) {
  const bruts = res.headers.getSetCookie?.() ?? [];
  for (const c of bruts) {
    const [paire] = c.split(";");
    const idx = paire.indexOf("=");
    if (idx > 0) cookies[paire.slice(0, idx).trim()] = paire.slice(idx + 1).trim();
  }
}

function entetes(extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    Cookie: Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; "),
    ...extra,
  };
}

async function login(): Promise<boolean> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  garderCookies(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const body = new URLSearchParams({
    email: EMAIL,
    password: PASSWORD,
    csrfToken,
    callbackUrl: `${BASE}/fabricant`,
    json: "true",
  });
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; "),
    },
    body: body.toString(),
    redirect: "manual",
  });
  garderCookies(res);
  const session = await fetch(`${BASE}/api/auth/session`, {
    headers: entetes(),
  });
  garderCookies(session);
  const donnees = (await session.json()) as { user?: { email?: string } };
  return !!donnees.user?.email;
}

/** UA smartphone — les curl/nodes sont filtrés comme bots par le resolver. */
const UA_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

async function simulerScan(uri: string): Promise<{
  statut: number;
  location: string | null;
}> {
  const res = await fetch(uri.startsWith("http") ? uri : `${BASE}${uri}`, {
    headers: { "User-Agent": UA_MOBILE },
    redirect: "manual",
  });
  return { statut: res.status, location: res.headers.get("location") };
}

async function main() {
  console.log("\n═══ E2E QR / GS1 — génération + scan round-trip ═══\n");

  // ── 0) Données : produit avec GTIN + produit sans barcode ──────────────
  const produitGtin = await db.product.findFirst({
    where: { barcode: "4006381333931" },
    include: {
      lots: { where: { status: { not: "DRAFT" } }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!produitGtin || produitGtin.lots.length === 0) {
    throw new Error("Produit GTIN 4006381333931 introuvable (lancez scripts/setup-e2e-gs1.ts)");
  }
  const lotGtin = produitGtin.lots[0];

  const produitSansGtin = await db.product.findFirst({
    where: {
      OR: [{ barcode: null }, { barcode: "" }],
      fabricantId: produitGtin.fabricantId,
    },
    include: {
      lots: { where: { status: { not: "DRAFT" } }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  console.log(
    `Produit GS1 : ${produitGtin.name} · lot ${lotGtin.lotNumber ?? lotGtin.reference} (${lotGtin.id})`
  );

  // ── 1) Login ───────────────────────────────────────────────────────────
  console.log("\n[1] Login fabricant");
  const connecte = await login();
  check(`Authentification ${EMAIL}`, connecte);
  if (!connecte) throw new Error("Login échoué — impossible de continuer.");

  // ── 2) POST /api/qr-codes/generate (produit GTIN → GS1) ───────────────
  console.log("\n[2] POST /api/qr-codes/generate (produit avec GTIN)");
  const genRes = await fetch(`${BASE}/api/qr-codes/generate`, {
    method: "POST",
    headers: entetes(),
    body: JSON.stringify({ lotId: lotGtin.id, quantity: 2 }),
  });
  check("Statut 200", genRes.status === 200, `reçu ${genRes.status}`);
  const genJson = (await genRes.json()) as {
    count?: number;
    qrCodes?: Array<{ id: string; code: string; publicUrl: string; format: string }>;
  };
  check("2 QR générés", genJson.count === 2, `reçu ${genJson.count}`);
  const gs1 = genJson.qrCodes?.[0];
  check(
    "Format GS1 détecté",
    gs1?.format === "GS1",
    `reçu ${gs1?.format}`
  );
  const uriAttendue = new RegExp(
    `^https?://[^/]+/01/${GTIN_ATTENDU_14}/10/${encodeURIComponent(
      lotGtin.lotNumber ?? lotGtin.reference
    )}/21/[A-Z0-9]+$`
  );
  check(
    "URI GS1 Digital Link conforme",
    !!gs1 && uriAttendue.test(gs1.publicUrl),
    `reçu ${gs1?.publicUrl}`
  );
  console.log(`      URI : ${gs1?.publicUrl}`);

  // ── 3) Série AI 21 persistée dans QRCode.code ─────────────────────────
  console.log("\n[3] Persistance de la série (AI 21) dans QRCode.code");
  const serieGeneree = gs1?.code ?? "";
  const qrDb = await db.qRCode.findUnique({ where: { id: gs1!.id } });
  check("QRCode trouvé en base", !!qrDb);
  check(
    "QRCode.code = série AI 21",
    qrDb?.code === serieGeneree && serieGeneree.length > 0 && serieGeneree.length <= 20,
    `code=${qrDb?.code}`
  );
  check(
    "Le resolver retrouvera la série (match lotId+code)",
    !!(await db.qRCode.findFirst({
      where: { code: serieGeneree, lotId: lotGtin.id },
      select: { id: true },
    }))
  );

  // ── 4) Scan simulé de l'URI GS1 ───────────────────────────────────────
  console.log("\n[4] Scan simulé (UA iPhone) de l'URI générée");
  const cheminGs1 = new URL(gs1!.publicUrl).pathname;
  const scan = await simulerScan(cheminGs1);
  check("HTTP 302", scan.statut === 302, `reçu ${scan.statut}`);
  check(
    "Redirection vers /p/<lotId>",
    scan.location?.includes(`/p/${lotGtin.id}`) === true,
    `location=${scan.location}`
  );
  const scansRecents = await db.scan.findMany({
    where: { lotId: lotGtin.id },
    orderBy: { scannedAt: "desc" },
    take: 1,
  });
  const dernierScan = scansRecents[0];
  check("Scan enregistré en base", !!dernierScan);
  if (dernierScan?.metadata) {
    const meta = JSON.parse(dernierScan.metadata) as {
      standard?: string;
      gtin?: string;
      lot?: string;
      serie?: string;
      serieInconnue?: boolean;
    };
    check("metadata.standard = GS1", meta.standard === "GS1");
    check("metadata.gtin normalisé", meta.gtin === GTIN_ATTENDU_14, `reçu ${meta.gtin}`);
    check("metadata.serie = série générée", meta.serie === serieGeneree, `reçu ${meta.serie}`);
    check("Pas de faux signal serieInconnue", meta.serieInconnue !== true);
  } else {
    check("Scan.metadata présent", false, "metadata absent du dernier scan");
  }

  // ── 5) POST /api/qr-codes/bulk-generate ───────────────────────────────
  console.log("\n[5] POST /api/qr-codes/bulk-generate");
  const bulkRes = await fetch(`${BASE}/api/qr-codes/bulk-generate`, {
    method: "POST",
    headers: entetes(),
    body: JSON.stringify({ lotIds: [lotGtin.id], perLot: 1 }),
  });
  check("Statut 200", bulkRes.status === 200, `reçu ${bulkRes.status}`);
  const bulkJson = (await bulkRes.json()) as {
    totalGenerated?: number;
    results?: Array<{
      qrCodes?: Array<{ publicUrl: string; format: string; imageUrl: string }>;
    }>;
  };
  const bulkQr = bulkJson.results?.[0]?.qrCodes?.[0];
  check("1 QR généré en masse", bulkJson.totalGenerated === 1);
  check("Format GS1", bulkQr?.format === "GS1", `reçu ${bulkQr?.format}`);
  check("PNG rendu (imageUrl présent)", !!bulkQr?.imageUrl, `imageUrl=${bulkQr?.imageUrl}`);
  check("URI GS1 encodée dans le PNG", uriAttendue.test(bulkQr?.publicUrl ?? ""));
  if (bulkQr?.imageUrl) {
    const pngRes = await fetch(`${BASE}${bulkQr.imageUrl}`);
    check("PNG servible (HTTP 200, image/png)", pngRes.status === 200 && (pngRes.headers.get("content-type") ?? "").includes("image/png"));
  }

  // ── 6) POST /api/qr-codes/labels-pdf ──────────────────────────────────
  console.log("\n[6] POST /api/qr-codes/labels-pdf");
  const pdfRes = await fetch(`${BASE}/api/qr-codes/labels-pdf`, {
    method: "POST",
    headers: entetes(),
    body: JSON.stringify({ lotIds: [lotGtin.id], perLot: 2 }),
  });
  check("Statut 200", pdfRes.status === 200, `reçu ${pdfRes.status}`);
  check(
    "Content-Type application/pdf",
    (pdfRes.headers.get("content-type") ?? "").includes("application/pdf")
  );
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
  check(
    "PDF non vide + signature %PDF",
    pdfBuffer.length > 1000 && pdfBuffer.subarray(0, 4).toString() === "%PDF",
    `${pdfBuffer.length} octets`
  );
  console.log(`      PDF : ${pdfBuffer.length} octets (étiquettes GS1 /01/${GTIN_ATTENDU_14}/10/…)`);

  // ── 7) Repli standard : produit SANS barcode ──────────────────────────
  console.log("\n[7] Repli STANDARD (produit sans GTIN)");
  if (produitSansGtin && produitSansGtin.lots.length > 0) {
    const lotStd = produitSansGtin.lots[0];
    const stdRes = await fetch(`${BASE}/api/qr-codes/generate`, {
      method: "POST",
      headers: entetes(),
      body: JSON.stringify({ lotId: lotStd.id, quantity: 1 }),
    });
    const stdJson = (await stdRes.json()) as {
      qrCodes?: Array<{ publicUrl: string; format: string; code: string }>;
    };
    const stdQr = stdJson.qrCodes?.[0];
    check("Format STANDARD", stdQr?.format === "STANDARD", `reçu ${stdQr?.format}`);
    check(
      "URL historique /p/<lotId>?code=",
      stdQr?.publicUrl.includes(`/p/${lotStd.id}?code=`) === true,
      `reçu ${stdQr?.publicUrl}`
    );
    check(
      "Code d'impression long conservé (analytics)",
      !!stdQr && stdQr.code.length > 20
    );
  } else {
    console.log("  ⚠️ Aucun produit sans barcode pour ce fabricant — test de repli ignoré.");
  }

  // ── Résumé ─────────────────────────────────────────────────────────────
  console.log(`\n═══ Résultat : ${ok} OK · ${ko} échec(s) ═══\n`);
  if (ko > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error("Erreur E2E :", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
