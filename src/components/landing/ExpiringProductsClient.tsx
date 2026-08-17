"use client";

import * as React from "react";
import Link from "next/link";
import { Star, QrCode, Clock, AlertTriangle } from "lucide-react";
import { cn, LEVEL_CONFIG, getLevelFromScore } from "@/lib/utils";

/**
 * ExpiringProductsClient — Nest "Deals Of The Day" style with live countdown.
 *
 * Each card:
 *   - Image
 *   - Countdown (Days / Hours / Mins / Secs) until expiry
 *   - Name + brand + rating
 *   - "Scanner le QR" CTA → /p/[lotId]
 *
 * The countdown ticks every second via useEffect + setInterval. Pause when
 * the tab is hidden to save CPU (same pattern as FabricantHeader).
 */

export type ExpiringProductItem = {
  lotId: string;
  lotReference: string;
  expiryDate: string; // ISO
  productName: string;
  productBrand: string | null;
  productImage: string | null;
  productWeight: string | null;
  category: string | null;
  categoryEmoji: string | null;
  transparencyScore: number;
  averageRating: number;
  totalReviews: number;
  fabricant: {
    companyName: string | null;
    logoUrl: string | null;
    isVerified: boolean;
  } | null;
};

type Props = {
  items: ExpiringProductItem[];
};

function useNow(intervalMs: number = 1000): Date {
  const [now, setNow] = React.useState<Date>(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        setNow(new Date());
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function diffParts(target: Date, now: Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);
  return { days, hours, minutes, seconds, expired: false };
}

export function ExpiringProductsClient({ items }: Props) {
  return (
    <section
      id="expiration"
      className="bg-[#F7F8FA] py-12 sm:py-16"
      aria-labelledby="expiring-title"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3E0] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#E65100]">
              <Clock className="h-3 w-3" aria-hidden />
              À scanner avant péremption
            </span>
            <h2
              id="expiring-title"
              className="mt-3 font-display text-[24px] font-bold text-[#1A1A1A] sm:text-[28px]"
            >
              Produits bientôt périmés
            </h2>
            <p className="mt-1 text-sm text-[#7A7A7A]">
              Ces lots expirent prochainement — scannez-les avant la date limite
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <ExpiringCard key={item.lotId} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ExpiringCard({ item }: { item: ExpiringProductItem }) {
  const now = useNow(1000);
  const expiry = React.useMemo(() => new Date(item.expiryDate), [item.expiryDate]);
  const t = diffParts(expiry, now);
  const emoji = item.categoryEmoji ?? "📦";
  const level = getLevelFromScore(item.transparencyScore);
  const cfg = LEVEL_CONFIG[level];
  const fabricantName = item.fabricant?.companyName ?? "Fabricant";

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-[#ECECEC] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Image — taller portrait (4:5) so the photo is more visible */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[#F7F8FA]">
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

        {/* "Bientôt périmé" warning badge */}
        <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded bg-[#FF5252] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          <AlertTriangle className="h-3 w-3" aria-hidden />
          Bientôt périmé
        </span>

        {item.productImage ? (
          <img
            src={item.productImage}
            alt={item.productName}
            className="relative z-[1] h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-110 sm:p-6"
            loading="lazy"
          />
        ) : (
          <div className="relative z-[1] flex h-full w-full items-center justify-center">
            <span
              className="text-5xl transition-transform duration-500 group-hover:scale-110"
              aria-hidden
            >
              {emoji}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#3BB77E]">
          {item.category ?? "Produit"}
        </span>
        <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-[#1A1A1A] sm:text-sm">
          {item.productName}
        </h3>
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-[#FBA545] text-[#FBA545]" aria-hidden />
          <span className="text-[11px] font-bold text-[#1A1A1A]">
            {item.averageRating.toFixed(1)}
          </span>
          <span className="text-[11px] text-[#7A7A7A]">({item.totalReviews})</span>
          <span className="ml-auto truncate text-[11px] text-[#5A5A5A]">{fabricantName}</span>
        </div>

        {/* Countdown */}
        <div className="mt-1 rounded-lg bg-[#FAFAFA] p-2">
          {t.expired ? (
            <p className="text-center text-[11px] font-bold text-[#FF5252]">
              Expiré — ne pas consommer
            </p>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <CountdownBox value={t.days} label="Jours" />
              <CountdownSep />
              <CountdownBox value={t.hours} label="Heures" />
              <CountdownSep />
              <CountdownBox value={t.minutes} label="Min" />
              <CountdownSep />
              <CountdownBox value={t.seconds} label="Sec" />
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href={`/p/${item.lotId}`}
          className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#3BB77E] px-3 py-2 text-[12px] font-bold text-white transition-all hover:bg-[#2E7D32] active:scale-[0.98]"
        >
          <QrCode className="h-3.5 w-3.5" aria-hidden />
          Scanner le QR
        </Link>
      </div>
    </div>
  );
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="min-w-[28px] rounded bg-white px-1.5 py-0.5 text-center text-[14px] font-bold text-[#1A1A1A] shadow-sm">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-0.5 text-[9px] uppercase tracking-wide text-[#7A7A7A]">{label}</span>
    </div>
  );
}

function CountdownSep() {
  return <span className="text-[14px] font-bold text-[#B0B0B0]">:</span>;
}
