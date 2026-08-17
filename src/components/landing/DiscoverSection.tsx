import { getAllProducts } from "@/lib/public-data";
import { DiscoverSectionClient } from "./DiscoverSectionClient";

/**
 * DiscoverSection — Server Component.
 *
 * Fetches 5 products sorted by transparency:
 *   - The first (highest transparency) becomes the "featured" product shown
 *     inside the large green promo card on the left.
 *   - The next 4 fill the small product cards on the right.
 */
export async function DiscoverSection() {
  let products: Awaited<ReturnType<typeof getAllProducts>>["products"] = [];

  try {
    // Fetch 5 so we have 1 featured + 4 small cards.
    const result = await getAllProducts({ sort: "transparency", limit: 5, page: 1 });
    products = result.products;
  } catch (e) {
    console.error("[DiscoverSection] failed to fetch:", e);
    return null;
  }

  if (products.length === 0) return null;

  const mapItem = (p: (typeof products)[number]) => ({
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
  });

  // First product → featured (goes in the large green promo card).
  // Remaining products → small cards (up to 4).
  const [featuredRaw, ...rest] = products;
  const featured = mapItem(featuredRaw);
  const items = rest.slice(0, 4).map(mapItem);

  return <DiscoverSectionClient items={items} featured={featured} />;
}
