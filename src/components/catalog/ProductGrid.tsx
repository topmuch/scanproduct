import { PackageSearch } from "lucide-react";
import type { ProductWithRelations } from "@/lib/public-data";
import { ProductCard } from "./ProductCard";
import { CatalogPagination } from "./CatalogPagination";

type Props = {
  products: ProductWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * ProductGrid — server component rendering the product cards + results count +
 * empty state + pagination.
 */
export function ProductGrid({ products, pagination }: Props) {
  const { page, totalPages, total } = pagination;

  return (
    <div>
      {/* Results count */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          <span className="font-bold text-gray-900">{total}</span>{" "}
          {total > 1 ? "produits trouvés" : "produit trouvé"}
          {total > 0 && pagination.limit && (
            <span className="text-gray-400">
              {" "}
              · page {page}/{Math.max(1, totalPages)}
            </span>
          )}
        </p>
      </div>

      {products.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
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
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50"
        aria-hidden
      >
        <PackageSearch className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-gray-900">
        Aucun produit trouvé
      </h3>
      <p className="mt-1 max-w-md text-sm text-gray-500">
        Essayez de modifier vos critères de recherche ou de filtrer par une
        autre catégorie. Vous pouvez aussi réinitialiser les filtres pour voir
        tous les produits vérifiés par VerifScan.
      </p>
    </div>
  );
}
