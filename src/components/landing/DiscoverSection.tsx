import { getAllProducts } from "@/lib/public-data";
import { DiscoverSectionClient } from "./DiscoverSectionClient";

/**
 * DiscoverSection — Server Component.
 *
 * Fetches 4 products to feature alongside a large promo card (Nest "Daily
 * Best Sells" style). Each small card has a solid "Scanner le QR" CTA.
 */
export async function DiscoverSection() {
  let products: Awaited<ReturnType<typeof getAllProducts>>["products"] = [];

  try {
    // Use transparency sort to feature the best products
    const result = await getAllProducts({ sort: "transparency", limit: 4, page: 1 });
    products = result.products;
  } catch (e) {
    console.error("[DiscoverSection] failed to fetch:", e);
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

  return <DiscoverSectionClient items={items} />;
}
