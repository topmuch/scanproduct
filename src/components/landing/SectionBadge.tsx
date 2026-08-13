"use client";

import { cn } from "@/lib/utils";

type SectionBadgeProps = {
  children: React.ReactNode;
  className?: string;
  /** tailwind bg class for the badge, e.g. bg-[#EFF6FF] */
  bg?: string;
  /** tailwind text class, e.g. text-[#2563EB] */
  color?: string;
};

/**
 * SectionBadge — small pill used as a section eyebrow.
 * Defaults to the green "POURQUOI VERIFSCAN ?" style.
 */
export function SectionBadge({
  children,
  className,
  bg = "bg-[#F0FDF4]",
  color = "text-[#10B981]",
}: SectionBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold uppercase tracking-[1px]",
        bg,
        color,
        className
      )}
    >
      {children}
    </span>
  );
}
