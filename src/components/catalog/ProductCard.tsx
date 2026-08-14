import Link from "next/link";
import { CheckCircle2, Search, ShieldCheck, Star } from "lucide-react";
import {
  LEVEL_CONFIG,
  getLevelFromScore,
  cn,
} from "@/lib/utils";
import type { ProductWithRelations } from "@/lib/public-data";

type Props = {
  product: ProductWithRelations;
};

// Fallback emoji map for categories when no emoji is set / no image.
const CATEGORY_EMOJI: Record<string, string> = {
  cosmétique: "🧴",
  cosm: "🧴",
  cosmetique: "🧴",
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

// Badge "Nouveau" : un produit est "nouveau" s'il a été créé dans les 14
// derniers jours ET n'a pas encore beaucoup été scanné (< 5 scans). Cela
// évite que tous les produits d'une DB fraîchement seedée soient marqués
// "Nouveau", tout en gardant le badge pertinent pour les vrais nouveaux
// produits pas encore populaires.
function isNewProduct(
  createdAt: Date | string | null | undefined,
  totalScans: number | null | undefined,
): boolean {
  if (!createdAt) return false;
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const isRecent = d.getTime() >= fourteenDaysAgo;
  const hasFewScans = (totalScans ?? 0) < 5;
  return isRecent && hasFewScans;
}

/**
 * ProductCard — server component, single product tile in the catalog grid.
 * Links to the product's Digital Passport at `/p/[lotId]` (or `/p/[productId]`
 * as a fallback if no active lot exists yet).
 *
 * Design: premium card with image area, badges, product info, manufacturer row,
 * and a mini transparency bar.
 */
export function ProductCard({ product }: Props) {
  const score = product.transparencyScore ?? 0;
  const level = getLevelFromScore(score);
  const cfg = LEVEL_CONFIG[level];

  const emoji = product.categoryRef?.emoji || categoryEmoji(product.category);
  const href = product.latestLot
    ? `/p/${product.latestLot.id}`
    : `/p/${product.id}`;
  const isNew = isNewProduct(product.createdAt, product.totalScans);
  const scans = product.totalScans ?? 0;
  const fabricantName =
    product.fabricant?.companyName ?? product.fabricant?.name ?? null;
  const rating = product.averageRating ?? 0;
  const totalReviews = product.totalReviews ?? 0;

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/50"
      aria-label={`Voir le passeport numérique de ${product.name}`}
    >
      {/* Image area */}
      <div className="relative flex h-52 items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/40">
        {/* NOUVEAU badge (top-left) */}
        {isNew && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md shadow-red-200">
            Nouveau
          </span>
        )}

        {/* Transparency badge (top-right) */}
        <span
          className={cn(
            "absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border bg-white/95 px-2.5 py-1 text-[11px] font-bold shadow-sm backdrop-blur",
            cfg.borderColor,
            cfg.textColor,
          )}
        >
          <span aria-hidden className="text-sm leading-none">
            {cfg.icon}
          </span>
          <span className="capitalize">{level}</span>
        </span>

        {/* Scans count (bottom-left of image) */}
        <span className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-gray-600 shadow-sm backdrop-blur">
          <Search className="h-3 w-3 text-gray-400" aria-hidden />
          {scans.toLocaleString("fr-FR")}
        </span>

        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="relative z-[1] max-h-44 w-auto object-contain p-5 transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <span
            className="relative z-[1] text-7xl leading-none drop-shadow-sm transition-transform duration-500 group-hover:scale-110"
            aria-hidden
          >
            {emoji}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        {/* Category + weight */}
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {product.category && (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>{emoji}</span>
              {product.category}
            </span>
          )}
          {product.weight && (
            <>
              {product.category && <span aria-hidden className="text-gray-300">·</span>}
              <span>{product.weight}</span>
            </>
          )}
        </div>

        {/* Name */}
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-gray-900 transition-colors group-hover:text-[#2563EB]">
          {product.name}
        </h3>

        {/* Brand + rating */}
        <div className="flex items-center justify-between gap-2">
          {product.brand && (
            <p className="truncate text-sm text-gray-600">{product.brand}</p>
          )}
          {totalReviews > 0 && (
            <span className="flex flex-shrink-0 items-center gap-1 text-xs">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              <span className="font-bold text-gray-700">{rating.toFixed(1)}</span>
              <span className="text-gray-400">({totalReviews})</span>
            </span>
          )}
        </div>

        {/* Manufacturer */}
        <div className="mt-1 flex items-center gap-2 border-t border-gray-100 pt-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 ring-1 ring-gray-200">
            {product.fabricant?.logoUrl ? (
              <img
                src={product.fabricant.logoUrl}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-sm font-bold text-[#2563EB]">
                {(fabricantName ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <span className="truncate text-xs font-medium text-gray-700">
              {fabricantName ?? "Fabricant"}
            </span>
            {product.fabricant?.isVerified && (
              <CheckCircle2
                className="h-3.5 w-3.5 flex-shrink-0 text-[#10B981]"
                aria-label="Fabricant vérifié"
              />
            )}
          </div>
        </div>

        {/* Mini transparency bar */}
        <div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 font-medium text-gray-500">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Transparence
            </span>
            <span className="font-bold text-gray-700">{score}/100</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, Math.max(0, score))}%`,
                backgroundColor: cfg.color,
              }}
            />
          </div>
        </div>

        {/* CTA hint */}
        <div className="mt-1 flex items-center justify-end">
          <span className="text-xs font-semibold text-[#2563EB] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            Voir le passeport →
          </span>
        </div>
      </div>
    </Link>
  );
}
