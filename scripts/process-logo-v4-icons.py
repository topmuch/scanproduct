#!/usr/bin/env python3
# ============================================================================
# VerifScan — v4 : ICÔNES = LOGO COMPLET (bouclier + texte « VerifScan »)
#
# Demande utilisateur : « lorsqu'on scanne le QR code, l'icône qui apparaît
# avant le site doit être le LOGO » (et non le bouclier seul).
#
# Source : public/verifscan-logo.webp (720x247, fond transparent, recoloré v3)
#   → split : bouclier (gauche) + texte « VerifScan » (droite)
#   → 2 variantes carrées testées :
#       A) logo horizontal fit-contain sur fond blanc
#       B) composition empilée : bouclier en haut + texte en dessous
#   → planche comparative 256 / 64 / 48 / 32 / 16 pour choisir
# ============================================================================
from PIL import Image, ImageDraw

SRC = "public/verifscan-logo.webp"
OUT = "/tmp/icons-compare"

WHITE = (255, 255, 255, 255)


def trim(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def split_shield_text(full: Image.Image):
    """Sépare le bouclier (gauche) du texte (droite) via la 1re colonne
    entièrement transparente après 5 % de largeur."""
    w, h = full.size
    px = full.load()
    start = max(1, int(w * 0.05))
    for x in range(start, w - 1):
        if all(px[x, y][3] == 0 for y in range(h)):
            shield = trim(full.crop((0, 0, x, h)))
            text = trim(full.crop((x + 1, 0, w, h)))
            return shield, text
    return full, None  # pas de séparation trouvée


def paste_contain(canvas: Image.Image, src: Image.Image, box_w: int, box_h: int,
                  cx: int, cy: int) -> None:
    """Colle `src` en fit-contain dans une boîte box_w x box_h centrée sur (cx, cy)."""
    s = src.copy()
    s.thumbnail((box_w, box_h), Image.LANCZOS)
    canvas.paste(s, (cx - s.width // 2, cy - s.height // 2), s)


def icon_stacked(size: int, shield: Image.Image, text: Image.Image) -> Image.Image:
    """Variante B : bouclier en haut + texte en bas, fond blanc."""
    canvas = Image.new("RGBA", (size, size), WHITE)
    pad = int(size * 0.08)
    # bouclier : ~52 % de la hauteur
    sh_h = int(size * 0.52)
    paste_contain(canvas, shield, sh_h, sh_h, size // 2, pad + sh_h // 2)
    # texte : 80 % de la largeur, centré dans l'espace restant
    if text:
        y_center = pad + sh_h + (size - pad - (pad + sh_h)) // 2
        paste_contain(canvas, text, int(size * 0.80), int(size * 0.22),
                      size // 2, y_center)
    return canvas


def icon_maskable(size: int, stacked_ref: Image.Image) -> Image.Image:
    """Icône maskable Android : fond blanc pleine surface (le masque rognera
    les bords) + variante empilée réduite à 66 % (zone de sécurité)."""
    canvas = Image.new("RGBA", (size, size), WHITE)
    inner = stacked_ref.resize((int(size * 0.66), int(size * 0.66)), Image.LANCZOS)
    off = ((size - inner.width) // 2, (size - inner.height) // 2)
    canvas.paste(inner, off, inner)
    return canvas


PUBLIC = "public"


def main() -> None:
    import os
    os.makedirs(OUT, exist_ok=True)

    full = trim(Image.open(SRC).convert("RGBA"))
    print(f"Logo source: {full.size}")

    shield, text = split_shield_text(full)
    print(f"Bouclier: {shield.size}  Texte: {text.size if text else None}")

    # ------- génération finale : TOUTES les icônes = logo empilé fond blanc
    stacked = icon_stacked(512, shield, text)

    icon_stacked(256, shield, text).save(f"{PUBLIC}/icon.png")
    icon_stacked(180, shield, text).save(f"{PUBLIC}/apple-icon.png")
    icon_stacked(192, shield, text).save(f"{PUBLIC}/icon-192.png")
    icon_stacked(512, shield, text).save(f"{PUBLIC}/icon-512.png")
    icon_stacked(16, shield, text).save(f"{PUBLIC}/icon-16.png")
    icon_stacked(32, shield, text).save(f"{PUBLIC}/icon-32.png")
    icon_stacked(48, shield, text).save(f"{PUBLIC}/icon-48.png")
    icon_maskable(192, stacked).save(f"{PUBLIC}/icon-192-maskable.png")
    icon_maskable(512, stacked).save(f"{PUBLIC}/icon-512-maskable.png")
    print("→ icônes PNG régénérées (logo complet empilé, fond blanc)")

    frames = [icon_stacked(s, shield, text) for s in (16, 32, 48)]
    frames[0].save(f"{PUBLIC}/favicon.ico", format="ICO",
                   sizes=[(16, 16), (32, 32), (48, 48)], append_images=frames[1:])
    print("→ favicon.ico régénéré (16/32/48, logo complet)")

    # planche de contrôle finale
    sizes = [256, 64, 48, 32, 16]
    sheet_w = sum(s + 20 for s in sizes) + 20
    sheet = Image.new("RGBA", (sheet_w, 276), (245, 245, 244, 255))
    x = 20
    for s in sizes:
        ic = icon_stacked(s, shield, text)
        sheet.paste(ic, (x, 10), ic)
        x += s + 20
    mk = icon_maskable(256, stacked)
    sheet.paste(mk, (x, 10), mk)
    sheet.convert("RGB").save(f"{OUT}/planche-finale.png")
    print(f"→ {OUT}/planche-finale.png")


if __name__ == "__main__":
    main()
