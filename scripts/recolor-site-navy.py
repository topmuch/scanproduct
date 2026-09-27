#!/usr/bin/env python3
# ============================================================================
# VerifScan — Harmonisation du SITE sur le bleu marine du LOGO
# User: "on garde la couleur du logo d'origine (bleu foncé), c'est ce bleu
#        qu'il faut mettre partout où il y a du bleu"
#
# Bleu du logo (mode mesuré) : #022150
# Échelle navy dérivée (ancrée sur #022150) remplace la famille blue Tailwind.
# Les cartes métiers décoratives (multicolores) et Wave #0EA5E9 sont épargnées.
# ============================================================================
import os
import re

ROOT = "/home/z/my-project/scanproduct/src"
EXTS = (".tsx", ".ts", ".css")

# hex (case-insensitive) → navy
HEX_MAP = {
    "2563EB": "022150",  # blue-600  → bleu du logo (primaire)
    "1D4ED8": "011D46",  # blue-700  → navy sombre (hover)
    "1E40AF": "0A2B5F",  # blue-800  → navy gradient bas
    "1E3A8A": "0D3068",  # blue-900/indigo-800 → navy gradient haut
    "3B82F6": "2E5383",  # blue-500  → navy clair
    "60A5FA": "4E74A8",  # blue-400  → navy plus clair
    "93C5FD": "8FA9C9",  # blue-300
    "BFDBFE": "C3D2E5",  # blue-200
    "DBEAFE": "DCE7F2",  # blue-100
    "EFF6FF": "F0F4F9",  # blue-50
}

# classes Tailwind nommées → valeurs arbitraires navy
CLASS_MAP = {
    "blue-50": "F0F4F9",
    "blue-100": "DCE7F2",
    "blue-200": "C3D2E5",
    "blue-300": "8FA9C9",
    "blue-400": "4E74A8",
    "blue-500": "2E5383",
    "blue-600": "022150",
    "blue-700": "011D46",
    "blue-800": "0A2B5F",
    "blue-900": "0D3068",
    "blue-950": "061A38",
}

RGBA_MAP = [
    (re.compile(r"rgba\(\s*37\s*,\s*99\s*,\s*235"), "rgba(2, 33, 80"),
    (re.compile(r"rgba\(\s*30\s*,\s*64\s*,\s*175"), "rgba(10, 43, 95"),
]

total_hex = 0
total_cls = 0
total_rgba = 0
files_touched = 0

for dirpath, _, filenames in os.walk(ROOT):
    for fn in filenames:
        if not fn.endswith(EXTS):
            continue
        path = os.path.join(dirpath, fn)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        original = content

        for old, new in HEX_MAP.items():
            pattern = re.compile(re.escape(old), re.IGNORECASE)
            content, n = pattern.subn(new, content)
            total_hex += n

        for cls, hexv in CLASS_MAP.items():
            pattern = re.compile(r"(?<![\w#])" + re.escape(cls) + r"\b")
            content, n = pattern.subn(f"[#{hexv}]", content)
            total_cls += n

        for pattern, repl in RGBA_MAP:
            content, n = pattern.subn(repl, content)
            total_rgba += n

        if content != original:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            files_touched += 1

print(f"Hex remplacés     : {total_hex}")
print(f"Classes blue-N    : {total_cls}")
print(f"rgba bleus        : {total_rgba}")
print(f"Fichiers modifiés : {files_touched}")

# vérification résiduelle
left = 0
for dirpath, _, filenames in os.walk(ROOT):
    for fn in filenames:
        if not fn.endswith(EXTS):
            continue
        path = os.path.join(dirpath, fn)
        with open(path, "r", encoding="utf-8") as f:
            c = f.read()
        for old in list(HEX_MAP) + list(CLASS_MAP):
            if re.search(re.escape(old), c, re.IGNORECASE):
                print(f"  ⚠️ restant {old} dans {path}")
                left += 1
print(f"Résidus: {left}")
