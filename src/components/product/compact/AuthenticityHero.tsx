import { CheckCircle2, XCircle, Star } from "lucide-react";
import type { LotWithDetails } from "@/lib/public-data";
import { formatDate, formatDateShort, daysUntil } from "@/lib/utils";

/**
 * AuthenticityHero — compact hero visible without scrolling.
 *
 * Shows:
 *   1. A compact authenticity banner (green if active, red if recalled).
 *   2. A product card with photo + name + brand + manufacturer + rating.
 *   3. Three key badges: Lot | DLC | Scans.
 *
 * Server component.
 */

type Props = {
  product: LotWithDetails["product"];
  lot: LotWithDetails;
  fabricant: LotWithDetails["fabricant"];
  status: string;
  verifiedAt: Date | string | null;
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

function BadgeItem({
  icon,
  value,
  label,
  color,
  alert,
}: {
  icon: string;
  value: string;
  label: string;
  color: "blue" | "orange" | "purple";
  alert?: boolean;
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700",
    orange: alert
      ? "bg-red-50 text-red-700 animate-pulse"
      : "bg-orange-50 text-orange-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className={`p-3 text-center ${colorClasses[color]}`}>
      <div className="mb-1 text-lg" aria-hidden>
        {icon}
      </div>
      <div className="truncate text-xs font-bold">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide opacity-70">
        {label}
      </div>
    </div>
  );
}

export function AuthenticityHero({
  product,
  lot,
  fabricant,
  status,
  verifiedAt,
}: Props) {
  const isSuccess = status === "active" || status === "ACTIVE";
  const emoji = categoryEmoji(product.category);
  const rating = product.averageRating ?? 0;
  const totalReviews = product.totalReviews ?? 0;
  const scans = lot.scanCount ?? lot.totalScans ?? 0;
  const daysToExpiry = daysUntil(lot.expiryDate);
  const dlcAlert = daysToExpiry !== null && daysToExpiry < 30;

  return (
    <div className="space-y-3">
      {/* Compact authenticity banner */}
      <div
        className={`flex items-center gap-3 rounded-2xl p-3.5 backdrop-blur-sm ${
          isSuccess
            ? "bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg shadow-green-500/30"
            : "bg-gradient-to-r from-red-500 to-rose-600 shadow-lg shadow-red-500/30"
        }`}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur">
          {isSuccess ? (
            <CheckCircle2 className="h-6 w-6 text-white" />
          ) : (
            <XCircle className="h-6 w-6 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">
            {isSuccess
              ? "Produit authentique et vérifié"
              : "Produit rappelé"}
          </h2>
          <p className="mt-0.5 truncate text-xs text-white/90">
            Vérifié par VerifScan
            {verifiedAt ? ` • ${formatDate(verifiedAt)}` : ""}
          </p>
        </div>
      </div>

      {/* Product card */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex gap-4 p-4">
          {/* Product image */}
          <div className="relative h-28 w-28 flex-shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200" />
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="relative h-full w-full rounded-xl object-cover"
              />
            ) : (
              <div className="relative flex h-full w-full items-center justify-center rounded-xl text-4xl">
                {emoji}
              </div>
            )}
            {/* Floating category badge */}
            {product.category && (
              <div className="absolute -right-2 -top-2 rounded-full bg-blue-500 px-2 py-1 text-[10px] font-bold text-white shadow-lg">
                {emoji} {product.category}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="min-w-0 flex-1">
            <h1 className="line-clamp-2 text-lg font-bold leading-tight text-gray-900">
              {product.name}
            </h1>

            {product.brand && (
              <p className="mt-1 text-sm font-medium text-gray-600">
                {product.brand}
              </p>
            )}

            {/* Manufacturer */}
            <div className="mt-2 flex items-center gap-2 text-xs">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-[10px] font-bold text-white">
                {(fabricant.companyName ?? fabricant.name ?? "F")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <span className="truncate text-gray-600">
                {fabricant.companyName ?? fabricant.name}
              </span>
              {fabricant.isVerified && (
                <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-blue-500" />
              )}
            </div>

            {/* Rating */}
            {totalReviews > 0 && (
              <div className="mt-2 flex items-center gap-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={
                        i <= Math.round(rating)
                          ? "h-3.5 w-3.5 fill-amber-400 text-amber-400"
                          : "h-3.5 w-3.5 text-gray-200"
                      }
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-gray-700">
                  {rating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">
                  ({totalReviews})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3 key badges */}
        <div className="grid grid-cols-3 border-t border-gray-100">
          <BadgeItem
            icon="🏷️"
            value={lot.lotNumber ?? lot.reference ?? "—"}
            label="Lot"
            color="blue"
          />
          <BadgeItem
            icon="📅"
            value={lot.expiryDate ? formatDateShort(lot.expiryDate) : "—"}
            label="DLC"
            color="orange"
            alert={dlcAlert}
          />
          <BadgeItem
            icon="📱"
            value={scans.toLocaleString("fr-FR")}
            label="Scans"
            color="purple"
          />
        </div>
      </div>
    </div>
  );
}
