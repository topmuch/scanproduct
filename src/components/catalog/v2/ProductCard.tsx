import Link from "next/link";
import {
  CheckCircle2,
  Search,
  ShieldCheck,
  Star,
  Flame,
  Sparkles,
  Heart,
  Share2,
} from "lucide-react";
// Note: this is a Server Component. The "favorite" and "share" buttons in the
// hover overlay are decorative-only (no real action yet), so they are rendered
// as non-interactive <span> elements to avoid the "Event handlers cannot be
// passed to Client Component props" error. When real favoriting/sharing is
// implemented, extract them into a small Client Component.
import {
  LEVEL_CONFIG,
  getLevelFromScore,
  cn,
} from "@/lib/utils";
import type { ProductWithRelations } from "@/lib/public-data";

type ViewMode = "grid" | "list";

type Props = {
  product: ProductWithRelations;
  view: ViewMode;
  index: number;
};

// Fallback emoji for categories.
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

// Badge "Nouveau" : 14 jours ET < 5 scans (évite que tous les produits
// d'une DB fraîchement seedée soient marqués Nouveau).
function isNewProduct(
  createdAt: Date | string | null | undefined,
  totalScans: number | null | undefined,
): boolean {
  if (!createdAt) return false;
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return d.getTime() >= fourteenDaysAgo && (totalScans ?? 0) < 5;
}

function isPopularProduct(totalScans: number | null | undefined): boolean {
  return (totalScans ?? 0) >= 50;
}

/**
 * ProductCard v2 — premium card with large image, floating badges, hover
 * overlay actions, and a gradient transparency bar. Supports grid + list views.
 */
export function ProductCard({ product, view, index }: Props) {
  if (view === "list") {
    return <ProductCardList product={product} index={index} />;
  }
  return <ProductCardGrid product={product} index={index} />;
}

// ---------------------------------------------------------------------------
// Grid variant
// ---------------------------------------------------------------------------

