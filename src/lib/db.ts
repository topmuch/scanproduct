import { PrismaClient } from '@prisma/client'

/**
 * Bump this constant whenever the Prisma schema gains a new model that the
 * dev server's cached PrismaClient needs to know about.
 *
 * Background: Next.js dev (Turbopack) caches the PrismaClient instance in
 * `globalThis` to avoid exhausting DB connections on HMR. But when
 * `prisma generate` runs mid-dev (e.g. after the schema gains a new model
 * like `MarketplaceInquiry`), the cached instance is stale — it doesn't have
 * the new accessor. Comparing a version string forces a clean recreate on
 * the next module evaluation.
 */
const PRISMA_CACHE_VERSION = 'v3-loyalty'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __prismaCacheVersion?: string
}

// Invalidate the cached client when the version mismatches.
if (globalForPrisma.__prismaCacheVersion !== PRISMA_CACHE_VERSION) {
  console.log("[db] Prisma cache version mismatch — recreating PrismaClient")
  globalForPrisma.prisma = undefined
  globalForPrisma.__prismaCacheVersion = PRISMA_CACHE_VERSION
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
