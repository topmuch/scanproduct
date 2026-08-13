import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  variant?: "default" | "light";
};

/**
 * VerifScan logo: official brand image.
 * The image itself already contains the "VerifScan" wordmark (icon + text),
 * so no additional text is rendered next to it.
 */
export function Logo({ className, variant = "default" }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center select-none", className)}>
      <img
        src="/verifscan-logo.webp"
        alt="VerifScan"
        className={cn("h-12 w-auto", variant === "light" && "brightness-0 invert")}
        width={48}
        height={12}
      />
    </span>
  );
}
