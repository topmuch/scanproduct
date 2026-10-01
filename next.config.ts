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
