"use client";

import * as React from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  CheckCircle2,
  Star,
  Weight,
  QrCode,
  ShieldCheck,
  Award,
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  Globe,
  TrendingUp,
  ScanLine,
  Calendar,
  Building2,
  ArrowRight,
} from "lucide-react";
import type { LotWithDetails } from "@/lib/public-data";
import { getScanUrl } from "@/lib/qr-utils";
import {
  LEVEL_CONFIG,
  getPercentileRank,
  type TransparencyResult,
} from "@/lib/utils";

/**
 * ProductHero3Col
 *
 * Redesigned product hero inspired by a 3-column editorial catalog template:
 *
 *   ┌───────────────────────────────┬──────────────┐
 *   │  2 columns of LARGE image     │  Dark        │
 *   │  cards (product, QR, certs,   │  sidebar     │
 *   │  manufacturer)                │  with key    │
 *   │                               │  info + CTA  │
 *   └───────────────────────────────┴──────────────┘
 *
 * Left 2 columns = a 2×2 grid of big image cards so the product imagery is
 * displayed prominently (the previous design had a single small ~256px image).
 * Right column = a dark slate-900 sidebar with the product name, transparency
 * score badge (big %), description, manufacturer, stats, and contact CTAs.
 *
 * This component consolidates the previous ProductHeader + QuickStats +
 * TransparencyScore (summary) + QRCodeSection (visual) + ContactManufacturer
 * (summary) into a single above-the-fold hero. The detailed sections
 * (TraceabilityInfo, LotHistory, full Certifications list, AllergensInfo,
 * full TransparencyScore breakdown, Reviews, SimilarProducts) remain rendered
 * below this hero in page.tsx.
 */

