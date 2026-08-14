"use client";

import { LayoutGrid, List, Flame, Clock, Star, ShieldCheck } from "lucide-react";
import { useUpdateUrl } from "../use-update-url";
import type { TransparencyLevel } from "@/lib/public-data";

type SortValue = "recent" | "popular" | "transparency" | "name" | "rating";
type ViewMode = "grid" | "list";

type Props = {
  totalProducts: number;
  sort: string;
  view: ViewMode;
  activeTransparency: TransparencyLevel | null;
};

const SORT_OPTIONS: Array<{
  value: SortValue;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: "popular", label: "Populaire", icon: <Flame className="h-4 w-4" /> },
  { value: "recent", label: "Récent", icon: <Clock className="h-4 w-4" /> },
  { value: "rating", label: "Mieux notés", icon: <Star className="h-4 w-4" /> },
  { value: "transparency", label: "Transparence", icon: <ShieldCheck className="h-4 w-4" /> },
];

const TRANSPARENCY_CHIPS: Array<{
  id: TransparencyLevel;
  label: string;
  color: string;
}> = [
  { id: "platine", label: "Platine", color: "bg-gradient-to-br from-violet-500 to-purple-600" },
  { id: "or", label: "Or", color: "bg-gradient-to-br from-amber-400 to-yellow-500" },
  { id: "argent", label: "Argent", color: "bg-gradient-to-br from-slate-400 to-slate-500" },
  { id: "bronze", label: "Bronze", color: "bg-gradient-to-br from-orange-400 to-amber-700" },
];

/**
 * ControlBar — sticky toolbar with:
 *   - results count
 *   - sort buttons (Popular / Recent / Rating / Transparency)
 *   - grid/list view toggle
 *   - transparency level chips (compact, preserves the filter feature)
 */
export function ControlBar({
  totalProducts,
  sort,
  view,
  activeTransparency,
}: Props) {
  const updateUrl = useUpdateUrl();

  function handleSort(value: SortValue) {
    updateUrl({ sort: value });
  }

  function handleView(v: ViewMode) {
    updateUrl({ view: v });
  }

  function toggleTransparency(id: TransparencyLevel) {
    updateUrl({ transparency: activeTransparency === id ? null : id });
  }

  return (
    <div className="sticky top-16 z-30 -mx-4 mb-6 rounded-2xl border border-gray-100 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-md sm:mx-0 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: results count */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            <span className="font-bold text-gray-900">{totalProducts}</span>{" "}
            {totalProducts > 1 ? "produits trouvés" : "produit trouvé"}
          </span>
          {activeTransparency && (
            <button
              type="button"
              onClick={() => updateUrl({ transparency: null })}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#2563EB] ring-1 ring-blue-200 transition-colors hover:bg-blue-100"
            >
              Niveau : {activeTransparency}
              <span aria-hidden>×</span>
            </button>
          )}
        </div>

        {/* Right: sort + view */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort buttons */}
          <div
            className="flex items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-1"
            role="group"
            aria-label="Trier par"
          >
            {SORT_OPTIONS.map((opt) => {
              const isActive = sort === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSort(opt.value)}
                  aria-pressed={isActive}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all sm:px-3 sm:text-sm",
                    isActive
                      ? "bg-[#2563EB] text-white shadow-md shadow-blue-200"
                      : "text-gray-600 hover:bg-gray-100",
                  ].join(" ")}
                >
                  {opt.icon}
                  <span className="hidden sm:inline">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* View toggle */}
          <div
            className="flex items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-1"
            role="group"
            aria-label="Mode d'affichage"
          >
            <button
              type="button"
              onClick={() => handleView("grid")}
              aria-pressed={view === "grid"}
              aria-label="Vue grille"
              className={[
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                view === "grid"
                  ? "bg-[#2563EB] text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100",
              ].join(" ")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleView("list")}
              aria-pressed={view === "list"}
              aria-label="Vue liste"
              className={[
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                view === "list"
                  ? "bg-[#2563EB] text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100",
              ].join(" ")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transparency chips row */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Transparence :
        </span>
        {TRANSPARENCY_CHIPS.map((chip) => {
          const isActive = activeTransparency === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => toggleTransparency(chip.id)}
              aria-pressed={isActive}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all",
                isActive
                  ? "border-[#2563EB] bg-blue-50 text-blue-700 shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50",
              ].join(" ")}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${chip.color}`} aria-hidden />
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
