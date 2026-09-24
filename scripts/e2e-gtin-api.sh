#!/bin/bash
# ============================================================================
# E2E GS1 — validation GTIN sur l'API produit (auth NextAuth réelle)
# 1. Connexion fabricant (credentials)
# 2. PATCH barcode invalide  → 400 GTIN_INVALIDE
# 3. PATCH barcode valide    → 200
# 4. Restauration du GTIN d'origine
# ============================================================================
set -u
BASE="http://localhost:3000"
JAR="/tmp/gs1-cookies.txt"
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36"
EMAIL="sarine@biocosmetique.sn"
PASSWORD="Demo1234!"

# Produit avec GTIN (Huile de Baobab) + GTIN d'origine
PROD_ID="cmufxevn1000kkwx0j9jxxivv"
GTIN_ORIGINE="4006381333931"   # valide
GTIN_FAUX="4006381333932"      # check digit erroné

rm -f "$JAR"

# ── 1. Connexion NextAuth (csrf + callback credentials) ────────────────────
CSRF=$(curl -s -c "$JAR" "$BASE/api/auth/csrf" | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -c "$JAR" -X POST "$BASE/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" -A "$UA" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASSWORD" \
  --data-urlencode "json=true")
echo "connexion: HTTP $LOGIN_CODE"

# Vérifie la session
SESSION=$(curl -s -b "$JAR" "$BASE/api/auth/session")
echo "session: $(echo "$SESSION" | head -c 120)"
case "$SESSION" in *sarine*) echo "✅ authentifié" ;; *) echo "❌ échec auth"; exit 1 ;; esac

# ── 2. PATCH GTIN invalide → 400 attendu ───────────────────────────────────
R2=$(curl -s -w "\n%{http_code}" -b "$JAR" -X PATCH "$BASE/api/products/$PROD_ID" \
  -H "Content-Type: application/json" -A "$UA" \
  -d "{\"barcode\":\"$GTIN_FAUX\"}")
CODE2=$(echo "$R2" | tail -1)
BODY2=$(echo "$R2" | head -1)
echo "PATCH GTIN faux  → HTTP $CODE2 : $(echo "$BODY2" | head -c 140)"
[ "$CODE2" = "400" ] && echo "✅ 400 GTIN_INVALIDE (rejeté)" || echo "❌ attendu 400"

# ── 3. PATCH GTIN valide → 200 attendu ─────────────────────────────────────
R3=$(curl -s -w "\n%{http_code}" -b "$JAR" -X PATCH "$BASE/api/products/$PROD_ID" \
  -H "Content-Type: application/json" -A "$UA" \
  -d "{\"barcode\":\"$GTIN_ORIGINE\"}")
CODE3=$(echo "$R3" | tail -1)
echo "PATCH GTIN valide → HTTP $CODE3"
[ "$CODE3" = "200" ] && echo "✅ 200 (accepté)" || echo "❌ attendu 200"

# ── 4. Vérification DB : le GTIN est-il inchangé ? ─────────────────────────
cd /home/z/my-project/scanproduct
bun -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.product.findUnique({ where: { id: '$PROD_ID' }, select: { barcode: true } })
  .then(r => console.log('GTIN en base :', r.barcode, r.barcode === '$GTIN_ORIGINE' ? '✅ inchangé' : '❌ MODIFIÉ'))
  .finally(() => db.\$disconnect());
" 2>&1 | tail -1
rm -f "$JAR"
