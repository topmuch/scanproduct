"use client";

import { useUpdateUrl } from "./use-update-url";

type Props = {
  value: string;
};

const OPTIONS: Array<{ value: string; label: string }> = [
  { value: "recent", label: "Plus récents" },
  { value: "popular", label: "Plus populaires" },
  { value: "transparency", label: "Meilleure transparence" },
  { value: "name", label: "Nom A-Z" },
  { value: "rating", label: "Mieux notés" },
];

/**
 * SortDropdown — simple `<select>` for the catalog sort order.
 * Visible on both mobile and desktop (in the toolbar).
 * On change, updates `?sort=...` and preserves category + search (page reset).
 */
export function SortDropdown({ value }: Props) {
  const updateUrl = useUpdateUrl();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Trier par</span>
      <select
        value={value}
        onChange={(e) => updateUrl({ sort: e.target.value })}
        aria-label="Trier par"
        className="h-10 cursor-pointer appearance-none rounded-full border-2 border-gray-200 bg-white py-0 pl-4 pr-9 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 h-4 w-4 text-gray-400"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
