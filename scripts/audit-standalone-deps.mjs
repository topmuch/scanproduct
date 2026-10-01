#!/usr/bin/env node
/**
 * Audit du build standalone : liste les packages npm importés par le code
 * serveur (src/app, src/lib, middleware, instrumentation) qui sont ABSENTS
 * de .next/standalone/node_modules → causes de "500 Internal Server Error"
 * en prod alors que tout marche en dev.
 *
 * Usage: node scripts/audit-standalone-deps.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STANDALONE_NM = path.join(ROOT, ".next/standalone/node_modules");

// ── 1. Collecter tous les fichiers TS/JS serveur ──────────────────
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (e === "node_modules" || e === ".next") continue;
      walk(p, out);
    } else if (/\.(ts|tsx|mts|js|mjs|jsx)$/.test(e)) out.push(p);
  }
  return out;
}

const serverFiles = [
  ...walk(path.join(ROOT, "src/app")),
  ...walk(path.join(ROOT, "src/lib")),
];
if (existsSync(path.join(ROOT, "src/server"))) walk(path.join(ROOT, "src/server"), serverFiles);
for (const f of ["middleware.ts", "instrumentation.ts", "src/middleware.ts"]) {
  const p = path.join(ROOT, f);
  if (existsSync(p)) serverFiles.push(p);
}

// ── 2. Extraire les imports externes ──────────────────────────────
const external = new Set();
const importRe = /(?:import|export)\s+(?:[\s\S]*?from\s*)?["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)|import\(\s*["']([^"']+)["']\s*\)/g;
for (const file of serverFiles) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(importRe)) {
    const spec = m[1] || m[2] || m[3];
    if (!spec) continue;
    if (spec.startsWith(".") || spec.startsWith("@/")) continue; // local
    // extraire le nom de package (scope ou pas)
    const parts = spec.split("/");
    const pkg = spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
    external.add(pkg);
  }
}

// ── 3. Vérifier la présence dans le standalone ────────────────────
const pkgJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
const declared = new Set([
  ...Object.keys(pkgJson.dependencies || {}),
  ...Object.keys(pkgJson.devDependencies || {}),
]);

const missing = [];
const present = [];
for (const pkg of [...external].sort()) {
  if (!declared.has(pkg)) continue; // pas une dep du projet (alias etc.)
  const ok = existsSync(path.join(STANDALONE_NM, pkg, "package.json"));
  (ok ? present : missing).push(pkg);
}

// ── 4. Dépendances transitives des packages manquants ─────────────
function transitiveDeps(pkg, seen = new Set()) {
  const pj = path.join(ROOT, "node_modules", pkg, "package.json");
  if (!existsSync(pj) || seen.has(pkg)) return seen;
  seen.add(pkg);
  let meta;
  try {
    meta = JSON.parse(readFileSync(pj, "utf8"));
  } catch {
    return seen;
  }
  for (const d of Object.keys(meta.dependencies || {})) {
    // ignorer les deps optionnelles/binaires gérées séparément
    if (meta.optionalDependencies?.[d]) continue;
    transitiveDeps(d, seen);
  }
  return seen;
}

console.log("=== PACKAGES MANQUANTS dans .next/standalone/node_modules ===");
const fullClosure = new Set();
for (const pkg of missing) {
  const closure = transitiveDeps(pkg);
  const missingInClosure = [...closure].filter(
    (p) => !existsSync(path.join(STANDALONE_NM, p, "package.json"))
  );
  console.log(`\n✗ ${pkg} (importé par le code serveur)`);
  console.log(`  closure transitive manquante: ${missingInClosure.length} packages`);
  missingInClosure.forEach((p) => console.log(`    - ${p}`));
  missingInClosure.forEach((p) => fullClosure.add(p));
}

console.log(`\n=== Résumé ===`);
console.log(`Packages serveur présents:  ${present.length}`);
console.log(`Packages manquants (racine): ${missing.length} → ${missing.join(", ") || "—"}`);
console.log(`\nClosure totale à copier (${fullClosure.size}):`);
console.log([...fullClosure].sort().join("\n"));
