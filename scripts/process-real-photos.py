#!/usr/bin/env python3
# ============================================================================
# VerifScan — Remplacement des illustrations générées par de VRAIES photos
# (sélectionnées via image-search) : recadrage au ratio cible des cartes,
# conversion WebP optimisée.
#   Steps (HowItWorks)   : 4:3 → 1200×900
#   Features (Features)  : 16:10 → 1280×800
# ============================================================================
from PIL import Image
import os

SRC = "/home/z/my-project/imgsearch/cand"
OUT = "/home/z/my-project/scanproduct/public/features"

# (source, destination, largeur, hauteur)
JOBS = [
    # 3 étapes — 4:3
    ("d1-pack.jpg",       "step-create-product.webp", 1200, 900),
    ("e2-clothing.jpg",   "step-generate-qr.webp",    1200, 900),
    ("c1-warehouse.jpg",  "step-share-track.webp",    1200, 900),
    # 3 fonctionnalités — 16:10
    ("d3-factory.jpg",    "feature-tracabilite.webp", 1280, 800),
    ("c5-port.jpg",       "feature-export.webp",      1280, 800),
    ("c6-dash.png",       "feature-statistiques.webp", 1280, 800),
]

def crop_to_ratio(im: Image.Image, tw: int, th: int) -> Image.Image:
    """Recadre centré au ratio tw/th puis redimensionne."""
    target = tw / th
    w, h = im.size
    cur = w / h
    if cur > target:  # trop large → rogner les côtés
        nw = int(h * target)
        x = (w - nw) // 2
        im = im.crop((x, 0, x + nw, h))
    else:             # trop haut → rogner haut/bas
        nh = int(w / target)
        y = (h - nh) // 2
        im = im.crop((0, y, w, y + nh))
    return im.resize((tw, th), Image.LANCZOS)

for src, dst, tw, th in JOBS:
    im = Image.open(os.path.join(SRC, src))
    # EXIF orientation → pixels droits
    try:
        from PIL import ImageOps
        im = ImageOps.exif_transpose(im)
    except Exception:
        pass
    im = im.convert("RGB")
    im = crop_to_ratio(im, tw, th)
    path = os.path.join(OUT, dst)
    im.save(path, "WEBP", quality=84, method=6)
    print(f"→ {dst}  {im.size}  {os.path.getsize(path)//1024} Ko")
