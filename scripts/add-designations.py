#!/usr/bin/env python3
"""Insère `designation: "..."` après la ligne `category:` de chaque template
de src/lib/product-templates.ts (les 24 templates existants)."""

import re

PATH = "/home/z/my-project/scanproduct/src/lib/product-templates.ts"

DESIGNATIONS = {
    # ── Cosmétiques (14) ──
    "savon-solide-saponification-a-froid":
        "Savon artisanal saponifié à froid, 100 % naturel, mûri plusieurs semaines",
    "savon-liquide":
        "Savon liquide artisanal, doux pour la peau, préparé à la main",
    "gommage-corporel-sec":
        "Gommage corporel sec 100 % naturel, exfoliant à base de sucre et d'huiles",
    "gommage-corporel-humide":
        "Gommage corporel humide frais, sans conservateur, préparé à la main",
    "gel-douche":
        "Gel douche artisanal doux, nettoyant naturel pour un usage quotidien",
    "lait-corporel":
        "Lait corporel hydratant artisanal, pénètre vite et nourrit la peau",
    "creme-visage":
        "Crème visage nourrissante artisanale, pour une peau douce et protégée",
    "beurre-karite-pur":
        "Beurre de karité brut 100 % pur, non raffiné, préparé à la main",
    "huile-massage":
        "Huile de massage artisanale, aux huiles végétales naturelles",
    "eau-florale-hydrolat":
        "Eau florale artisanale distillée, tonique naturelle pour le visage",
    "baume-levres":
        "Baume à lèvres nourrissant artisanal, au karité et cire naturelle",
    "serum-huileux":
        "Sérum huileux concentré artisanal, éclat et nutrition intense",
    "masque-argile-poudre":
        "Masque à l'argile en poudre, à préparer soi-même, 100 % minéral",
    "masque-argile-prepare":
        "Masque à l'argile préparé, frais et sans conservateur, à utiliser sous 30 jours",
    # ── Agroalimentaires (10) ──
    "jus-fruits-frais":
        "Jus de fruits frais artisanal, sans conservateur, pressé du jour",
    "confiture-artisanale":
        "Confiture artisanale au fruit, cuite au sucre de canne, préparée à la main",
    "miel-naturel":
        "Miel pur 100 % naturel, récolté et mis en pot à la main, non chauffé",
    "melange-epices":
        "Mélange d'épices artisanal, moulu à la main, sans arôme ajouté",
    "huile-alimentaire":
        "Huile alimentaire pressée à froid, 100 % pure, sans additif",
    "fruits-secs":
        "Fruits secs artisanaux, séchés au soleil, sans sucre ajouté",
    "pate-arachide":
        "Pâte d'arachide artisanale, arachides grillées moulues, sans huile ajoutée",
    "sauce-pimentee":
        "Sauce pimentée artisanale, préparée à la main avec des piments frais",
    "pain-artisanal":
        "Pain artisanal cuit au four, sans conservateur, farine et levain naturel",
    "fromage-frais":
        "Fromage frais artisanal, au lait entier, sans conservateur",
}

with open(PATH, encoding="utf-8") as f:
    content = f.read()

count = 0
for tpl_id, designation in DESIGNATIONS.items():
    # Repérer le bloc du template par son id unique, puis la ligne category:
    # qui le suit immédiatement.
    pattern = re.compile(
        r'(id:\s*"' + re.escape(tpl_id) + r'",\n(.*?)category:\s*"(?:cosmetique|agroalimentaire)",\n)',
        re.DOTALL,
    )
    m = pattern.search(content)
    if not m:
        print(f"!! INTROUVABLE : {tpl_id}")
        continue
    replacement = m.group(1) + f'    designation: "{designation}",\n'
    content = content[: m.start()] + replacement + content[m.end():]
    count += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✅ {count}/{len(DESIGNATIONS)} designations insérées")
