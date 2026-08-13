import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  variant?: "default" | "light";
  showText?: boolean;
};

/**
 * VerifScan logo: official brand image + wordmark.
 * `variant="light"` renders white text for dark backgrounds (footer, login panels).
 */
export function Logo({ className, variant = "default", showText = true }: LogoProps) {
  const isLight = variant === "light";
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      {/* Official VerifScan logo image */}
      { }
      <img
        src="/verifscan-logo.webp"
        alt="VerifScan"
        className="h-9 w-auto"
        width={36}
        height={36}
      />
      {showText && (
        <span
          className={cn(
            "font-display text-[20px] font-bold leading-none",
            isLight ? "text-white" : "text-[#111827]"
          )}
        >
          Verif<span className={isLight ? "text-[#10B981]" : "text-[#2563EB]"}>Scan</span>
        </span>
      )}
    </span>
  );
}
