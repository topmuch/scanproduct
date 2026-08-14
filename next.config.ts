import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  serverExternalPackages: ["@prisma/client"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai"],
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
