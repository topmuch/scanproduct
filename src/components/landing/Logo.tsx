import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  variant?: "default" | "light";
  /**
   * Taille harmonisée du logo :
   *  - "sm" → 40px : espaces étroits (sidebars 260px avec badge, aperçus 64px)
   *  - "md" → 48px : compact
   *  - "lg" → 56px : défaut — headers du site, pages publiques, auth
   */
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASSES = {
  sm: "h-10",
  md: "h-12",
  lg: "h-14",
} as const;

/**
 * VerifScan logo: official brand image.
 * The image itself already contains the "VerifScan" wordmark (icon + text),
 * so no additional text is rendered next to it.
 * intrinsic ratio 720x247 — width/height attrs keep layout stable pre-load,
 * `shrink-0` prevents flex containers from squashing the wordmark.
 *
 * ⚠️ NO CSS filter ever (see history below). "light" = dedicated white asset
 * for navy backgrounds. The official file already has a white-stroked
 * wordmark + readable shield for light backgrounds. The old hack
 * `brightness-0 invert` flattened EVERYTHING into an opaque white blob —
 * the QR code and check mark inside the shield literally disappeared
 * (reported by the user on the 3 login pages).
 */
export function Logo({ className, variant = "default", size = "lg" }: LogoProps) {
  // "light" (fonds marine) → variante blanche dédiée : wordmark clair lisible,
  // QR blanc, coche émeraude préservée. Générée depuis l'officielle par
  // scripts/make-logo-white-final.py (knockout par luminance + teintes vertes gardées).
  // L'ancien hack CSS `brightness-0 invert` aplatait tout en un blob blanc
  // opaque : le QR et la coche du bouclier devenaient illisibles.
  const src =
    variant === "light" ? "/verifscan-logo-white.webp?v=1" : "/verifscan-logo.webp?v=5";
  return (
    <span className={cn("inline-flex items-center select-none", className)}>
      <img
        src={src}
        alt="VerifScan"
        className={cn("w-auto shrink-0", SIZE_CLASSES[size])}
        width={720}
        height={247}
      />
    </span>
  );
}
