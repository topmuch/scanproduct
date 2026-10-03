#!/usr/bin/env bun
/**
 * Génère 3 photos « atelier » de test (couleurs distinctes) pour le slider.
 * Usage : bun scripts/gen-test-photos-atelier.ts <dossier-sortie>
 */
import { writeFileSync } from "fs";

const { default: sharp } = await import("sharp");

const themes = [
  { name: "ATELIER 1", bg1: "#FDE68A", bg2: "#F59E0B", accent: "#7C2D12" },
  { name: "ATELIER 2", bg1: "#D1FAE5", bg2: "#10B981", accent: "#064E3B" },
  { name: "ATELIER 3", bg1: "#DBEAFE", bg2: "#3B82F6", accent: "#1E3A8A" },
];

const outDir = process.argv[2] ?? "public/";
const urls: string[] = [];

for (let i = 0; i < themes.length; i++) {
  const t = themes[i];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${t.bg1}"/><stop offset="100%" stop-color="${t.bg2}"/>
    </linearGradient></defs>
    <rect width="1200" height="800" fill="url(#g)"/>
    <circle cx="330" cy="420" r="150" fill="${t.accent}" opacity="0.25"/>
    <rect x="620" y="300" width="380" height="260" rx="28" fill="${t.accent}" opacity="0.85"/>
    <text x="810" y="450" text-anchor="middle" font-family="sans-serif" font-size="52" font-weight="bold" fill="#FFFFFF">${t.name}</text>
    <text x="600" y="700" text-anchor="middle" font-family="sans-serif" font-size="34" fill="${t.accent}">Atelier de fabrication — photo ${i + 1}/3</text>
  </svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const file = `test-atelier-${i + 1}.png`;
  writeFileSync(`${outDir}${file}`, png);
  urls.push(`/${file}`);
  console.log(`✓ ${outDir}${file} (${png.length} octets)`);
}
console.log("URLs:", JSON.stringify(urls));
