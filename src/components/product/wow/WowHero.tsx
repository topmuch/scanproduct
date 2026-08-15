import { CheckCircle2, XCircle, Star, BadgeCheck } from "lucide-react";
import type { LotWithDetails } from "@/lib/public-data";
import { formatDate, formatDateShort, daysUntil, cn } from "@/lib/utils";

/**
 * WowHero — spectacular hero section for the premium product page.
 *
 * Renders:
 *   A. A full-width gradient authenticity banner (green/red) with pulse glow,
 *      ping ring and date badge.
 *   B. A premium glassmorphism product card with glow blur behind it,
 *      product image with hover scale, category badge, manufacturer info
 *      card and star rating.
 *   C. Three gradient stat cards (LOT / DLC / SCANS) with colored glow
 *      shadows and pulse animation on near-expiry DLC.
 *
 * Server component.
 */

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

function StatCard({
  icon,
  value,
  label,
  gradient,
  glow,
  pulse,
}: {
  icon: string;
  value: string;
  label: string;
  gradient: string;
  glow: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-white transition-transform duration-300 hover:scale-105",
        gradient,
        glow,
        pulse && "wow-animate-pulse-glow",
      )}
    >
      {/* Decorative white blur circle top-right */}
      <div className="absolute -right-4 -top-4 h-12 w-12 rounded-full bg-white/20 blur-xl" />

      <div className="relative flex flex-col items-center gap-0.5 text-center">
        <div className="text-base leading-none" aria-hidden>
          {icon}
        </div>
        <div className="mt-1 w-full truncate text-sm font-bold" title={value}>
          {value}
        </div>
        <div className="text-[9px] font-semibold uppercase tracking-wider opacity-90">
          {label}
        </div>
      </div>
    </div>
  );
}

export function WowHero({ product, lot, fabricant }: Props) {
  const isActive = lot.status === "ACTIVE";
  const emoji = categoryEmoji(product.category);
  const rating = product.averageRating ?? 0;
  const totalReviews = product.totalReviews ?? 0;
  const scans = lot.scanCount ?? lot.totalScans ?? 0;
  const daysToExpiry = daysUntil(lot.expiryDate);
  const dlcAlert = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry < 30;
  const companyName = fabricant.companyName ?? fabricant.name ?? "Fabricant";

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* A. Authenticity banner                                        */}
      {/* ============================================================ */}
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl bg-gradient-to-r p-4 sm:p-5",
          isActive
            ? "from-emerald-500 via-green-600 to-teal-700 wow-shadow-glow-green"
            : "from-red-500 via-rose-600 to-pink-700 wow-shadow-glow-red",
        )}
      >
        {/* Decorative blurred circles */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex items-center gap-3 sm:gap-4">
          {/* Icon with pulse + ping ring */}
          <div className="relative flex-shrink-0">
            <span className="absolute inset-0 animate-ping rounded-2xl bg-white/40" />
            <div className="wow-glass relative flex h-12 w-12 items-center justify-center rounded-2xl wow-animate-pulse-glow sm:h-14 sm:w-14">
              {isActive ? (
                <CheckCircle2 className="h-7 w-7 text-white drop-shadow-lg sm:h-8 sm:w-8" />
              ) : (
                <XCircle className="h-7 w-7 text-white drop-shadow-lg sm:h-8 sm:w-8" />
              )}
            </div>
          </div>

          {/* Title + subtitle */}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-bold leading-tight text-white drop-shadow-sm sm:text-xl">
              {isActive ? "Produit authentique" : "Produit rappelé"}
            </h1>
            <p className="mt-0.5 truncate text-xs text-white/90 sm:text-sm">
              Vérifié par VerifScan • Blockchain sécurisée
            </p>
          </div>

          {/* Date badge */}
          {lot.verifiedAt && (
            <div className="wow-glass hidden flex-shrink-0 rounded-xl px-3 py-1.5 text-right sm:block">
              <div className="text-[10px] uppercase tracking-wider text-white/80">
                Vérifié le
              </div>
              <div className="text-xs font-semibold text-white">
                {formatDate(lot.verifiedAt)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* B. Product card (glassmorphism)                              */}
      {/* ============================================================ */}
      <div className="group relative">
        {/* Glow blur behind card */}
        <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40" />

        <div className="wow-glass wow-shadow-card relative overflow-hidden rounded-3xl p-4 sm:p-5">
          <div className="flex gap-4">
            {/* Product image */}
            <div className="relative flex-shrink-0">
              {/* Gradient blur behind image */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-blue-300 via-purple-300 to-pink-300 opacity-50 blur-lg" />

              <div className="relative h-28 w-28 sm:h-32 sm:w-32">
                <div className="relative h-full w-full overflow-hidden rounded-2xl border-4 border-white shadow-xl">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 text-5xl">
                      {emoji}
                    </div>
                  )}
                </div>

                {/* Floating category badge top-right */}
                {product.category && (
                  <div className="absolute -right-2 -top-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg sm:text-xs">
                    {emoji} {product.category}
                  </div>
                )}
              </div>
            </div>

            {/* Product info */}
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <h2 className="font-display line-clamp-2 text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
                {product.name}
              </h2>

              {product.brand && (
                <p className="mt-1 text-sm font-medium text-gray-600 sm:text-base">
                  {product.brand}
                </p>
              )}

              {/* Manufacturer info card */}
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50 p-2.5">
                {fabricant.logoUrl ? (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-white shadow-md">
                    <img
                      src={fabricant.logoUrl}
                      alt={`Logo ${companyName}`}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white shadow-md">
                    {companyName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-sm font-semibold text-gray-900">
                      {companyName}
                    </span>
                    {fabricant.isVerified && (
                      <BadgeCheck className="h-4 w-4 flex-shrink-0 text-blue-500" />
                    )}
                  </div>
                  {(fabricant.city || fabricant.country) && (
                    <p className="truncate text-xs text-gray-500">
                      {[fabricant.city, fabricant.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              </div>

              {/* Star rating */}
              {totalReviews > 0 && rating > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4 drop-shadow-sm",
                          i <= Math.round(rating)
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-200 text-gray-200",
                        )}
                      />
                    ))}
                  </div>
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
        </div>
      </div>

      {/* ============================================================ */}
      {/* C. Three stat cards                                          */}
      {/* ============================================================ */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon="🏷️"
          value={lot.lotNumber ?? lot.reference ?? "—"}
          label="Lot"
          gradient="from-blue-500 to-cyan-600"
          glow="wow-shadow-glow-blue"
        />
        <StatCard
          icon="📅"
          value={lot.expiryDate ? formatDateShort(lot.expiryDate) : "—"}
          label="DLC"
          gradient="from-orange-500 to-red-600"
          glow="wow-shadow-glow-orange"
          pulse={dlcAlert}
        />
        <StatCard
          icon="📱"
          value={scans.toLocaleString("fr-FR")}
          label="Scans"
          gradient="from-purple-500 to-pink-600"
          glow="wow-shadow-glow-purple"
        />
      </div>
    </div>
  );
}
