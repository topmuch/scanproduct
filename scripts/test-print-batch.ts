/**
 * Test print-batch : crée un batch minimal, télécharge le PDF, décode,
 * puis supprime le batch. bun scripts/test-print-batch.ts
 */
import { writeFileSync, mkdirSync, execSync } from "fs";
import { execSync as sx } from "child_process";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const OUT = "/home/z/my-project/scripts/export-test";
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
      "user-agent": "test-print-batch",
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
  const { db } = await import("../src/lib/db");

  // ── Batch de test (2 packs × 3 QR, dont 1 maître par pack) ─────
  const batch = await db.batch.create({
    data: {
      totalQuantity: 6,
      packSize: 3,
      numberOfPacks: 2,
      packs: {
        create: [
          { packNumber: 1, quantity: 3, price: 5000, masterQrCode: "TEST-MAITRE-P1" },
          { packNumber: 2, quantity: 3, price: 5000, masterQrCode: "TEST-MAITRE-P2" },
        ],
      },
    },
    include: { packs: true },
  });
  for (const pack of batch.packs) {
    for (let i = 1; i <= 3; i++) {
      await db.preActivatedLot.create({
        data: {
          packId: pack.id,
          qrCode: `${pack.masterQrCode}-${i}`,
          isMaster: i === 1,
        },
      });
    }
  }
  console.log(`Batch créé: ${batch.id}`);

  // ── Login superadmin ───────────────────────────────────────────
  const csrf = await req("/api/auth/csrf");
  await req("/api/auth/callback/credentials", {
    method: "POST",
    body: JSON.stringify({
      csrfToken: csrf.body?.csrfToken,
      email: "admin@verifscan.sn",
      password: "ChangeMeOnFirstLogin!2025",
      callbackUrl: `${BASE}/superadmin`,
    }),
  });
  const sess = await req("/api/auth/session");
  console.log("Rôle:", sess.body?.user?.role);

  // ── Télécharge le PDF ──────────────────────────────────────────
  const res = await fetch(`${BASE}/api/admin/print-batch/${batch.id}`, {
    headers: { cookie: cookieJar },
  });
  console.log("PDF status:", res.status, res.headers.get("content-type"));
  if (!res.ok) {
    console.log(await res.text());
    process.exit(1);
  }
  const pdfBuf = Buffer.from(await res.arrayBuffer());
  writeFileSync(`${OUT}/print-batch.pdf`, pdfBuf);
  console.log(`PDF: ${(pdfBuf.length / 1024).toFixed(0)} Ko`);

  // ── Extraction + analyse des images ────────────────────────────
  sx(`cd ${OUT} && rm -f pb-*.png && python3 -c "
import fitz
doc = fitz.open('${OUT}/print-batch.pdf')
n = 0
for pno in range(len(doc)):
    for img in doc[pno].get_images(full=True):
        pix = fitz.Pixmap(doc, img[0])
        if pix.n > 3: pix = fitz.Pixmap(fitz.csRGB, pix)
        pix.save(f'${OUT}/pb-{pno}-{n}.png'); n += 1
print('images extraites:', n)
"`, { encoding: "utf8" });

  const analyse = sx(`python3 -c "
from pyzbar.pyzbar import decode
from PIL import Image
import glob
files = sorted(glob.glob('${OUT}/pb-*.png'))
ok_jaune = 0; ok_decode = 0
for f in files:
    im = Image.open(f).convert('RGB')
    w, h = im.size
    px = list(im.resize((100, 100)).getdata())
    yellow = sum(1 for r, g, b in px if r > 180 and g > 180 and b < 120)
    im2 = im.resize((w*2, h*2), Image.NEAREST)
    dec = decode(im) or decode(im2)
    data = dec[0].data.decode() if dec else None
    if yellow > 30: ok_jaune += 1
    if data and '/a/' in data: ok_decode += 1
    if f == files[0]: print('extrait 0:', w, 'x', h, 'jaune=', yellow, 'decode=', (data or '')[:60])
print(f'{ok_jaune}/{len(files)} badges jaunes, {ok_decode}/{len(files)} décodés (URL /a/)')
"`, { encoding: "utf8" });
  console.log(analyse);

  // ── Nettoyage ──────────────────────────────────────────────────
  await db.batch.delete({ where: { id: batch.id } });
  console.log("Batch de test supprimé ✓");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
