#!/usr/bin/env python3
# ============================================================================
# VerifScan — Image Open Graph 1200×630 (partages Facebook/WhatsApp/LinkedIn).
# Fond dégradé clair → logo couleur centré → badge + accroche + sous-titre.
# ============================================================================
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1200, 630
PUBLIC = "public"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

NAVY = (2, 33, 80)        # #022150
GREEN = (16, 185, 129)    # #10B981
GRAY = (75, 85, 99)       # #4B5563

# ---------------------------------------------------------------- fond dégradé
base = Image.new("RGB", (W, H), (255, 255, 255))
top, bottom = (255, 255, 255), (232, 238, 247)  # blanc → #E8EEF7
px = base.load()
for y in range(H):
    t = y / (H - 1)
    r = int(top[0] + (bottom[0] - top[0]) * t)
    g = int(top[1] + (bottom[1] - top[1]) * t)
    b = int(top[2] + (bottom[2] - top[2]) * t)
    for x in range(W):
        px[x, y] = (r, g, b)

# orbes décoratifs (navy / green très doux)
for cx, cy, rad, col in ((110, 540, 260, (2, 33, 80, 26)), (1120, 80, 300, (16, 185, 129, 24))):
    orb = Image.new("RGBA", (rad * 2, rad * 2), (0, 0, 0, 0))
    od = ImageDraw.Draw(orb)
    od.ellipse((0, 0, rad * 2, rad * 2), fill=col)
    orb = orb.filter(ImageFilter.GaussianBlur(60))
    base_rgba = base.convert("RGBA")
    base_rgba.alpha_composite(orb, (cx - rad, cy - rad))
    base = base_rgba

draw = ImageDraw.Draw(base)

# ------------------------------------------------------------------ badge vert
badge_txt = "PASSEPORT NUMÉRIQUE PRODUIT"
font_badge = ImageFont.truetype(FONT_BOLD, 22)
tw = draw.textlength(badge_txt, font=font_badge)
bx, by = (W - tw) / 2 - 28, 78
draw.rounded_rectangle((bx, by, bx + tw + 56, by + 46), radius=23, fill=(236, 253, 245), outline=GREEN, width=2)
draw.text(((W - tw) / 2, by + 10), badge_txt, font=font_badge, fill=(5, 130, 87))

# ------------------------------------------------- logo (complet, transparent)
logo = Image.open(f"{PUBLIC}/verifscan-logo.webp").convert("RGBA")
lw = 640
lh = int(logo.height * lw / logo.width)
logo = logo.resize((lw, lh), Image.LANCZOS)
base.alpha_composite(logo, ((W - lw) // 2, 170))

# -------------------------------------------------------------------- accroche
tag = "La vérité au bout du scan"
font_tag = ImageFont.truetype(FONT_BOLD, 44)
tw = draw.textlength(tag, font=font_tag)
draw.text(((W - tw) / 2, 452), tag, font=font_tag, fill=NAVY)

sub = "Traçabilité alimentaire & cosmétique · Anti-contrefaçon · QR code authentique"
font_sub = ImageFont.truetype(FONT_REG, 25)
tw = draw.textlength(sub, font=font_sub)
draw.text(((W - tw) / 2, 520), sub, font=font_sub, fill=GRAY)

# --------------------------------------------------------- barre dégradée bas
bar = Image.new("RGB", (W, 10))
bpx = bar.load()
for x in range(W):
    t = x / (W - 1)
    bpx[x, 0] = (int(NAVY[0] + (GREEN[0] - NAVY[0]) * t),
                 int(NAVY[1] + (GREEN[1] - NAVY[1]) * t),
                 int(NAVY[2] + (GREEN[2] - NAVY[2]) * t))
for y in range(10):
    for x in range(W):
        px[x, H - 10 + y] = bpx[x, 0]

base.save(f"{PUBLIC}/og-image.png", "PNG", optimize=True)
print(f"→ {PUBLIC}/og-image.png {base.size}")
