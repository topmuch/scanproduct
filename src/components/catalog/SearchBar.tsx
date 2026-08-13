"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Search, X } from "lucide-react";
import { useUpdateUrl } from "./use-update-url";

type Props = {
  defaultValue: string;
};

/**
 * SearchBar — full-width search input with a 🔍 icon and a clear (✕) button.
 * On submit (Enter or button click) updates the URL `?search=...` while
 * preserving existing category and sort params (page is reset to 1).
 */
export function SearchBar({ defaultValue }: Props) {
  const updateUrl = useUpdateUrl();
  const [value, setValue] = useState(defaultValue);

  // Keep input in sync if the URL changes elsewhere (e.g. clearing from
  // another component).
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    updateUrl({ search: trimmed || null });
  }

  function handleClear() {
    setValue("");
    updateUrl({ search: null });
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Rechercher un produit"
      className="relative w-full"
    >
      <div className="relative flex items-center">
        <Search
          className="pointer-events-none absolute left-4 h-5 w-5 text-gray-400"
          aria-hidden
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Rechercher un produit, une marque…"
          aria-label="Termes de recherche"
          className="h-12 w-full rounded-full border-2 border-gray-200 bg-white pl-12 pr-28 text-sm text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Effacer la recherche"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Rechercher</span>
          </button>
        </div>
      </div>
    </form>
  );
}
