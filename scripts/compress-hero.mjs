// Compress hero slider images using sharp.
// Input:  /home/z/my-project/upload/*.png  (3 new hero images)
// Output: /home/z/my-project/public/hero-slide-{1,2,3}.{webp,png}
//
// Run: node scripts/compress-hero.mjs
//
// Strategy (matches the existing hero pipeline):
//   - WebP at quality 82 — ~70% smaller than source PNG, visually lossless
//   - PNG with palette reduction (8-bit colormap) — fallback for legacy browsers
//   - No resize: the new images are already 1956x804 / 1983x793, which matches
//     the existing aspect-[1956/804] container. object-cover handles the minor
//     height delta on slides 2 & 3.
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC = [
  "/home/z/my-project/upload/99b9ce85-9b8c-4d32-bee0-7bf06f66e8d6.png",
  "/home/z/my-project/upload/84234dfc-572e-4624-aa93-73e257f0b3ee (1).png",
  "/home/z/my-project/upload/f25985a7-2a83-4e7b-8680-cd45faa60695.png",
];

const OUT_DIR = "/home/z/my-project/public";

for (let i = 0; i < SRC.length; i++) {
  const src = SRC[i];
  const n = i + 1;
  const webpOut = path.join(OUT_DIR, `hero-slide-${n}.webp`);
  const pngOut = path.join(OUT_DIR, `hero-slide-${n}-opt.png`);

  if (!fs.existsSync(src)) {
    console.error(`MISSING: ${src}`);
    continue;
  }

  const srcSize = fs.statSync(src).size;
  console.log(`\n[${n}/${SRC.length}] ${path.basename(src)} (${(srcSize / 1024).toFixed(0)} KB, source)`);

  // WebP — lossy quality 82, smart subsampling, effort 4 (good speed/size balance)
  await sharp(src, { failOn: "none" })
    .webp({ quality: 82, alphaQuality: 90, smartSubsample: true, effort: 4 })
    .toFile(webpOut);
  const webpSize = fs.statSync(webpOut).size;
  console.log(`      → hero-slide-${n}.webp      ${(webpSize / 1024).toFixed(0)} KB  (${(100 - (webpSize / srcSize) * 100).toFixed(1)}% smaller)`);

  // PNG — palette mode (8-bit colormap), compression 9
  await sharp(src, { failOn: "none" })
    .png({
      palette: true,
      quality: 80,
      compressionLevel: 9,
      effort: 10,
      colors: 256,
      dither: 0,
    })
    .toFile(pngOut);
  const pngSize = fs.statSync(pngOut).size;
  console.log(`      → hero-slide-${n}-opt.png  ${(pngSize / 1024).toFixed(0)} KB  (${(100 - (pngSize / srcSize) * 100).toFixed(1)}% smaller)`);
}

console.log("\n✅ Compression done. Files in /home/z/my-project/public/");
