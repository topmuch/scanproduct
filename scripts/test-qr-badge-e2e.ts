/**
 * Test e2e — Design « LABEL VERIFSCAN » sur les QR codes.
 *
 *   1. /api/qr-codes/render-badge        → PNG badge, décodable
 *   2. /api/qr-codes/bulk-generate (badge) → PNG persisté, décodable
 *   3. /api/qr-codes/labels-pdf (badge + stickers 30mm) → PDF généré
 *   4. Sécurité render-badge : URL domaine tiers → 403
 *
 *   bun scripts/test-qr-badge-e2e.ts
 */
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { execSync } from "child_process";

const BASE = "http://localhost:3000";
const OUT = "/home/z/my-project/download/qr-concepts";
mkdirSync(OUT, { recursive: true });

let cookieJar = "";
let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function captureCookies(res: Response) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const [nv] = raw.split(";");
    const name = nv.split("=")[0];
    if (!name) continue;
    if (cookieJar.includes(name + "=")) {
      cookieJar = cookieJar.replace(new RegExp(`${name}=[^;]*`), nv);
    } else {
      cookieJar = cookieJar ? `${cookieJar}; ${nv}` : nv;
    }
  }
}

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      "user-agent": "test-qr-badge-e2e",
      ...(init.headers ?? {}),
      cookie: cookieJar,
    },
  });
  captureCookies(res);
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return { status: res.status, body: await res.json(), res };
  }
  return { status: res.status, body: null, res };
}

function decodePng(path: string): string | null {
  try {
    const out = execSync(
      `python3 -c "
from pyzbar.pyzbar import decode
from PIL import Image
im = Image.open('${path}').convert('RGB')
r = decode(im)
# réessai avec upscale (simule un scanner)
if not r:
    im2 = im.resize((im.width*2, im.height*2), Image.NEAREST)
    r = decode(im2)
print(r[0].data.decode() if r else 'NONE')
"`,
      { encoding: "utf8" }
    ).trim();
    return out === "NONE" ? null : out;
  } catch {
    return null;
  }
}

