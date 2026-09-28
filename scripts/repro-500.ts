/**
 * Reproduction de l'HTTP 500 sur la génération de batch QR.
 * Login SuperAdmin → POST /api/admin/batches (petit batch de test) → GET liste → PDF.
 */
const BASE = "http://localhost:3000";

let cookieJar = "";

function captureCookies(res: Response) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const [nv] = raw.split(";"); // name=value seulement, sans les flags
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
      "user-agent": "repro-500-script",
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
    body = text.slice(0, 200);
  }
  return { status: res.status, body };
}

async function login(password: string) {
  const csrf = await req("/api/auth/csrf");
  const res = await req("/api/auth/callback/credentials", {
    method: "POST",
    body: JSON.stringify({
      csrfToken: csrf.body?.csrfToken,
      email: "admin@verifscan.sn",
      password,
      callbackUrl: `${BASE}/admin`,
    }),
  });
  const sess = await req("/api/auth/session");
  const hasSession = !!(sess.body as any)?.user;
  return hasSession;
}

async function main() {
  console.log("1. Login SuperAdmin (ChangeMeOnFirstLogin!2025)...");
  const ok = await login(process.env.ADMIN_PASSWORD ?? "ChangeMeOnFirstLogin!2025");
  console.log("   login:", ok ? "OK" : "ÉCHEC");
  if (!ok) process.exit(1);

  console.log("2. GET /api/admin/batches (état actuel)...");
  const list = await req("/api/admin/batches");
  const batchesBefore = Array.isArray(list.body) ? list.body : [];
  console.log("   status:", list.status, "— batches:", batchesBefore.length);

  console.log("3. POST /api/admin/batches — batch de test 2/1/0 (minimal)...");
  const t0 = Date.now();
  const create = await req("/api/admin/batches", {
    method: "POST",
    body: JSON.stringify({ totalQuantity: 2, packSize: 1, pricePerPack: 0 }),
  });
  console.log("   status:", create.status, `(${Date.now() - t0}ms)`);
  console.log("   body:", JSON.stringify(create.body).slice(0, 400));

  console.log("4. GET /api/admin/batches (après création)...");
  const list2 = await req("/api/admin/batches");
  const batches = Array.isArray(list2.body) ? list2.body : [];
  console.log("   status:", list2.status, "— batches:", batches.length);
  if (batches[0]) {
    const b = batches[0];
    console.log(
      "   dernier batch:",
      b.id,
      `(${b.totalQuantity}/${b.packSize})`,
      "packs:",
      b.packs?.length,
      "stats:",
      JSON.stringify(b.stats)
    );
    if (b.packs?.[0]) console.log("   code maître:", b.packs[0].masterQrCode);

    console.log("5. PDF du dernier batch...");
    const pdf = await fetch(`${BASE}/api/admin/print-batch/${b.id}`, {
      headers: { cookie: cookieJar, "user-agent": "repro-500-script" },
    });
    const buf = await pdf.arrayBuffer();
    const isPdf = new TextDecoder().decode(buf.slice(0, 4)) === "%PDF";
    console.log("   status:", pdf.status, "— taille:", buf.byteLength, "octets — %PDF:", isPdf);
  }

  console.log("6. Page artisan /a/<code maître>...");
  const master = batches[0]?.packs?.[0]?.masterQrCode;
  if (master) {
    const page = await fetch(`${BASE}/a/${master}`, {
      headers: { "user-agent": "repro-500-script" },
    });
    console.log("   status:", page.status);
  }
}

main().catch((e) => {
  console.error("ERREUR SCRIPT:", e);
  process.exit(1);
});
