"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Star, QrCode, ShieldCheck, Leaf } from "lucide-react";
import { cn, LEVEL_CONFIG, getLevelFromScore } from "@/lib/utils";

/**
 * DiscoverSectionClient — Nest "Daily Best Sells" style layout.
 *
 * Layout:
 *   - Left: large promo card with green menthe background + CTA "Shop now →"
 *   - Right: 4 small product cards with solid "Scanner le QR" button
 */

export type DiscoverItem = {
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
  items: DiscoverItem[];
};

export function DiscoverSectionClient({ items }: Props) {
  return (
    <section
      id="a-decouvrir"
      className="bg-white py-12 sm:py-16"
      aria-labelledby="discover-title"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2
            id="discover-title"
            className="font-display text-[24px] font-bold text-[#1A1A1A] sm:text-[28px]"
          >
            À découvrir
          </h2>
          <p className="mt-1 text-sm text-[#7A7A7A]">
            Notre sélection de produits à forte transparence
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-5">
          {/* Large promo card — left side */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3BB77E] via-[#2E7D32] to-[#1B5E20] p-6 sm:p-8 lg:col-span-2">
            {/* Decorative leaf icons */}
            <Leaf
              className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 text-white/10"
              aria-hidden
            />
            <Leaf
              className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rotate-180 text-white/10"
              aria-hidden
            />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Top transparence
                </span>
                <h3 className="mt-4 font-display text-[24px] font-bold leading-tight text-white sm:text-[28px]">
                  La transparence,
                  <br />
                  au bout du scan
                </h3>
                <p className="mt-3 max-w-xs text-[13px] text-white/90">
                  Chaque produit vérifié possède un passeport numérique complet :
                  origine, lot, certifications, allergènes.
                </p>
              </div>
              <Link
                href="/produits?sort=transparency"
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-[13px] font-bold text-[#2E7D32] transition-all hover:gap-3 hover:bg-[#F1F8E9]"
              >
                Explorer
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          {/* 4 small product cards — right side */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-3 lg:grid-cols-2">
            {items.map((item) => (
              <DiscoverCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DiscoverCard({ item }: { item: DiscoverItem }) {
  const score = item.transparencyScore;
  const level = getLevelFromScore(score);
  const cfg = LEVEL_CONFIG[level];
  const emoji = item.categoryEmoji ?? "📦";
  const href = item.latestLotId ? `/p/${item.latestLotId}` : `/p/${item.id}`;
  const fabricantName =
    item.fabricant?.companyName ?? item.fabricant?.name ?? "Fabricant";

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-[#ECECEC] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#3BB77E]/30 hover:shadow-lg">
      {/* Image + badges */}
      <div className="relative aspect-square overflow-hidden bg-[#F7F8FA]">
        <span
          className={cn(
            "absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border bg-white/95 px-2 py-0.5 text-[10px] font-bold shadow-sm",
            cfg.borderColor,
            cfg.textColor,
          )}
        >
          <span aria-hidden>{cfg.icon}</span>
          <span className="capitalize">{level}</span>
        </span>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="relative z-[1] h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="relative z-[1] flex h-full w-full items-center justify-center">
            <span
              className="text-4xl transition-transform duration-500 group-hover:scale-110"
              aria-hidden
            >
              {emoji}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#3BB77E]">
          {item.category ?? "Produit"}
        </span>
        <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-[#1A1A1A]">
          {item.name}
        </h3>
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-[#FBA545] text-[#FBA545]" aria-hidden />
          <span className="text-[11px] font-bold text-[#1A1A1A]">
            {item.averageRating.toFixed(1)}
          </span>
          <span className="text-[11px] text-[#7A7A7A]">({item.totalReviews})</span>
          <span className="ml-auto truncate text-[11px] text-[#5A5A5A]">
            {fabricantName}
          </span>
        </div>

        {/* "Scanner le QR" — solid green button */}
        <Link
          href={href}
          className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#3BB77E] px-3 py-2 text-[12px] font-bold text-white transition-all hover:bg-[#2E7D32] active:scale-[0.98]"
        >
          <QrCode className="h-3.5 w-3.5" aria-hidden />
          Scanner le QR
        </Link>
      </div>
    </div>
  );
}
