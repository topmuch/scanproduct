import { CheckCircle2, Star, Weight } from "lucide-react";
import type { LotWithDetails } from "@/lib/public-data";

type Props = {
  product: LotWithDetails["product"];
  lot: LotWithDetails;
  fabricant: LotWithDetails["fabricant"];
};

const CATEGORY_EMOJI: Record<string, string> = {
  cosmétique: "🧴",
  cosm: "🧴",
  agro: "🌾",
  agroalimentaire: "🌾",
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

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Note ${rating.toFixed(1)} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= Math.round(rating)
              ? "h-4 w-4 fill-yellow-400 text-yellow-400"
              : "h-4 w-4 text-gray-300"
          }
        />
      ))}
    </div>
  );
}

/**
 * ProductHeader — large hero card showing the product image, name, brand, weight,
 * description, manufacturer, and rating.
 * Server component.
 */
export function ProductHeader({ product, lot, fabricant }: Props) {
  const emoji = categoryEmoji(product.category);
  const rating = product.averageRating ?? 0;
  const totalReviews = product.totalReviews ?? 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 gap-0 md:grid-cols-5">
        {/* Left: image / emoji placeholder */}
        <div className="relative flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 p-8 md:col-span-2 md:p-10">
          <div className="absolute inset-0 opacity-40" aria-hidden>
            <div className="absolute -left-10 top-10 h-32 w-32 rounded-full bg-blue-100 blur-3xl" />
            <div className="absolute -right-10 bottom-10 h-32 w-32 rounded-full bg-green-100 blur-3xl" />
          </div>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="relative z-10 max-h-64 w-auto rounded-xl object-contain shadow-md"
            />
          ) : (
            <div
              className="relative z-10 flex h-48 w-48 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-gray-100"
              aria-hidden
            >
              <span className="text-8xl leading-none">{emoji}</span>
            </div>
          )}
        </div>

        {/* Right: product info */}
        <div className="flex flex-col justify-center gap-4 p-6 md:col-span-3 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {product.category && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
                {emoji} {product.category}
              </span>
            )}
            {product.brand && (
              <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700 ring-1 ring-green-200">
                {product.brand}
              </span>
            )}
            {product.weight && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 ring-1 ring-gray-200">
                <Weight className="h-3 w-3" /> {product.weight}
              </span>
            )}
            {lot.weight && !product.weight && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 ring-1 ring-gray-200">
                <Weight className="h-3 w-3" /> {lot.weight}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
            {product.name}
          </h1>

          {product.description && (
            <p className="text-sm leading-relaxed text-gray-600 sm:text-base">
              {product.description}
            </p>
          )}

          {/* Manufacturer card */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">
              {fabricant.logoUrl ? (
                <img
                  src={fabricant.logoUrl}
                  alt={fabricant.companyName ?? "Fabricant"}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-lg font-bold text-blue-600">
                  {(fabricant.companyName ?? fabricant.name ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {fabricant.companyName ?? fabricant.name ?? "Fabricant"}
                </p>
                {fabricant.isVerified && (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-blue-500" aria-label="Fabricant vérifié" />
                )}
              </div>
              <p className="truncate text-xs text-gray-500">
                {fabricant.city ? `${fabricant.city}, ` : ""}
                {fabricant.country ?? "—"}
                {fabricant.sector ? ` · ${fabricant.sector}` : ""}
              </p>
            </div>
          </div>

          {/* Rating */}
          {totalReviews > 0 && (
            <div className="flex items-center gap-3">
              <Stars rating={rating} />
              <span className="text-sm font-semibold text-gray-900">
                {rating.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">
                ({totalReviews} avis)
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
