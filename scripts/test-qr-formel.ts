/**
 * Test de la génération QR FORMELLE (système fabricant).
 * POST /api/qr-codes/generate avec quantity=1 sur un lot existant.
 */
const BASE = "http://localhost:3000";
const LOT_ID = process.argv[2] || "cmullfzrx000mr2ynwbou1ru9";

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
      "user-agent": "test-qr-formel",
      ...(init.headers ?? {}),
      cookie: cookieJar,
    },
  });
  captureCookies(res);
  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 300);
  }
  return { status: res.status, body };
}

async function main() {
  console.log(`Lot cible: ${LOT_ID}`);

  console.log("1. Login fabricant sarine@biocosmetique.sn / Demo1234! ...");
  const csrf = await req("/api/auth/csrf");
  await req("/api/auth/callback/credentials", {
    method: "POST",
    body: JSON.stringify({
      csrfToken: csrf.body?.csrfToken,
      email: "sarine@biocosmetique.sn",
      password: "Demo1234!",
      callbackUrl: `${BASE}/dashboard`,
    }),
  });
  const sess = await req("/api/auth/session");
  const s = sess.body as any;
  console.log("   session:", s?.user ? `${s.user.email} (${s.user.role})` : "VIDE");
  if (!s?.user) process.exit(1);

  console.log("2. POST /api/qr-codes/generate — quantity=1 ...");
  const t0 = Date.now();
  const gen = await req("/api/qr-codes/generate", {
    method: "POST",
    body: JSON.stringify({ lotId: LOT_ID, quantity: 1 }),
  });
  console.log("   status:", gen.status, `(${Date.now() - t0}ms)`);
  const b = gen.body as any;
  if (b?.qrCodes?.[0]) {
    console.log("   count:", b.count, "| quota restant:", b.quotaRemaining);
    const q = b.qrCodes[0];
    console.log("   1er QR:", JSON.stringify(q).slice(0, 220));
  } else {
    console.log("   body:", JSON.stringify(gen.body).slice(0, 500));
  }
}

main().catch((e) => {
  console.error("ERREUR SCRIPT:", e);
  process.exit(1);
});
