# =============================================================================
# VerifScan — Coolify / Docker production image
# Next.js 16 standalone + Prisma (SQLite) + Node.js 20
# =============================================================================
# Build with:  docker build -t verifscan .
# Run with:    docker run -p 3000:3000 -e DATABASE_URL="file:./db/custom.db" verifscan
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 — deps (production dependencies only, used by the runner stage)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

# Alpine packages required by Prisma (openssl) and Node native modules
# (libc6-compat). wget is shipped with alpine for the HEALTHCHECK.
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy only manifests first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install only production dependencies (no devDeps).
# This gives us the `prisma` CLI + `@prisma/client` at runtime.
RUN npm ci --omit=dev

# -----------------------------------------------------------------------------
# Stage 2 — builder (full deps + prisma generate + next build)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./

# Full install (incl. devDependencies) needed to build the Next.js app
RUN npm ci

# Copy Prisma schema and generate the client BEFORE the build,
# so the generated @prisma/client is bundled into the standalone output.
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the source and build the standalone output
COPY . .

# Disable Next.js telemetry during the build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3 — runner (minimal runtime image)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat wget

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Create the runtime DB directory up-front so the persistent volume
# (mounted at /app/db by Coolify) is writable by the `node` user.
RUN mkdir -p /app/db \
    && chown -R node:node /app

# Production node_modules (contains `prisma` CLI used by `prisma db push`)
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# package.json is needed by `npx prisma` to resolve the local binary
COPY --chown=node:node package.json ./

# Next.js standalone server (includes server.js + a slim node_modules)
COPY --from=builder --chown=node:node /app/.next/standalone ./

# Static assets & public folder (the build script also copies these into
# standalone, but we copy them again to be explicit and resilient)
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Prisma schema (needed by `prisma db push`) and generated client
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma

# Drop root privileges
USER node

EXPOSE 3000

# Health check — Coolify reads this to know when the container is ready.
# alpine ships `wget` (no curl) so we use `wget --spider`.
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --spider -q http://localhost:3000/api/health || exit 1

# Apply the SQLite schema (idempotent) then start the standalone server.
# `prisma db push --accept-data-loss` is safe here because the DB file
# already lives on a persistent volume (see COOLIFY.md step 5).
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node server.js"]
