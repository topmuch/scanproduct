/**
 * Test e2e — Import de design de QR code (fabricant + superadmin).
 *
 * Scénario complet :
 *   1. Login fabricant
 *   2. GET /api/qr-codes/badge-template → null (aucun design personnel)
 *   3. POST render-badge → badge jaune officiel (~47 % jaune, décodable)
 *   4. POST /api/qr-codes/badge-template (multipart, template BLEU généré)
 *      → 200 { url } + persistance
 *   5. GET → url = /api/uploads/qr-badge/template-<id>.png
 *   6. POST render-badge → le BLEU du template est appliqué (coins), le QR
 *      reste décodable (pyzbar), fond blanc (quiet zone) au centre
 *   7. DELETE → retour au design officiel (jaune)
 *   8. Anonyme → 401 sur les 2 endpoints
 *   9. Login superadmin → POST /api/admin/settings/qr-badge-template
 *      (template ORANGE) → le fabricant SANS design personnel reçoit le
 *      design de la plateforme (coins orange)
 *  10. DELETE superadmin → retour au jaune
 *
 *   TEST_BASE_URL=http://localhost:3100 bun scripts/test-badge-template.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import sharp from "sharp";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3100";
const OUT = process.env.TEST_OUT_DIR || "/tmp/badge-template-test";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMeOnFirstLogin!2025";
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
      "user-agent": "test-badge-template",
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
  await req("/api/auth/callback/credentials", {
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

/** Rend le badge via l'API et sauvegarde le PNG. Retourne le chemin. */
async function rendreBadge(outPath: string): Promise<number> {
  const res = await fetch(`${BASE}/api/qr-codes/render-badge`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieJar },
    body: JSON.stringify({ url: `${BASE}/produits`, size: 1200 }),
  });
  if (res.status !== 200) return res.status;
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  return 200;
}

/** Décode le QR via pyzbar + % jaune. */
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

/** Lit la couleur RGB d'un pixel (coordonnées normalisées 0..1). */
async function pixelAt(f: string, fx: number, fy: number): Promise<[number, number, number]> {
  const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
  const x = Math.min(info.width - 1, Math.round(fx * info.width));
  const y = Math.min(info.height - 1, Math.round(fy * info.height));
  const idx = (y * info.width + x) * info.channels;
  return [data[idx], data[idx + 1], data[idx + 2]];
}

const proche = (c: [number, number, number], hex: string, tol = 30) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return Math.abs(c[0] - r) <= tol && Math.abs(c[1] - g) <= tol && Math.abs(c[2] - b) <= tol;
};

/** Génère un template carré de couleur unie + cercle blanc central. */
async function genererTemplate(f: string, hex: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">
    <rect width="1000" height="1000" fill="${hex}"/>
    <circle cx="500" cy="500" r="340" fill="#FFFFFF"/>
    <circle cx="500" cy="500" r="340" fill="none" stroke="#000000" stroke-width="8"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(f);
}

