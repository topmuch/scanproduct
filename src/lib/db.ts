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
const PRISMA_CACHE_VERSION = 'v6-auto-migrate'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __prismaCacheVersion?: string
  __prismaMigrated?: boolean
}

// Invalidate the cached client when the version mismatches.
if (globalForPrisma.__prismaCacheVersion !== PRISMA_CACHE_VERSION) {
  console.log("[db] Prisma cache version mismatch — recreating PrismaClient")
  globalForPrisma.prisma = undefined
  globalForPrisma.__prismaCacheVersion = PRISMA_CACHE_VERSION
  globalForPrisma.__prismaMigrated = false
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-MIGRATION (SERVER SIDE ONLY, async via Prisma — no Node.js built-ins)
// ─────────────────────────────────────────────────────────────────────────────
// This is a NUCLEAR SAFETY NET for when `prisma db push` fails in production.
// The production DB was STILL missing the `barcode` column (P2022 error)
// despite multiple docker-entrypoint.sh fix attempts. This migration runs
// before any Prisma query can execute (async, fire-and-forget), adding
// missing columns via ALTER TABLE through Prisma's own $executeRawUnsafe.
//
// WHY NO `child_process` / `sqlite3` CLI:
//   db.ts is transitively imported by client components (via admin-server-data
//   → AdminShell.tsx). Next.js's bundler tries to include it in the client
//   bundle, where Node.js built-ins like `child_process` and `module` don't
//   exist → build fails with "module not found". Using Prisma's
//   $executeRawUnsafe avoids any Node.js built-in imports — Prisma handles
//   the DB connection internally and is already properly bundled.
//
// TRADE-OFF: async means a small race condition on the very first request
// after startup (migration may not have completed yet). This is acceptable:
// the first request might get P2022, but a refresh will work. The
// /api/products route also has a defensive P2022 handler that returns a
// clear "retry" message.
//
// GUARDS:
//   - `typeof window === 'undefined'` — skip in browser bundles
//   - `!isBuildPhase` — skip during `next build` (NEXT_PHASE = 'phase-production-build')
//
// SQLite limitation: cannot add UNIQUE constraints via ALTER TABLE.
// The barcode uniqueness is enforced in app code (pre-flight check in
// /api/products/route.ts returns 409 before the insert).
const isBuildPhase =
  typeof process !== 'undefined' &&
  process.env.NEXT_PHASE === 'phase-production-build'

const shouldMigrate =
  !globalForPrisma.__prismaMigrated &&
  typeof window === 'undefined' &&
  typeof process !== 'undefined' &&
  !isBuildPhase

if (shouldMigrate) {
  globalForPrisma.__prismaMigrated = true

  // Columns added in V3 Phase 3 that may be missing from older production DBs.
  // Format: [columnName, columnType, defaultValueClause]
  const REQUIRED_COLUMNS: Array<[string, string, string?]> = [
    ['barcode', 'TEXT', ''],
    ['offData', 'TEXT', ''],
    ['offLastSync', 'DATETIME', ''],
    ['categoryData', 'TEXT', ''],
    ['exportData', 'TEXT', ''],
    ['isExport', 'BOOLEAN', 'DEFAULT 0'],
    ['certifications', 'TEXT', ''],
  ]

  console.log('[db] Starting async schema migration (ALTER TABLE for missing columns)...')

  // Fire-and-forget: runs the migration asynchronously. Each ALTER TABLE is
  // independent — if one fails with "duplicate column name", the others
  // still execute. This is 100% idempotent and safe to run on every startup.
  ;(async () => {
    let added = 0
    let existing = 0
    let failed = 0

    for (const [colName, colType, defaultClause] of REQUIRED_COLUMNS) {
      const sql = `ALTER TABLE Product ADD COLUMN "${colName}" ${colType}${
        defaultClause ? ' ' + defaultClause : ''
      }`
      try {
        await db.$executeRawUnsafe(sql)
        console.log(`[db]   ✓ Added column: ${colName}`)
        added++
      } catch (e: unknown) {
        const msg = (e as Error)?.message || String(e)
        if (msg.includes('duplicate column') || msg.includes('already exists')) {
          // Column already exists — expected on subsequent restarts
          existing++
        } else {
          // Unexpected error (e.g. "no such table: Product") — log it but
          // don't crash. The query itself will surface a clearer error.
          console.warn(`[db]   ⚠ ${colName}: ${msg.substring(0, 120)}`)
          failed++
        }
      }
    }
    console.log(
      `[db] Migration complete — added: ${added}, already existed: ${existing}, failed: ${failed}`,
    )
  })()
}
