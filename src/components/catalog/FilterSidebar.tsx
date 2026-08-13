"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useUpdateUrl } from "./use-update-url";
import type { CategoryTabItem } from "./CategoryTabs";

type Props = {
  categories: CategoryTabItem[];
  activeCategory: string;
  activeSort: string;
  search: string;
};

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "recent", label: "Plus récents" },
  { value: "popular", label: "Plus populaires" },
  { value: "transparency", label: "Meilleur score transparence" },
  { value: "name", label: "Nom A-Z" },
  { value: "rating", label: "Mieux notés" },
];

const TRANSPARENCY_FILTERS: Array<{
  id: string;
  label: string;
  range: string;
  color: string;
}> = [
  { id: "bronze", label: "Bronze", range: "0 – 40", color: "bg-amber-400" },
  { id: "argent", label: "Argent", range: "41 – 70", color: "bg-gray-400" },
  { id: "or", label: "Or", range: "71 – 90", color: "bg-yellow-400" },
  { id: "platine", label: "Platine", range: "91 – 100", color: "bg-purple-400" },
];

/**
 * FilterSidebar — left-column filter card with three collapsible sections:
 *   1. Catégories (radio-like list)
 *   2. Trier par (sort options)
 *   3. Transparence (visual-only toggle checkboxes for now)
 *
 * Hidden on mobile (`hidden lg:block`) — mobile uses CategoryTabs + SortDropdown.
 */
export function FilterSidebar({
  categories,
  activeCategory,
  activeSort,
}: Props) {
  const updateUrl = useUpdateUrl();

  function selectCategory(slug: string) {
    updateUrl({ category: slug === "all" ? null : slug });
  }

  function selectSort(value: string) {
    updateUrl({ sort: value });
  }

  // Track transparency toggles locally only (visual filters, not wired to URL
  // to keep the scope simple per task spec).
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  function toggleTransparency(id: string) {
    setToggles((t) => ({ ...t, [id]: !t[id] }));
  }

  return (
    <aside className="hidden lg:block" aria-label="Filtres">
      <div className="sticky top-20 space-y-4">
        {/* Catégories */}
        <FilterSection title="Catégories" defaultOpen>
          <ul className="space-y-1">
            <CategoryRadioRow
              label="Tous les produits"
              emoji="🛒"
              active={activeCategory === "all"}
              onClick={() => selectCategory("all")}
            />
            {categories.map((c) => (
              <CategoryRadioRow
                key={c.id}
                label={c.name}
                emoji={c.emoji ?? "📦"}
                active={activeCategory === c.slug}
                onClick={() => selectCategory(c.slug)}
              />
            ))}
          </ul>
        </FilterSection>

        {/* Trier par */}
        <FilterSection title="Trier par" defaultOpen>
          <ul className="space-y-1">
            {SORT_OPTIONS.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => selectSort(opt.value)}
                  className={[
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    activeSort === opt.value
                      ? "bg-blue-50 font-semibold text-[#2563EB]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2",
                      activeSort === opt.value
                        ? "border-[#2563EB]"
                        : "border-gray-300",
                    ].join(" ")}
                    aria-hidden
                  >
                    {activeSort === opt.value && (
                      <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                    )}
                  </span>
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </FilterSection>

        {/* Transparence */}
        <FilterSection title="Transparence" defaultOpen>
          <p className="mb-2 text-xs text-gray-500">
            Niveau de transparence minimum
          </p>
          <ul className="space-y-1.5">
            {TRANSPARENCY_FILTERS.map((t) => {
              const checked = !!toggles[t.id];
              return (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50">
                    <span
                      className={[
                        "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors",
                        checked
                          ? "border-[#2563EB] bg-[#2563EB] text-white"
                          : "border-gray-300 bg-white",
                      ].join(" ")}
                      aria-hidden
                    >
                      {checked && (
                        <svg
                          viewBox="0 0 14 14"
                          className="h-2.5 w-2.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path
                            d="M2 7l3 3 7-7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleTransparency(t.id)}
                    />
                    <span
                      className={`h-2 w-2 rounded-full ${t.color}`}
                      aria-hidden
                    />
                    <span className="flex-1 text-sm text-gray-700">
                      {t.label}
                    </span>
                    <span className="text-[11px] font-medium text-gray-400">
                      {t.range}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 rounded-md bg-gray-50 px-2 py-1.5 text-[11px] text-gray-400">
            Filtres de transparence bientôt disponibles
          </p>
        </FilterSection>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold uppercase tracking-wide text-gray-700"
      >
        {title}
        <ChevronDown
          className={[
            "h-4 w-4 text-gray-400 transition-transform",
            open ? "rotate-180" : "rotate-0",
          ].join(" ")}
        />
      </button>
      {open && <div className="border-t border-gray-100 px-4 py-3">{children}</div>}
    </div>
  );
}

function CategoryRadioRow({
  label,
  emoji,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={[
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
          active
            ? "bg-blue-50 font-semibold text-[#2563EB]"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2",
            active ? "border-[#2563EB]" : "border-gray-300",
          ].join(" ")}
          aria-hidden
        >
          {active && <span className="h-2 w-2 rounded-full bg-[#2563EB]" />}
        </span>
        <span aria-hidden className="text-base leading-none">
          {emoji}
        </span>
        <span className="truncate">{label}</span>
      </button>
    </li>
  );
}
