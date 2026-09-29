/** Debug : décode les 4 QR extraits du PDF (pdfimages, natif 190px). */
import { chromium, type Page } from "playwright";
import jsQR from "jsqr";

async function decode(page: Page, file: string): Promise<string | null> {
  const b64 = Buffer.from(await Bun.file(file).arrayBuffer()).toString("base64");
  const px = (await page.evaluate(async (url: string) => {
    const img = new Image();
    await new Promise((ok, err) => {
      img.onload = ok;
      img.onerror = err;
      img.src = url;
    });
    const cv = document.createElement("canvas");
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    // fond blanc sous l'éventuelle transparence
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, cv.width, cv.height);
    return { data: Array.from(id.data), w: id.width, h: id.height };
  }, `data:image/png;base64,${b64}`)) as { data: number[]; w: number; h: number } | null;
  if (!px) return null;
  return jsQR(new Uint8ClampedArray(px.data), px.w, px.h)?.data ?? null;
}

const browser = await chromium.launch();
const page = await browser.newPage();
for (const f of ["img-000", "img-002", "img-004", "img-006"]) {
  const path = `/home/z/my-project/scanproduct/.tmp-qr-scan/${f}.png`;
  console.log(f, "→", await decode(page, path));
}
await browser.close();
