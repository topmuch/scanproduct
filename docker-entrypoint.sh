#!/bin/sh
# =============================================================================
# VerifScan — Docker Entrypoint
# =============================================================================
# Runs at container startup. Responsibilities:
#   1. Ensure data + upload directories exist (in case a fresh volume was mounted)
#   2. Apply Prisma schema to the database (prisma db push)
#   3. VERIFY the schema was actually applied (checks for `barcode` column)
#   4. Seed the database (idempotent — won't duplicate data)
#   5. Start the Next.js standalone server
#
# HISTORY — why this script exists:
#   The previous inline CMD had `bunx prisma db push --skip-generate --accept-data-loss 2>&1 || echo WARN`.
#   In production, `prisma db push` showed the data-loss warning, then PROMPTED
#   for confirmation ("Do you want to apply this change? (y/N)"). Despite
#   `--accept-data-loss`, the prompt appeared (likely because adding a UNIQUE
#   constraint is treated as a special case in some Prisma versions). Since
#   Docker runs non-interactively (stdin = EOF), Prisma read EOF, treated it
#   as "no", and EXITED 0 WITHOUT applying the migration. The `|| echo WARN`
#   didn't fire (exit code was 0), so the container started with a STALE
#   schema. Every `db.product.create` including the `barcode` column then
#   threw P2022 ("column does not exist") → HTTP 500.
#
#   FIX: pipe `yes y` into stdin so Prisma always gets "y" for any prompt,
#   then VERIFY the schema was applied by querying PRAGMA table_info using
#   the sqlite3 CLI (installed in the Docker image).
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

# ── 2. Apply Prisma schema ────────────────────────────────────────────────
# CRITICAL: `yes y |` pipes an infinite stream of "y" lines into Prisma's
# stdin. This bypasses ANY confirmation prompt (even ones that
# --accept-data-loss doesn't suppress, like adding a UNIQUE constraint).
# Without this, Prisma reads EOF on stdin in non-interactive Docker and
# silently exits 0 WITHOUT applying the migration.
echo "=== Running prisma db push ==="
echo "  (piping 'y' to stdin to bypass any confirmation prompts)"
if yes y | bunx prisma db push --skip-generate --accept-data-loss 2>&1; then
  echo "=== prisma db push completed (exit 0) ==="
else
  PUSH_EXIT=$?
  echo "=========================================================="
  echo "ERROR: prisma db push exited with code $PUSH_EXIT"
  echo "The database schema may be incomplete. The server will still"
  echo "start, but queries touching missing columns will fail (P2022)."
  echo "=========================================================="
fi

# ── 3. VERIFY the schema was actually applied ─────────────────────────────
# We check that the `barcode` column exists on the Product table using
# SQLite's PRAGMA table_info via the sqlite3 CLI. This catches the
# silent-failure case where `prisma db push` exited 0 but didn't apply.
echo "=== Verifying schema: checking Product table columns ==="
if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "WARN: sqlite3 CLI not available — skipping schema verification"
else
  if [ ! -f "$DB_FILE" ]; then
    echo "CRITICAL: database file does not exist at $DB_FILE"
    echo "  prisma db push may have failed to create it."
  else
    # Extract all column names from the Product table
    PRODUCT_COLUMNS=$(sqlite3 "$DB_FILE" "PRAGMA table_info(Product);" 2>/dev/null | cut -d'|' -f2)

    if [ -z "$PRODUCT_COLUMNS" ]; then
      echo "CRITICAL: Product table does not exist or has no columns!"
      echo "  The migration did not run. The app will not work correctly."
    else
      echo "  Product table columns: $(echo "$PRODUCT_COLUMNS" | tr '\n' ' ')"

      # Check for required columns (added in V3 Phase 3)
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
        echo "CRITICAL: Schema verification FAILED — missing columns:"
        echo "$MISSING"
        echo ""
        echo "The migration did not apply these columns. This usually"
        echo "means prisma db push prompted for confirmation and got EOF"
        echo "on stdin (non-interactive Docker). Check the migration"
        echo "output above for the prompt."
        echo "=========================================================="
      fi
    fi
  fi
fi

# ── 4. Seed the database (idempotent) ─────────────────────────────────────
echo "=== Running seed ==="
bun run prisma/seed.ts 2>&1 || echo "WARN: seed script returned non-zero (may be OK if already seeded)"

# ── 5. Start the Next.js standalone server ────────────────────────────────
echo "=== Starting server ==="
exec node .next/standalone/server.js