type Props = {
  product: LotWithDetails["product"];
  lot: LotWithDetails;
  fabricant: LotWithDetails["fabricant"];
  transparency: TransparencyResult;
  scans: number;
  totalCerts: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function normalizePhone(p: string): string {
  const trimmed = p.trim();
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`Note ${rating.toFixed(1)} sur 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= Math.round(rating)
              ? "h-4 w-4 fill-amber-400 text-amber-400"
              : "h-4 w-4 text-slate-500"
          }
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image card (one tile in the 2×2 left grid)
// ---------------------------------------------------------------------------

type ImageCardProps = {
  label: string;
  accent: string; // tailwind text color, e.g. "text-[#2563EB]"
  children: React.ReactNode;
  className?: string;
};

function ImageCard({ label, accent, children, className = "" }: ImageCardProps) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)] ${className}`}
    >
      {/* Top label bar */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <span
          className={`text-[11px] font-bold uppercase tracking-[0.12em] ${accent}`}
        >
          {label}
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" aria-hidden />
      </div>
      {/* Big visual area */}
      <div className="relative flex flex-1 items-center justify-center bg-slate-50 p-5">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProductHero3Col({
  product,
  lot,
  fabricant,
  transparency,
  scans,
  totalCerts,
}: Props) {
  const emoji = categoryEmoji(product.category);
  const rating = product.averageRating ?? 0;
  const totalReviews = product.totalReviews ?? 0;

  const levelConfig = LEVEL_CONFIG[transparency.level];
  const percentile = getPercentileRank(transparency.score);

  const publicUrl = getScanUrl(lot.id);
  const qrCanvasRef = React.useRef<HTMLDivElement>(null);

  const phone = fabricant.phone ?? null;
  const whatsapp = fabricant.whatsapp ?? null;
  const email = fabricant.email ?? null;
  const address = [fabricant.city, fabricant.country]
    .filter(Boolean)
    .join(", ");

  // Brand accent per transparency level
  const accentHex =
    transparency.level === "platine"
      ? "#8B5CF6"
      : transparency.level === "or"
        ? "#F59E0B"
        : transparency.level === "argent"
          ? "#64748B"
          : "#D97706";

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.08)]">
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* ============================================================= */}
        {/* LEFT: 2 columns of large image cards (spans 2 of 3 columns)   */}
        {/* ============================================================= */}
        <div className="lg:col-span-2 lg:border-r lg:border-slate-200">
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-5 lg:p-6">
            {/* (1) Main product image — LARGE, square-ish */}
            <ImageCard
              label="Produit"
              accent="text-[#2563EB]"
              className="sm:col-span-2"
            >
              <div className="relative flex aspect-[16/10] w-full items-center justify-center sm:aspect-[2/1]">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full rounded-xl object-cover shadow-sm transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div
                    className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 via-white to-green-50"
                    aria-hidden
                  >
                    <span className="text-[120px] leading-none">{emoji}</span>
                  </div>
                )}
                {/* Brand + weight badge overlay (echoes the reference price tag) */}
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                  {product.brand && (
                    <span className="inline-flex items-center rounded-full bg-[#2563EB] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-md">
                      {product.brand}
                    </span>
                  )}
                  {(product.weight || lot.weight) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-800 shadow-md ring-1 ring-slate-200">
                      <Weight className="h-3 w-3" />
                      {product.weight || lot.weight}
                    </span>
                  )}
                </div>
              </div>
            </ImageCard>

            {/* (2) QR code — LARGE */}
            <ImageCard label="QR code unique" accent="text-[#10B981]">
              <div className="flex w-full flex-col items-center gap-3">
                <div
                  ref={qrCanvasRef}
                  className="flex h-44 w-44 items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-3 shadow-sm"
                >
                  <QRCodeCanvas
                    value={publicUrl}
                    size={160}
                    level="H"
                    marginSize={0}
                    fgColor="#0F172A"
                    bgColor="#FFFFFF"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <QrCode className="h-3.5 w-3.5" />
                  <span className="font-mono">{lot.reference}</span>
                </div>
              </div>
            </ImageCard>

            {/* (3) Manufacturer — LARGE */}
            <ImageCard label="Fabricant" accent="text-[#F59E0B]">
              <div className="flex w-full flex-col items-center gap-3 text-center">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200">
                  {fabricant.logoUrl ? (
                    <img
                      src={fabricant.logoUrl}
                      alt={fabricant.companyName ?? "Logo"}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-[#2563EB]">
                      {(fabricant.companyName ?? fabricant.name ?? "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-center gap-1.5">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {fabricant.companyName ?? fabricant.name ?? "Fabricant"}
                    </p>
                    {fabricant.isVerified && (
                      <CheckCircle2
                        className="h-4 w-4 flex-shrink-0 text-[#2563EB]"
                        aria-label="Fabricant vérifié"
                      />
                    )}
                  </div>
                  {fabricant.sector && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {fabricant.sector}
                    </p>
                  )}
                  {address && (
                    <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {address}
                    </p>
                  )}
                </div>
              </div>
            </ImageCard>

            {/* (4) Certifications summary — LARGE */}
            <ImageCard
              label="Certifications"
              accent="text-[#8B5CF6]"
              className="sm:col-span-2"
            >
              <div className="flex w-full flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <Award className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-2xl font-extrabold text-slate-900">
                        {totalCerts}
                      </p>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        certification{totalCerts > 1 ? "s" : ""} vérifiée
                        {totalCerts > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 ring-1 ring-green-200">
                    <ShieldCheck className="h-4 w-4" />
                    {fabricant.isVerified ? "Fabricant vérifié" : "Vérifié"}
                  </div>
                </div>

                {/* Cert chips */}
                <div className="flex flex-wrap gap-2">
                  {lot.lotCerts && lot.lotCerts.length > 0 ? (
                    lot.lotCerts.slice(0, 4).map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
                      >
                        <span aria-hidden>📜</span>
                        {c.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">
                      Certifications du lot à venir
                    </span>
                  )}
                  {fabricant.fabricantCerts &&
                    fabricant.fabricantCerts.slice(0, 2).map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 shadow-sm"
                      >
                        <span aria-hidden>✓</span>
                        {c.name}
                      </span>
                    ))}
                </div>
              </div>
            </ImageCard>
          </div>
        </div>

        {/* ============================================================= */}
        {/* RIGHT: Dark sidebar with key product info + CTA               */}
        {/* ============================================================= */}
        <aside className="flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 p-6 text-white sm:p-7 lg:p-8">
          {/* Category badge */}
          {product.category && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white ring-1 ring-white/20">
              <span aria-hidden>{emoji}</span>
              {product.category}
            </span>
          )}

          {/* Product name */}
          <h1 className="mt-4 font-display text-[26px] font-bold leading-tight tracking-tight text-white sm:text-[30px] lg:text-[34px]">
            {product.name}
          </h1>

          {/* Rating */}
          {totalReviews > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <Stars rating={rating} />
              <span className="text-sm font-semibold text-white">
                {rating.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">
                ({totalReviews} avis)
              </span>
            </div>
          )}

          {/* Transparency score — big badge echoing the reference "60%" promo */}
          <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Score de transparence
                </p>
                <p className="mt-1 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">
                    {transparency.percentage}%
                  </span>
                  <span className="text-sm font-semibold text-slate-400">
                    {transparency.score}/{transparency.maxScore}
                  </span>
                </p>
              </div>
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-lg"
                style={{ backgroundColor: `${accentHex}25` }}
                aria-hidden
              >
                {levelConfig.icon}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${transparency.percentage}%`,
                  backgroundColor: accentHex,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-white">
                {levelConfig.label}
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <TrendingUp className="h-3 w-3" />
                Top {percentile}%
              </span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <p className="mt-5 text-sm leading-relaxed text-slate-300">
              {product.description}
            </p>
          )}

          {/* Key stats row */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/5 p-2.5 text-center ring-1 ring-white/10">
              <ScanLine className="mx-auto h-4 w-4 text-[#10B981]" />
              <p className="mt-1 text-base font-bold text-white">
                {scans.toLocaleString("fr-FR")}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                Scans
              </p>
            </div>
            <div className="rounded-xl bg-white/5 p-2.5 text-center ring-1 ring-white/10">
              <Calendar className="mx-auto h-4 w-4 text-[#F59E0B]" />
              <p className="mt-1 truncate text-base font-bold text-white">
                {lot.manufactureDate
                  ? new Date(lot.manufactureDate).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                    })
                  : "—"}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                Fabrication
              </p>
            </div>
            <div className="rounded-xl bg-white/5 p-2.5 text-center ring-1 ring-white/10">
              <Building2 className="mx-auto h-4 w-4 text-[#2563EB]" />
              <p className="mt-1 truncate text-base font-bold text-white">
                {fabricant.companyName?.charAt(0) ?? "F"}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                Fabricant
              </p>
            </div>
          </div>

          {/* Contact CTAs */}
          <div className="mt-6 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Contacter le fabricant
            </p>
            <div className="grid grid-cols-2 gap-2">
              {whatsapp && (
                <a
                  href={`https://wa.me/${normalizePhone(whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#10B981] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#059669]"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#1D4ED8]"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </a>
              )}
              {phone && !whatsapp && (
                <a
                  href={`tel:${normalizePhone(phone)}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10"
                >
                  <Phone className="h-4 w-4" />
                  Appeler
                </a>
              )}
              {fabricant.website && (
                <a
                  href={fabricant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10"
                >
                  <Globe className="h-4 w-4" />
                  Site web
                </a>
              )}
            </div>
          </div>

          {/* Footer link: full contact details anchor */}
          <a
            href="#contact-fabricant"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 transition-colors hover:text-white"
          >
            Voir toutes les coordonnées
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </aside>
      </div>
    </section>
  );
}
