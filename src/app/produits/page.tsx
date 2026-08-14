import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getActiveCategories,
  getAllProducts,
  type TransparencyLevel,
} from "@/lib/public-data";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

import { SearchBar } from "@/components/catalog/SearchBar";
import { CategoryTabs, type CategoryTabItem } from "@/components/catalog/CategoryTabs";
import { FilterSidebar } from "@/components/catalog/FilterSidebar";
import { SortDropdown } from "@/components/catalog/SortDropdown";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { LoadingSkeleton } from "@/components/catalog/LoadingSkeleton";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Catalogue — VerifScan",
    description:
      "Découvrez tous les produits authentiques vérifiés par VerifScan. Filtrez par catégorie, recherchez par marque et explorez les passeports numériques.",
    openGraph: {
      title: "Catalogue — VerifScan",
      description:
        "Découvrez tous les produits authentiques vérifiés par VerifScan.",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const VALID_TRANSPARENCY: TransparencyLevel[] = ["bronze", "argent", "or", "platine"];

type SearchParams = Promise<{
  category?: string;
  search?: string;
  sort?: string;
  transparency?: string;
  page?: string;
}>;

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const category = sp.category || "all";
  const search = sp.search || "";
  const sort = (sp.sort as "recent" | "popular" | "transparency" | "name" | "rating") || "recent";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  // Validate transparency param — only accept known levels.
  const transparency: TransparencyLevel | null =
    sp.transparency && VALID_TRANSPARENCY.includes(sp.transparency as TransparencyLevel)
      ? (sp.transparency as TransparencyLevel)
      : null;

  const [categories, { products, pagination }] = await Promise.all([
    getActiveCategories(),
    getAllProducts({ category, search, sort, transparency, page, limit: 12 }),
  ]);

  // Map DB rows to the simpler shape used by client components.
  const categoryTabs: CategoryTabItem[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    emoji: c.emoji ?? null,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero section */}
        <section className="relative overflow-hidden border-b border-gray-100 bg-white">
          {/* Decorative gradient blobs */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />
            <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-emerald-100/30 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-[1400px] px-4 py-10 text-center sm:px-6 sm:py-14 lg:px-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#2563EB] ring-1 ring-blue-200">
              🛒 Catalogue VerifScan
            </span>
            <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
              Découvrez nos produits{" "}
              <span className="text-[#2563EB]">authentiques</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 sm:text-lg">
              Chaque produit dispose d&apos;un passeport numérique vérifiable.
              Filtrez, recherchez et explorez la traçabilité complète de vos
              marques préférées.
            </p>

            {/* Search bar (full width) */}
            <div className="mx-auto mt-8 max-w-2xl">
              <SearchBar defaultValue={search} />
            </div>
          </div>
        </section>

        {/* Category tabs */}
        <section className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
            <CategoryTabs
              categories={categoryTabs}
              activeCategory={category}
            />
          </div>
        </section>

        {/* Main content: sidebar + grid */}
        <section className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[256px_1fr]">
            {/* Sidebar (desktop only) */}
            <FilterSidebar
              categories={categoryTabs}
              activeCategory={category}
              activeSort={sort}
              activeTransparency={transparency}
              search={search}
            />

            {/* Main column */}
            <div>
              {/* Mobile sort bar (visible on mobile/tablet only) */}
              <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
                <p className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">{pagination.total}</span>{" "}
                  {pagination.total > 1 ? "produits" : "produit"}
                </p>
                <SortDropdown value={sort} />
              </div>

              {/* Desktop sort row */}
              <div className="mb-4 hidden items-center justify-end gap-3 lg:flex">
                <span className="text-sm font-medium text-gray-500">Trier par</span>
                <SortDropdown value={sort} />
              </div>

              <Suspense fallback={<LoadingSkeleton />}>
                <ProductGrid products={products} pagination={pagination} />
              </Suspense>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