async function main() {
  console.log("═".repeat(64));
  console.log("TEST E2E — DESIGN QR « LABEL VERIFSCAN »");
  console.log("═".repeat(64));

  // ── Login fabricant ─────────────────────────────────────────────
  console.log("\n[1] Login fabricant…");
  const csrf = await req("/api/auth/csrf");
  const login = await req("/api/auth/callback/credentials", {
    method: "POST",
    body: JSON.stringify({
      csrfToken: csrf.body?.csrfToken,
      email: "sarine@biocosmetique.sn",
      password: "Demo1234!",
      callbackUrl: `${BASE}/dashboard`,
    }),
  });
  const sess = await req("/api/auth/session");
  check("Login fabricant", login.status < 400 && !!sess.body?.user, `role=${sess.body?.user?.role ?? "?"}`);

  // ── Trouver un lot (via Prisma — /api/lots n'expose que le POST) ──
  console.log("\n[2] Recherche d'un lot…");
  const { db } = await import("../src/lib/db");
  const fabricant = await db.user.findUnique({
    where: { email: "sarine@biocosmetique.sn" },
    select: { id: true },
  });
  const lot = fabricant
    ? await db.lot.findFirst({
        where: { fabricantId: fabricant.id },
        select: { id: true, lotNumber: true, reference: true },
        orderBy: { createdAt: "desc" },
      })
    : null;
  check("Lot trouvé (Prisma)", !!lot, lot ? `${lot.lotNumber ?? lot.reference}` : "aucun");
  if (!lot) process.exit(1);
  const lotId = lot.id;

  // ── Test 1 : render-badge ───────────────────────────────────────
  console.log("\n[3] POST /api/qr-codes/render-badge…");
  const scanUrl = `${BASE}/p/${lotId}?code=BADGE-E2E-TEST`;
  const badgeRes = await fetch(`${BASE}/api/qr-codes/render-badge`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieJar },
    body: JSON.stringify({ url: scanUrl, size: 1200 }),
  });
  check("HTTP 200 + image/png", badgeRes.status === 200 && (badgeRes.headers.get("content-type") || "").includes("image/png"),
    `${badgeRes.status} ${badgeRes.headers.get("content-type")}`);
  if (badgeRes.status === 200) {
    const buf = Buffer.from(await badgeRes.arrayBuffer());
    const p = `${OUT}/e2e-badge.png`;
    writeFileSync(p, buf);
    check("PNG > 30 Ko (design riche, pas un QR nu)", buf.length > 30_000, `${(buf.length / 1024).toFixed(0)} Ko`);
    const decoded = decodePng(p);
    check("QR du badge décodé (pyzbar)", decoded !== null, decoded ?? "NON DÉCODÉ");
  }

  // ── Test 2 : bulk-generate avec badge ───────────────────────────
  console.log("\n[4] POST /api/qr-codes/bulk-generate (design badge)…");
  const bulk = await req("/api/qr-codes/bulk-generate", {
    method: "POST",
    body: JSON.stringify({
      lotIds: [lotId],
      perLot: 1,
      options: { size: 512, includeDesign: true },
    }),
  });
  check("HTTP 200", bulk.status === 200, bulk.status === 402 ? "quota épuisé (non bloquant pour la suite)" : `status ${bulk.status}`);
  let persistedUrl: string | null = null;
  if (bulk.status === 200 && bulk.body?.results?.[0]?.qrCodes?.[0]) {
    persistedUrl = bulk.body.results[0].qrCodes[0].imageUrl;
    check("imageUrl persistée", !!persistedUrl, persistedUrl ?? "");
    if (persistedUrl) {
      const imgRes = await fetch(`${BASE}${persistedUrl}`, { headers: { cookie: cookieJar } });
      const p = `${OUT}/e2e-bulk-badge.png`;
      writeFileSync(p, Buffer.from(await imgRes.arrayBuffer()));
      const decoded = decodePng(p);
      check("PNG bulk (badge) décodé", decoded !== null, decoded ?? "");
    }
  }

  // ── Test 3 : labels-pdf avec badge + stickers 30mm ─────────────
  console.log("\n[5] POST /api/qr-codes/labels-pdf (badge, autocollants 30×30 mm)…");
  const pdf = await fetch(`${BASE}/api/qr-codes/labels-pdf`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieJar },
    body: JSON.stringify({
      lotIds: [lotId],
      perLot: 2,
      options: {
        size: 600,
        design: "badge",
        labelsPerRow: 5,
        labelWidth: 30,
        labelHeight: 30,
        cutLines: true,
      },
    }),
  });
  const ct = pdf.headers.get("content-type") || "";
  check("HTTP 200 + application/pdf", pdf.status === 200 && ct.includes("application/pdf"), `${pdf.status} ${ct}`);
  if (pdf.status === 200) {
    const pdfBuf = Buffer.from(await pdf.arrayBuffer());
    const p = `${OUT}/e2e-stickers-30mm.pdf`;
    writeFileSync(p, pdfBuf);
    check("PDF > 40 Ko (2 badges haute résolution)", pdfBuf.length > 40_000, `${(pdfBuf.length / 1024).toFixed(0)} Ko`);
    check("En-tête PDF valide", pdfBuf.subarray(0, 5).toString() === "%PDF-", pdfBuf.subarray(0, 8).toString());
    // Décodage du QR incrusté dans la planche (pdftoppm → png)
    try {
      execSync(`pdftoppm -png -r 300 -f 1 -l 1 ${p} ${OUT}/e2e-stickers-page`, { encoding: "utf8" });
      const pagePng = `${OUT}/e2e-stickers-page-1.png`;
      if (existsSync(pagePng)) {
        const decoded = decodePng(pagePng);
        check("QR du sticker 30mm décodé dans la planche PDF", decoded !== null, decoded ?? "");
      }
    } catch {
      console.log("  ⚠️ pdftoppm indisponible — décodage planche sauté");
    }
  }

  // ── Test 4 : sécurité render-badge ──────────────────────────────
  console.log("\n[6] Sécurité render-badge (domaine tiers)…");
  const evil = await fetch(`${BASE}/api/qr-codes/render-badge`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieJar },
    body: JSON.stringify({ url: "https://phishing-exemple.com/arnaque" }),
  });
  check("URL tierce rejetée 403", evil.status === 403, `status ${evil.status}`);

  // ── Résumé ──────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(64));
  console.log(`RÉSULTAT: ${passed} ✅ / ${failed} ❌`);
  console.log("═".repeat(64));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("ERREUR FATALE:", e);
  process.exit(1);
});
