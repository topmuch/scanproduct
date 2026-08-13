# VerifScan - Dockerfile for Coolify
FROM node:20-alpine

# Install required packages
RUN apk add --no-cache git libc6-compat sqlite curl file
RUN npm install -g bun

WORKDIR /app

# Optional GitHub token — required if the repo is private.
# In Coolify: set "GITHUB_TOKEN" as a Build Environment Variable.
# For public repos, leave it unset.
ARG GITHUB_TOKEN=""

# Download source from GitHub tarball + install in one step.
# Authenticates with the token if provided (private repos);
# otherwise falls back to anonymous download (public repos only).
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
    ls -la package.json && \
    echo "=== Installing dependencies ===" && \
    bun install

# Generate Prisma Client
RUN npx prisma generate

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

CMD ["sh", "-c", "mkdir -p /app/data && export DATABASE_URL=file:/app/data/scanproduct.db && npx prisma db push --skip-generate 2>/dev/null || true && bun run prisma/seed.ts 2>/dev/null || true && exec node .next/standalone/server.js"]
