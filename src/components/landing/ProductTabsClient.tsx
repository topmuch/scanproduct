"use client";

import * as React from "react";
import Link from "next/link";
import { Star, Search, ShieldCheck, QrCode } from "lucide-react";
import { cn, LEVEL_CONFIG, getLevelFromScore } from "@/lib/utils";

/**
 * ProductTabsClient — 4-column tabbed product lists (Nest style).
 *
 * Each column is a vertical list of 4 compact rows (image + name + rating +
 * small "Scanner le QR" button). On mobile, the 4 columns stack vertically.
 */

export type ProductTabItem = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  categoryEmoji: string | null;
  imageUrl: string | null;
  weight: string | null;
  averageRating: number;
  totalReviews: number;
  transparencyScore: number;
  totalScans: number;
  latestLotId: string | null;
};

type Tabs = {
  topScanned: ProductTabItem[];
  trending: ProductTabItem[];
  recent: ProductTabItem[];
  topRated: ProductTabItem[];
};

type Props = {
  tabs: Tabs;
};

const TAB_DEFS: { id: keyof Tabs; title: string; subtitle: string }[] = [
  { id: "topScanned", title: "Top scannés", subtitle: "Les plus consultés" },
  { id: "trending", title: "Tendance", subtitle: "Les mieux notés" },
  { id: "recent", title: "Récents", subtitle: "Derniers ajouts" },
  { id: "topRated", title: "Top transparence", subtitle: "Score maximal" },
];

export function ProductTabsClient({ tabs }: Props) {
  return (
    <section
      id="tabs-listes"
      className="bg-white py-12 sm:py-16"
      aria-labelledby="product-tabs-title"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2
            id="product-tabs-title"
            className="font-display text-[24px] font-bold text-[#1A1A1A] sm:text-[28px]"
          >
            Parcourir par popularité
          </h2>
          <p className="mt-1 text-sm text-[#7A7A7A]">
            Quatre façons de découvrir les produits VerifScan
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {TAB_DEFS.map((def) => (
            <TabColumn key={def.id} title={def.title} subtitle={def.subtitle} items={tabs[def.id]} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TabColumn({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: ProductTabItem[];
}) {
  return (
    <div className="rounded-xl border border-[#ECECEC] bg-white p-4">
      <div className="mb-3 border-b border-[#F1F1F1] pb-3">
        <h3 className="text-[15px] font-bold text-[#1A1A1A]">{title}</h3>
        <p className="text-[11px] text-[#7A7A7A]">{subtitle}</p>
      </div>
      <ul className="space-y-3">
        {items.length === 0 ? (
          <li className="py-6 text-center text-[12px] text-[#B0B0B0]">Aucun produit</li>
        ) : (
          items.map((item) => (
            <TabRow key={item.id} item={item} />
          ))
        )}
      </ul>
    </div>
  );
}

function TabRow({ item }: { item: ProductTabItem }) {
  const emoji = item.categoryEmoji ?? "📦";
  const href = item.latestLotId ? `/p/${item.latestLotId}` : `/p/${item.id}`;
  const level = getLevelFromScore(item.transparencyScore);
  const cfg = LEVEL_CONFIG[level];

  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-lg p-1 transition-all hover:bg-[#F7F8FA]"
      >
        {/* Mini image */}
        <div className="relative flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F7F8FA]">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-contain p-1.5"
              loading="lazy"
            />
          ) : (
            <span className="text-2xl" aria-hidden>
              {emoji}
            </span>
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-1 text-[12px] font-semibold text-[#1A1A1A] group-hover:text-[#3BB77E]">
            {item.name}
          </h4>
          <div className="mt-0.5 flex items-center gap-1">
            <Star className="h-3 w-3 fill-[#FBA545] text-[#FBA545]" aria-hidden />
            <span className="text-[11px] font-bold text-[#1A1A1A]">
              {item.averageRating.toFixed(1)}
            </span>
            <span className="text-[11px] text-[#7A7A7A]">({item.totalReviews})</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#7A7A7A]">
            <ShieldCheck className={cn("h-3 w-3", cfg.textColor)} aria-hidden />
            <span>{item.transparencyScore}/100</span>
            <span className="mx-1">•</span>
            <Search className="h-2.5 w-2.5" aria-hidden />
            <span>{item.totalScans.toLocaleString("fr-FR")}</span>
          </div>
        </div>

        {/* Scanner icon */}
        <span
          aria-hidden
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#F2FCEC] text-[#3BB77E] transition-all group-hover:bg-[#3BB77E] group-hover:text-white"
        >
          <QrCode className="h-4 w-4" />
        </span>
      </Link>
    </li>
  );
}