async function main() {
  console.log("═".repeat(64));
  console.log("TEST IMPORT DE DESIGN QR (fabricant + superadmin)");
  console.log(`  BASE = ${BASE}`);
  console.log("═".repeat(64));

  // ── 0. Nettoyage d'état (rejouabilité) ───────────────────────────
  console.log("\n[0] Nettoyage d'état préalable…");
  cookieJar = "";
  await login("admin@verifscan.sn", ADMIN_PASSWORD);
  await req("/api/admin/settings/qr-badge-template", { method: "DELETE" });
  cookieJar = "";
  await login("sarine@biocosmetique.sn", "Demo1234!");
  await req("/api/qr-codes/badge-template", { method: "DELETE" });
  console.log("  (templates préexistants supprimés)");

  // ── 1. Anonyme → 401 sur les deux endpoints ─────────────────────
  console.log("\n[1] Appels anonymes (sans session)…");
  const savedJar = cookieJar;
  cookieJar = "";
  const anon1 = await req("/api/qr-codes/badge-template");
  check("badge-template anonyme 401", anon1.status === 401, `status=${anon1.status}`);
  const anon2 = await req("/api/admin/settings/qr-badge-template");
  check("admin qr-badge-template anonyme 401", anon2.status === 401, `status=${anon2.status}`);
  cookieJar = savedJar;

  // ── 2. Login fabricant + état initial ───────────────────────────
  console.log("\n[2] Login fabricant…");
  const role = await login("sarine@biocosmetique.sn", "Demo1234!");
  check("Login fabricant", role === "FABRICANT", `role=${role}`);
  const jarFabricant = cookieJar; // session fabricant pour la suite des étapes

  const etat0 = await req("/api/qr-codes/badge-template");
  check("GET badge-template → 200", etat0.status === 200, `status=${etat0.status}`);

  // ── 3. Rendu SANS template → badge jaune officiel ───────────────
  console.log("\n[3] Rendu sans design importé (badge jaune officiel)…");
  const png0 = `${OUT}/badge-officiel.png`;
  const st0 = await rendreBadge(png0);
  check("render-badge 200", st0 === 200, `status=${st0}`);
  const a0 = analyserPng(png0);
  check("Badge jaune officiel (~47 %)", a0.jaune >= 35, `${a0.jaune} % jaune`);
  check("QR décodable", a0.decode === `${BASE}/produits`, `décode: ${a0.decode}`);

  // ── 4. Import du design personnel (BLEU) ────────────────────────
  console.log("\n[4] Import du design personnel (template bleu)…");
  const tplF = `${OUT}/template-fabricant.png`;
  await genererTemplate(tplF, "#1E90FF");
  const tplBytes = await (await import("fs/promises")).readFile(tplF);
  const form = new FormData();
  form.append("file", new Blob([tplBytes], { type: "image/png" }), "mon-design.png");
  const up = await fetch(`${BASE}/api/qr-codes/badge-template`, {
    method: "POST",
    headers: { cookie: cookieJar },
    body: form,
  });
  const upBody = await up.json().catch(() => null);
  check("POST badge-template 200", up.status === 200, `status=${up.status}`);
  check(
    "URL retournée = /api/uploads/qr-badge/",
    typeof upBody?.url === "string" && upBody.url.startsWith("/api/uploads/qr-badge/"),
    upBody?.url ?? "(null)"
  );

  const etat1 = await req("/api/qr-codes/badge-template");
  check(
    "GET renvoie le design importé",
    etat1.body?.url === upBody?.url,
    etat1.body?.url ?? "(null)"
  );

  // ── 5. Rendu AVEC template → bleu aux coins, blanc au centre ────
  console.log("\n[5] Rendu avec design importé…");
  const png1 = `${OUT}/badge-template-fabricant.png`;
  const st1 = await rendreBadge(png1);
  check("render-badge 200", st1 === 200, `status=${st1}`);
  const coin = await pixelAt(png1, 0.03, 0.03);
  const pad = await pixelAt(png1, 0.21, 0.5); // entre bord pad (0.19) et QR (0.25)
  check("Template appliqué (coin bleu)", proche(coin, "#1E90FF"), `coin rgb(${coin})`);
  check("Quiet zone blanche au centre", proche(pad, "#FFFFFF"), `pad rgb(${pad})`);
  const a1 = analyserPng(png1);
  check(
    "QR toujours décodable sur design importé",
    a1.decode === `${BASE}/produits`,
    `décode: ${a1.decode}`
  );

  // ── 6. Suppression du design personnel → retour au jaune ────────
  console.log("\n[6] Suppression du design personnel…");
  const del = await req("/api/qr-codes/badge-template", { method: "DELETE" });
  check("DELETE 200", del.status === 200, `status=${del.status}`);
  const etat2 = await req("/api/qr-codes/badge-template");
  check("GET → null", etat2.body?.url === null, `${etat2.body?.url}`);
  const png2 = `${OUT}/badge-retour-officiel.png`;
  await rendreBadge(png2);
  const a2 = analyserPng(png2);
  check("Retour au badge jaune", a2.jaune >= 35, `${a2.jaune} % jaune`);

  // ── 7. Design OFFICIEL de la plateforme (superadmin) ────────────
  console.log("\n[7] Superadmin : design officiel plateforme (template orange)…");
  cookieJar = "";
  const roleAdmin = await login("admin@verifscan.sn", ADMIN_PASSWORD);
  check("Login superadmin", roleAdmin === "SUPERADMIN", `role=${roleAdmin}`);

  const tplA = `${OUT}/template-plateforme.png`;
  await genererTemplate(tplA, "#FF7F00");
  const tplABytes = await (await import("fs/promises")).readFile(tplA);
  const formA = new FormData();
  formA.append("file", new Blob([tplABytes], { type: "image/png" }), "design-officiel.png");
  const upA = await fetch(`${BASE}/api/admin/settings/qr-badge-template`, {
    method: "POST",
    headers: { cookie: cookieJar },
    body: formA,
  });
  const upABody = await upA.json().catch(() => null);
  check("POST admin qr-badge-template 200", upA.status === 200, `status=${upA.status}`);
  check(
    "URL = /api/uploads/site/qr-badge.",
    typeof upABody?.url === "string" && upABody.url.startsWith("/api/uploads/site/qr-badge."),
    upABody?.url ?? "(null)"
  );

  // Fabricant (sans design personnel) → reçoit le design plateforme
  cookieJar = jarFabricant;
  const png3 = `${OUT}/badge-template-plateforme.png`;
  await rendreBadge(png3);
  const coin3 = await pixelAt(png3, 0.03, 0.03);
  check(
    "Fabricant hérite du design plateforme (coin orange)",
    proche(coin3, "#FF7F00"),
    `coin rgb(${coin3})`
  );

  // ── 8. Nettoyage + retour au jaune ─────────────────────────────
  console.log("\n[8] Nettoyage (suppression design plateforme)…");
  cookieJar = "";
  await login("admin@verifscan.sn", ADMIN_PASSWORD);
  const delA = await req("/api/admin/settings/qr-badge-template", { method: "DELETE" });
  check("DELETE admin 200", delA.status === 200, `status=${delA.status}`);

  cookieJar = jarFabricant;
  const png4 = `${OUT}/badge-final-jaune.png`;
  await rendreBadge(png4);
  const a4 = analyserPng(png4);
  check("Retour final au badge jaune", a4.jaune >= 35, `${a4.jaune} % jaune`);

  // ── Bilan ──────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(64));
  console.log(`BILAN : ${passed} OK / ${failed} échec(s)`);
  console.log("─".repeat(64));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Erreur fatale :", e);
  process.exit(1);
});
