#!/usr/bin/env node
/**
 * fix-standalone-deps.mjs — garantit que les modules npm externalisés par
 * Turbopack existent bien dans .next/standalone/node_modules.
 *
 * POURQUOI (incident production oct. 2026) :
 *   Le build standalone (Next 16 / Turbopack + bun) BUNDLE la plupart des
 *   dépendances dans ses chunks, MAIS externalise certains paquets via
 *   `createRequire("node_modules/<pkg>/…")` — pdfkit (chargement de polices
 *   à l'exécution) et archiver (module ESM pur) notamment. Le "output file
 *   tracing" ne trace AUCUN fichier de ces paquets (nft.json vide pour
 *   pdfkit) → ils sont absents de .next/standalone/node_modules → en prod :
 *   Cannot find module 'pdfkit' / 'archiver' → HTTP 500 « Internal Server
 *   Error » sur TOUS les téléchargements (export ZIP des QR, PDF
 *   print-batch admin, PDF étiquettes). En dev tout marche (node_modules
 *   complet), d'où l'effet « ça marche en local mais pas en prod ».
 *
 * FIX : copie déterministe (idempotente) de la closure complète des
 *   paquets externalisés depuis node_modules vers le standalone, en
 *   déréférençant les hardlinks/symlinks bun. Puis smoke test : les
 *   importer DEPUIS le standalone (exactement ce que fera le serveur).
 *
 * Usage :
 *   node scripts/fix-standalone-deps.mjs          # build time (échoue si smoke KO)
 *   node scripts/fix-standalone-deps.mjs --boot   # boot conteneur (warn seulement)
 */
import { cpSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const BOOT = process.argv.includes("--boot");
const ROOT = process.cwd();

/** Paquets externalisés détectés (racines). pdfkit via createRequire dans
 *  les chunks ; archiver ESM pur non tracé. */
const ROOT_PACKAGES = ["pdfkit", "archiver"];

/** Closure transitive complète, pré-calculée depuis bun.lock (voir
 *  scripts/audit-standalone-deps.mjs pour recalculer si deps changent). */
const CLOSURE = [
  "@noble/ciphers", "@noble/hashes", "@swc/helpers", "abort-controller",
  "archiver", "async", "b4a", "balanced-match", "bare-events", "bare-fs",
  "bare-path", "bare-stream", "bare-url", "base64-js", "brace-expansion",
  "brotli", "buffer", "buffer-crc32", "clone", "compress-commons",
  "concat-map", "crc-32", "crc32-stream", "dfa", "event-target-shim",
  "events", "events-universal", "fast-deep-equal", "fast-fifo",
  "fflate", "fontkit", "ieee754", "is-stream", "lazystream", "linebreak",
  "minimatch", "normalize-path", "pako", "pdfkit", "png-js", "process",
  "readable-stream", "readdir-glob", "restructure", "safe-buffer",
  "streamx", "string_decoder", "tar-stream", "teex", "text-decoder",
  "tiny-inflate", "tslib", "unicode-properties", "unicode-trie",
  "zip-stream",
];

const STANDALONE_NM = path.join(ROOT, ".next/standalone/node_modules");
const SRC_NM = path.join(ROOT, "node_modules");

if (!existsSync(STANDALONE_NM)) {
  console.log("fix-standalone-deps: pas de sortie standalone — rien à faire");
  process.exit(0);
}

let copies = 0, deja = 0, absents = 0;
for (const pkg of CLOSURE) {
  const dst = path.join(STANDALONE_NM, pkg);
  const src = path.join(SRC_NM, pkg);
  if (!existsSync(src)) {
    // Paquet absent de node_modules : bun peut l'avoir dédoublonné
    // (version différente) — pas bloquant si le smoke passe.
    absents++;
    continue;
  }
  if (existsSync(path.join(dst, "package.json"))) {
    deja++;
    continue;
  }
  try {
    cpSync(src, dst, { recursive: true, dereference: true });
    copies++;
  } catch (e) {
    console.error(`  ✗ ${pkg}: ${e.message}`);
  }
}
console.log(
  `fix-standalone-deps: ${copies} paquets copiés, ${deja} déjà présents, ${absents} absents de node_modules (closure ${ROOT_PACKAGES.join(" + ")})`
);

// ── Smoke test : importer les racines DEPUIS le standalone ──────────
const smoke = spawnSync(
  process.execPath,
  [
    "--input-type=module",
    "-e",
    `import('pdfkit').then(()=>console.log('  pdfkit OK')).then(()=>import('archiver')).then(()=>console.log('  archiver OK'))`,
  ],
  { cwd: STANDALONE_NM, encoding: "utf8", timeout: 30000 }
);
const ok = smoke.status === 0;
if (ok) {
  console.log("fix-standalone-deps: smoke OK — pdfkit + archiver chargeables depuis le standalone");
} else {
  const msg = (smoke.stderr || smoke.stdout || "").trim().split("\n").slice(-4).join("\n  ");
  console.error(`fix-standalone-deps: SMOKE ÉCHEC — un téléchargement (ZIP/PDF) renverra 500 :\n  ${msg}`);
  if (!BOOT) process.exit(1);
  console.error("  (mode boot : le serveur démarre quand même)");
}
