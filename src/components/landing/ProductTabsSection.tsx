import { getAllProducts } from "@/lib/public-data";
import { ProductTabsClient, type ProductTabItem } from "./ProductTabsClient";

/**
 * ProductTabsSection — Server Component.
 *
 * Fetches 4 product lists (each limited to 4 items) in parallel:
 *   - Top scannés   (sort by totalScans desc)
 *   - Tendance      (sort by totalReviews desc — proxy for "trending")
 *   - Récents       (sort by createdAt desc)
 *   - Mieux notés   (sort by averageRating desc)
 *
 * Each tab renders as a vertical list of compact rows (image 60x60 + text).
 */
export async function ProductTabsSection() {
  let tabs: { topScanned: ProductTabItem[]; trending: ProductTabItem[]; recent: ProductTabItem[]; topRated: ProductTabItem[] } | null = null;

  try {
    const [topScanned, trending, recent, topRated] = await Promise.all([
      getAllProducts({ sort: "popular", limit: 4, page: 1 }),
      getAllProducts({ sort: "rating", limit: 4, page: 1 }),
      getAllProducts({ sort: "recent", limit: 4, page: 1 }),
      getAllProducts({ sort: "transparency", limit: 4, page: 1 }),
    ]);

    const toItems = (ps: typeof topScanned.products): ProductTabItem[] =>
      ps.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand ?? null,
        category: p.category ?? null,
        categoryEmoji: p.categoryRef?.emoji ?? null,
        imageUrl: p.imageUrl ?? null,
        weight: p.weight ?? null,
        averageRating: p.averageRating ?? 0,
        totalReviews: p.totalReviews ?? 0,
        transparencyScore: p.transparencyScore ?? 0,
        totalScans: p.totalScans ?? 0,
        latestLotId: p.latestLot?.id ?? null,
      }));

    tabs = {
      topScanned: toItems(topScanned.products),
      trending: toItems(trending.products),
      recent: toItems(recent.products),
      topRated: toItems(topRated.products),
    };
  } catch (e) {
    console.error("[ProductTabsSection] failed to fetch:", e);
    return null;
  }

  if (!tabs) return null;

  // If no products anywhere, skip the section
  if (
    tabs.topScanned.length === 0 &&
    tabs.trending.length === 0 &&
    tabs.recent.length === 0 &&
    tabs.topRated.length === 0
  ) {
    return null;
  }

  return <ProductTabsClient tabs={tabs} />;
}
