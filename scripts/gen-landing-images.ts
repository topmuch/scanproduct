import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT = '/home/z/my-project/public/features';
fs.mkdirSync(OUT, { recursive: true });

const IMAGES = [
  {
    name: 'feature-tracabilite.png',
    prompt:
      'Modern flat illustration of complete product traceability for an African food brand: a central product bottle with a QR code, connected by glowing lines to floating info cards showing ingredients, origin map of Senegal, dates, certifications (Bio, Halal). Clean professional infographic style, blue and white color palette with green accents, transparent-like background, high quality, detailed, no text labels',
  },
  {
    name: 'feature-export.png',
    prompt:
      'Modern flat illustration of simplified export and international compliance: a stack of official-looking normalized documents with stamps, surrounded by flag icons of CEDEAO (West Africa), European Union, and USA, a cargo ship and plane in the background. Clean professional infographic style, emerald green and white color palette, high quality, detailed, no readable text',
  },
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

async function main() {
  const zai = await ZAI.create();
  const results = await Promise.all(
    IMAGES.map(async (img) => {
      try {
        const res = await zai.images.generations.create({
          prompt: img.prompt,
          size: '1024x1024',
        });
        const b64 = res.data[0].base64;
        const buf = Buffer.from(b64, 'base64');
        const outPath = path.join(OUT, img.name);
        fs.writeFileSync(outPath, buf);
        return { ok: true, name: img.name, size: buf.length };
      } catch (e) {
        return { ok: false, name: img.name, error: String(e).slice(0, 200) };
      }
    })
  );
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
