"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ============================================================================
// CountUp — animates from 0 to `end` on mount (no scroll trigger needed)
// ============================================================================
export function CountUpNumber({
  end,
  duration = 1.4,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let raf = 0;
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / (duration * 1000), 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(end * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
      else setValue(end);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);

  const formatted =
    decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString("fr-FR");
  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

// ============================================================================
// StatusBadge — colored pill for statuses
// ============================================================================
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  actif: { bg: "#D1FAE5", text: "#065F46", label: "Actif" },
  brouillon: { bg: "#F3F4F6", text: "#4B5563", label: "Brouillon" },
  masque: { bg: "#FEE2E2", text: "#991B1B", label: "Masqué" },
  rappelle: { bg: "#FEE2E2", text: "#991B1B", label: "Rappelé" },
  expire: { bg: "#F3F4F6", text: "#6B7280", label: "Expiré" },
  desactive: { bg: "#F3F4F6", text: "#6B7280", label: "Désactivé" },
  reussi: { bg: "#D1FAE5", text: "#065F46", label: "Réussi" },
  echoue: { bg: "#FEE2E2", text: "#991B1B", label: "Échoué" },
  en_attente: { bg: "#FEF3C7", text: "#92400E", label: "En attente" },
  rembourse: { bg: "#F3F4F6", text: "#6B7280", label: "Remboursé" },
};

export function StatusBadge({ status, custom }: { status: string; custom?: { bg: string; text: string; label: string } }) {
  const s = custom || STATUS_STYLES[status] || STATUS_STYLES.brouillon;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

// ============================================================================
// PageHeader — title + subtitle + optional actions
// ============================================================================
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-[24px] font-bold leading-tight text-[#111827]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-[#6B7280]">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

// ============================================================================
// SectionCard — white rounded card with border
// ============================================================================
export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-[#E5E7EB] bg-white", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between border-b border-[#F3F4F6] px-5 py-4">
          <div>
            {title && <h3 className="font-display text-[16px] font-semibold text-[#111827]">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-[13px] text-[#6B7280]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

// ============================================================================
// KpiCard — used on dashboard & stats pages
// ============================================================================
export function KpiCard({
  icon,
  iconBg,
  label,
  value,
  valueSuffix = "",
  tendance,
  tendancePositif = true,
  subText,
  onClick,
  decimals = 0,
  gradient,
}: {
  icon: string;
  iconBg: string;
  label: string;
  value: number;
  valueSuffix?: string;
  tendance?: string;
  tendancePositif?: boolean;
  subText?: string;
  onClick?: () => void;
  decimals?: number;
  /** Optional Tailwind gradient classes (e.g. "from-[#2563EB] to-[#3B82F6]"). When set, the card uses a colored gradient background with white text. */
  gradient?: string;
}) {
  const hasGradient = Boolean(gradient);
  return (
    <motion.div
      whileHover={onClick ? { y: -4 } : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl border p-5 transition-all",
        hasGradient
          ? cn("border-white/20 bg-gradient-to-br text-white shadow-md hover:shadow-xl", gradient)
          : "border-[#E5E7EB] bg-white transition-shadow",
        onClick && "cursor-pointer",
        !hasGradient && onClick && "hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full text-[22px]",
            hasGradient ? "bg-white/20 text-white" : "text-[#111827]"
          )}
          style={hasGradient ? undefined : { backgroundColor: iconBg }}
        >
          {icon}
        </div>
        {tendance && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[12px] font-semibold",
              hasGradient
                ? "bg-white/20 text-white"
                : tendancePositif
                  ? "bg-[#D1FAE5] text-[#065F46]"
                  : "bg-[#FEE2E2] text-[#991B1B]"
            )}
          >
            {tendance}
          </span>
        )}
      </div>
      <p className={cn("mt-3 text-[14px] font-medium", hasGradient ? "text-white/90" : "text-[#6B7280]")}>
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-[32px] font-bold leading-none",
          hasGradient ? "text-white" : "text-[#111827]"
        )}
      >
        <CountUpNumber end={value} suffix={valueSuffix} decimals={decimals} />
      </p>
      {subText && (
        <p className={cn("mt-1.5 text-[12px]", hasGradient ? "text-white/80" : "text-[#9CA3AF]")}>
          {subText}
        </p>
      )}
    </motion.div>
  );
}

// ============================================================================
// PillFilter — segmented filter buttons
// ============================================================================
export function PillFilter<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
            value === opt.value
              ? "bg-white text-[#2563EB] shadow-sm"
              : "text-[#6B7280] hover:text-[#2563EB]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// EmptyState
// ============================================================================
export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] py-16 text-center">
      <div className="mb-4 text-[48px]">{icon}</div>
      <h3 className="font-display text-[18px] font-semibold text-[#111827]">{title}</h3>
      {subtitle && <p className="mt-1 max-w-sm text-[14px] text-[#6B7280]">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ============================================================================
// GradientButton — primary CTA with blue→green gradient
// ============================================================================
export function GradientButton({
  children,
  onClick,
  className,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#10B981] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// OutlineButton
// ============================================================================
export function OutlineButton({
  children,
  onClick,
  className,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// ProgressBar
// ============================================================================
export function ProgressBar({
  value,
  max = 100,
  gradient = "from-[#2563EB] to-[#10B981]",
  height = "h-2",
}: {
  value: number;
  max?: number;
  gradient?: string;
  height?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-[#E5E7EB] dark:bg-[#374151]", height)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={cn("h-full rounded-full bg-gradient-to-r", gradient)}
      />
    </div>
  );
}

// ============================================================================
// InsightBox — colored callout with lightbulb insight
// ============================================================================
export function InsightBox({ children, color = "#2563EB" }: { children: ReactNode; color?: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2 text-[13px]"
      style={{ backgroundColor: `${color}15`, color: "#374151" }}
    >
      <span>💡</span>
      <span>{children}</span>
    </div>
  );
}
