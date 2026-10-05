#!/bin/bash
# ============================================================================
# ping-google.sh — automatise l'indexation des passeports produits
# ============================================================================
# Le sitemap dynamique (src/app/sitemap.ts) liste TOUS les lots actifs.
# Ce script appelle l'endpoint sécurisé /api/seo/ping qui :
#   1. soumet les lots récents à IndexNow (canal actif : Bing, Yandex,
#      Seznam, Naver — clé servie à la racine /{clé}.txt) ;
#   2. tente les pings historiques Google/Bing (endpoints retirés par les
#      moteurs — conservés pour le rapport) ;
#   3. retourne un rapport JSON (totalUrls, lotUrls, statuts).
#
# Pour GOOGLE : le sitemap est déjà déclaré dans robots.txt et Google le
# relit à chaque crawl ; enregistrez aussi le site dans Google Search
# Console (gratuit) pour soumissions et suivi d'indexation.
#
# Usage :
#   ./scripts/ping-google.sh                          # https://verifscan.com
#   ./scripts/ping-google.sh https://verifscan.com    # explicite
#   BASE_URL=... SEO_PING_SECRET=... ./scripts/ping-google.sh
#
# Secret : SEO_PING_SECRET (ou NEXTAUTH_SECRET) côté serveur.
#          Passé via l'env ou en 2e argument.
#
# Exemple crontab (quotidien à 8h) :
#   0 8 * * * SEO_PING_SECRET="xxx" /app/scripts/ping-google.sh >> /var/log/seo-ping.log 2>&1
#
# Coolify : ajoutez une « Scheduled Task » (cron) au conteneur app pointant
# vers /app/scripts/ping-google.sh.
# ============================================================================

set -euo pipefail

BASE_URL="${1:-${BASE_URL:-https://verifscan.com}}"
SECRET="${2:-${SEO_PING_SECRET:-${NEXTAUTH_SECRET:-}}}"

if [ -z "$SECRET" ]; then
  echo "❌ Secret manquant : exportez SEO_PING_SECRET (ou NEXTAUTH_SECRET) ou passez-le en 2e argument." >&2
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ping indexation → $BASE_URL"
RESPONSE=$(curl -sS -m 40 -w "\nHTTP_STATUS:%{http_code}" \
  "$BASE_URL/api/seo/ping?secret=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$SECRET")" 2>&1) || {
  echo "❌ Requête échouée : $RESPONSE" >&2
  exit 1
}

STATUS=$(echo "$RESPONSE" | sed -n 's/^HTTP_STATUS://p')
BODY=$(echo "$RESPONSE" | sed '/^HTTP_STATUS:/d')

echo "$BODY"
if [ "$STATUS" = "200" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Ping terminé (HTTP $STATUS)"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Ping en échec (HTTP $STATUS)" >&2
  exit 1
fi
