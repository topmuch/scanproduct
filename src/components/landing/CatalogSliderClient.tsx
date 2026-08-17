"use client";

import * as React from "react";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import {
  CheckCircle2,
  Search,
  ShieldCheck,
  Star,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn, LEVEL_CONFIG, getLevelFromScore } from "@/lib/utils";

/**
 * CatalogSliderClient — auto-scrolling carousel of real catalog products.
 *
 * - 1 slide on mobile, 2 on sm, 3 on lg, 4 on xl.
 * - Auto-advances every 4s; pauses on hover/focus.
 * - Manual prev/next arrows + dot indicators.
 * - Final CTA links to /produits (the full catalog).
 *
 * Data is passed from the server parent <CatalogSlider /> so we don't ship any
 * DB code to the client.
 */

export type CatalogSliderItem = {
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
  items: CatalogSliderItem[];
};

// Fallback emoji for categories without an emoji in DB.
const CATEGORY_EMOJI_FALLBACK: Record<string, string> = {
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

function emojiFor(category: string | null, dbEmoji: string | null): string {
  if (dbEmoji) return dbEmoji;
  if (!category) return "📦";
  const k = category.toLowerCase().trim();
  for (const [key, val] of Object.entries(CATEGORY_EMOJI_FALLBACK)) {
    if (k.includes(key)) return val;
  }
  return "📦";
}

export function CatalogSliderClient({ items }: Props) {
  const plugin = React.useRef(
    Autoplay({
      delay: 4000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      // Pause when the carousel is off-screen to save CPU.
      // The plugin doesn't have a built-in IntersectionObserver, but
      // stopOnMouseEnter covers the common case (user is browsing).
    }),
  );

  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Number of dot indicators — capped at 8 so a long catalog doesn't produce
  // dozens of dots. Each dot corresponds to a "page" of slides.
  const dotCount = Math.min(count, 8);

  return (
    <section
      id="catalogue-slider"
      className="relative bg-gradient-to-b from-white via-[#F9FAFB] to-white py-16 sm:py-20 lg:py-24"
      aria-labelledby="catalog-slider-title"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            <Package className="h-3.5 w-3.5" />
            Catalogue
          </span>
          <h2
            id="catalog-slider-title"
            className="mt-4 font-display text-[28px] font-semibold leading-tight text-[#111827] sm:text-[36px] lg:text-[40px]"
          >
            Découvrez des produits authentiques
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-base text-[#6B7280]">
            Chaque produit vérifié par VerifScan possède un passeport numérique
            scannable. Parcourez les plus populaires ci-dessous.
          </p>
        </div>

        {/* Carousel */}
        <div className="relative mt-12">
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: items.length > 4,
              dragFree: false,
            }}
            plugins={[plugin.current]}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {items.map((item) => (
                <CarouselItem
                  key={item.id}
                  className="basis-full pl-4 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <SliderCard item={item} />
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* Arrows — only on >= sm, hidden on mobile (swipe instead) */}
            <CarouselArrow
              direction="prev"
              className="hidden sm:flex"
              api={api}
            />
            <CarouselArrow
              direction="next"
              className="hidden sm:flex"
              api={api}
            />
          </Carousel>
        </div>

        {/* Dot indicators */}
        {dotCount > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {Array.from({ length: dotCount }).map((_, i) => {
              const isActive = i === current % dotCount;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`Aller à la page ${i + 1}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => api?.scrollTo(i)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    isActive
                      ? "w-8 bg-[#2563EB]"
                      : "w-2 bg-gray-300 hover:bg-gray-400",
                  )}
                />
              );
            })}
          </div>
        )}

        {/* CTA → full catalog */}
        <div className="mt-10 text-center">
          <Link
            href="/produits"
            className="group inline-flex items-center justify-center gap-2 rounded-[10px] border-2 border-[#2563EB] bg-white px-7 py-3 text-base font-semibold text-[#2563EB] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#2563EB] hover:text-white hover:shadow-lg hover:shadow-[#2563EB]/25"
          >
            Voir tout le catalogue
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Slider card — a compact version of the catalog ProductCard.
// ---------------------------------------------------------------------------

function SliderCard({ item }: { item: CatalogSliderItem }) {
  const score = item.transparencyScore;
  const level = getLevelFromScore(score);
  const cfg = LEVEL_CONFIG[level];
  const emoji = emojiFor(item.category, item.categoryEmoji);
  const href = item.latestLotId ? `/p/${item.latestLotId}` : `/p/${item.id}`;
  const fabricantName =
    item.fabricant?.companyName ?? item.fabricant?.name ?? "Fabricant";

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/50"
      aria-label={`Voir le passeport numérique de ${item.name}`}
    >
      {/* Image area — taller (1:1 square) so the product photo is more visible.
          p-7 gives more breathing room around the image. */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 via-white to-blue-50/40">
        {/* Transparency badge (top-right) */}
        <span
          className={cn(
            "absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full border bg-white/95 px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur",
            cfg.borderColor,
            cfg.textColor,
          )}
        >
          <span aria-hidden className="text-xs leading-none">{cfg.icon}</span>
          <span className="capitalize">{level}</span>
        </span>

        {/* Product image / emoji */}
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="relative z-[1] h-full w-full object-contain p-7 transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="relative z-[1] flex h-full w-full items-center justify-center">
            <span
              className="text-6xl drop-shadow-sm transition-transform duration-500 group-hover:scale-110"
              aria-hidden
            >
              {emoji}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Category + weight */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]">
            <span aria-hidden>{emoji}</span>
            {item.category ?? "Produit"}
          </span>
          {item.weight && (
            <span className="text-[10px] text-gray-500">{item.weight}</span>
          )}
        </div>

        {/* Name */}
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900 transition-colors group-hover:text-[#2563EB]">
          {item.name}
        </h3>

        {/* Brand */}
        {item.brand && (
          <p className="text-xs text-gray-600">{item.brand}</p>
        )}

        {/* Manufacturer */}
        <div className="mt-1 flex items-center gap-1.5">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-gray-50 to-gray-100 ring-1 ring-gray-200">
            {item.fabricant?.logoUrl ? (
              <img
                src={item.fabricant.logoUrl}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-[10px] font-bold text-[#2563EB]">
                {fabricantName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="truncate text-[11px] font-medium text-gray-700">
            {fabricantName}
          </span>
          {item.fabricant?.isVerified && (
            <CheckCircle2
              className="h-3 w-3 flex-shrink-0 text-[#10B981]"
              aria-label="Vérifié"
            />
          )}
        </div>

        {/* Footer: rating + scans */}
        <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-2.5">
          {item.totalReviews > 0 ? (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
              <span className="text-[11px] font-bold text-gray-700">
                {item.averageRating.toFixed(1)}
              </span>
              <span className="text-[11px] text-gray-400">
                ({item.totalReviews})
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-gray-400">Pas encore d&apos;avis</span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <Search className="h-3 w-3" aria-hidden />
            <span className="font-medium">
              {item.totalScans.toLocaleString("fr-FR")}
            </span>
          </span>
        </div>

        {/* Transparency bar */}
        <div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 font-medium text-gray-500">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Transparence
            </span>
            <span className="font-bold text-gray-700">{score}/100</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
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
// Arrow buttons — sit outside the carousel viewport so they don't overlap
// card content. Hidden on mobile (where swipe is the natural interaction).
// ---------------------------------------------------------------------------

function CarouselArrow({
  direction,
  className,
  api,
}: {
  direction: "prev" | "next";
  className?: string;
  api?: CarouselApi;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const onClick = () => {
    if (!api) return;
    if (direction === "prev") api.scrollPrev();
    else api.scrollNext();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Précédent" : "Suivant"}
      className={cn(
        "absolute top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-lg backdrop-blur transition-all duration-200 hover:scale-110 hover:border-[#2563EB] hover:text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100",
        direction === "prev" ? "-left-3 lg:-left-5" : "-right-3 lg:-right-5",
        className,
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
