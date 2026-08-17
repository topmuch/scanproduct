import Link from "next/link";
import { getCategoriesWithCounts } from "@/lib/public-data";

/**
 * TopCategories — Server Component.
 *
 * Horizontal grid of all active categories from the DB, with the product
 * count per category. Clicking a category navigates to /produits?category=slug.
 *
 * Style: Nest grocery "Top Categories" — small cards with emoji, name, count,
 * hover state with green accent.
 */
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

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10">
          {categories.slice(0, 10).map((cat) => (
            <Link
              key={cat.id}
              href={`/produits?category=${encodeURIComponent(cat.slug)}`}
              className="group flex flex-col items-center gap-2 rounded-xl border border-[#ECECEC] bg-white p-3 transition-all duration-200 hover:-translate-y-1 hover:border-[#3BB77E]/40 hover:shadow-md"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F2FCEC] text-2xl transition-transform group-hover:scale-110"
                aria-hidden
              >
                {cat.emoji ?? "📦"}
              </span>
              <span className="line-clamp-1 text-center text-[11px] font-semibold text-[#1A1A1A]">
                {cat.name}
              </span>
              <span className="text-[10px] text-[#7A7A7A]">
                {cat.productCount} {cat.productCount > 1 ? "produits" : "produit"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
