"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

/**
 * AccordionSection — collapsible card with animated open/close.
 *
 * Uses the modern CSS grid `grid-template-rows: 0fr → 1fr` technique which
 * animates smoothly regardless of content height (no max-height guessing).
 *
 * The header shows a gradient icon badge, the title, an optional badge, and
 * an animated chevron. Clicking the header toggles the content.
 */

type Color =
  | "green"
  | "blue"
  | "purple"
  | "amber"
  | "emerald"
  | "yellow"
  | "slate";

const COLOR_MAP: Record<Color, string> = {
  green: "from-emerald-500 to-green-600",
  blue: "from-blue-500 to-blue-600",
  purple: "from-purple-500 to-purple-600",
  amber: "from-amber-500 to-orange-600",
  emerald: "from-emerald-500 to-teal-600",
  yellow: "from-yellow-500 to-amber-600",
  slate: "from-slate-600 to-slate-800",
};

type Props = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  color?: Color;
  badge?: string;
};

export function AccordionSection({
  title,
  icon,
  children,
  defaultOpen = false,
  color = "blue",
  badge,
}: Props) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const panelId = React.useId();

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header (button) */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50"
      >
        {/* Gradient icon badge */}
        <span
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${COLOR_MAP[color]} text-xl shadow-md`}
          aria-hidden
        >
          {icon}
        </span>

        {/* Title */}
        <span className="flex-1 text-sm font-semibold text-gray-900">
          {title}
        </span>

        {/* Optional badge */}
        {badge && (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
            {badge}
          </span>
        )}

        {/* Animated chevron */}
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Animated content via grid-template-rows */}
      <div
        id={panelId}
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-100 px-4 pb-4 pt-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
