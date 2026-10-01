import QR from "qrcode";
import sharp from "sharp";

/**
 * VerifScan — Rendu du QR code avec le design officiel « LABEL VERIFSCAN ».
 *
 * ── Modèle (label verif.png, fourni par le client) ───────────────
 *   • Cercle jaune vif (#F8E805) occupant 94,4 % du canvas carré
 *   • « LABEL VERIFSCAN » en arc supérieur, noir, gras, letter-spacing large
 *   • Deux arcs décoratifs noirs latéraux (extrémités arrondies)
 *   • « SCANNEZ POUR EN SAVOIR PLUS » en arc inférieur, noir, gras
 *   • Le QR code NOIR est composé au CENTRE, directement sur le jaune
 *     (modules clairs = jaune, quiet zone = jaune environnant — combinaison
 *     noir/jaune validée industriellement, luminance ≈ 0,87 : contraste 19:1)
 *
 * ── Implémentation ───────────────────────────────────────────────
 *   • SVG 1000×1000 (viewBox) rendu par sharp/librsvg à la taille demandée
 *   • Textes en arc = caractères individuels positionnés/rotés
 *     (advances EXACTS de DejaVu Sans Bold — la police installée dans
 *     l'image Docker via fonts-dejavu-core — table intégrée ci-dessous)
 *   • QR généré par `qrcode` (ECC Q par défaut, margin 0) puis composé
 *     en pixels natifs (aucun rééchantillonnage) → modules nets à 3 cm
 *
 * ── Impression 3 cm ──────────────────────────────────────────────
 *   Rendu par défaut 1200 px = 1016 DPI à 30 mm (le strict 300 DPI
 *   nécessite 354 px). Le QR occupe 50 % du badge → 15 mm à 3 cm.
 */

// ── Couleurs officielles du modèle ──────────────────────────────────
export const BADGE_YELLOW = "#F8E805";
export const BADGE_DARK = "#000000";
/** Émeraude VerifScan (coche), disponible pour variantes futures. */
export const BRAND_EMERALD = "#10B981";

// ── Métriques DejaVu Sans Bold (advance / em) — extraites du TTF réel ──
const GLYPH_W: Record<string, number> = {
  A: 0.774, B: 0.762, C: 0.734, D: 0.83, E: 0.683, F: 0.683, G: 0.821,
  H: 0.837, I: 0.372, J: 0.372, K: 0.775, L: 0.637, M: 0.995, N: 0.837,
  O: 0.85, P: 0.733, Q: 0.85, R: 0.77, S: 0.72, T: 0.682, U: 0.812,
  V: 0.774, W: 1.103, X: 0.771, Y: 0.724, Z: 0.725,
  À: 0.774, Â: 0.774, Ä: 0.774, É: 0.683, È: 0.683, Ê: 0.683, Ë: 0.683,
  Î: 0.372, Ï: 0.372, Ô: 0.85, Ö: 0.85, Ù: 0.812, Û: 0.812, Ü: 0.812,
  Ç: 0.734, "'": 0.306, " ": 0.348, ".": 0.38, ",": 0.38, "-": 0.415,
  "0": 0.696, "1": 0.696, "2": 0.696, "3": 0.696, "4": 0.696, "5": 0.696,
  "6": 0.696, "7": 0.696, "8": 0.696, "9": 0.696, "&": 0.872,
};
const GLYPH_W_DEFAULT = 0.72;

// ── Géométrie (unités viewBox 1000×1000, fidèle au modèle) ──────────
const CX = 500;
const CY = 500;
const CIRCLE_R = 472;          // cercle jaune (94,4 %)
const QR_BOX = 500;            // carré QR (50 % du badge)
const QR_XY = (1000 - QR_BOX) / 2; // 250

const TOP_FONT = 56;           // « LABEL VERIFSCAN »
const TOP_BASE_R = 452;
const TOP_TRACKING = 27;       // letter-spacing large du modèle
const TOP_SPAN_DEG = 120;      // amplitude max (centrée sur 0° = vertical haut)

const BOT_FONT = 44;           // « SCANNEZ POUR EN SAVOIR PLUS »
const BOT_BASE_R = 452;
const BOT_TRACKING = 8;
const BOT_SPAN_DEG = 124;      // centrée sur 0° = vertical bas

const ARC_R = 452;             // rayon médian des arcs décoratifs
const ARC_STROKE = 17;
const ARC_FROM_DEG = 76;       // (depuis le vertical haut)
const ARC_TO_DEG = 112;

