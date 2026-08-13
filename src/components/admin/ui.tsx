"use client";

import { cn } from "@/lib/utils";

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8", className)}>
      {children}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-[#E5E7EB] bg-white", className)}>{children}</div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[#F3F4F6] px-5 py-4">
      <div>
        <h3 className="font-display text-[16px] font-semibold text-[#111827]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-[#6B7280]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type BadgeColor = "blue" | "green" | "orange" | "red" | "gray" | "purple" | "yellow";

const BADGE_STYLES: Record<BadgeColor, string> = {
  blue: "bg-[#DBEAFE] text-[#1E40AF]",
  green: "bg-[#D1FAE5] text-[#065F46]",
  orange: "bg-[#FFEDD5] text-[#9A3412]",
  red: "bg-[#FEE2E2] text-[#991B1B]",
  gray: "bg-[#F3F4F6] text-[#374151]",
  purple: "bg-[#EDE9FE] text-[#5B21B6]",
  yellow: "bg-[#FEF3C7] text-[#92400E]",
};

export function Badge({ children, color = "gray", className }: { children: React.ReactNode; color?: BadgeColor; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold", BADGE_STYLES[color], className)}>
      {children}
    </span>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-display text-[24px] font-bold text-[#111827]">{title}</h2>
        {subtitle && <p className="mt-1 text-[14px] text-[#6B7280]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger" | "success" | "gradient";
  size?: "sm" | "md" | "lg";
}) {
  const variants = {
    primary: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-sm",
    outline: "border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB] hover:border-[#2563EB] hover:text-[#2563EB]",
    ghost: "text-[#374151] hover:bg-[#F3F4F6]",
    danger: "bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-sm",
    success: "bg-[#10B981] text-white hover:bg-[#059669] shadow-sm",
    gradient: "bg-gradient-to-r from-[#2563EB] to-[#10B981] text-white hover:shadow-lg hover:shadow-[#2563EB]/25",
  };
  const sizes = {
    sm: "h-8 px-3 text-[13px]",
    md: "h-10 px-4 text-[14px]",
    lg: "h-11 px-5 text-[15px]",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
