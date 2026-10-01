# VerifScan - Dockerfile for Coolify
# Uses Debian slim (glibc) instead of Alpine to avoid musl/native-module
# issues (sharp, @img/sharp-libvips-*, etc.). Bun is pinned to the exact
# version used to generate bun.lock locally, avoiding lockfile-semantics
# drift between bun versions.
#
# ── v3: SINGLE SOURCE OF TRUTH (COPY . .) ────────────────────────────────
# History: this Dockerfile used to `git clone` GitHub INSIDE the build.
# That created a SECOND source of truth: Coolify checks out commit X, but
# the image code came from whatever `git clone --branch main` fetched (or
# from a CACHED clone layer, since Docker caches RUN layers). Result: the
# container could run code NEWER than the checked-out Dockerfile (route
# present) while the deploy-verification (commit SHA) was broken — exactly
# the "commit:null + old UI in production" incident of Oct 2026.
#
# Now: the image is built from the BUILD CONTEXT (= what Coolify checked
# out) via `COPY . .`. Code and Dockerfile always come from the SAME
# commit. Docker invalidates the COPY layer automatically whenever any
# source file changes → a Redeploy can NEVER ship stale code anymore.
# The deployed commit is baked from the context's .git (100% independent
# of Coolify env injection) and reported by GET /api/health.
FROM node:20-bookworm-slim

# Install required packages + native build tools (python3, make, g++)
# as a fallback for any package that needs to compile from source.
#
# fontconfig + fonts-dejavu-core : INDISPENSABLES au rendu des SVG par
# sharp/libvips (librsvg → fontconfig). Sans police installée, tous les
# <text> des SVG (design « LABEL VERIFSCAN », libellés lot/produit des
# QR) sortent INVISIBLES en production. DejaVu Sans est la police de
# référence du module qr-badge.ts.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      git curl file ca-certificates \
      libc6 sqlite3 \
      fontconfig fonts-dejavu-core \
      python3 make g++ \
      && \
    fc-cache -f && \
    rm -rf /var/lib/apt/lists/*

# Install a PINNED bun version (matches the version used to generate
# bun.lock locally). Newer bun versions can change lockfile semantics
# and break `bun install` mid-deploy.
ARG BUN_VERSION=1.3.14
RUN npm install -g bun@${BUN_VERSION} && \
    bun --version && \
    which bun

WORKDIR /app

# SOURCE_COMMIT — Coolify may inject the deployed SHA as a build arg.
# Used as a FALLBACK only: the primary source is `git rev-parse HEAD`
# executed on the build context itself (see the bake step below).
# CACHEBUST — manual escape hatch: set it to any new value in Coolify
# build args to force a full rebuild (rarely needed now: the COPY layer
# invalidates automatically on every source change).
ARG SOURCE_COMMIT="unknown"
ARG CACHEBUST=""

# ── 1. Dependencies (cached between source changes) ──────────────────────
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --no-progress

# ── 2. Prisma client (schema cached separately) ──────────────────────────
COPY prisma ./prisma
RUN bunx prisma generate

# ── 3. Application source (= the commit Coolify checked out) ─────────────
# .git IS included in the context (not .dockerignore-d) so the bake step
# can read the exact deployed SHA. It is removed from the final image
# right after baking.
COPY . .

# ── 4. Bake the deployed commit into /app/.deploy-commit ─────────────────
# Priority: context git HEAD (the truth) → Coolify SOURCE_COMMIT → a
# build-timestamp marker so /api/health NEVER reports a silently-stale
# deploy without evidence. .git is deleted afterwards to keep the image
# lean.
RUN { git rev-parse HEAD 2>/dev/null || true; } > /tmp/.baked-sha; \
    SHA="$(cat /tmp/.baked-sha 2>/dev/null)"; \
    if [ -z "$SHA" ]; then SHA="$SOURCE_COMMIT"; fi; \
    if [ -z "$SHA" ] || [ "$SHA" = "unknown" ]; then SHA="unknown-build-$(date +%Y%m%d-%H%M%S)"; fi; \
    echo -n "$SHA" > /app/.deploy-commit && \
    echo "=== Baked deployed commit: $SHA (cachebust=${CACHEBUST:-none}) ===" && \
    rm -rf /app/.git /tmp/.baked-sha

# IMPORTANT: create the uploads AND data directories BEFORE `next build`.
# - uploads: so the build doesn't fail if it traverses public/uploads.
# - data: so Prisma can create the SQLite file if any page is evaluated
#   at build time (even with force-dynamic, Next.js may still collect
#   page data). Without this dir, Prisma errors with "directory does not
#   exist" and the build hangs at "Creating an optimized production build".
# NOTE: in production, uploaded images are served via the dedicated API
# route /api/uploads/[...path] (not as static files from public/), so
# the upload directory can live OUTSIDE public/ — it is configured via
# the UPLOAD_DIR env var (set below to /app/public/uploads/product,
# matching the Coolify persistent volume mount — singular "product").
RUN mkdir -p /app/public/uploads/product /app/data && \
    chmod -R 777 /app/public/uploads /app/data

# ── 5. Build ──────────────────────────────────────────────────────────────
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/data/scanproduct.db
ENV NODE_OPTIONS="--max-old-space-size=4096"
# next.config.ts reads /app/.deploy-commit at build time and inlines it
# as NEXT_PUBLIC_DEPLOY_COMMIT into the client AND server bundles — the
# commit reported by /api/health survives even if the file is missing at
# runtime.
RUN bun run build

# The .deploy-commit is ALSO copied next to the standalone server as a
# belt-and-suspenders fallback (the health route reads both paths).
RUN cp /app/.deploy-commit /app/.next/standalone/.deploy-commit 2>/dev/null || true

# The entrypoint script (docker-entrypoint.sh) comes from the build
# context (it's committed to the GitHub repo). Just ensure it's
# executable — git doesn't always preserve the executable bit across
# platforms / tarball extraction.
#
# This script:
#   1. Runs `prisma db push` with `yes y |` piped to stdin to bypass
#      confirmation prompts that `--accept-data-loss` doesn't always
#      suppress (e.g. adding a UNIQUE constraint).
#   2. VERIFIES the schema was applied by querying PRAGMA table_info
#      for required columns (barcode, offData, etc.). This catches the
#      silent-failure case where Prisma exits 0 without applying.
#   3. Seeds the database (idempotent).
#   4. Starts the Next.js standalone server.
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL=file:/app/data/scanproduct.db
# Upload directory — matches the Coolify persistent volume mount
# (singular "product"). The /api/uploads/[...path] route serves files
# from here. This MUST match the destination path configured in Coolify:
#   /app/public/uploads/product
ENV UPLOAD_DIR=/app/public/uploads/product

CMD ["/app/docker-entrypoint.sh"]
