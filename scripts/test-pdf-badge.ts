/**
 * Test — PDF étiquettes : le badge LABEL VERIFSCAN est-il dans le PDF ?
 *
 *   1. Login fabricant
 *   2. POST /api/qr-codes/labels-pdf (options exactes de BulkQRPage)
 *   3. Extraction des images du PDF + analyse couleur (jaune #F8E805 ?)
 *   4. Décodage pyzbar d'une image extraite
 *
 *   bun scripts/test-pdf-badge.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";

const BASE = "http://localhost:3000";
const OUT = "/home/z/my-project/scripts/pdf-test";
mkdirSync(OUT, { recursive: true });

let cookieJar = "";

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
      "user-agent": "test-pdf-badge",
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

async function main() {
  console.log("═".repeat(64));
  console.log("TEST PDF ÉTIQUETTES — badge LABEL VERIFSCAN ?");
  console.log("═".repeat(64));

  // ── Login ───────────────────────────────────────────────────────
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
  console.log(`Login: ${login.status} role=${sess.body?.user?.role ?? "?"}`);

  // ── Lots ────────────────────────────────────────────────────────
  const { db } = await import("../src/lib/db");
  const fabricant = await db.user.findUnique({
    where: { email: "sarine@biocosmetique.sn" },
    select: { id: true },
  });
  const lots = fabricant
    ? await db.lot.findMany({
        where: { fabricantId: fabricant.id },
        select: { id: true, lotNumber: true, reference: true },
        orderBy: { createdAt: "desc" },
        take: 2,
      })
    : [];
  console.log(`Lots: ${lots.length}`);
  if (lots.length === 0) process.exit(1);

  // ── POST labels-pdf — options EXACTES de BulkQRPage ─────────────
  console.log("\nPOST /api/qr-codes/labels-pdf (design badge, défaut UI)…");
  const res = await fetch(`${BASE}/api/qr-codes/labels-pdf`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieJar },
    body: JSON.stringify({
      lotIds: lots.map((l) => l.id),
      perLot: 2,
      options: {
        size: 600,
        color: "#000000",
        design: "badge",
        includeLogo: true,
        includeLotNumber: true,
        includeProductName: true,
        cutLines: true,
      },
    }),
  });
  console.log(`Status: ${res.status} ${res.headers.get("content-type")}`);
  if (!res.ok) {
    console.log(await res.text());
    process.exit(1);
  }
  const pdfBuf = Buffer.from(await res.arrayBuffer());
  writeFileSync(`${OUT}/etiquettes.pdf`, pdfBuf);
  console.log(`PDF: ${(pdfBuf.length / 1024).toFixed(0)} Ko → ${OUT}/etiquettes.pdf`);

  // ── Extraction images du PDF ────────────────────────────────────
  console.log("\nExtraction des images du PDF…");
  execSync(`cd ${OUT} && rm -f extracted*.png && python3 -c "
import fitz  # pymupdf
doc = fitz.open('${OUT}/etiquettes.pdf')
n = 0
for pno in range(len(doc)):
    for img in doc[pno].get_images(full=True):
        xref = img[0]
        pix = fitz.Pixmap(doc, xref)
        if pix.n > 3:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        pix.save(f'${OUT}/extracted-{pno}-{n}.png')
        n += 1
print(n)
"`, { encoding: "utf8" });

  // ── Analyse couleur + décodage ─────────────────────────────────
  const analysis = execSync(`python3 -c "
from pyzbar.pyzbar import decode
from PIL import Image
import glob

files = sorted(glob.glob('${OUT}/extracted-*.png'))
print(f'{len(files)} images extraites')
for f in files[:4]:
    im = Image.open(f).convert('RGB')
    w, h = im.size
    # proportion de pixels jaunes (#F8E805 ± tolérance)
    px = im.resize((100, 100)).getdata()
    yellow = sum(1 for r, g, b in px if r > 180 and g > 180 and b < 120)
    black = sum(1 for r, g, b in px if r < 80 and g < 80 and b < 80)
    im2 = im.resize((w*2, h*2), Image.NEAREST)
    dec = decode(im)
    dec2 = decode(im2)
    data = (dec or dec2)
    print(f'{f.split(chr(47))[-1]}: {w}x{h}, jaune={yellow}%, noir={black}%, decode={data[0].data.decode()[:60] if data else None}')
"`, { encoding: "utf8" });
  console.log(analysis);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
