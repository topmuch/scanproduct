import type { NextConfig } from "next";
import * as fs from "node:fs";

/**
 * Read the deployed commit baked by the Dockerfile (v3) into
 * /app/.deploy-commit BEFORE `next build` runs. Whatever value is found
 * here gets inlined by Next.js as NEXT_PUBLIC_DEPLOY_COMMIT into BOTH the
 * client and the server bundles — so GET /api/health can report the exact
 * deployed commit even if the file disappears at runtime (volume mounts,
 * standalone restructuring, etc.). This is what finally kills the
 * "commit:null + stale code in production" class of incidents: a simple
 * `curl /api/health` proves what is running.
 *
 * Local dev: no .deploy-commit file → falls back to SOURCE_COMMIT env
 * (Coolify build arg) → null. Harmless.
 */
function readBakedDeployCommit(): string | null {
  try {
    const raw = fs.readFileSync(".deploy-commit", "utf8").trim();
    return raw && raw !== "unknown" ? raw : null;
  } catch {
    return null;
  }
}

const bakedDeployCommit: string | null =
  readBakedDeployCommit() ||
  (process.env.SOURCE_COMMIT &&
  process.env.SOURCE_COMMIT.trim() &&
  process.env.SOURCE_COMMIT.trim() !== "unknown"
    ? process.env.SOURCE_COMMIT.trim()
    : null);

const nextConfig: NextConfig = {
  output: "standalone",
  // ── Modules externalisés par Turbopack (output: standalone) ────────
  // pdfkit (polices à l'exécution) et archiver (ESM pur) NE SONT PAS
  // tracés par le output file tracing (nft.json vide) → absents du
  // standalone → HTTP 500 sur les téléchargements (export ZIP, PDF).
  // Ce défaut force leur inclusion ; le filet de sécurité complet est
  // assuré par scripts/fix-standalone-deps.mjs (build + docker-entrypoint).
  outputFileTracingIncludes: {
    "/api/**": [
      "./node_modules/pdfkit/**/*",
      "./node_modules/archiver/**/*",
      "./node_modules/@noble/ciphers/**/*",
      "./node_modules/@noble/hashes/**/*",
      "./node_modules/@swc/helpers/**/*",
      "./node_modules/abort-controller/**/*",
      "./node_modules/async/**/*",
      "./node_modules/b4a/**/*",
      "./node_modules/balanced-match/**/*",
      "./node_modules/bare-events/**/*",
      "./node_modules/bare-fs/**/*",
      "./node_modules/bare-path/**/*",
      "./node_modules/bare-stream/**/*",
      "./node_modules/bare-url/**/*",
      "./node_modules/base64-js/**/*",
      "./node_modules/brace-expansion/**/*",
      "./node_modules/brotli/**/*",
      "./node_modules/buffer/**/*",
      "./node_modules/buffer-crc32/**/*",
      "./node_modules/clone/**/*",
      "./node_modules/compress-commons/**/*",
      "./node_modules/concat-map/**/*",
      "./node_modules/crc-32/**/*",
      "./node_modules/crc32-stream/**/*",
      "./node_modules/dfa/**/*",
      "./node_modules/event-target-shim/**/*",
      "./node_modules/events/**/*",
      "./node_modules/events-universal/**/*",
      "./node_modules/fast-deep-equal/**/*",
      "./node_modules/fast-fifo/**/*",
      "./node_modules/fflate/**/*",
      "./node_modules/fontkit/**/*",
      "./node_modules/ieee754/**/*",
      "./node_modules/is-stream/**/*",
      "./node_modules/lazystream/**/*",
      "./node_modules/linebreak/**/*",
      "./node_modules/minimatch/**/*",
      "./node_modules/normalize-path/**/*",
      "./node_modules/pako/**/*",
      "./node_modules/png-js/**/*",
      "./node_modules/process/**/*",
      "./node_modules/readable-stream/**/*",
      "./node_modules/readdir-glob/**/*",
      "./node_modules/restructure/**/*",
      "./node_modules/safe-buffer/**/*",
      "./node_modules/streamx/**/*",
      "./node_modules/string_decoder/**/*",
      "./node_modules/tar-stream/**/*",
      "./node_modules/teex/**/*",
      "./node_modules/text-decoder/**/*",
      "./node_modules/tiny-inflate/**/*",
      "./node_modules/tslib/**/*",
      "./node_modules/unicode-properties/**/*",
      "./node_modules/unicode-trie/**/*",
      "./node_modules/zip-stream/**/*",
    ],
  },
  // Inline the deployed commit at build time (client + server bundles).
  env: bakedDeployCommit
    ? { NEXT_PUBLIC_DEPLOY_COMMIT: bakedDeployCommit }
    : {},
  /* config options here */
  serverExternalPackages: ["@prisma/client"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai", "localhost", "127.0.0.1"],
  images: {
    // IMPORTANT (Coolify / Docker / self-hosted):
    // Disable Next.js Image Optimization in production. Locally-uploaded
    // images (saved to /public/uploads/* by /api/upload) are served as
    // plain static files. With the optimizer ON, Next.js tries to fetch
    // and re-encode them through /_next/image, which can 404 or 500 on
    // self-hosted setups where the sharp binary or the image cache dir
    // isn't writable. Disabling optimization means <img src="/uploads/...">
    // works directly — matching what ImageUploadWithPreview & ProductImage
    // already do (they use plain <img>, not next/image, but this also
    // protects any future next/image usage).
    unoptimized: process.env.NODE_ENV === "production",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
