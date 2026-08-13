"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

/**
 * Returns a function that updates the URL search params.
 * - Merges `updates` into the current search params.
 * - If a value is `null` or `""`, the key is removed.
 * - By default, resets `page` to 1 (since most filter changes invalidate the
 *   current page). Pass `{ page: "<n>" }` to keep a specific page.
 *
 * Usage:
 *   const updateUrl = useUpdateUrl();
 *   updateUrl({ category: "cosmetiques" }); // → ?category=cosmetiques (page removed)
 *   updateUrl({ page: "3" });               // → keeps filters, sets page=3
 */
export function useUpdateUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      // Reset page to 1 when a non-page param changes (so users don't end up
      // on a non-existent page after filtering).
      if (!("page" in updates)) {
        params.delete("page");
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );
}
