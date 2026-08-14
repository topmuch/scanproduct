import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";

import {
  getLotWithDetails,
  getSimilarProducts,
  recordScan,
  isBotUserAgent,
} from "@/lib/public-data";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

import { SimilarProducts } from "@/components/product/SimilarProducts";

// Compact v2 components
import { AuthenticityHero } from "@/components/product/compact/AuthenticityHero";
import { FreshnessBar } from "@/components/product/compact/FreshnessBar";
import { QuickContact } from "@/components/product/compact/QuickContact";
import { AccordionSection } from "@/components/product/compact/AccordionSection";
import { CompactIngredients } from "@/components/product/compact/CompactIngredients";
import { CompactTraceability } from "@/components/product/compact/CompactTraceability";
import { CompactHistory } from "@/components/product/compact/CompactHistory";
import { TransparencyLite } from "@/components/product/compact/TransparencyLite";
import { CompactCertifications } from "@/components/product/compact/CompactCertifications";
import { CompactReviews } from "@/components/product/compact/CompactReviews";
import { CompactVerificationFooter } from "@/components/product/compact/CompactVerificationFooter";

// ---------------------------------------------------------------------------
// Metadata (SEO)
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lotId: string }>;
}): Promise<Metadata> {
  const { lotId } = await params;
  let lot: Awaited<ReturnType<typeof getLotWithDetails>> = null;
  try {
    lot = await getLotWithDetails(lotId);
  } catch (e) {
    console.error("[generateMetadata /p/[lotId]] getLotWithDetails threw:", e);
  }
  if (!lot) {
    return {
      title: "Produit introuvable — VerifScan",
      description:
        "Ce QR code ne correspond à aucun produit enregistré. Vérifiez le catalogue VerifScan.",
      openGraph: {
        title: "Produit introuvable — VerifScan",
        description:
          "Ce QR code ne correspond à aucun produit enregistré. Vérifiez le catalogue VerifScan.",
        type: "website",
      },
    };
  }
  return {
    title: `${lot.product.name} — Passeport numérique VerifScan`,
    description: lot.product.description?.slice(0, 160) ?? undefined,
    openGraph: {
      title: `${lot.product.name} — Passeport numérique VerifScan`,
      description: lot.product.description?.slice(0, 160) ?? undefined,
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ lotId: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { lotId } = await params;
  const { code: qrCodeId } = await searchParams;

  let lot: Awaited<ReturnType<typeof getLotWithDetails>> = null;
  try {
    lot = await getLotWithDetails(lotId);
  } catch (e) {
    // This is the real "server-side exception" path. Log it clearly so we
    // can debug, then fall through to the not-found / mock handling below.
    console.error("[ProductPage /p/[lotId]] getLotWithDetails threw:", e);
  }

  if (!lot) {
    // Graceful fallback — a scanned QR code whose lot is not (yet) registered
    // should never show a raw server 404. Instead we render a friendly
    // "product not found" page that keeps the public header/footer and lets
    // the visitor browse the public catalog.
    return (
      <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
        <PublicHeader />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#FEF3C7] text-[40px]">
            🔍
          </div>
          <h1 className="font-display text-[28px] font-bold text-[#111827] sm:text-[32px]">
            Produit introuvable
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#6B7280]">
            Ce QR code ne correspond à aucun lot enregistré pour le moment.
            Le produit n&apos;a peut-être pas encore été publié, ou le lot a été
            retiré. Vous pouvez consulter l&apos;ensemble de nos produits
            vérifiés dans le catalogue public.
          </p>
          <Link
            href="/produits"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#10B981] px-5 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-[#059669]"
          >
            Voir le catalogue public
          </Link>
        </main>
        <PublicFooter />
      </div>
    );
  }

  // Fire and forget — don't block the page render on scan recording.
  // Skip bots/crawlers so analytics counters aren't inflated by search
  // engines or uptime monitors hitting the page.
  // If the QR code ID is in the ?code= param, record it so we can track
  // which specific QR code was scanned (useful for attribution analytics).
  try {
    const h = await headers();
    const ua = h.get("user-agent") || "";
    if (ua && !isBotUserAgent(ua)) {
      void recordScan(lot.id, {
        userAgent: ua || undefined,
        qrCodeId: qrCodeId || undefined,
      }).catch((e) =>
        console.error("[ProductPage] recordScan failed:", e),
      );
    }
  } catch (e) {
    console.error("[ProductPage] headers() failed:", e);
  }

  // Similar products (same category, excluding current product).
  // Wrapped in try/catch so a failure here doesn't crash the whole page —
  // we just render without the "similar products" section.
  let similar: Awaited<ReturnType<typeof getSimilarProducts>> = [];
  try {
    similar = await getSimilarProducts(
      lot.product.categoryId,
      lot.product.id,
      4,
    );
  } catch (e) {
    console.error("[ProductPage] getSimilarProducts failed:", e);
  }

  const totalCerts =
    (lot.lotCerts?.length ?? 0) + (lot.fabricantCerts?.length ?? 0);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-white">
      <PublicHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-6">
        {/* 1. HERO COMPACT — visible without scrolling */}
        <AuthenticityHero
          product={lot.product}
          lot={lot}
          fabricant={lot.fabricant}
          status={lot.status}
          verifiedAt={lot.verifiedAt}
        />

        {/* 2. BARRE DE FRAÎCHEUR — visual freshness indicator */}
        <FreshnessBar
          expiryDate={lot.expiryDate}
          manufactureDate={lot.manufactureDate}
        />

        {/* 3. BOUTONS CONTACT — prominent, always visible */}
        <QuickContact fabricant={lot.fabricant} />

        {/* 4. SECTIONS REPLIABLES — accordions for curious users */}
        <div className="space-y-3">
          {/* Ingrédients & Allergènes — OPEN by default (essential info) */}
          <AccordionSection
            title="Ingrédients & Allergènes"
            icon="🌾"
            defaultOpen={true}
            color="green"
          >
            <CompactIngredients lot={lot} />
          </AccordionSection>

          {/* Traçabilité complète — closed by default */}
          <AccordionSection
            title="Traçabilité complète"
            icon="📍"
            defaultOpen={false}
            color="blue"
          >
            <CompactTraceability lot={lot} />
          </AccordionSection>

          {/* Historique du lot — closed by default */}
          <AccordionSection
            title="Historique du lot"
            icon="⏱️"
            defaultOpen={false}
            color="purple"
            badge={
              lot.historyEvents?.length
                ? String(lot.historyEvents.length)
                : undefined
            }
          >
            <CompactHistory events={lot.historyEvents} />
          </AccordionSection>

          {/* Score de transparence — light version */}
          <AccordionSection
            title="Score de transparence"
            icon="💎"
            defaultOpen={false}
            color="amber"
            badge={`${lot.transparency.score}/${lot.transparency.maxScore}`}
          >
            <TransparencyLite transparency={lot.transparency} />
          </AccordionSection>

          {/* Certifications */}
          <AccordionSection
            title="Certifications"
            icon="🏆"
            defaultOpen={false}
            color="emerald"
            badge={totalCerts > 0 ? String(totalCerts) : undefined}
          >
            <CompactCertifications
              lotCerts={lot.lotCerts}
              fabricantCerts={lot.fabricantCerts}
            />
          </AccordionSection>

          {/* Avis consommateurs */}
          <AccordionSection
            title="Avis consommateurs"
            icon="⭐"
            defaultOpen={false}
            color="yellow"
            badge={
              lot.product.totalReviews
                ? String(lot.product.totalReviews)
                : undefined
            }
          >
            <CompactReviews
              reviews={lot.reviews}
              averageRating={lot.product.averageRating}
              totalReviews={lot.product.totalReviews}
            />
          </AccordionSection>
        </div>

        {/* Similar products (still full-width, outside accordions) */}
        {similar.length > 0 && <SimilarProducts products={similar} />}

        {/* 5. FOOTER VÉRIFICATION — compact */}
        <CompactVerificationFooter lot={lot} />
      </main>

      <PublicFooter />
    </div>
  );
}
