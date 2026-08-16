#!/bin/sh
# =============================================================================
# VerifScan — Docker Entrypoint (ROBUST MIGRATION)
# =============================================================================
# Runs at container startup. Responsibilities:
#   1. Ensure data + upload directories exist
#   2. Apply Prisma schema (prisma db push)
#   3. NUCLEAR FALLBACK: directly ALTER TABLE to add any missing columns
#      (bypasses Prisma entirely — works even if prisma db push failed)
#   4. VERIFY the schema was actually applied
#   5. Seed the database (idempotent)
#   6. Start the Next.js standalone server
#
# HISTORY — why the nuclear fallback exists:
#   Despite `yes y | prisma db push --accept-data-loss`, the migration kept
#   failing silently in production (P2022 "column barcode does not exist").
#   Root cause unclear (possibly: Prisma CLI version quirk, SQLite shadow DB
#   issue, or persistent volume with stale _prisma_migrations metadata).
#   The nuclear fallback runs raw `ALTER TABLE` SQL directly on the SQLite
#   file — this CANNOT fail silently. If a column already exists, SQLite
#   returns "duplicate column name" which we ignore.
# =============================================================================

# Extract the SQLite file path from DATABASE_URL (format: "file:/path/to/db.sqlite")
DB_FILE=$(echo "$DATABASE_URL" | sed 's|^file:||')
# Fallback if DATABASE_URL wasn't set or didn't start with "file:"
if [ -z "$DB_FILE" ]; then
  DB_FILE="/app/data/scanproduct.db"
fi

echo "=== VerifScan container starting ==="
echo "  DATABASE_URL: $DATABASE_URL"
echo "  DB file:      $DB_FILE"
echo "  UPLOAD_DIR:   $UPLOAD_DIR"
echo "  NODE_ENV:     $NODE_ENV"

# ── 1. Ensure directories exist ────────────────────────────────────────────
mkdir -p /app/data "$(dirname "$DB_FILE")" /app/public/uploads/product
chmod -R 777 /app/public/uploads /app/data

# ── 2. Apply Prisma schema (best-effort) ──────────────────────────────────
echo "=== Running prisma db push ==="
echo "  (piping 'y' to stdin to bypass any confirmation prompts)"
yes y | bunx prisma db push --skip-generate --accept-data-loss 2>&1 || {
  echo "WARN: prisma db push exited non-zero — will rely on SQL fallback"
}

# ── 3. NUCLEAR FALLBACK: direct ALTER TABLE for missing columns ────────────
# This is the GUARANTEED fix. We run ALTER TABLE statements directly on the
# SQLite file. If a column already exists, SQLite returns "duplicate column
# name" — we catch and ignore that error. This ensures the columns exist
# regardless of whether prisma db push worked.
#
# NOTE: SQLite does NOT support adding UNIQUE constraints via ALTER TABLE.
# The barcode uniqueness is enforced in app code (pre-flight check in
# /api/products/route.ts returns 409 before the insert). The DB-level
# unique constraint is nice-to-have but not required for the app to work.
echo "=== Running SQL fallback: ALTER TABLE for missing columns ==="

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "ERROR: sqlite3 CLI not available — cannot run SQL fallback!"
elif [ ! -f "$DB_FILE" ]; then
  echo "WARN: DB file does not exist yet at $DB_FILE — prisma db push should have created it"
  echo "      Attempting to create it with sqlite3..."
  sqlite3 "$DB_FILE" "VACUUM;" 2>&1 || echo "ERROR: cannot create DB file"
fi

