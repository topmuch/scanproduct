/**
 * Test e2e — Build STANDALONE (identique à la prod Docker/Coolify).
 *
 * Valide sur le serveur standalone (.next/standalone — PORT env, défaut 3001) :
 *   1. /api/health  → commit déployé NON NULL (chaîne bake Dockerfile →
 *      next.config inline → route health)
 *   2. render-badge NON authentifié        → 401 (et PAS 500 :
 *      détecte la casse du module natif sharp/libvips dans le bundle)
 *   3. render-badge authentifié (fabricant) → PNG badge décodable pyzbar
 *   4. Sécurité : URL domaine tiers → 403
 *
 * Usage :
 *   PORT=3001 bun scripts/test-standalone-badge.ts
 *   (après : git rev-parse HEAD > .deploy-commit && bun run build &&
 *    PORT=3001 node .next/standalone/server.js)
 */
import { writeFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";

const BASE = process.env.BASE ?? `http://localhost:${process.env.PORT ?? 3001}`;
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
      "user-agent": "test-standalone-badge",
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
  console.log(`TEST STANDALONE (prod-like) — ${BASE}`);
  console.log("═".repeat(64));

  // ── 1. Health : commit déployé visible ────────────────────────────
  console.log("\n[1] GET /api/health …");
  const health = await req("/api/health");
  const commit = (health.body as { commit?: string } | null)?.commit ?? null;
  check(
    "Health 200 + commit NON NULL",
    health.status === 200 && !!commit,
    `commit=${commit ?? "null"}`
  );

  // ── 2. render-badge NON authentifié → 401 (pas 500 !) ─────────────
  console.log("\n[2] POST render-badge SANS auth …");
  const anon = await req("/api/qr-codes/render-badge", {
    method: "POST",
    body: JSON.stringify({ url: `${BASE}/p/x` }),
  });
  check(
    "Non authentifié → 401",
    anon.status === 401,
    `status=${anon.status} (500 = sharp/libvips cassé dans le bundle)`
  );

  // ── Login fabricant ───────────────────────────────────────────────
  console.log("\n[3] Login fabricant …");
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
  check("Login fabricant", login.status < 400 && !!sess.body?.user);

  // ── 4. render-badge authentifié → PNG décodable ───────────────────
  console.log("\n[4] POST render-badge authentifié …");
  const scanUrl = `${BASE}/p/standalone-test-lot`;
  const badge = await req("/api/qr-codes/render-badge", {
    method: "POST",
    body: JSON.stringify({ url: scanUrl, size: 1200 }),
  });
  const ct = badge.res.headers.get("content-type") ?? "";
  const width = badge.res.headers.get("x-badge-width");
  check("Status 200 + image/png", badge.status === 200 && ct.includes("image/png"), `status=${badge.status} ct=${ct}`);
  const buf = Buffer.from(await badge.res.arrayBuffer());
  check("PNG > 20 Ko (design complet, pas un QR nu)", buf.length > 20_000, `${Math.round(buf.length / 1024)} Ko`);
  const pngPath = `${OUT}/badge-standalone-test.png`;
  writeFileSync(pngPath, buf);
  const decoded = decodePng(pngPath);
  check("PNG décodé par pyzbar", !!decoded, `contenu=${decoded?.slice(0, 60)}`);
  check("Contenu = URL demandée", decoded === scanUrl, decoded ?? "null");

  // ── 5. Sécurité : domaine tiers → 403 ─────────────────────────────
  console.log("\n[5] URL domaine tiers …");
  const evil = await req("/api/qr-codes/render-badge", {
    method: "POST",
    body: JSON.stringify({ url: "https://site-étranger.example/arnaque" }),
  });
  check("403 anti brand-abuse", evil.status === 403, `status=${evil.status}`);

  console.log("═".repeat(64));
  console.log(`RÉSULTAT : ${passed} OK / ${failed} ÉCHEC(S)`);
  console.log("═".repeat(64));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
