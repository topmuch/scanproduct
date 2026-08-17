import { getAllProducts } from "@/lib/public-data";
import { PopularProductsGrid } from "./PopularProductsGrid";

/**
 * PopularProducts — Server Component.
 *
 * Fetches the 10 most-scanned public products and renders them in a 5-column
 * grid (Nest "Popular Products" style). Each card has a "Scanner le QR" CTA
 * that links to /p/[latestLotId].
 */
export async function PopularProducts() {
  let products: Awaited<ReturnType<typeof getAllProducts>>["products"] = [];

  try {
    const result = await getAllProducts({ sort: "popular", limit: 10, page: 1 });
    products = result.products;
  } catch (e) {
    console.error("[PopularProducts] failed to fetch:", e);
    return null;
  }

  if (products.length === 0) return null;

  const items = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand ?? null,
    category: p.category ?? null,
    imageUrl: p.imageUrl ?? null,
    weight: p.weight ?? null,
    transparencyScore: p.transparencyScore ?? 0,
    totalScans: p.totalScans ?? 0,
    averageRating: p.averageRating ?? 0,
    totalReviews: p.totalReviews ?? 0,
    categoryEmoji: p.categoryRef?.emoji ?? null,
    fabricant: p.fabricant
      ? {
          name: p.fabricant.name ?? null,
          companyName: p.fabricant.companyName ?? null,
          logoUrl: p.fabricant.logoUrl ?? null,
          isVerified: p.fabricant.isVerified ?? false,
        }
      : null,
    latestLotId: p.latestLot?.id ?? null,
  }));

  return <PopularProductsGrid items={items} />;
}
