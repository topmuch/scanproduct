#!/usr/bin/env python3
# ============================================================================
# VerifScan — Traitement du nouveau logo logoverifiscan.png (759×269, fond
# blanc opaque) → toutes les déclinaisons du site.
#
# Étapes :
#   1. Flood-fill depuis les bords : pixels blancs connectés au bord → alpha 0
#      (préserve les blancs INTÉRIEURS : quiet zone du QR, carré du bouclier)
#   2. Trim sur la bounding box du contenu
#   3. Split bouclier / wordmark au 1er gap vertical transparent
#   4. Génération : verifscan-logo.webp (complet), icon.png 256, apple-icon
#      180, icon-16/32/48/192/512, versions maskable (safe-zone 62%),
#      favicon.ico 16+32+48
#   5. Archivage du master → public/brand/logoverifiscan-master.png
# ============================================================================
from PIL import Image
from collections import deque
import os

SRC = "logoverifiscan.png"
PUBLIC = "public"
BRAND = "public/brand"

# ---------------------------------------------------------------- flood fill
def make_transparent_from_edges(img: Image.Image, thresh: int = 240) -> Image.Image:
    """Blanchâtre + connecté aux bords → transparent. Le blanc intérieur reste."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    def is_whiteish(p) -> bool:
        r, g, b, a = p
        return a > 0 and r >= thresh and g >= thresh and b >= thresh

    visited = bytearray(w * h)
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            if is_whiteish(px[x, y]) and not visited[y * w + x]:
                visited[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_whiteish(px[x, y]) and not visited[y * w + x]:
                visited[y * w + x] = 1
                q.append((x, y))

    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx]:
                if is_whiteish(px[nx, ny]):
                    visited[ny * w + nx] = 1
                    q.append((nx, ny))
    return img

def trim(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img

def split_shield(img: Image.Image) -> Image.Image:
    """Coupe au premier gap vertical entièrement transparent (après 5% de la
    largeur pour éviter un gap dans le bouclier lui-même)."""
    w, h = img.size
    px = img.load()
    start = max(1, int(w * 0.05))
    for x in range(start, w - 1):
        if all(px[x, y][3] == 0 for y in range(h)):
            # gap confirmé sur 2 colonnes consécutives
            if x + 1 < w and all(px[x + 1, y][3] == 0 for y in range(h)):
                return trim(img.crop((0, 0, x, h)))
    return img

def paste_contain(icon_src: Image.Image, size: int, ratio: float = 1.0) -> Image.Image:
    """Bouclier centré sur canvas size×size (ratio = fraction occupée)."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * ratio)
    s = icon_src.copy()
    s.thumbnail((inner, inner), Image.LANCZOS)
    off = ((size - s.width) // 2, (size - s.height) // 2)
    canvas.paste(s, off, s)
    return canvas

def main() -> None:
    src = Image.open(SRC)
    print(f"Source: {src.size} {src.mode}")

    # 1-2) détourage + trim
    full = trim(make_transparent_from_edges(src))
    print(f"Logo complet détouré: {full.size}")

    # 3) bouclier seul (pour les icônes)
    shield = split_shield(full)
    print(f"Bouclier: {shield.size}")

    os.makedirs(BRAND, exist_ok=True)

    # 4) déclinaisons
    full.save(f"{PUBLIC}/verifscan-logo.webp", "WEBP", quality=92)
    print("→ verifscan-logo.webp", full.size)

    paste_contain(shield, 256, ratio=0.92).save(f"{PUBLIC}/icon.png")
    paste_contain(shield, 180, ratio=0.92).save(f"{PUBLIC}/apple-icon.png")
    paste_contain(shield, 192, ratio=0.92).save(f"{PUBLIC}/icon-192.png")
    paste_contain(shield, 512, ratio=0.92).save(f"{PUBLIC}/icon-512.png")
    paste_contain(shield, 16, ratio=0.95).save(f"{PUBLIC}/icon-16.png")
    paste_contain(shield, 32, ratio=0.95).save(f"{PUBLIC}/icon-32.png")
    paste_contain(shield, 48, ratio=0.95).save(f"{PUBLIC}/icon-48.png")

    # maskable : safe zone 62% (Android masque jusqu'à 38% des coins)
    paste_contain(shield, 192, ratio=0.62).save(f"{PUBLIC}/icon-192-maskable.png")
    paste_contain(shield, 512, ratio=0.62).save(f"{PUBLIC}/icon-512-maskable.png")

    # favicon.ico (16 + 32 + 48)
    frames = [paste_contain(shield, s, ratio=0.95) for s in (16, 32, 48)]
    frames[0].save(f"{PUBLIC}/favicon.ico", format="ICO",
                   sizes=[(16, 16), (32, 32), (48, 48)], append_images=frames[1:])

    # 5) master archivé
    src.convert("RGBA").save(f"{BRAND}/logoverifiscan-master.png")
    print("→ icônes + favicon + master OK")

if __name__ == "__main__":
    main()
