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
 */
export function Logo({ className, variant = "default", size = "lg" }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center select-none", className)}>
      <img
        src="/verifscan-logo.webp?v=5"
        alt="VerifScan"
        className={cn(
          "w-auto shrink-0",
          SIZE_CLASSES[size],
          variant === "light" && "brightness-0 invert"
        )}
        width={720}
        height={247}
      />
    </span>
  );
}
