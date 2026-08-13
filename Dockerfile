# VerifScan - Dockerfile for Coolify
FROM node:20-alpine

# Install required packages
RUN apk add --no-cache git libc6-compat sqlite curl
RUN npm install -g bun

WORKDIR /app

# Download source from GitHub tarball + install in one step
RUN curl -sL https://github.com/topmuch/scanproduct/archive/refs/heads/main.tar.gz | tar xz --strip-components=1 && \
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
