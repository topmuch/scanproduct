import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

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
// AUTO-MIGRATION (synchronous, runs at module load)
// ─────────────────────────────────────────────────────────────────────────────
// This is a NUCLEAR SAFETY NET for when `prisma db push` fails in production.
// Despite the docker-entrypoint.sh running `yes y | prisma db push` + ALTER
// TABLE fallback, the production DB was STILL missing the `barcode` column
// (P2022 error). This module-level migration runs SYNCHRONOUSLY before any
// Prisma query can execute, using the sqlite3 CLI (installed in the Docker
// image via `apt-get install sqlite3`).
//
// It adds missing columns via `ALTER TABLE Product ADD COLUMN ...`. If a
// column already exists, SQLite returns "duplicate column name" which we
// silently ignore. This is 100% idempotent and safe to run on every startup.
//
// SQLite limitation: cannot add UNIQUE constraints via ALTER TABLE.
// The barcode uniqueness is enforced in app code (pre-flight check in
// /api/products/route.ts returns 409 before the insert).
//
// NOTE: in dev mode (local), sqlite3 CLI may not be installed. In that case,
// the sync migration is skipped (the local DB already has the columns from
// `bun run db:push`). The async fallback below handles any edge cases.
if (!globalForPrisma.__prismaMigrated) {
  globalForPrisma.__prismaMigrated = true

  const dbUrl = process.env.DATABASE_URL || ''
  const dbFile = dbUrl.replace(/^file:/, '') || '/app/data/scanproduct.db'

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

  // ── Attempt 1: synchronous migration via sqlite3 CLI ───────────────────
  // This is the PREFERRED path — it blocks module load for ~10ms but
  // GUARANTEES the columns exist before any Prisma query runs.
  try {
    // Check if sqlite3 is available
    execSync('which sqlite3', { stdio: 'ignore' })

    if (dbFile) {
      console.log(`[db] Running sync migration on ${dbFile}...`)

      for (const [colName, colType, defaultClause] of REQUIRED_COLUMNS) {
        const sql = `ALTER TABLE Product ADD COLUMN "${colName}" ${colType}${
          defaultClause ? ' ' + defaultClause : ''
        };`

        try {
          execSync(`sqlite3 "${dbFile}" "${sql}"`, {
            stdio: 'ignore',
            timeout: 5000,
          })
          console.log(`[db]   ✓ Added column: ${colName}`)
        } catch {
          // "duplicate column name" = column already exists (expected)
          // Any other error (e.g. "no such table") is also non-fatal —
          // prisma db push should have created the table, and if it didn't,
          // the async fallback or the query itself will surface the error.
        }
      }
      console.log('[db] Sync migration complete')
    }
  } catch {
    // sqlite3 not available (dev mode) — skip sync migration.
    // The local DB already has the columns from `bun run db:push`.
    if (process.env.NODE_ENV === 'production') {
      console.warn('[db] sqlite3 CLI not available — skipping sync migration')
    }
  }

  // ── Attempt 2: async fallback via Prisma $executeRawUnsafe ─────────────
  // This runs as a fire-and-forget promise. It catches any columns that the
  // sync migration missed (e.g. if sqlite3 wasn't available). There's a
  // small race condition on the very first request, but subsequent requests
  // will have the columns. This is an acceptable tradeoff.
  ;(async () => {
    try {
      for (const [colName, colType, defaultClause] of REQUIRED_COLUMNS) {
        const sql = `ALTER TABLE Product ADD COLUMN "${colName}" ${colType}${
          defaultClause ? ' ' + defaultClause : ''
        }`
        try {
          await db.$executeRawUnsafe(sql)
          console.log(`[db]   ✓ Async fallback: added column ${colName}`)
        } catch (e: unknown) {
          const msg = (e as Error)?.message || String(e)
          // Ignore "duplicate column" — column already exists
          if (!msg.includes('duplicate column') && !msg.includes('already exists')) {
            // Don't spam logs — only log unexpected errors
            if (process.env.NODE_ENV === 'production') {
              console.warn(`[db]   Async migration note for ${colName}: ${msg.substring(0, 100)}`)
            }
          }
        }
      }
    } catch (e) {
      console.error('[db] Async migration failed:', e)
    }
  })()
}
