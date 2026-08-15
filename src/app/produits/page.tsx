import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getAllProducts,
  getCategoriesWithCounts,
  getCatalogStats,
  type TransparencyLevel,
} from "@/lib/public-data";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

import { CatalogHero } from "@/components/catalog/v2/CatalogHero";
import { CategoryFilters } from "@/components/catalog/v2/CategoryFilters";
import { ControlBar } from "@/components/catalog/v2/ControlBar";
import { ProductGrid } from "@/components/catalog/v2/ProductGrid";
import { LoadingSkeleton } from "@/components/catalog/LoadingSkeleton";

// Force dynamic rendering — this page fetches from the DB (products,
// categories, stats). Without this flag, `next build` tries to statically
// pre-render it at build time, which fails in Docker because the database
// file doesn't exist yet during the build phase.
export const dynamic = "force-dynamic";

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
const VALID_VIEWS = ["grid", "list"] as const;
type ViewMode = (typeof VALID_VIEWS)[number];

type SearchParams = Promise<{
  category?: string;
  search?: string;
  sort?: string;
  view?: string;
  transparency?: string;
  page?: string;
}>;

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const category = sp.category || "all";
  const search = sp.search || "";
  const sort = (sp.sort as "recent" | "popular" | "transparency" | "name" | "rating") || "recent";
  const view: ViewMode = VALID_VIEWS.includes(sp.view as ViewMode) ? (sp.view as ViewMode) : "grid";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const transparency: TransparencyLevel | null =
    sp.transparency && VALID_TRANSPARENCY.includes(sp.transparency as TransparencyLevel)
      ? (sp.transparency as TransparencyLevel)
      : null;

  const [categories, stats, { products, pagination }] = await Promise.all([
    getCategoriesWithCounts(),
    getCatalogStats(),
    getAllProducts({ category, search, sort, transparency, page, limit: view === "grid" ? 12 : 10 }),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <PublicHeader />

      <main className="flex-1">
        {/* 1. HERO */}
        <CatalogHero
          totalProducts={stats.totalProducts}
          totalManufacturers={stats.totalManufacturers}
          defaultValue={search}
        />

        {/* Content wrapper — overlaps hero slightly */}
        <div className="mx-auto -mt-8 max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-8">
          {/* 2. CATEGORY FILTERS */}
          <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-gray-100" />}>
            <CategoryFilters
              categories={categories}
              activeCategory={category}
            />
          </Suspense>

          {/* 3. CONTROL BAR (sort + view + transparency chips) */}
          <div className="mt-6">
            <ControlBar
              totalProducts={pagination.total}
              sort={sort}
              view={view}
              activeTransparency={transparency}
            />
          </div>

          {/* 4. PRODUCT GRID */}
          <Suspense fallback={<LoadingSkeleton />}>
            <ProductGrid
              products={products}
              pagination={pagination}
              view={view}
            />
          </Suspense>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
