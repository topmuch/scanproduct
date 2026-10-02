#!/bin/bash
# Captures d'écran e2e — page produit artisan WOW
set -e
cd /home/z/my-project/scanproduct

# 1. Démarre le serveur standalone (arrière-plan de CE shell)
cd .next/standalone
PORT=3100 DATABASE_URL="file:/home/z/my-project/db/custom.db" \
  NEXTAUTH_SECRET="test-local-secret-0123456789abcdef" \
  NODE_ENV=production bun server.js > /tmp/server-shot.log 2>&1 &
SERVER_PID=$!
cd /home/z/my-project/scanproduct

cleanup() { kill $SERVER_PID 2>/dev/null || true; }
trap cleanup EXIT

# 2. Attend que le serveur réponde
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:3100/api/health; then break; fi
  sleep 0.5
done
echo "serveur prêt"

URL="http://localhost:3100/a/ART-CMURJRRV-P01-0001"
OUT=/home/z/my-project/download
mkdir -p "$OUT"

# 3. Vue mobile iPhone
agent-browser set viewport 390 844
agent-browser open "$URL" > /dev/null
agent-browser wait --load networkidle > /dev/null 2>&1 || true
agent-browser wait 1200 > /dev/null

# Hero SANS photo (placeholder stylisé)
agent-browser screenshot "$OUT/wow-1-hero-sans-photo.png"
echo "✓ capture 1 (hero placeholder)"

# Clic « Découvrir » → scroll smooth vers la carte produit
agent-browser find text "Découvrir" click > /dev/null 2>&1 || true
agent-browser wait 1500 > /dev/null
agent-browser screenshot "$OUT/wow-2-carte-produit.png"
echo "✓ capture 2 (carte produit glassmorphism)"

# Scroll progressif pour déclencher les reveals + capture fraîcheur
agent-browser scroll down 900 > /dev/null
agent-browser wait 1200 > /dev/null
agent-browser screenshot "$OUT/wow-3-fraicheur-why.png"
echo "✓ capture 3 (fraîcheur + pourquoi choisir)"

# Page complète (le failsafe Reveal 2,5 s a tout rendu visible)
agent-browser wait 2600 > /dev/null
agent-browser screenshot --full "$OUT/wow-4-full-sans-photo.png"
echo "✓ capture 4 (page complète sans photo)"

# 4. Ajoute une photo produit réelle + précautions/conservation/prix/logo
bun -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.preActivatedLot.updateMany({
  where: { qrCode: 'ART-CMURJRRV-P01-0001' },
  data: {
    photoUrl: '/hero-slide-1.webp',
    productPrice: '3 500 FCFA',
    productDesignation: 'Savon artisanal au beurre de karité pur, hydratant et nourrissant',
    precautions: JSON.stringify(['Éviter le contact avec les yeux', 'Test cutané recommandé']),
    storageConditions: 'Conserver au frais, à l\\'abri du soleil',
  },
}).then(() => p.\$disconnect());
" 2>/dev/null

agent-browser reload > /dev/null
agent-browser wait --load networkidle > /dev/null 2>&1 || true
agent-browser wait 1500 > /dev/null
agent-browser screenshot "$OUT/wow-5-hero-avec-photo.png"
echo "✓ capture 5 (hero avec photo + Ken Burns)"

agent-browser wait 2600 > /dev/null
agent-browser screenshot --full "$OUT/wow-6-full-avec-photo.png"
echo "✓ capture 6 (page complète avec photo)"

agent-browser close > /dev/null 2>&1 || true
echo "terminé"
