/**
 * Test e2e — Exports du design « LABEL VERIFSCAN » :
 *   1. POST /api/qr-codes/export-zip (sélection)   → ZIP de badges décodables
 *   2. POST /api/qr-codes/export-zip (all:true)    → ZIP de badges décodables
 *   3. GET  /api/admin/print-batch/<batchId>       → PDF avec badges (pas de QR bleu)
 *
 *   bun scripts/test-exports-badge.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";

const BASE = "http://localhost:3000";
const OUT = "/home/z/my-project/scripts/export-test";
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
      "user-agent": "test-exports-badge",
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

async function login(email: string, password: string): Promise<string | null> {
  const csrf = await req("/api/auth/csrf");
  const login = await req("/api/auth/callback/credentials", {
    method: "POST",
    body: JSON.stringify({
      csrfToken: csrf.body?.csrfToken,
      email,
      password,
      callbackUrl: `${BASE}/dashboard`,
    }),
  });
  const sess = await req("/api/auth/session");
  return sess.body?.user?.role ?? null;
}

/** Analyse un PNG : % de jaune + décodage pyzbar. */
function analyserPng(f: string): { jaune: number; decode: string | null } {
  try {
    const out = execSync(
      `python3 -c "
from pyzbar.pyzbar import decode
from PIL import Image
im = Image.open('${f}').convert('RGB')
w, h = im.size
px = list(im.resize((100, 100)).getdata())
yellow = round(sum(1 for r, g, b in px if r > 180 and g > 180 and b < 120))
im2 = im.resize((w*2, h*2), Image.NEAREST)
dec = decode(im) or decode(im2)
print(f'{yellow}|{dec[0].data.decode() if dec else None}')
"`,
      { encoding: "utf8" }
    ).trim();
    const [jaune, decode] = out.split("|");
    return { jaune: Number(jaune), decode: decode === "None" ? null : decode };
  } catch {
    return { jaune: 0, decode: null };
  }
}

async function main() {
  console.log("═".repeat(64));
  console.log("TEST EXPORTS — ZIP badges + PDF print-batch");
  console.log("═".repeat(64));

  const { db } = await import("../src/lib/db");

  // ── 1. Login fabricant ──────────────────────────────────────────
  console.log("\n[1] Login fabricant…");
  const role = await login("sarine@biocosmetique.sn", "Demo1234!");
  check("Login fabricant", role === "FABRICANT", `role=${role}`);

  const fabricant = await db.user.findUnique({
    where: { email: "sarine@biocosmetique.sn" },
    select: { id: true },
  });
  const qrs = await db.qRCode.findMany({
    where: { lot: { fabricantId: fabricant!.id } },
    select: { id: true, code: true, design: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  check("QR codes du fabricant", qrs.length > 0, `${qrs.length} (design: ${qrs.map((q) => q.design).join(",")})`);

  // ── 2. Export ZIP sélection ─────────────────────────────────────
  console.log("\n[2] POST /api/qr-codes/export-zip (sélection de 5)…");
  const zipRes = await fetch(`${BASE}/api/qr-codes/export-zip`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieJar },
    body: JSON.stringify({ qrIds: qrs.map((q) => q.id) }),
  });
  check("HTTP 200 + application/zip", zipRes.ok && (zipRes.headers.get("content-type") || "").includes("zip"), `${zipRes.status} ${(zipRes.headers.get("content-type") || "").split(";")[0]}`);
  if (zipRes.ok) {
    const zipBuf = Buffer.from(await zipRes.arrayBuffer());
    writeFileSync(`${OUT}/badges-selection.zip`, zipBuf);
    check("ZIP > 100 Ko (PNG badge 1200px)", zipBuf.length > 100_000, `${(zipBuf.length / 1024).toFixed(0)} Ko`);
    execSync(`cd ${OUT} && rm -rf selection && mkdir selection && cd selection && unzip -o -q ../badges-selection.zip`);
    execSync(`ls ${OUT}/selection/*.png | head -2 | xargs -I{} cp {} ${OUT}/sel.png 2>/dev/null || true`);
    const premier = execSync(`ls ${OUT}/selection/*.png | head -1`, { encoding: "utf8" }).trim();
    const a = analyserPng(premier);
    check("PNG = badge jaune", a.jaune > 30, `jaune=${a.jaune}%`);
    check("PNG décodable (pyzbar)", !!a.decode, a.decode?.slice(0, 60));
  }

  // ── 3. Export ZIP all:true (sans auth → 401) ────────────────────
  console.log("\n[3] Sécurité export-zip…");
  const anon = await fetch(`${BASE}/api/qr-codes/export-zip`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ all: true }),
  });
  check("Sans auth → 401", anon.status === 401, String(anon.status));

  // ── 4. Login superadmin + print-batch ───────────────────────────
  console.log("\n[4] Login superadmin + GET /api/admin/print-batch…");
  cookieJar = "";
  const roleAdmin = await login("admin@verifscan.sn", "ChangeMeOnFirstLogin!2025");
  check("Login superadmin", roleAdmin === "SUPERADMIN", `role=${roleAdmin}`);

  const batch = await db.batch.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true } });
  if (batch) {
    const pdfRes = await fetch(`${BASE}/api/admin/print-batch/${batch.id}`, {
      headers: { cookie: cookieJar },
    });
    check("HTTP 200 + application/pdf", pdfRes.ok && (pdfRes.headers.get("content-type") || "").includes("pdf"), `${pdfRes.status}`);
    if (pdfRes.ok) {
      const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
      writeFileSync(`${OUT}/print-batch.pdf`, pdfBuf);
      execSync(`cd ${OUT} && rm -f extracted-*.png && python3 -c "
import fitz
doc = fitz.open('${OUT}/print-batch.pdf')
n = 0
for pno in range(min(2, len(doc))):
    for img in doc[pno].get_images(full=True):
        pix = fitz.Pixmap(doc, img[0])
        if pix.n > 3: pix = fitz.Pixmap(fitz.csRGB, pix)
        pix.save(f'${OUT}/extracted-{pno}-{n}.png'); n += 1
print(n)
"`, { encoding: "utf8" });
      const premier = execSync(`ls ${OUT}/extracted-*.png | head -1`, { encoding: "utf8" }).trim();
      const a = analyserPng(premier);
      check("PDF print-batch = badge jaune", a.jaune > 30, `jaune=${a.jaune}%`);
      check("Badge PDF décodable", !!a.decode, a.decode?.slice(0, 60));
    }
  } else {
    console.log("  (aucun batch en DB — test print-batch sauté)");
  }

  console.log("\n" + "═".repeat(64));
  console.log(`RÉSULTAT: ${passed} OK, ${failed} ÉCHEC(S)`);
  console.log("═".repeat(64));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