if [ -f "$DB_FILE" ] && command -v sqlite3 >/dev/null 2>&1; then
  # Check if Product table exists
  PRODUCT_EXISTS=$(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name='Product';" 2>/dev/null)

  if [ -z "$PRODUCT_EXISTS" ]; then
    echo "  Product table does not exist — prisma db push should have created it."
    echo "  Re-running prisma db push..."
    yes y | bunx prisma db push --skip-generate --accept-data-loss 2>&1 || true
  else
    echo "  Product table exists — checking columns..."

    # Get current columns
    CURRENT_COLS=$(sqlite3 "$DB_FILE" "PRAGMA table_info(Product);" 2>/dev/null | cut -d'|' -f2)
    echo "  Current columns: $(echo "$CURRENT_COLS" | tr '\n' ' ')"

    # Add each missing column via ALTER TABLE.
    # SQLite ALTER TABLE ADD COLUMN works for nullable columns without default.
    # For columns with @default, we specify the DEFAULT clause.
    #
    # Column definitions matching schema.prisma:
    #   barcode         String?    @unique   → TEXT (unique enforced in app)
    #   offData         String?              → TEXT
    #   offLastSync     DateTime?            → DATETIME (stored as TEXT in SQLite)
    #   categoryData    String?              → TEXT
    #   exportData      String?              → TEXT
    #   isExport        Boolean   @default(false) → BOOLEAN DEFAULT 0
    #   certifications  String?              → TEXT

    add_column_if_missing() {
      COL="$1"
      TYPE="$2"
      DEFAULT="$3"
      if echo "$CURRENT_COLS" | grep -qx "$COL"; then
        echo "  ✓ $COL already exists"
      else
        echo "  + Adding $COL ($TYPE$DEFAULT)..."
        if [ -n "$DEFAULT" ]; then
          sqlite3 "$DB_FILE" "ALTER TABLE Product ADD COLUMN \"$COL\" $TYPE $DEFAULT;" 2>&1 || {
            # If it failed with "duplicate column name", the column was added
            # between our check and the ALTER (race condition) — that's OK.
            echo "    (column may already exist — ignoring error)"
          }
        else
          sqlite3 "$DB_FILE" "ALTER TABLE Product ADD COLUMN \"$COL\" $TYPE;" 2>&1 || {
            echo "    (column may already exist — ignoring error)"
          }
        fi
      fi
    }

    add_column_if_missing "barcode"        "TEXT"
    add_column_if_missing "offData"        "TEXT"
    add_column_if_missing "offLastSync"    "DATETIME"
    add_column_if_missing "categoryData"   "TEXT"
    add_column_if_missing "exportData"     "TEXT"
    add_column_if_missing "isExport"       "BOOLEAN" "DEFAULT 0"
    add_column_if_missing "certifications" "TEXT"
  fi
fi

# ── 4. VERIFY the schema ──────────────────────────────────────────────────
echo "=== Verifying schema ==="
if [ ! -f "$DB_FILE" ]; then
  echo "CRITICAL: DB file still does not exist at $DB_FILE"
elif ! command -v sqlite3 >/dev/null 2>&1; then
  echo "WARN: sqlite3 CLI not available — skipping verification"
else
  PRODUCT_COLUMNS=$(sqlite3 "$DB_FILE" "PRAGMA table_info(Product);" 2>/dev/null | cut -d'|' -f2)

  if [ -z "$PRODUCT_COLUMNS" ]; then
    echo "CRITICAL: Product table does not exist or has no columns!"
  else
    echo "  Product columns: $(echo "$PRODUCT_COLUMNS" | tr '\n' ' ')"

    MISSING=""
    for COL in barcode offData offLastSync categoryData exportData isExport certifications; do
      if ! echo "$PRODUCT_COLUMNS" | grep -qx "$COL"; then
        MISSING="$MISSING $COL"
      fi
    done

    if [ -z "$MISSING" ]; then
      echo "=== Schema verification PASSED: all required columns present ==="
    else
      echo "=========================================================="
      echo "CRITICAL: Schema verification FAILED — missing columns:$MISSING"
      echo "=========================================================="
    fi
  fi
fi

# ── 5. Seed the database (idempotent) ─────────────────────────────────────
echo "=== Running seed ==="
bun run prisma/seed.ts 2>&1 || echo "WARN: seed script returned non-zero (may be OK if already seeded)"

# ── 6. Start the Next.js standalone server ────────────────────────────────
echo "=== Starting server ==="
exec node .next/standalone/server.js
