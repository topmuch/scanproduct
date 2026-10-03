#!/usr/bin/env bun
/**
 * Génère une photo produit de test (pot de beurre de karité stylisé, format
 * portrait) pour vérifier la VISIBILITÉ de l'image sous l'overlay allégé.
 */
import { writeFileSync } from "fs";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="55%" stop-color="#FBBF24"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
    <linearGradient id="jar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFF7ED"/>
      <stop offset="100%" stop-color="#FED7AA"/>
    </linearGradient>
  </defs>
  <rect width="900" height="1200" fill="url(#bg)"/>
  <circle cx="450" cy="330" r="210" fill="#FCD34D" opacity="0.55"/>
  <rect x="250" y="480" width="400" height="130" rx="24" fill="#92400E"/>
  <path d="M250 610 h400 v420 a60 60 0 0 1 -60 60 h-280 a60 60 0 0 1 -60 -60 z" fill="url(#jar)"/>
  <rect x="310" y="700" width="280" height="200" rx="18" fill="#0F172A" opacity="0.85"/>
  <text x="450" y="775" text-anchor="middle" font-family="sans-serif" font-size="44" font-weight="bold" fill="#FDE68A">KARITÉ</text>
  <text x="450" y="830" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#FDBA74">100% PUR</text>
  <text x="450" y="875" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#94A3B8">250 g — Sénégal</text>
</svg>`;

const { default: sharp } = await import("sharp");
const png = await sharp(Buffer.from(svg)).png().toBuffer();

for (const out of process.argv.slice(2)) {
  writeFileSync(out, png);
  console.log(`✓ photo produit test écrite : ${out} (${png.length} octets)`);
}
