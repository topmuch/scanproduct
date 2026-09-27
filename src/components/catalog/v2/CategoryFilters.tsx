"use client";

import { Check } from "lucide-react";
import { useUpdateUrl } from "../use-update-url";

export type CategoryCard = {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  productCount: number;
};

type Props = {
  categories: CategoryCard[];
  activeCategory: string;
};

// Gradient backgrounds per category index for visual variety.
const GRADIENTS = [
  "from-[#F0F4F9] to-[#DCE7F2]",
  "from-emerald-50 to-emerald-100",
  "from-amber-50 to-amber-100",
  "from-rose-50 to-rose-100",
  "from-violet-50 to-violet-100",
  "from-cyan-50 to-cyan-100",
  "from-orange-50 to-orange-100",
  "from-teal-50 to-teal-100",
];

/**
 * CategoryFilters — visual category cards (emoji + name + product count).
 * Clicking toggles the `?category=slug` URL param (single-select, "all" clears).
 * Active card gets a blue ring, scale, and check badge.
 */
export function CategoryFilters({ categories, activeCategory }: Props) {
  const updateUrl = useUpdateUrl();

  function handleClick(slug: string) {
    updateUrl({ category: slug === activeCategory ? null : slug });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-lg shadow-gray-200/50 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Catégories</h2>
          <p className="text-xs text-gray-500">Filtrez par type de produit</p>
        </div>
        {activeCategory !== "all" && (
          <button
            type="button"
            onClick={() => updateUrl({ category: null })}
            className="text-sm font-semibold text-[#022150] hover:text-[#011D46]"
          >
            Tout afficher
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {categories.map((cat, i) => {
          const isActive = activeCategory === cat.slug;
          const gradient = GRADIENTS[i % GRADIENTS.length];
          const emoji = cat.emoji ?? "📦";

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleClick(cat.slug)}
              aria-pressed={isActive}
              className={[
                "group relative flex flex-col items-center rounded-xl border-2 p-4 text-center transition-all duration-300",
                isActive
                  ? "scale-[1.03] border-[#022150] bg-[#F0F4F9] shadow-md shadow-[#DCE7F2]"
                  : "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-[#C3D2E5] hover:shadow-md",
              ].join(" ")}
            >
              {/* Emoji circle */}
              <div
                className={[
                  "mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-2xl transition-transform duration-300 group-hover:scale-110",
                  gradient,
                ].join(" ")}
              >
                <span aria-hidden>{emoji}</span>
              </div>

              {/* Name */}
              <div
                className={[
                  "text-sm font-semibold leading-tight",
                  isActive ? "text-[#0D3068]" : "text-gray-900",
                ].join(" ")}
              >
                {cat.name}
              </div>

              {/* Count */}
              <div
                className={[
                  "mt-0.5 text-xs",
                  isActive ? "text-[#022150]" : "text-gray-500",
                ].join(" ")}
              >
                {cat.productCount} {cat.productCount > 1 ? "produits" : "produit"}
              </div>

              {/* Active check badge */}
              {isActive && (
                <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#022150] shadow-lg ring-2 ring-white">
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={4} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