function ProductCardGrid({ product, index }: { product: ProductWithRelations; index: number }) {
  const score = product.transparencyScore ?? 0;
  const level = getLevelFromScore(score);
  const cfg = LEVEL_CONFIG[level];

  const emoji = product.categoryRef?.emoji || categoryEmoji(product.category);
  const href = product.latestLot ? `/p/${product.latestLot.id}` : `/p/${product.id}`;
  const isNew = isNewProduct(product.createdAt, product.totalScans);
  const popular = isPopularProduct(product.totalScans);
  const scans = product.totalScans ?? 0;
  const fabricantName = product.fabricant?.companyName ?? product.fabricant?.name ?? null;
  const rating = product.averageRating ?? 0;
  const totalReviews = product.totalReviews ?? 0;

  return (
    <Link
      href={href}
      className="group relative flex animate-fade-in flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-100/50"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      aria-label={`Voir le passeport numérique de ${product.name}`}
    >
      {/* Image area — 4:3 aspect ratio */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/40">
        {/* NOUVEAU / POPULAIRE badges (top-left) */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {isNew && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-red-200">
              <Sparkles className="h-3 w-3" />
              Nouveau
            </span>
          )}
          {popular && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-amber-200">
              <Flame className="h-3 w-3" />
              Populaire
            </span>
          )}
        </div>

        {/* Transparency badge (top-right) */}
        <span
          className={cn(
            "absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full border bg-white/95 px-2.5 py-1 text-[11px] font-bold shadow-sm backdrop-blur",
            cfg.borderColor,
            cfg.textColor,
          )}
        >
          <span aria-hidden className="text-sm leading-none">{cfg.icon}</span>
          <span className="capitalize">{level}</span>
        </span>

        {/* Product image / emoji */}
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="relative z-[1] h-full w-full object-contain p-6 transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="relative z-[1] flex h-full w-full items-center justify-center">
            <span className="text-7xl drop-shadow-sm transition-transform duration-700 group-hover:scale-110" aria-hidden>
              {emoji}
            </span>
          </div>
        )}

        {/* Hover overlay actions (decorative — no onClick in Server Component) */}
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-lg backdrop-blur-sm transition-colors group-hover:text-rose-500"
          >
            <Heart className="h-4 w-4" />
          </span>
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-lg backdrop-blur-sm transition-colors group-hover:text-[#2563EB]"
          >
            <Share2 className="h-4 w-4" />
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        {/* Category + weight */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
            <span aria-hidden>{emoji}</span>
            {product.category ?? "Produit"}
          </span>
          {product.weight && (
            <span className="text-[11px] text-gray-500">{product.weight}</span>
          )}
        </div>

        {/* Name */}
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-gray-900 transition-colors group-hover:text-[#2563EB]">
          {product.name}
        </h3>

        {/* Brand */}
        {product.brand && (
          <p className="text-sm text-gray-600">{product.brand}</p>
        )}

        {/* Manufacturer */}
        <div className="mt-1 flex items-center gap-2">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 ring-1 ring-gray-200">
            {product.fabricant?.logoUrl ? (
              <img src={product.fabricant.logoUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs font-bold text-[#2563EB]">
                {(fabricantName ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="truncate text-xs font-medium text-gray-700">{fabricantName ?? "Fabricant"}</span>
          {product.fabricant?.isVerified && (
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-[#10B981]" aria-label="Vérifié" />
          )}
        </div>

        {/* Footer: rating + scans */}
        <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-3">
          {totalReviews > 0 ? (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              <span className="text-xs font-bold text-gray-700">{rating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({totalReviews})</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Pas encore d'avis</span>
          )}
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Search className="h-3 w-3" aria-hidden />
            <span className="font-medium">{scans.toLocaleString("fr-FR")}</span>
          </span>
        </div>

        {/* Transparency bar */}
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
              className="h-full rounded-full bg-gradient-to-r from-[#2563EB] via-[#8b5cf6] to-[#ec4899] transition-all duration-1000"
              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// List variant
// ---------------------------------------------------------------------------

function ProductCardList({ product, index }: { product: ProductWithRelations; index: number }) {
  const score = product.transparencyScore ?? 0;
  const level = getLevelFromScore(score);
  const cfg = LEVEL_CONFIG[level];

  const emoji = product.categoryRef?.emoji || categoryEmoji(product.category);
  const href = product.latestLot ? `/p/${product.latestLot.id}` : `/p/${product.id}`;
  const isNew = isNewProduct(product.createdAt, product.totalScans);
  const popular = isPopularProduct(product.totalScans);
  const scans = product.totalScans ?? 0;
  const fabricantName = product.fabricant?.companyName ?? product.fabricant?.name ?? null;
  const rating = product.averageRating ?? 0;
  const totalReviews = product.totalReviews ?? 0;

  return (
    <Link
      href={href}
      className="group flex animate-fade-in overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-xl"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      aria-label={`Voir le passeport numérique de ${product.name}`}
    >
      {/* Image (left) */}
      <div className="relative h-40 w-40 flex-shrink-0 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/40 sm:h-48 sm:w-56">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-6xl" aria-hidden>{emoji}</span>
          </div>
        )}
        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1.5">
          {isNew && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-md">
              <Sparkles className="h-2.5 w-2.5" />
              Nouveau
            </span>
          )}
          {popular && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-md">
              <Flame className="h-2.5 w-2.5" />
              Populaire
            </span>
          )}
        </div>
      </div>

      {/* Content (right) */}
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        {/* Top row: category + transparency badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
              <span aria-hidden>{emoji}</span>
              {product.category ?? "Produit"}
            </span>
            {product.weight && (
              <span className="text-[11px] text-gray-500">{product.weight}</span>
            )}
          </div>
          <span
            className={cn(
              "inline-flex flex-shrink-0 items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-[11px] font-bold shadow-sm",
              cfg.borderColor,
              cfg.textColor,
            )}
          >
            <span aria-hidden className="text-sm leading-none">{cfg.icon}</span>
            <span className="capitalize">{level}</span> · {score}
          </span>
        </div>

        {/* Name + brand */}
        <h3 className="text-lg font-bold leading-snug text-gray-900 transition-colors group-hover:text-[#2563EB]">
          {product.name}
        </h3>
        {product.brand && (
          <p className="text-sm text-gray-600">{product.brand}</p>
        )}

        {/* Description (truncated) */}
        {product.description && (
          <p className="line-clamp-2 text-sm text-gray-500">{product.description}</p>
        )}

        {/* Bottom: manufacturer + rating + scans */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 ring-1 ring-gray-200">
              {product.fabricant?.logoUrl ? (
                <img src={product.fabricant.logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="text-sm font-bold text-[#2563EB]">
                  {(fabricantName ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm font-semibold text-gray-900">{fabricantName ?? "Fabricant"}</span>
                {product.fabricant?.isVerified && (
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-[#10B981]" />
                )}
              </div>
              {product.fabricant?.city && (
                <div className="text-xs text-gray-500">{product.fabricant.city}</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {totalReviews > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-gray-700">{rating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({totalReviews})</span>
              </div>
            )}
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Search className="h-4 w-4" aria-hidden />
              <span className="font-medium">{scans.toLocaleString("fr-FR")}</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