const FONT_FAMILY = "DejaVu Sans, Arial, Helvetica, sans-serif";

export interface BadgeDesignOptions {
  /** Taille du PNG final en pixels (défaut 1200 — 1016 DPI à 3 cm). */
  size?: number;
  /** Texte arc supérieur (défaut « LABEL VERIFSCAN »). */
  topText?: string;
  /** Texte arc inférieur (défaut « SCANNEZ POUR EN SAVOIR PLUS »). */
  bottomText?: string;
  /** Jaune du design (défaut #F8E805, couleur exacte du modèle). */
  yellow?: string;
  /** Couleur du texte/arcs/QR (défaut noir pur). */
  dark?: string;
  /** Fond derrière le cercle : "white" (impression) ou "transparent". */
  background?: "white" | "transparent";
  /** Niveau de correction d'erreur du QR (défaut "Q" — 25 %, modules plus
   *  grands que "H" à taille d'impression égale). */
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Tronque un texte pour tenir sur son arc (garde … final). */
function fitArcText(text: string, maxChars: number): string {
  const t = text.trim().toUpperCase();
  return t.length <= maxChars ? t : t.slice(0, Math.max(1, maxChars - 1)) + "…";
}

/** Largeur totale d'une chaîne en unités em (métriques DejaVu Bold). */
function textEmWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += GLYPH_W[ch] ?? GLYPH_W_DEFAULT;
  return w;
}

/**
 * Génère les <text> individuels le long d'un arc, centrés sur l'angle 0.
 * `zeroAt` = position angulaire du centre : "top" (vertical haut) ou
 * "bottom" (vertical bas). Les têtes de caractères pointent vers
 * l'extérieur en haut, vers le centre en bas (comme le modèle).
 */
function arcTextSvg(
  text: string,
  opts: {
    zeroAt: "top" | "bottom";
    baseR: number;
    fontSize: number;
    tracking: number;
    maxSpanDeg: number;
    fill: string;
  }
): string {
  const chars = Array.from(text);
  const widths = chars.map((ch) => (GLYPH_W[ch] ?? GLYPH_W_DEFAULT) * opts.fontSize);
  const tracking = opts.tracking;
  const totalPx =
    widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, chars.length - 1);

  // Amplitude angulaire réelle ; clamp sur l'amplitude max autorisée.
  let spanRad = totalPx / opts.baseR;
  const maxRad = (opts.maxSpanDeg * Math.PI) / 180;
  if (spanRad > maxRad) {
    // Texte trop long : on compresse le tracking (proportionnellement).
    const scale = maxRad / spanRad;
    spanRad = maxRad;
    // Re-calcule le tracking compressé (peut devenir négatif = serré).
    const naturalPx = widths.reduce((a, b) => a + b, 0);
    const allowedPx = maxRad * opts.baseR;
    const gaps = Math.max(1, chars.length - 1);
    // tracking ajusté, borné à -8 % de la fonte pour rester lisible.
    const tr = Math.max(-opts.fontSize * 0.08, (allowedPx - naturalPx) / gaps);
    return arcTextSvg(text, { ...opts, tracking: tr });
  }

  let cum = 0; // avancement horizontal cumulé (px)
  const out: string[] = [];
  for (let i = 0; i < chars.length; i++) {
    const midPx = cum + widths[i] / 2;
    cum += widths[i] + tracking;
    const angRad = -spanRad / 2 + midPx / opts.baseR; // -span/2 .. +span/2
    const deg = (angRad * 180) / Math.PI;
    const sinA = Math.sin(angRad);
    const cosA = Math.cos(angRad);

    let x: number, y: number, rotDeg: number;
    if (opts.zeroAt === "top") {
      // 0° = vertical haut ; tête des glyphes vers l'extérieur.
      x = CX + opts.baseR * sinA;
      y = CY - opts.baseR * cosA;
      rotDeg = deg;
    } else {
      // 0° = vertical bas ; tête des glyphes vers le centre (arc lisible).
      x = CX + opts.baseR * sinA;
      y = CY + opts.baseR * cosA;
      rotDeg = -deg;
    }
    out.push(
      `<text x="0" y="0" transform="translate(${x.toFixed(2)} ${y.toFixed(
        2
      )}) rotate(${rotDeg.toFixed(2)})" font-family="${FONT_FAMILY}" font-size="${
        opts.fontSize
      }" font-weight="bold" fill="${opts.fill}" text-anchor="middle">${escXml(
        chars[i] === " " ? "\u00A0" : chars[i]
      )}</text>`
    );
  }
  return out.join("\n    ");
}

