/**
 * Sauvegarde un PDF d'impression d'exemple dans download/
 * Usage : bun run scripts/save-pdf-exemple.ts
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@verifscan.sn";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ChangeMeOnFirstLogin!2025";
const { writeFileSync } = await import("fs");

let cookieJar = "";

async function req(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), cookie: cookieJar },
    redirect: "manual",
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    const pair = c.split(";")[0];
    if (!cookieJar.includes(pair.split("=")[0] + "=")) {
      cookieJar = cookieJar ? `${cookieJar}; ${pair}` : pair;
    }
  }
  return res;
}

async function main() {
  const csrf = await (await req("/api/auth/csrf")).json();
  await req("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken: csrf.csrfToken,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      json: "true",
    }).toString(),
  });
  const batches = await (await req("/api/admin/batches")).json();
  const batchId = batches[0]?.id;
  if (!batchId) throw new Error("Aucun batch en base");
  const pdfRes = await req(`/api/admin/print-batch/${batchId}`);
  const buf = Buffer.from(await pdfRes.arrayBuffer());
  const dest = "/home/z/my-project/download/verifscan-etiquettes-artisan-exemple.pdf";
  writeFileSync(dest, buf);
  console.log(`PDF sauvegardé: ${dest} (${buf.length} octets)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
