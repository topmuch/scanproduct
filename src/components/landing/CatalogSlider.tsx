import { getAllProducts } from "@/lib/public-data";
import { CatalogSliderClient } from "./CatalogSliderClient";

/**
 * CatalogSlider — Server Component.
 *
 * Fetches real catalog products from the database (most scanned first) and
 * passes them to the client carousel. Rendered on the landing page directly
 * below the "Démarrer maintenant" CTA so visitors can browse authentic
 * products without leaving the home page.
 *
 * If the catalog is empty (fresh install / no public products yet), the
 * section is simply not rendered — no broken empty slider.
 */
export async function CatalogSlider() {
  let products: Awaited<ReturnType<typeof getAllProducts>>["products"] = [];

  try {
    const result = await getAllProducts({
      sort: "popular",
      limit: 12,
      page: 1,
    });
    products = result.products;
  } catch (e) {
    // Don't crash the home page if the DB is unreachable — just skip the slider.
    console.error("[CatalogSlider] failed to fetch products:", e);
    return null;
  }

  if (products.length === 0) {
    return null;
  }

  // Serialize for the client: Prisma returns Date objects, which Next.js RSC
  // handles automatically, but we trim to the minimal shape the card needs to
  // keep the payload small.
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

  return <CatalogSliderClient items={items} />;
}
