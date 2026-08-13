import Link from "next/link";
import { CheckCircle2, Search } from "lucide-react";
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

function isNewProduct(createdAt: Date | string | null | undefined): boolean {
  if (!createdAt) return false;
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return d.getTime() >= thirtyDaysAgo;
}

/**
 * ProductCard — server component, single product tile in the catalog grid.
 * Links to the product's Digital Passport at `/p/[lotId]` (or `/p/[productId]`
 * as a fallback if no active lot exists yet).
 */
export function ProductCard({ product }: Props) {
  const score = product.transparencyScore ?? 0;
  const level = getLevelFromScore(score);
  const cfg = LEVEL_CONFIG[level];

  const emoji = product.categoryRef?.emoji || categoryEmoji(product.category);
  const href = product.latestLot
    ? `/p/${product.latestLot.id}`
    : `/p/${product.id}`;
  const isNew = isNewProduct(product.createdAt);
  const scans = product.totalScans ?? 0;
  const fabricantName =
    product.fabricant?.companyName ?? product.fabricant?.name ?? null;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
      aria-label={`Voir le passeport numérique de ${product.name}`}
    >
      {/* Image area */}
      <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-green-50">
        {/* NOUVEAU badge (top-left) */}
        {isNew && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center rounded-full bg-[#EF4444] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
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

        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="relative z-[1] max-h-40 w-auto object-contain p-4 transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span
            className="relative z-[1] text-7xl leading-none transition-transform duration-300 group-hover:scale-110"
            aria-hidden
          >
            {emoji}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        {/* Category + weight */}
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          {product.category && (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>{emoji}</span>
              {product.category}
            </span>
          )}
          {product.weight && (
            <>
              {product.category && <span aria-hidden>·</span>}
              <span>{product.weight}</span>
            </>
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

        {/* Manufacturer + scans */}
        <div className="mt-1 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-50 ring-1 ring-gray-200">
              {product.fabricant?.logoUrl ? (
                <img
                  src={product.fabricant.logoUrl}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs font-bold text-blue-600">
                  {(fabricantName ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-1">
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
          <span className="flex flex-shrink-0 items-center gap-1 text-xs text-gray-500">
            <Search className="h-3 w-3" aria-hidden />
            {scans.toLocaleString("fr-FR")}
          </span>
        </div>

        {/* Mini transparency bar */}
        <div className="mt-1">
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>Transparence</span>
            <span className="font-bold text-gray-700">{score}/100</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, score))}%`,
                backgroundColor: cfg.color,
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
