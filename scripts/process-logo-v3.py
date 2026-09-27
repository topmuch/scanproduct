#!/usr/bin/env python3
# ============================================================================
# VerifScan — v3 : HARMONISATION DES COULEURS du logo avec la palette du site
#
#   Site : bleu primaire #2563EB (liens, CTAs) + vert emerald #10B981
#   Logo actuel : bleu marine #02214F (bouclier + texte) + coche #17A05F
#
#   → marine  → #2563EB (ancre = mode de luminance ; ombres → #1E40AF,
#               hautes lumières → #60A5FA, shading 3D préservé)
#   → coche   → #10B981 exact (hautes lumières → #34D399)
#   → QR noir / gris neutre : conservé (scanabilité)
#
# Pipeline : recolor sur l'original → flood-fill bords → trim → split
# bouclier → webp + icons + favicon + masters. Cache-buster à bump ?v=4.
# ============================================================================
from PIL import Image
from collections import deque, Counter
import os

SRC = "logoverifiscan.png"
PUBLIC = "public"
BRAND = "public/brand"

BLUE_DARK = (30, 64, 175)      # #1E40AF (blue-800) — ombres
BLUE_MAIN = (37, 99, 235)      # #2563EB (blue-600) — couleur du site
BLUE_LIGHT = (96, 165, 250)    # #60A5FA (blue-400) — reflets
GREEN_MAIN = (16, 185, 129)    # #10B981 (emerald-500) — couleur du site
GREEN_LIGHT = (52, 211, 153)   # #34D399 (emerald-400) — reflets

# ----------------------------------------------------------------- utilitaires
def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))

def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]

# ------------------------------------------------------------------- recolor
def recolor(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    # 1) collecte des luminances par famille
    blues, greens = [], []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            if r > 235 and g > 235 and b > 235:
                continue  # blancs (fond, quiet zone, carré) — intacts
            if g > b + 15 and g > r + 15:
                greens.append(lum((r, g, b)))
            elif b > g + 15 and b > r + 15:
                blues.append(lum((r, g, b)))

    if not blues:
        raise SystemExit("Aucun pixel bleu détecté !")

    def anchor(lums):
        """Mode de la distribution de luminance (pas de 4) = couleur 'corps'."""
        hist = Counter(int(l // 4) * 4 for l in lums)
        mode = max(hist.items(), key=lambda kv: kv[1])[0]
        return mode + 2.0

    b_anchor = anchor(blues)
    g_anchor = anchor(greens) if greens else None
    b_min, b_max = min(blues), max(blues)
    print(f"bleus: L∈[{b_min:.0f},{b_max:.0f}] ancre={b_anchor:.0f} ({len(blues)} px)")
    if greens:
        print(f"verts: L∈[{min(greens):.0f},{max(greens):.0f}] ancre={g_anchor:.0f} ({len(greens)} px)")

    # 2) remapping
    n_blue = n_green = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            if r > 235 and g > 235 and b > 235:
                continue
            if g > b + 15 and g > r + 15:
                # coche verte → emerald du site
                if g_anchor and g_anchor > min(greens):
                    t = max(0.0, (lum((r, g, b)) - g_anchor) /
                            max(1e-6, max(greens) - g_anchor))
                else:
                    t = 0.0
                px[x, y] = (*lerp(GREEN_MAIN, GREEN_LIGHT, t), a)
                n_green += 1
            elif b > g + 15 and b > r + 15:
                L = lum((r, g, b))
                if L <= b_anchor:
                    t = 0 if b_anchor <= b_min else (L - b_min) / max(1e-6, b_anchor - b_min)
                    px[x, y] = (*lerp(BLUE_DARK, BLUE_MAIN, t), a)
                else:
                    t = (L - b_anchor) / max(1e-6, b_max - b_anchor)
                    px[x, y] = (*lerp(BLUE_MAIN, BLUE_LIGHT, t), a)
                n_blue += 1
    print(f"recolor: {n_blue} px bleus → #2563EB, {n_green} px verts → #10B981")
    return img

# ------------------------------------------------------- flood fill (v2)
def make_transparent_from_edges(img: Image.Image, thresh: int = 240) -> Image.Image:
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
    w, h = img.size
    px = img.load()
    start = max(1, int(w * 0.05))
    for x in range(start, w - 1):
        if all(px[x, y][3] == 0 for y in range(h)):
            if x + 1 < w and all(px[x + 1, y][3] == 0 for y in range(h)):
                return trim(img.crop((0, 0, x, h)))
    return img

def paste_contain(icon_src: Image.Image, size: int, ratio: float = 1.0) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * ratio)
    s = icon_src.copy()
    s.thumbnail((inner, inner), Image.LANCZOS)
    off = ((size - s.width) // 2, (size - s.height) // 2)
    canvas.paste(s, off, s)
    return canvas

# ---------------------------------------------------------------------- main
def main() -> None:
    src = Image.open(SRC)
    print(f"Source: {src.size} {src.mode}")

    recolored = recolor(src)

    full = trim(make_transparent_from_edges(recolored))
    print(f"Logo complet détouré: {full.size}")

    shield = split_shield(full)
    print(f"Bouclier: {shield.size}")

    os.makedirs(BRAND, exist_ok=True)

    full.save(f"{PUBLIC}/verifscan-logo.webp", "WEBP", quality=92)
    print("→ verifscan-logo.webp", full.size)

    paste_contain(shield, 256, ratio=0.92).save(f"{PUBLIC}/icon.png")
    paste_contain(shield, 180, ratio=0.92).save(f"{PUBLIC}/apple-icon.png")
    paste_contain(shield, 192, ratio=0.92).save(f"{PUBLIC}/icon-192.png")
    paste_contain(shield, 512, ratio=0.92).save(f"{PUBLIC}/icon-512.png")
    paste_contain(shield, 16, ratio=0.95).save(f"{PUBLIC}/icon-16.png")
    paste_contain(shield, 32, ratio=0.95).save(f"{PUBLIC}/icon-32.png")
    paste_contain(shield, 48, ratio=0.95).save(f"{PUBLIC}/icon-48.png")
    paste_contain(shield, 192, ratio=0.62).save(f"{PUBLIC}/icon-192-maskable.png")
    paste_contain(shield, 512, ratio=0.62).save(f"{PUBLIC}/icon-512-maskable.png")

    frames = [paste_contain(shield, s, ratio=0.95) for s in (16, 32, 48)]
    frames[0].save(f"{PUBLIC}/favicon.ico", format="ICO",
                   sizes=[(16, 16), (32, 32), (48, 48)], append_images=frames[1:])

    # masters : version harmonisée = référence ; marine d'origine conservée
    recolored.save(f"{BRAND}/logoverifiscan-master.png")
    src.convert("RGBA").save(f"{BRAND}/logoverifiscan-master-original-navy.png")
    print("→ icônes + favicon + masters OK")

if __name__ == "__main__":
    main()
