import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LEVEL_CONFIG, getLevelFromScore } from "@/lib/utils";
import { getSimilarProducts } from "@/lib/public-data";

type Props = {
  products: Awaited<ReturnType<typeof getSimilarProducts>>;
};

const CATEGORY_EMOJI: Record<string, string> = {
  cosmétique: "🧴",
  cosm: "🧴",
  agro: "🌾",
  alimentaire: "🌾",
  aliment: "🌾",
  boisson: "🥤",
  boissons: "🥤",
  hygiène: "🧼",
  hygiene: "🧼",
};

function categoryEmoji(category: string | null | undefined): string {
  if (!category) return "📦";
  const k = category.toLowerCase().trim();
  for (const [key, val] of Object.entries(CATEGORY_EMOJI)) {
    if (k.includes(key)) return val;
  }
  return "📦";
}

/**
 * SimilarProducts — grid of similar product mini-cards linking to their
 * respective digital passports.
 * Server component.
 */
export function SimilarProducts({ products }: Props) {
  if (!products || products.length === 0) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
          🛒 Produits similaires
        </h2>
        <Link
          href="/produits"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700"
        >
          Tout voir <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => {
          const score = p.transparencyScore ?? 0;
          const level = getLevelFromScore(score);
          const cfg = LEVEL_CONFIG[level];
          const emoji = categoryEmoji(p.category);
          const href = p.latestLot ? `/p/${p.latestLot.id}` : "/produits";
          return (
            <Link
              key={p.id}
              href={href}
              className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
            >
              <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="max-h-20 w-auto object-contain"
                  />
                ) : (
                  <span className="text-4xl" aria-hidden>
                    {emoji}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="line-clamp-2 text-xs font-semibold text-gray-900">
                  {p.name}
                </p>
                {p.brand && (
                  <p className="text-[11px] text-gray-500">{p.brand}</p>
                )}
                {p.fabricant?.companyName && (
                  <p className="truncate text-[10px] text-gray-400">
                    {p.fabricant.companyName}
                  </p>
                )}

                {/* Mini transparency bar */}
                <div className="mt-auto pt-1.5">
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>Transparence</span>
                    <span className="font-bold text-gray-700">{score}/100</span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${score}%`,
                        backgroundColor: cfg.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
