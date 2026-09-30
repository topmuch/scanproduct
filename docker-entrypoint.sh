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

# ── 3b. Tables du système artisanal (Batch/Pack/PreActivatedLot/ArtisanScan) ──
# Si prisma db push échoue silencieusement (historique : P2022 en prod, puis
# P2021 "The table main.Batch does not exist"), CHAQUE génération/chargement
# de batches renvoie HTTP 500. Stratégie en 3 temps :
#   1. détecter les tables manquantes
#   2. re-tenter prisma db push une fois
#   3. NUCLEAR : CREATE TABLE IF NOT EXISTS en SQL brut via sqlite3 — ne peut
#      pas échouer silencieusement (même technique que le fallback Product).
if [ -f "$DB_FILE" ] && command -v sqlite3 >/dev/null 2>&1; then
  ARTISAN_TABLES="Artisan Batch Pack PreActivatedLot ArtisanScan ArtisanReview ApiKey Webhook"
  MISSING=""
  for T in $ARTISAN_TABLES; do
    T_EXISTS=$(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name='$T';" 2>/dev/null)
    [ -z "$T_EXISTS" ] && MISSING="$MISSING $T"
  done

  if [ -n "$MISSING" ]; then
    echo "=== Tables artisanales manquantes:$MISSING — re-run de prisma db push ==="
    yes y | bunx prisma db push --skip-generate --accept-data-loss 2>&1 | tail -3 || true
  else
    echo "=== Tables artisanales OK (Batch/Pack/PreActivatedLot/ArtisanScan présentes) ==="
  fi

  # Colonnes ajoutées après coup sur des tables déjà déployées — ALTER nu.
  # (CREATE TABLE IF NOT EXISTS ne met à jour JAMAIS une table existante.)
  PACK_EXISTS=$(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name='Pack';" 2>/dev/null)
  if [ -n "$PACK_EXISTS" ]; then
    PACK_COLS=$(sqlite3 "$DB_FILE" "PRAGMA table_info(Pack);" 2>/dev/null | cut -d'|' -f2)
    for COL in artisanId artisanPhone artisanEmail instagramUrl facebookUrl tiktokUrl artisanPhotos productPrice productDesignation; do
      if ! echo "$PACK_COLS" | grep -qx "$COL"; then
        echo "  + ALTER TABLE Pack ADD COLUMN $COL (fallback nu)"
        sqlite3 "$DB_FILE" "ALTER TABLE Pack ADD COLUMN \"$COL\" TEXT;" 2>&1 | grep -v "duplicate column" || true
      fi
    done
  fi

  # Colonnes ajoutées après coup sur des tables déjà déployées — ALTER nu.
  # (CREATE TABLE IF NOT EXISTS ne met à jour JAMAIS une table existante.)
  LOT_EXISTS=$(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name='PreActivatedLot';" 2>/dev/null)
  if [ -n "$LOT_EXISTS" ]; then
    LOT_COLS=$(sqlite3 "$DB_FILE" "PRAGMA table_info(PreActivatedLot);" 2>/dev/null | cut -d'|' -f2)
    for COL in artisanBio usageTips counterfeitAlert productPrice productDesignation; do
      if ! echo "$LOT_COLS" | grep -qx "$COL"; then
        echo "  + ALTER TABLE PreActivatedLot ADD COLUMN $COL (fallback nu)"
        sqlite3 "$DB_FILE" "ALTER TABLE PreActivatedLot ADD COLUMN \"$COL\" TEXT;" 2>&1 | grep -v "duplicate column" || true
      fi
    done
  fi

  # Colonne ArtisanScan.timezone (détection contrefaçon multi-régions)
  SCAN_EXISTS=$(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name='ArtisanScan';" 2>/dev/null)
  if [ -n "$SCAN_EXISTS" ]; then
    SCAN_COLS=$(sqlite3 "$DB_FILE" "PRAGMA table_info(ArtisanScan);" 2>/dev/null | cut -d'|' -f2)
    for COL in timezone; do
      if ! echo "$SCAN_COLS" | grep -qx "$COL"; then
        echo "  + ALTER TABLE ArtisanScan ADD COLUMN $COL (fallback nu)"
        sqlite3 "$DB_FILE" "ALTER TABLE ArtisanScan ADD COLUMN \"$COL\" TEXT;" 2>&1 | grep -v "duplicate column" || true
      fi
    done
  fi

  # Nuclear fallback : DDL EXACT tel que créé par Prisma (extrait d'une DB
  # réelle via .schema). Idempotent : IF NOT EXISTS partout. Ordre respecté
  # pour les clés étrangères : Batch → Pack → PreActivatedLot → ArtisanScan.
  STILL_MISSING=""
  for T in $ARTISAN_TABLES; do
    T_EXISTS=$(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name='$T';" 2>/dev/null)
    [ -z "$T_EXISTS" ] && STILL_MISSING="$STILL_MISSING $T"
  done

  if [ -n "$STILL_MISSING" ]; then
    echo "=== NUCLEAR FALLBACK : CREATE TABLE IF NOT EXISTS (SQL brut) pour:$STILL_MISSING ==="
    sqlite3 "$DB_FILE" <<'ARTISAN_DDL'
CREATE TABLE IF NOT EXISTS "Artisan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT '0000',
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Artisan_phone_key" ON "Artisan"("phone");
CREATE INDEX IF NOT EXISTS "Artisan_phone_idx" ON "Artisan"("phone");
CREATE TABLE IF NOT EXISTS "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "totalQuantity" INTEGER NOT NULL,
    "packSize" INTEGER NOT NULL,
    "numberOfPacks" INTEGER NOT NULL,
    "printedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "Batch_status_idx" ON "Batch"("status");
CREATE TABLE IF NOT EXISTS "Pack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "packNumber" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "masterQrCode" TEXT NOT NULL,
    "soldTo" TEXT,
    "soldAt" DATETIME,
    "artisanPhone" TEXT,
    "artisanEmail" TEXT,
    "artisanId" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "tiktokUrl" TEXT,
    "artisanPhotos" TEXT,
    "productPrice" TEXT,
    "productDesignation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pack_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pack_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "Artisan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Pack_masterQrCode_key" ON "Pack"("masterQrCode");
CREATE INDEX IF NOT EXISTS "Pack_batchId_idx" ON "Pack"("batchId");
CREATE INDEX IF NOT EXISTS "Pack_status_idx" ON "Pack"("status");
CREATE INDEX IF NOT EXISTS "Pack_masterQrCode_idx" ON "Pack"("masterQrCode");
CREATE INDEX IF NOT EXISTS "Pack_artisanId_idx" ON "Pack"("artisanId");
CREATE TABLE IF NOT EXISTS "PreActivatedLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packId" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "isMaster" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "activatedAt" DATETIME,
    "productName" TEXT,
    "contenance" TEXT,
    "ingredients" TEXT,
    "manufacturingDate" DATETIME,
    "expirationDate" DATETIME,
    "artisanName" TEXT,
    "contactPhone" TEXT,
    "photoUrl" TEXT,
    "productPrice" TEXT,
    "productDesignation" TEXT,
    "artisanBio" TEXT,
    "usageTips" TEXT,
    "counterfeitAlert" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PreActivatedLot_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PreActivatedLot_qrCode_key" ON "PreActivatedLot"("qrCode");
CREATE INDEX IF NOT EXISTS "PreActivatedLot_packId_idx" ON "PreActivatedLot"("packId");
CREATE INDEX IF NOT EXISTS "PreActivatedLot_qrCode_idx" ON "PreActivatedLot"("qrCode");
CREATE INDEX IF NOT EXISTS "PreActivatedLot_status_idx" ON "PreActivatedLot"("status");
CREATE INDEX IF NOT EXISTS "PreActivatedLot_isMaster_idx" ON "PreActivatedLot"("isMaster");
CREATE TABLE IF NOT EXISTS "ArtisanScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "country" TEXT,
    "city" TEXT,
    "deviceType" TEXT,
    "timezone" TEXT,
    CONSTRAINT "ArtisanScan_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "PreActivatedLot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ArtisanScan_lotId_idx" ON "ArtisanScan"("lotId");
CREATE INDEX IF NOT EXISTS "ArtisanScan_scannedAt_idx" ON "ArtisanScan"("scannedAt");
CREATE TABLE IF NOT EXISTS "ArtisanReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtisanReview_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "PreActivatedLot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ArtisanReview_lotId_idx" ON "ArtisanReview"("lotId");
CREATE INDEX IF NOT EXISTS "ArtisanReview_createdAt_idx" ON "ArtisanReview"("createdAt");
CREATE TABLE IF NOT EXISTS "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" DATETIME,
    "lastUsedIp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME
);
CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX IF NOT EXISTS "ApiKey_active_idx" ON "ApiKey"("active");
CREATE TABLE IF NOT EXISTS "Webhook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "events" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "Webhook_active_idx" ON "Webhook"("active");
ARTISAN_DDL
    echo "  SQL fallback exécuté (exit $?)"
  fi

  # Vérification finale — doit TOUJOURS passer, sinon CRITICAL visible dans les logs.
  FINAL_MISSING=""
  for T in $ARTISAN_TABLES; do
    T_EXISTS=$(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name='$T';" 2>/dev/null)
    [ -z "$T_EXISTS" ] && FINAL_MISSING="$FINAL_MISSING $T"
  done
  if [ -n "$FINAL_MISSING" ]; then
    echo "=================================================================="
    echo "CRITICAL: tables artisanales toujours manquantes après fallback:$FINAL_MISSING"
    echo "Le chargement/génération de batches renverra HTTP 500 (P2021)."
    echo "=================================================================="
  else
    # Colonnes artisanales attendues sur les tables existantes (schéma récent)
    LOT_COLS=$(sqlite3 "$DB_FILE" "PRAGMA table_info(PreActivatedLot);" 2>/dev/null | cut -d'|' -f2)
    LOT_MISSING=""
    for COL in artisanBio usageTips counterfeitAlert productPrice productDesignation; do
      echo "$LOT_COLS" | grep -qx "$COL" || LOT_MISSING="$LOT_MISSING $COL"
    done
    if [ -n "$LOT_MISSING" ]; then
      echo "CRITICAL: colonnes PreActivatedLot manquantes après fallback:$LOT_MISSING"
      echo "La génération de batches renverra HTTP 500 (P2022 column does not exist)."
    else
      echo "  ✓ Vérification finale : tables artisanales + colonnes lot (bio/tips/alerte/prix/désignation) en place"
    fi
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

# 5b. Seed the blog (4 articles fondateurs — idempotent, upsert par slug).
#     Sans cela, une DB de production fraîche n'aurait AUCUN article :
#     la section blog de l'accueil et /blog resteraient vides.
echo "=== Running blog seed (4 articles fondateurs) ==="
bun run scripts/seed-blog.ts 2>&1 || echo "WARN: blog seed returned non-zero (may be OK if already seeded)"

# ── 5b. BACKUP QUOTIDIEN de la base (boucle de fond) ──────────────────────
# SQLite = la seule vraie donnée critique du produit. Une copie quotidienne
# (API .backup = snapshot cohérent d'une DB vivante) dans /app/data/backups
# (même volume persistant), rétention 14 jours. Le premier backup part tout
# de suite au boot, puis un toutes les 24 h. Survit au `exec node` (nohup).
BACKUP_DIR="$(dirname "$DB_FILE")/backups"
mkdir -p "$BACKUP_DIR"
echo "=== Backup initial vers $BACKUP_DIR ==="
if command -v sqlite3 >/dev/null 2>&1 && [ -f "$DB_FILE" ]; then
  sqlite3 "$DB_FILE" ".backup '$BACKUP_DIR/scanproduct-$(date +%Y%m%d-%H%M%S).db'" 2>&1 \
    || cp "$DB_FILE" "$BACKUP_DIR/scanproduct-$(date +%Y%m%d-%H%M%S).db" 2>/dev/null || true
  # Rétention : garder les 14 plus récents
  ls -1t "$BACKUP_DIR"/scanproduct-*.db 2>/dev/null | tail -n +15 | xargs rm -f 2>/dev/null || true
  ls -1t "$BACKUP_DIR"/scanproduct-*.db 2>/dev/null | head -3
fi
nohup sh -c '
  while true; do
    sleep 86400
    DB_FILE_BACKUP="$(echo "$DATABASE_URL" | sed "s|^file:||")"
    [ -z "$DB_FILE_BACKUP" ] && DB_FILE_BACKUP="/app/data/scanproduct.db"
    BKDIR="$(dirname "$DB_FILE_BACKUP")/backups"
    mkdir -p "$BKDIR"
    if command -v sqlite3 >/dev/null 2>&1 && [ -f "$DB_FILE_BACKUP" ]; then
      sqlite3 "$DB_FILE_BACKUP" ".backup '$BKDIR/scanproduct-$(date +%Y%m%d-%H%M%S).db'" \
        || cp "$DB_FILE_BACKUP" "$BKDIR/scanproduct-$(date +%Y%m%d-%H%M%S).db" 2>/dev/null
      ls -1t "$BKDIR"/scanproduct-*.db 2>/dev/null | tail -n +15 | xargs rm -f 2>/dev/null
    fi
  done
' >/dev/null 2>&1 &
echo "  Boucle backup quotidien démarrée (rétention 14)"

# ── 6. Start the Next.js standalone server ────────────────────────────────
echo "=== Starting server ==="
exec node .next/standalone/server.js