/** Extrémités d'un arc décoratif (angles depuis le vertical haut). */
function arcPath(fromDeg: number, toDeg: number, r: number): string {
  const p = (deg: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
  };
  const [x1, y1] = p(fromDeg);
  const [x2, y2] = p(toDeg);
  const sweep = toDeg > fromDeg ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 ${sweep} ${x2.toFixed(
    2
  )} ${y2.toFixed(2)}`;
}

/**
 * Construit le SVG complet du badge (QR EXCLU — il est composé ensuite
 * en bitmap natif par sharp pour des modules parfaitement nets).
 */
export function badgeSvgString(text: string, options: BadgeDesignOptions = {}): {
  svg: string;
  size: number;
  qrPx: number;
  qrLeft: number;
  qrTop: number;
} {
  const size = Math.max(256, Math.min(4096, Math.round(options.size || 1200)));
  const yellow = options.yellow || BADGE_YELLOW;
  const dark = options.dark || BADGE_DARK;
  const bg = options.background === "transparent" ? null : "#FFFFFF";

  const topText = fitArcText(options.topText ?? "LABEL VERIFSCAN", 18);
  const bottomText = fitArcText(options.bottomText ?? "SCANNEZ POUR EN SAVOIR PLUS", 30);

  const k = size / 1000; // échelle viewBox → pixels finaux
  const qrPx = Math.round(QR_BOX * k);
  const qrLeft = Math.round(QR_XY * k);
  const qrTop = Math.round(QR_XY * k);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1000 1000">
  ${
    bg
      ? `<rect x="0" y="0" width="1000" height="1000" fill="${bg}"/>`
      : `<!-- fond transparent (découpe au laser / vinyle) -->`
  }
  <circle cx="${CX}" cy="${CY}" r="${CIRCLE_R}" fill="${yellow}"/>
  <g>
    ${arcTextSvg(topText, {
      zeroAt: "top",
      baseR: TOP_BASE_R,
      fontSize: TOP_FONT,
      tracking: TOP_TRACKING,
      maxSpanDeg: TOP_SPAN_DEG,
      fill: dark,
    })}
  </g>
  <g fill="none" stroke="${dark}" stroke-width="${ARC_STROKE}" stroke-linecap="round">
    <path d="${arcPath(ARC_FROM_DEG, ARC_TO_DEG, ARC_R)}"/>
    <path d="${arcPath(-ARC_TO_DEG, -ARC_FROM_DEG, ARC_R)}"/>
  </g>
  <g>
    ${arcTextSvg(bottomText, {
      zeroAt: "bottom",
      baseR: BOT_BASE_R,
      fontSize: BOT_FONT,
      tracking: BOT_TRACKING,
      maxSpanDeg: BOT_SPAN_DEG,
      fill: dark,
    })}
  </g>
</svg>`;

  return { svg, size, qrPx, qrLeft, qrTop };
}

/**
 * Rend le badge complet : design SVG + QR noir composé au centre.
 *
 * @param text    URL à encoder (scan URL / URI GS1 Digital Link).
 * @param options Options du design (taille, textes, couleurs, ECC).
 * @returns Buffer PNG + dimensions.
 */
export async function renderBadgeQR(
  text: string,
  options: BadgeDesignOptions = {}
): Promise<{ buffer: Buffer; width: number }> {
  const { svg, size, qrPx, qrLeft, qrTop } = badgeSvgString(text, options);
  const ecc = options.errorCorrectionLevel || "Q";

  // QR NOIR sur TRANSPARENT : les modules clairs laissent voir le jaune
  // du design (fidèle au modèle — QR directement posé sur le cercle).
  const qrPng = await QR.toBuffer(text, {
    type: "png",
    errorCorrectionLevel: ecc,
    margin: 0, // la quiet zone = le jaune environnant (≈ 100 unités)
    width: qrPx,
    color: { dark: "#000000FF", light: "#00000000" },
  });

  const buffer = await sharp(Buffer.from(svg))
    .composite([{ input: qrPng, top: qrTop, left: qrLeft }])
    .png()
    .toBuffer();

  return { buffer, width: size };
}
