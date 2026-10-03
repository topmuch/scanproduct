/**
 * Crée un batch de test et affiche le code maître (pour démo navigateur).
 * Usage : BASE=… ADMIN_PASSWORD=… DATABASE_URL=file:… bun scripts/create-test-batch.ts [nb]
 */
const BASE = process.env.BASE ?? "http://localhost:3100";
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
    body = text;
  }
  return { status: res.status, body };
}

const csrf = await req("/api/auth/csrf");
await req("/api/auth/callback/credentials", {
  method: "POST",
  body: JSON.stringify({
    csrfToken: csrf.body?.csrfToken,
    email: "admin@verifscan.sn",
    password: process.env.ADMIN_PASSWORD ?? "Admin123!2025",
    callbackUrl: `${BASE}/admin`,
  }),
});
const n = parseInt(process.argv[2] ?? "5", 10);
const create = await req("/api/admin/batches", {
  method: "POST",
  body: JSON.stringify({ totalQuantity: n, packSize: n, pricePerPack: 0 }),
});
if (create.status !== 201) {
  console.error("ERREUR", create.status, create.body);
  process.exit(1);
}
console.log(create.body.masterCodes[0]);
