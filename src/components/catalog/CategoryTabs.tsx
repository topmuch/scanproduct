"use client";

import { useUpdateUrl } from "./use-update-url";

export type CategoryTabItem = {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
};

type Props = {
  categories: CategoryTabItem[];
  activeCategory: string; // "all" or a slug
};

/**
 * CategoryTabs — horizontal scrollable row of category pill buttons.
 * "Tous" (all) is the first tab (🛒). Active tab is blue; inactive ones are
 * white with a border. Clicking updates `?category=slug` and preserves search
 * + sort params (page is reset to 1).
 */
export function CategoryTabs({ categories, activeCategory }: Props) {
  const updateUrl = useUpdateUrl();

  function selectCategory(slug: string) {
    if (slug === "all") {
      updateUrl({ category: null });
    } else {
      updateUrl({ category: slug });
    }
  }

  const tabs: Array<{ slug: string; name: string; emoji: string }> = [
    { slug: "all", name: "Tous", emoji: "🛒" },
    ...categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      emoji: c.emoji ?? "📦",
    })),
  ];

  return (
    <div
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
      role="tablist"
      aria-label="Filtrer par catégorie"
      style={{ scrollbarWidth: "thin" }}
    >
      {tabs.map((tab) => {
        const isActive = activeCategory === tab.slug;
        return (
          <button
            key={tab.slug}
            role="tab"
            aria-selected={isActive}
            onClick={() => selectCategory(tab.slug)}
            className={[
              "inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-all",
              isActive
                ? "border-[#2563EB] bg-[#2563EB] text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900",
            ].join(" ")}
          >
            <span aria-hidden className="text-base leading-none">
              {tab.emoji}
            </span>
            <span>{tab.name}</span>
          </button>
        );
      })}
    </div>
  );
}
