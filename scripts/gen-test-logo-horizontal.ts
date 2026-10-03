#!/usr/bin/env bun
/**
 * Génère un logo HORIZONTAL de test (400x120, large — le cas qui était coupé
 * par object-cover) dans le dossier public du serveur standalone.
 */
import { writeFileSync } from "fs";

// PNG minimal 400x120 dessiné à la main serait pénible → on passe par sharp
// (déjà présent dans node_modules) pour convertir un SVG large en PNG.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120">
  <rect width="400" height="120" rx="16" fill="#0F172A"/>
  <circle cx="60" cy="60" r="28" fill="#F59E0B"/>
  <text x="110" y="72" font-family="sans-serif" font-size="38" font-weight="bold" fill="#FFFFFF">MA MARQUE</text>
</svg>`;

const { default: sharp } = await import("sharp");
const png = await sharp(Buffer.from(svg)).png().toBuffer();

const out = process.argv[2] ?? "public/test-logo-horizontal.png";
writeFileSync(out, png);
console.log(`✓ logo horizontal 400x120 écrit : ${out} (${png.length} octets)`);
