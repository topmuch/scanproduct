import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  variant?: "default" | "light";
  showText?: boolean;
};

/**
 * VerifScan logo: stylized QR icon (blue + green) + wordmark.
 * `variant="light"` renders white text/icons for dark backgrounds (footer).
 */
export function Logo({ className, variant = "default", showText = true }: LogoProps) {
  const isLight = variant === "light";
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      {/* Stylized QR icon */}
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563EB] to-[#10B981] shadow-sm transition-transform duration-300 group-hover:scale-105">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-white"
          aria-hidden="true"
        >
          {/* QR-like squares */}
          <rect x="3" y="3" width="6" height="6" rx="1.2" fill="currentColor" opacity="0.95" />
          <rect x="15" y="3" width="6" height="6" rx="1.2" fill="currentColor" opacity="0.75" />
          <rect x="3" y="15" width="6" height="6" rx="1.2" fill="currentColor" opacity="0.75" />
          <rect x="13" y="13" width="3" height="3" rx="0.6" fill="currentColor" />
          <rect x="18" y="13" width="3" height="3" rx="0.6" fill="currentColor" opacity="0.7" />
          <rect x="13" y="18" width="3" height="3" rx="0.6" fill="currentColor" opacity="0.7" />
          <rect x="18" y="18" width="3" height="3" rx="0.6" fill="currentColor" />
        </svg>
      </span>
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
