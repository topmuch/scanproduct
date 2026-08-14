import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT = '/home/z/my-project/public/features';

const REMAINING = [
  {
    name: 'feature-statistiques.png',
    prompt:
      'Modern flat illustration of useful analytics dashboard for product scans: bar charts, line graphs, a map of Senegal with heat zones showing scan density by region, pie chart of top products. Clean professional infographic style, amber and orange color palette with white background, high quality, detailed, no readable text labels',
  },
  {
    name: 'step-create-product.png',
    prompt:
      'Modern flat illustration of creating a product in an app: a clean product form being filled on a tablet, with fields for name, ingredients, dates, certifications, and a product photo upload zone. A fresh artisanal African food product (bottle of juice) beside it. Blue and white color palette, professional UI illustration style, high quality, detailed, no readable text',
  },
  {
    name: 'step-generate-qr.png',
    prompt:
      'Modern flat illustration of generating QR codes for product labels: a sheet of printed QR code labels coming out of a printer, a smartphone scanning one QR code, green verification checkmarks. Emerald green and white color palette, professional infographic style, high quality, detailed, no readable text',
  },
  {
    name: 'step-share-track.png',
    prompt:
      'Modern flat illustration of sharing products and tracking scans: customers scanning QR codes with smartphones in different locations, a live dashboard map showing scan points lighting up across Senegal/West Africa, growing chart trending up. Amber and orange color palette with green accents, professional infographic style, high quality, detailed, no readable text',
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const zai = await ZAI.create();
  const results = [];
  for (let i = 0; i < REMAINING.length; i++) {
    const img = REMAINING[i];
    let attempt = 0;
    let done = false;
    while (attempt < 4 && !done) {
      attempt++;
      try {
        const res = await zai.images.generations.create({
          prompt: img.prompt,
          size: '1024x1024',
        });
        const buf = Buffer.from(res.data[0].base64, 'base64');
        fs.writeFileSync(path.join(OUT, img.name), buf);
        results.push({ ok: true, name: img.name, size: buf.length, attempt });
        done = true;
        console.log(`OK ${img.name} (attempt ${attempt})`);
      } catch (e: any) {
        const msg = String(e).slice(0, 120);
        console.log(`FAIL ${img.name} attempt ${attempt}: ${msg}`);
        if (String(e).includes('429')) {
          await sleep(15000 * attempt); // backoff
        } else {
          results.push({ ok: false, name: img.name, error: msg });
          done = true;
        }
      }
    }
    if (!done) results.push({ ok: false, name: img.name });
    if (i < REMAINING.length - 1) await sleep(8000);
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
