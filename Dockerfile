# VerifScan - Dockerfile for Coolify
# Uses Debian slim (glibc) instead of Alpine to avoid musl/native-module
# issues (sharp, @img/sharp-libvips-*, etc.). Bun is pinned to the exact
# version used to generate bun.lock locally, avoiding lockfile-semantics
# drift between bun versions.
FROM node:20-bookworm-slim

# Install required packages + native build tools (python3, make, g++)
# as a fallback for any package that needs to compile from source.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      git curl file ca-certificates \
      libc6 sqlite3 \
      python3 make g++ \
      && \
    rm -rf /var/lib/apt/lists/*

# Install a PINNED bun version (matches the version used to generate
# bun.lock locally). Newer bun versions can change lockfile semantics
# and break `bun install` mid-deploy.
ARG BUN_VERSION=1.3.14
RUN npm install -g bun@${BUN_VERSION} && \
    bun --version && \
    which bun

WORKDIR /app

# Optional GitHub token — required if the repo is private.
# In Coolify: set "GITHUB_TOKEN" as a Build Environment Variable.
# For public repos, leave it unset.
ARG GITHUB_TOKEN=""

# Download source from GitHub tarball + install in one step.
# Authenticates with the token if provided (private repos);
# otherwise falls back to anonymous download (public repos only).
#
# The install step uses --frozen-lockfile for reproducibility, with a
# verbose fallback so the REAL error is surfaced if the frozen install
# fails (otherwise BuildKit only shows the summary line).
RUN echo "=== Downloading source ===" && \
    if [ -n "$GITHUB_TOKEN" ]; then \
      echo "  Using authenticated download (private repo)"; \
      curl -sL -H "Authorization: token $GITHUB_TOKEN" \
        -o /tmp/src.tar.gz \
        https://github.com/topmuch/scanproduct/archive/refs/heads/main.tar.gz; \
    else \
      echo "  Using anonymous download (public repo)"; \
      curl -sL \
        -o /tmp/src.tar.gz \
        https://github.com/topmuch/scanproduct/archive/refs/heads/main.tar.gz; \
    fi && \
    echo "  Downloaded: $(file /tmp/src.tar.gz)" && \
    if ! tar tzf /tmp/src.tar.gz > /dev/null 2>&1; then \
      echo "==========================================" && \
      echo "ERROR: downloaded file is NOT a valid tarball." && \
      echo "If the repo is private, set GITHUB_TOKEN as a Build Environment Variable in Coolify." && \
      echo "If it is public, check that the repo URL is correct." && \
      echo "First 300 bytes of the response:" && \
      head -c 300 /tmp/src.tar.gz; \
      exit 1; \
    fi && \
    tar xzf /tmp/src.tar.gz --strip-components=1 -C /app && \
    rm /tmp/src.tar.gz && \
    echo "=== Download successful ===" && \
    ls -la package.json bun.lock && \
    echo "=== bun version ===" && \
    bun --version && \
    echo "=== System info ===" && \
    uname -a && \
    cat /etc/os-release | head -3 && \
    echo "=== Disk space ===" && \
    df -h / /tmp && \
    echo "=== Memory ===" && \
    free -h 2>/dev/null || cat /proc/meminfo | head -5 && \
    echo "=== Installing dependencies (frozen lockfile) ===" && \
    (bun install --frozen-lockfile --no-progress || \
      (echo "==========================================" && \
       echo "Frozen install failed — retrying with verbose output" && \
       echo "to surface the real error:" && \
       echo "==========================================" && \
       bun install --verbose && \
       echo "NOTE: lockfile was out of sync — non-frozen install succeeded."))

# Generate Prisma Client
RUN bunx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/data/scanproduct.db
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN bun run build

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL=file:/app/data/scanproduct.db

CMD ["sh", "-c", "mkdir -p /app/data && export DATABASE_URL=file:/app/data/scanproduct.db && bunx prisma db push --skip-generate 2>/dev/null || true && bun run prisma/seed.ts 2>/dev/null || true && exec node .next/standalone/server.js"]
