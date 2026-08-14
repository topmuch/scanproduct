import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT = '/home/z/my-project/public/features';

const REMAINING = [
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
    while (attempt < 5 && !done) {
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
          await sleep(20000 * attempt);
        } else {
          results.push({ ok: false, name: img.name, error: msg });
          done = true;
        }
      }
    }
    if (!done) results.push({ ok: false, name: img.name });
    if (i < REMAINING.length - 1) await sleep(10000);
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
