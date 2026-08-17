"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Search,
  Star,
  QrCode,
  Flame,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { cn, LEVEL_CONFIG, getLevelFromScore } from "@/lib/utils";

/**
 * PopularProductsGrid — client component (5-col grid of Nest-style cards).
 *
 * Each card:
 *   - Badge top-left: "New" / "Hot" / "Vérifié" / transparency level
 *   - Image (object-contain, ~200px tall, soft gray background)
 *   - Category (small green text)
 *   - Name (2-line clamp, bold)
 *   - Manufacturer with verified badge
 *   - Rating stars + scans count
 *   - "Scanner le QR" CTA → /p/[lotId]
 *
 * Hover: shadow + translate-y + image scale.
 */

export type PopularProductItem = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  weight: string | null;
  transparencyScore: number;
  totalScans: number;
  averageRating: number;
  totalReviews: number;
  categoryEmoji: string | null;
  fabricant: {
    name: string | null;
    companyName: string | null;
    logoUrl: string | null;
    isVerified: boolean;
  } | null;
  latestLotId: string | null;
};

type Props = {
  items: PopularProductItem[];
  /** Optional: override the section title (default: "Produits populaires") */
  title?: string;
  /** Optional: override the section subtitle */
  subtitle?: string;
  /** Optional: override the section id (default: "produits-populaires") */
  sectionId?: string;
  /** Optional: hide the "Voir tout" link (default: visible, links to /produits) */
  showViewAll?: boolean;
  /** Optional: empty-state message when items is empty */
  emptyMessage?: string;
};

// Pick a badge for the card based on heuristics. Stable per product (hash id).
function badgeFor(item: PopularProductItem): {
  label: string;
  className: string;
} | null {
  // Verified manufacturer → green badge
  if (item.fabricant?.isVerified) {
    return {
      label: "Vérifié",
      className: "bg-[#3BB77E] text-white",
    };
  }
  // High transparency → platine badge
  if (item.transparencyScore >= 91) {
    return {
      label: "Platine",
      className: "bg-[#00BCD4] text-white",
    };
  }
  // Lots of scans → hot
  if (item.totalScans >= 20) {
    return {
      label: "Hot",
      className: "bg-[#FF5252] text-white",
    };
  }
  // New (recently created — id starts with a recent marker)
  // Fallback: no badge
  return null;
}

export function PopularProductsGrid({
  items,
  title = "Produits populaires",
  subtitle = "Les plus scannés par la communauté VerifScan",
  sectionId = "produits-populaires",
  showViewAll = true,
  emptyMessage = "Aucun produit dans cette sélection pour le moment.",
}: Props) {
  const titleId = `${sectionId}-title`;
  return (
    <section
      id={sectionId}
      className="bg-[#F7F8FA] py-12 sm:py-16"
      aria-labelledby={titleId}
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2
              id={titleId}
              className="font-display text-[24px] font-bold text-[#1A1A1A] sm:text-[28px]"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-[#7A7A7A]">{subtitle}</p>
            )}
          </div>
          {showViewAll && (
            <Link
              href="/produits"
              className="hidden items-center gap-1 text-sm font-semibold text-[#3BB77E] hover:underline sm:inline-flex"
            >
              Voir tout
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E0E0E0] bg-white py-16 text-center">
            <p className="text-sm text-[#7A7A7A]">{emptyMessage}</p>
          </div>
        ) : (
          <>
            {/* 3 cols on desktop (down from 4) for even bigger images.
                2 cols mobile, 3 sm + lg. */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-3 lg:gap-6">
              {items.map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>

            {/* Mobile CTA */}
            {showViewAll && (
              <div className="mt-6 text-center sm:hidden">
                <Link
                  href="/produits"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#3BB77E] px-6 py-2.5 text-sm font-semibold text-[#3BB77E]"
                >
                  Voir tout le catalogue
                  <span aria-hidden>→</span>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function ProductCard({ item }: { item: PopularProductItem }) {
  const score = item.transparencyScore;
  const level = getLevelFromScore(score);
  const cfg = LEVEL_CONFIG[level];
  const emoji = item.categoryEmoji ?? "📦";
  const href = item.latestLotId ? `/p/${item.latestLotId}` : `/p/${item.id}`;
  const fabricantName =
    item.fabricant?.companyName ?? item.fabricant?.name ?? "Fabricant";
  const badge = badgeFor(item);

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#ECECEC] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#3BB77E]/30 hover:shadow-lg hover:shadow-[#3BB77E]/5">
      {/* Image — bigger area: 1:1 square with generous padding so the
          product photo is clearly visible (cards are now 4 cols, not 5). */}
      <div className="relative aspect-square overflow-hidden bg-[#F7F8FA]">
        {/* Badge top-left */}
        {badge && (
          <span
            className={cn(
              "absolute left-2.5 top-2.5 z-10 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        )}
        {/* Transparency level badge top-right */}
        <span
          className={cn(
            "absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full border bg-white/95 px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur",
            cfg.borderColor,
            cfg.textColor,
          )}
        >
          <span aria-hidden>{cfg.icon}</span>
          <span className="capitalize">{level}</span>
        </span>

        {/* Image / emoji */}
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="relative z-[1] h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-110 sm:p-8"
            loading="lazy"
          />
        ) : (
          <div className="relative z-[1] flex h-full w-full items-center justify-center">
            <span
              className="text-5xl drop-shadow-sm transition-transform duration-500 group-hover:scale-110"
              aria-hidden
            >
              {emoji}
            </span>
          </div>
        )}
      </div>

      {/* Body — more padding + bigger text now that cards are larger */}
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        {/* Category */}
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#3BB77E]">
          {item.category ?? "Produit"}
        </span>

        {/* Name — bigger text (was 13px/sm) */}
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-[#1A1A1A] sm:text-base">
          {item.name}
        </h3>

        {/* Manufacturer */}
        <div className="flex items-center gap-1">
          <span className="truncate text-[11px] text-[#5A5A5A]">{fabricantName}</span>
          {item.fabricant?.isVerified && (
            <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-[#3BB77E]" aria-label="Vérifié" />
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-[#FBA545] text-[#FBA545]" aria-hidden />
          <span className="text-[11px] font-bold text-[#1A1A1A]">
            {item.averageRating.toFixed(1)}
          </span>
          <span className="text-[11px] text-[#7A7A7A]">({item.totalReviews})</span>
          <span className="ml-auto flex items-center gap-1 text-[11px] text-[#7A7A7A]">
            <Search className="h-3 w-3" aria-hidden />
            {item.totalScans.toLocaleString("fr-FR")}
          </span>
        </div>

        {/* Weight + transparency */}
        <div className="flex items-center justify-between border-t border-[#F1F1F1] pt-2">
          {item.weight ? (
            <span className="text-[11px] text-[#7A7A7A]">{item.weight}</span>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-1 text-[11px] font-medium text-[#7A7A7A]">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            {score}/100
          </span>
        </div>

        {/* CTA: Scanner le QR */}
        <Link
          href={href}
          className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#3BB77E] px-3 py-2 text-[12px] font-semibold text-white transition-all hover:bg-[#2E7D32] active:scale-[0.98]"
        >
          <QrCode className="h-3.5 w-3.5" aria-hidden />
          Scanner le QR
        </Link>
      </div>
    </div>
  );
}

// Re-export for type-only consumers
export type { PopularProductItem as ProductItem };
