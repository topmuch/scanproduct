import { PackageSearch } from "lucide-react";
import type { ProductWithRelations } from "@/lib/public-data";
import { ProductCard } from "./ProductCard";
import { CatalogPagination } from "../CatalogPagination";

type ViewMode = "grid" | "list";

type Props = {
  products: ProductWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  view: ViewMode;
};

/**
 * ProductGrid v2 — renders products in grid (default) or list layout.
 * Includes results count, empty state, and pagination.
 */
export function ProductGrid({ products, pagination, view }: Props) {
  const { page, totalPages, total } = pagination;

  return (
    <div>
      {products.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div
            className={
              view === "grid"
                ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "flex flex-col gap-4"
            }
          >
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} view={view} index={i} />
            ))}
          </div>

          <CatalogPagination currentPage={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-blue-100" aria-hidden>
        <PackageSearch className="h-10 w-10 text-[#2563EB]" />
      </div>
      <h3 className="mt-5 text-xl font-bold text-gray-900">Aucun produit trouvé</h3>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Essayez de modifier vos critères de recherche, de changer de catégorie,
        ou de réinitialiser les filtres pour voir tous les produits vérifiés.
      </p>
    </div>
  );
}
