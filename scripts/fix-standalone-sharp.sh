#!/bin/sh
# =============================================================================
# fix-standalone-sharp.sh — copie les binaires natifs de sharp dans la sortie
# standalone de Next.js.
#
# POURQUOI (incident production oct. 2026) : le "output file tracing" de
# Next.js (build Turbopack) copie bien le paquet @img/sharp-linux-x64 (.node)
# mais OMET le gros binaire libvips (@img/sharp-libvips-linux-x64/lib/
# libvips-cpp.so.8.18.3, 18 Mo) lorsque les dépendances sont installées avec
# bun (hardlinks). Résultat en production standalone :
#   ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3: cannot open shared object file
# → TOUT rendu PNG serveur plantait en HTTP 500 : /api/qr-codes/render-badge
#   (badge « LABEL VERIFSCAN »), generate, bulk-generate, labels-pdf.
# Ce script force la copie complète des paquets natifs glibc linux-x64.
# (La variante musl n'est pas nécessaire : l'image Docker est Debian glibc.)
# =============================================================================
set -e
cd "$(dirname "$0")/.."

if [ ! -d .next/standalone/node_modules ]; then
  echo "fix-standalone-sharp: pas de sortie standalone — rien à faire"
  exit 0
fi

mkdir -p .next/standalone/node_modules/@img/sharp-libvips-linux-x64/lib
mkdir -p .next/standalone/node_modules/@img/sharp-linux-x64/lib

if [ -d node_modules/@img/sharp-libvips-linux-x64 ]; then
  cp -rL node_modules/@img/sharp-libvips-linux-x64/. \
        .next/standalone/node_modules/@img/sharp-libvips-linux-x64/
  echo "fix-standalone-sharp: sharp-libvips-linux-x64 copié (libvips-cpp.so inclus)"
else
  echo "fix-standalone-sharp: WARN paquet sharp-libvips-linux-x64 absent (autre plateforme ?)"
fi

if [ -d node_modules/@img/sharp-linux-x64 ]; then
  cp -rL node_modules/@img/sharp-linux-x64/. \
        .next/standalone/node_modules/@img/sharp-linux-x64/
  echo "fix-standalone-sharp: sharp-linux-x64 copié (sharp .node inclus)"
fi

echo "=== Contenu standalone @img/sharp-libvips-linux-x64/lib ==="
ls -la .next/standalone/node_modules/@img/sharp-libvips-linux-x64/lib/ | head -6
echo "fix-standalone-sharp: OK"
