import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Store } from "lucide-react";

import {
  getLotWithDetails,
  getSimilarProducts,
  recordScan,
  isBotUserAgent,
} from "@/lib/public-data";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

import { SimilarProducts } from "@/components/product/SimilarProducts";

// WOW premium components
import { WowHero } from "@/components/product/wow/WowHero";
import { FreshnessGlow } from "@/components/product/wow/FreshnessGlow";
import { ContactOrb } from "@/components/product/wow/ContactOrb";
import { WowAccordion } from "@/components/product/wow/WowAccordion";
import { VerificationGlow } from "@/components/product/wow/VerificationGlow";

// V3 modules — consumer loyalty widget + B2B inquiry modal
import { LoyaltyWidget } from "@/components/loyalty/LoyaltyWidget";
import { InquiryModal } from "@/components/marketplace/InquiryModal";

// Content components (used inside accordions — keep the rich content, just upgrade the wrapper)
import { CompactIngredients } from "@/components/product/compact/CompactIngredients";
import { CompactTraceability } from "@/components/product/compact/CompactTraceability";
import { CompactHistory } from "@/components/product/compact/CompactHistory";
import { TransparencyLite } from "@/components/product/compact/TransparencyLite";
import { CompactCertifications } from "@/components/product/compact/CompactCertifications";
import { CompactReviews } from "@/components/product/compact/CompactReviews";
import { CertificationsSection } from "@/components/product/CertificationsSection";

// ---------------------------------------------------------------------------
// Force dynamic rendering so the page always reflects the latest reviews
// and product data. Without this, Next.js might cache the page and new
// reviews wouldn't appear until manual revalidation.
// ---------------------------------------------------------------------------
export const dynamic = "force-dynamic";

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
    (lot.lotCerts?.length ?? 0) +
    (lot.fabricantCerts?.length ?? 0) +
    (lot.productCertifications?.length ?? 0);

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* ── Background decorations: floating colored blobs ───────────────
          Three large blurred circles that slowly float around, creating
          a dynamic, premium atmosphere. `pointer-events-none` so they
          never interfere with clicks. `mix-blend-multiply` makes them
          blend softly into the background. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="wow-animate-float absolute -left-20 top-0 h-96 w-96 rounded-full bg-purple-300 opacity-20 mix-blend-multiply blur-3xl" />
        <div
          className="wow-animate-float absolute right-0 top-1/3 h-96 w-96 rounded-full bg-blue-300 opacity-20 mix-blend-multiply blur-3xl"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="wow-animate-float absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-pink-300 opacity-20 mix-blend-multiply blur-3xl"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <PublicHeader />

      <main className="relative mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        {/* 1. HERO WOW — bandeau authentique + carte produit + stats */}
        <WowHero
          product={lot.product}
          lot={lot}
          fabricant={lot.fabricant}
        />

        {/* 2. FRAÎCHEUR GLOW — barre de fraîcheur animée */}
        <FreshnessGlow
          expiryDate={lot.expiryDate}
          manufactureDate={lot.manufactureDate}
        />

        {/* 2b. FIDÉLITÉ CONSO — widget points/badges (V3 Module 5) */}
        <LoyaltyWidget lotId={lot.id} productName={lot.product.name} />

        {/* 3. CONTACT ORB — boutons contact premium */}
        <ContactOrb fabricant={lot.fabricant} />

        {/* 3b. DEMANDE DE DEVIS B2B — marketplace inquiry (V3 Module 2) */}
        <div className="rounded-2xl border border-[#10B981]/20 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#10B981] text-white">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#111827]">Vous êtes distributeur ?</h3>
                <p className="text-[13px] text-[#6B7280]">Demandez un devis personnalisé pour ce produit. Réponse sous 48h.</p>
              </div>
            </div>
            <InquiryModal
              productId={lot.product.id}
              productName={lot.product.name}
              fabricantName={lot.fabricant?.companyName ?? lot.fabricant?.name ?? "Fabricant"}
            />
          </div>
        </div>

        {/* 4. ACCORDÉONS WOW — sections repliables premium */}
        <div className="space-y-4">
          {/* Ingrédients & Allergènes — OPEN by default (essential info) */}
          <WowAccordion
            title="Ingrédients & Allergènes"
            icon="🌾"
            defaultOpen={true}
            color="green"
          >
            <CompactIngredients lot={lot} />
          </WowAccordion>

          {/* Traçabilité complète */}
          <WowAccordion
            title="Traçabilité complète"
            icon="📍"
            defaultOpen={false}
            color="blue"
          >
            <CompactTraceability lot={lot} />
          </WowAccordion>

          {/* Historique du lot */}
          <WowAccordion
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
          </WowAccordion>

          {/* Score de transparence */}
          <WowAccordion
            title="Score de transparence"
            icon="💎"
            defaultOpen={false}
            color="amber"
            badge={`${lot.transparency.score}/${lot.transparency.maxScore}`}
          >
            <TransparencyLite transparency={lot.transparency} />
          </WowAccordion>

          {/* Certifications */}
          <WowAccordion
            title="Certifications"
            icon="🏆"
            defaultOpen={false}
            color="emerald"
            badge={totalCerts > 0 ? String(totalCerts) : undefined}
          >
            {/* Section 1: certifications produits (catalogue VerifScan — Bio, Halal, ISO 22000…) */}
            {lot.productCertifications && lot.productCertifications.length > 0 && (
              <div className="mb-4">
                <CertificationsSection
                  certifications={lot.productCertifications}
                  showTitle
                  compact
                />
              </div>
            )}
            {/* Section 2: certifications du lot + certifications du fabricant (legacy) */}
            <CompactCertifications
              lotCerts={lot.lotCerts}
              fabricantCerts={lot.fabricantCerts}
            />
          </WowAccordion>

          {/* Avis consommateurs */}
          <WowAccordion
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
              lotId={lot.id}
              productName={lot.product.name}
            />
          </WowAccordion>
        </div>

        {/* Similar products (still full-width, outside accordions) */}
        {similar.length > 0 && <SimilarProducts products={similar} />}

        {/* 5. FOOTER VÉRIFICATION GLOW — spectacular verification footer */}
        <VerificationGlow lot={lot} />
      </main>

      <PublicFooter />
    </div>
  );
}
