import Link from "next/link";
import { getCategoriesWithCounts } from "@/lib/public-data";

/**
 * TopCategories — Server Component.
 *
 * Horizontal grid of all active categories from the DB, with the product
 * count per category. Clicking a category navigates to /produits?category=slug.
 *
 * Style: Nest grocery "Top Categories" — cards with a REAL product photo,
 * name, count, hover state with green accent.
 *
 * Images: real photos stored in /public/categories/<slug>.jpg. Fallback to
 * the category emoji on a soft green circle if no image file exists for
 * the slug.
 */

// Map category slug → local image path. Images are real photos fetched via
// the image-search skill and stored in /public/categories/.
const CATEGORY_IMAGE: Record<string, string> = {
  cosmétiques: "/categories/cosmetiques.jpg",
  cosmetiques: "/categories/cosmetiques.jpg",
  "agro-alimentaire": "/categories/agro-alimentaire.jpg",
  agro: "/categories/agro-alimentaire.jpg",
  boissons: "/categories/boissons.jpg",
  boisson: "/categories/boissons.jpg",
  hygiène: "/categories/hygiene.jpg",
  hygiene: "/categories/hygiene.jpg",
  épicerie: "/categories/epicerie.jpg",
  epicerie: "/categories/epicerie.jpg",
  textile: "/categories/textile.jpg",
};

export async function TopCategories() {
  let categories: Awaited<ReturnType<typeof getCategoriesWithCounts>> = [];

  try {
    categories = await getCategoriesWithCounts();
  } catch (e) {
    console.error("[TopCategories] failed to fetch:", e);
    return null;
  }

  if (categories.length === 0) return null;

  return (
    <section className="bg-white py-10 sm:py-12" aria-labelledby="top-categories-title">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2
              id="top-categories-title"
              className="font-display text-[22px] font-bold text-[#1A1A1A] sm:text-[26px]"
            >
              Top Catégories
            </h2>
            <p className="mt-1 text-sm text-[#7A7A7A]">
              Parcourez nos produits par rayon
            </p>
          </div>
          <Link
            href="/produits"
            className="hidden items-center gap-1 text-sm font-semibold text-[#3BB77E] hover:underline sm:inline-flex"
          >
            Voir tout
            <span aria-hidden>→</span>
          </Link>
        </div>

        {/* Bigger cards: 3 cols mobile, 4 sm, 6 lg (down from 10) so each
            card has more room for the real photo. */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-6 lg:grid-cols-6">
          {categories.slice(0, 6).map((cat) => {
            const img = CATEGORY_IMAGE[cat.slug];
            return (
              <Link
                key={cat.id}
                href={`/produits?category=${encodeURIComponent(cat.slug)}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-[#ECECEC] bg-white transition-all duration-200 hover:-translate-y-1.5 hover:border-[#3BB77E]/40 hover:shadow-lg hover:shadow-[#3BB77E]/10"
              >
                {/* Real image — taller aspect (4:3) so the photo is visible */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F7F8FA]">
                  {img ? (
                    <img
                      src={img}
                      alt={cat.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#F2FCEC]">
                      <span
                        className="text-4xl transition-transform duration-300 group-hover:scale-110"
                        aria-hidden
                      >
                        {cat.emoji ?? "📦"}
                      </span>
                    </div>
                  )}
                  {/* Gradient overlay for text legibility */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" aria-hidden />
                </div>

                {/* Text block — bigger, with more padding */}
                <div className="flex flex-col gap-0.5 p-3 sm:p-4">
                  <span className="line-clamp-1 text-[13px] font-bold text-[#1A1A1A] sm:text-sm">
                    {cat.name}
                  </span>
                  <span className="text-[11px] text-[#7A7A7A] sm:text-xs">
                    {cat.productCount} {cat.productCount > 1 ? "produits" : "produit"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
