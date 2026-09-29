/** Debug : PDF → raster 300dpi → crop du 1er QR → PNG à inspecter + décodage. */
import { chromium, type Page } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const TMP = "/home/z/my-project/scanproduct/.tmp-qr-dbg";
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

let jar = "";
function captureCookies(res: Response) {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) {
    const nv = c.split(";")[0];
    const name = nv.split("=")[0];
    jar = jar.split("; ").filter((p) => p && !p.startsWith(`${name}=`)).concat(nv).join("; ");
  }
}
async function req(p: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${p}`, {
    ...init,
    redirect: "manual",
    headers: { "content-type": "application/json", cookie: jar, ...(init.headers ?? {}) },
  });
  captureCookies(res);
  return res;
}

const csrf = await req("/api/auth/csrf");
const csrfJson = (await csrf.json()) as { csrfToken?: string };
await req("/api/auth/callback/credentials", {
  method: "POST",
  body: JSON.stringify({
    csrfToken: csrfJson.csrfToken,
    email: "admin@verifscan.sn",
    password: process.env.ADMIN_PASSWORD ?? "ChangeMeOnFirstLogin!2025",
    callbackUrl: `${BASE}/superadmin`,
  }),
});
// dernier batch
const listRes = await req("/api/admin/batches");
const list = (await listRes.json()) as Array<{ id: string }>;
const batchId = list?.[0]?.id;
console.log("batch:", batchId);
const pdfRes = await req(`/api/admin/print-batch/${batchId}`);
fs.writeFileSync(path.join(TMP, "batch.pdf"), Buffer.from(await pdfRes.arrayBuffer()));

// Raster 300dpi crop autour du 1er QR (x≈125 y≈500 à 300dpi, QR ~400px)
execFileSync("pdftoppm", ["-r", "300", "-png", "-x", "80", "-y", "430", "-W", "560", "-H", "560",
  path.join(TMP, "batch.pdf"), path.join(TMP, "crop")]);
const crop = fs.readdirSync(TMP).find((f) => f.startsWith("crop"));
console.log("crop file:", crop);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addScriptTag({ path: path.join(import.meta.dir, "..", "node_modules", "jsqr", "dist", "jsQR.js") });
const b64 = fs.readFileSync(path.join(TMP, crop!)).toString("base64");
const decoded = await page.evaluate(async (url: string) => {
  const img = new Image();
  await new Promise((ok, err) => { img.onload = ok; img.onerror = err; img.src = url; });
  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, cv.width, cv.height);
  // essais: natif, downscale 50%, upscale 2x
  const tryDecode = (d: Uint8ClampedArray, w: number, h: number) =>
    (window as unknown as { jsQR: (a: Uint8ClampedArray, w: number, h: number) => { data: string } | null }).jsQR(d, w, h)?.data ?? null;
  const native = tryDecode(id.data, id.width, id.height);
  let half: string | null = null;
  if (!native) {
    const cv2 = document.createElement("canvas");
    cv2.width = Math.floor(id.width / 2); cv2.height = Math.floor(id.height / 2);
    const c2 = cv2.getContext("2d")!;
    c2.drawImage(cv, 0, 0, cv2.width, cv2.height);
    const id2 = c2.getImageData(0, 0, cv2.width, cv2.height);
    half = tryDecode(id2.data, id2.width, id2.height);
  }
  return { native, half };
}, `data:image/png;base64,${b64}`);
console.log("decoded:", JSON.stringify(decoded));
await browser.close();
