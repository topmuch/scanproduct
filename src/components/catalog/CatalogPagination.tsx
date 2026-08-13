"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  currentPage: number;
  totalPages: number;
};

/**
 * CatalogPagination — URL-based pagination links.
 * Builds each `href` from the current searchParams + the target page, so other
 * filters (category, search, sort) are preserved when paginating.
 *
 * Current page: blue bg. Prev/Next are disabled (non-clickable) at boundaries.
 * Renders nothing if totalPages <= 1.
 */
export function CatalogPagination({ currentPage, totalPages }: Props) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function hrefForPage(page: number): string {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete("page");
    else params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/produits?${qs}` : "/produits";
  }

  // Build page-number list with `…` gaps for large ranges.
  function pageList(): Array<number | "..."> {
    const out: Array<number | "..."> = [];
    const push = (n: number | "...") => out.push(n);

    const showFirst = 1;
    const showLast = totalPages;
    const window = 1; // pages around current

    push(showFirst);

    const start = Math.max(2, currentPage - window);
    const end = Math.min(totalPages - 1, currentPage + window);

    if (start > 2) push("...");
    for (let i = start; i <= end; i++) push(i);
    if (end < totalPages - 1) push("...");

    if (totalPages > 1) push(showLast);
    return out;
  }

  const pages = pageList();
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  const baseLinkClass =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors";
  const disabledClass = "pointer-events-none opacity-40 cursor-not-allowed";

  return (
    <nav
      aria-label="Pagination du catalogue"
      className="mt-8 flex items-center justify-center gap-1.5"
    >
      {/* Previous */}
      {prevDisabled ? (
        <span
          aria-disabled="true"
          className={`${baseLinkClass} border border-gray-200 bg-white text-gray-500 ${disabledClass}`}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Précédent</span>
        </span>
      ) : (
        <Link
          href={hrefForPage(currentPage - 1)}
          className={`${baseLinkClass} border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50`}
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Précédent</span>
        </Link>
      )}

      {/* Page numbers */}
      <div className="flex items-center gap-1.5">
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`gap-${i}`}
              className="inline-flex h-10 w-10 items-center justify-center text-sm text-gray-400"
              aria-hidden
            >
              …
            </span>
          ) : p === currentPage ? (
            <span
              key={`page-${p}`}
              aria-current="page"
              className={`${baseLinkClass} bg-[#2563EB] text-white shadow-sm`}
            >
              {p}
            </span>
          ) : (
            <Link
              key={`page-${p}`}
              href={hrefForPage(p)}
              className={`${baseLinkClass} border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50`}
              aria-label={`Page ${p}`}
            >
              {p}
            </Link>
          ),
        )}
      </div>

      {/* Next */}
      {nextDisabled ? (
        <span
          aria-disabled="true"
          className={`${baseLinkClass} border border-gray-200 bg-white text-gray-500 ${disabledClass}`}
        >
          <span className="mr-1 hidden sm:inline">Suivant</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      ) : (
        <Link
          href={hrefForPage(currentPage + 1)}
          className={`${baseLinkClass} border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50`}
          aria-label="Page suivante"
        >
          <span className="mr-1 hidden sm:inline">Suivant</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  );
}
