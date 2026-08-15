"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * WowAccordion — premium accordion with glow + slide animations.
 *
 * A glassmorphism card with a clickable header (icon box + title +
 * optional badge + chevron). The content area animates open/closed
 * via max-height + opacity transitions.
 *
 * Client component — uses useState to track open/closed state.
 */

type Color = "green" | "blue" | "purple" | "amber" | "emerald" | "yellow";

type Props = {
  title: string;
  icon: string; // emoji
  children: React.ReactNode;
  defaultOpen?: boolean;
  color: Color;
  badge?: string;
};

const COLOR_MAP: Record<
  Color,
  { gradient: string; glow: string; badgeGradient: string }
> = {
  green: {
    gradient: "from-emerald-500 to-green-600",
    glow: "wow-shadow-glow-green",
    badgeGradient: "from-emerald-400 to-green-500",
  },
  blue: {
    gradient: "from-blue-500 to-cyan-600",
    glow: "wow-shadow-glow-blue",
    badgeGradient: "from-blue-400 to-cyan-500",
  },
  purple: {
    gradient: "from-purple-500 to-pink-600",
    glow: "wow-shadow-glow-purple",
    badgeGradient: "from-purple-400 to-pink-500",
  },
  amber: {
    gradient: "from-amber-500 to-orange-600",
    glow: "wow-shadow-glow-orange",
    badgeGradient: "from-amber-400 to-orange-500",
  },
  emerald: {
    gradient: "from-emerald-500 to-teal-600",
    glow: "wow-shadow-glow-green",
    badgeGradient: "from-emerald-400 to-teal-500",
  },
  yellow: {
    gradient: "from-yellow-500 to-amber-600",
    glow: "wow-shadow-glow-orange",
    badgeGradient: "from-yellow-400 to-amber-500",
  },
};

export function WowAccordion({
  title,
  icon,
  children,
  defaultOpen = false,
  color,
  badge,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const colors = COLOR_MAP[color];

  return (
    <div
      className={cn(
        "group wow-animate-slide-up overflow-hidden rounded-3xl wow-glass transition-all duration-300 wow-shadow-soft hover:wow-shadow-card",
      )}
    >
      {/* Clickable header */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 p-4 text-left sm:p-5"
      >
        {/* Icon box with hover scale + rotate */}
        <div
          className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 sm:h-14 sm:w-14",
            colors.gradient,
            colors.glow,
          )}
        >
          <span aria-hidden>{icon}</span>
        </div>

        {/* Title + badge */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h3 className="font-display truncate text-base font-bold text-gray-900 sm:text-lg">
            {title}
          </h3>
          {badge && (
            <span
              className={cn(
                "flex-shrink-0 rounded-full bg-gradient-to-r px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm sm:text-xs",
                colors.badgeGradient,
              )}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Chevron */}
        <div
          className={cn(
            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 transition-all duration-300 group-hover:bg-gray-200",
            isOpen && "rotate-180",
          )}
        >
          <ChevronDown className="h-5 w-5 text-gray-600" />
        </div>
      </button>

      {/* Animated content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-500 ease-in-out",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="border-t border-gray-100 px-4 pb-5 pt-4 sm:px-5">
          {children}
        </div>
      </div>
    </div>
  );
}
