/**
 * Test e2e — Bouton « Télécharger le nouveau design » (DesignDownloadButton).
 *
 * Reproduit exactement le comportement du bouton ajouté sur les pages
 * « Mes QR Codes » et « Génération en masse » :
 *   1. Login fabricant (session next-auth credentials)
 *   2. POST /api/qr-codes/render-badge { url: `${origin}/produits`, size: 1200 }
 *      — origin = origine du navigateur, comme getScanOrigin() côté client
 *   3. Vérifications : HTTP 200, Content-Type image/png, taille > 50 Ko,
 *      PNG décodable par pyzbar (QR réel), ~47 % de pixels jaunes
 *      (cercle #F8E805 = design officiel LABEL VERIFSCAN).
 *
 *   TEST_BASE_URL=http://localhost:3100 bun scripts/test-design-download.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3100";
const OUT = process.env.TEST_OUT_DIR || "/tmp/design-download-test";
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
      "user-agent": "test-design-download",
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
  console.log("TEST BOUTON « TÉLÉCHARGER LE NOUVEAU DESIGN »");
  console.log(`  BASE = ${BASE}`);
  console.log("═".repeat(64));

  // ── 1. Login fabricant ──────────────────────────────────────────
  console.log("\n[1] Login fabricant…");
  const role = await login("sarine@biocosmetique.sn", "Demo1234!");
  check("Login fabricant", role === "FABRICANT", `role=${role}`);

  // ── 2. Anonyme → 401 (garde d'authentification) ────────────────
  console.log("\n[2] Appel anonyme (sans session)…");
  const saved = cookieJar;
  cookieJar = "";
  const anon = await req("/api/qr-codes/render-badge", {
    method: "POST",
    body: JSON.stringify({ url: `${BASE}/produits`, size: 1200 }),
  });
  check("Anonyme rejeté 401", anon.status === 401, `status=${anon.status}`);
  cookieJar = saved;

  // ── 3. Téléchargement du design (comportement exact du bouton) ──
  console.log("\n[3] POST render-badge (design officiel, QR catalogue)…");
  const res = await fetch(`${BASE}/api/qr-codes/render-badge`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieJar,
    },
    body: JSON.stringify({ url: `${BASE}/produits`, size: 1200 }),
  });
  check("HTTP 200", res.status === 200, `status=${res.status}`);
  check(
    "Content-Type image/png",
    (res.headers.get("content-type") || "").includes("image/png"),
    `ct=${res.headers.get("content-type")}`
  );
  const buf = Buffer.from(await res.arrayBuffer());
  check("Taille > 50 Ko", buf.length > 50 * 1024, `${(buf.length / 1024).toFixed(0)} Ko`);
  const pngPath = `${OUT}/label-verifscan-design.png`;
  writeFileSync(pngPath, buf);

  // ── 4. Analyse visuelle + décodage du QR ───────────────────────
  console.log("\n[4] Analyse PNG (jaune #F8E805 + décodage pyzbar)…");
  const { jaune, decode } = analyserPng(pngPath);
  check("Cercle jaune présent (~47 %)", jaune >= 35, `${jaune} % de pixels jaunes`);
  check(
    "QR décodable → catalogue public",
    decode === `${BASE}/produits`,
    `décode: ${decode}`
  );

  // ── 5. Domaine tiers refusé (anti brand-abuse) ─────────────────
  console.log("\n[5] URL hors domaine refusée…");
  const abus = await req("/api/qr-codes/render-badge", {
    method: "POST",
    body: JSON.stringify({ url: "https://site-malveillant.example/produits", size: 1200 }),
  });
  check("Domaine tiers refusé 403", abus.status === 403, `status=${abus.status}`);

  // ── Bilan ──────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(64));
  console.log(`Résultat : ${passed} OK / ${failed} ÉCHEC(S)`);
  console.log(`PNG : ${pngPath}`);
  console.log("─".repeat(64));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Erreur fatale:", e);
  process.exit(1);
});
