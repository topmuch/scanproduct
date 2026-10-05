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
import { getSiteUrl } from "@/lib/seo";
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
import { ProductDetailsSection } from "@/components/product/ProductDetailsSection";

// Consumer engagement: review prompt (floating notification after 10s) +
// expired-product report modal (consumer safety feature)
import { ReviewPrompt } from "@/components/product/ReviewPrompt";
import { ReportExpiredModal } from "@/components/product/ReportExpiredModal";

// ---------------------------------------------------------------------------
// Force dynamic rendering so the page always reflects the latest reviews
// and product data. Without this, Next.js might cache the page and new
// reviews wouldn't appear until manual revalidation.
// ---------------------------------------------------------------------------
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Metadata (SEO)
// ---------------------------------------------------------------------------

/** Rend une URL d'image absolue (les uploads locaux sont relatifs à la racine). */
function absolutiser(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

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
      robots: { index: false, follow: true },
      openGraph: {
        title: "Produit introuvable — VerifScan",
        description:
          "Ce QR code ne correspond à aucun produit enregistré. Vérifiez le catalogue VerifScan.",
        type: "website",
      },
    };
  }
  // Image produit absolue pour les partages sociaux (OG/Twitter) — une
  // vignette produit augmente fortement le CTR dans les partages WhatsApp/
  // Facebook, canal majeur en Afrique de l'Ouest.
  const siteUrl = await getSiteUrl();
  const imageProduit = lot.product.imageUrl
    ? absolutiser(lot.product.imageUrl, siteUrl)
    : undefined;

  return {
    title: `${lot.product.name} — Passeport numérique VerifScan`,
    description: lot.product.description?.slice(0, 160) ?? undefined,
    alternates: { canonical: `/p/${lotId}` },
    keywords: [
      lot.product.name,
      lot.product.brand,
      lot.product.category,
      lot.fabricant.companyName,
      "passeport numérique",
      "traçabilité",
      "authenticité",
      "VerifScan",
    ]
      .filter((k): k is string => !!k)
      .join(", "),
    openGraph: {
      title: `${lot.product.name} — Passeport numérique VerifScan`,
      description: lot.product.description?.slice(0, 160) ?? undefined,
      url: `/p/${lotId}`,
      type: "website",
      ...(imageProduit ? { images: [{ url: imageProduit }] } : {}),
    },
    twitter: {
      card: imageProduit ? "summary_large_image" : "summary",
      title: `${lot.product.name} — Passeport numérique VerifScan`,
      description: lot.product.description?.slice(0, 160) ?? undefined,
      ...(imageProduit ? { images: [imageProduit] } : {}),
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

  // ── JSON-LD « Product » — référencement Google des passeports produits ──
  // Données structurées lues par Googlebot (rich results) : nom, marque,
  // image, SKU/GTIN, note agrégée des avis approuvés. Sécurité : les
  // valeurs optionnelles sont simplement omises du graphe.
  const siteUrlPage = await getSiteUrl();
  const imagePage = lot.product.imageUrl
    ? absolutiser(lot.product.imageUrl, siteUrlPage)
    : undefined;
  const marqueNom =
    lot.product.brand || lot.fabricant.companyName || "VerifScan";
  const notesApprouvees = (lot.reviews ?? []).map((r) => r.rating);
  // ── Exigence Google « Extraits de produits » ────────────────────────────
  // Un graphe « Product » DOIT contenir au moins UN de : offers / review /
  // aggregateRating — sinon Search Console signale le problème critique
  // « Il faut indiquer "offers", "review", ou "aggregateRating" » et la
  // page perd son éligibilité aux rich results.
  //   - Avis approuvés → aggregateRating + review[] (étoiles dans Google).
  //   - Aucun avis     → Offer de secours (honnête : disponibilité + URL +
  //     devise ; le produit fabricant n'expose pas de prix public — ne
  //     JAMAIS inventer un prix ni un avis).
  const offersFallback = {
    "@type": "Offer",
    url: `${siteUrlPage}/p/${lotId}`,
    priceCurrency: "XOF",
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
  };
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: lot.product.name,
    ...(lot.product.description
      ? { description: lot.product.description }
      : {}),
    ...(imagePage ? { image: [imagePage] } : {}),
    url: `${siteUrlPage}/p/${lotId}`,
    brand: { "@type": "Brand", name: marqueNom },
    manufacturer: {
      "@type": "Organization",
      name: lot.fabricant.companyName || lot.fabricant.name || marqueNom,
    },
    sku: lot.lotNumber || lot.reference,
    ...(lot.product.barcode ? { gtin13: lot.product.barcode } : {}),
    ...(lot.product.category ? { category: lot.product.category } : {}),
    ...(notesApprouvees.length > 0
      ? {
          aggregateRating: {
            "@type": "aggregateRating",
            ratingValue:
              Math.round(
                (notesApprouvees.reduce((s, r) => s + r, 0) /
                  notesApprouvees.length) *
                  10,
              ) / 10,
            reviewCount: notesApprouvees.length,
          },
          review: (lot.reviews ?? [])
            .filter((r) => r.authorName || r.comment)
            .slice(0, 10)
            .map((r) => ({
              "@type": "Review",
              ...(r.authorName
                ? { author: { "@type": "Person", name: r.authorName } }
                : {}),
              ...(r.comment ? { reviewBody: r.comment } : {}),
              datePublished: r.createdAt.toISOString().slice(0, 10),
              reviewRating: {
                "@type": "Rating",
                ratingValue: r.rating,
                bestRating: 5,
                worstRating: 1,
              },
            })),
        }
      : { offers: offersFallback }),
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-[#F0F4F9] to-purple-50">
      {/* JSON-LD « Product » — données structurées pour Google (indexation
          des passeports produits + rich results). Côté serveur uniquement. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Background decorations: floating colored blobs ───────────────
          Three large blurred circles that slowly float around, creating
          a dynamic, premium atmosphere. `pointer-events-none` so they
          never interfere with clicks. `mix-blend-multiply` makes them
          blend softly into the background. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="wow-animate-float absolute -left-20 top-0 h-96 w-96 rounded-full bg-purple-300 opacity-20 mix-blend-multiply blur-3xl" />
        <div
          className="wow-animate-float absolute right-0 top-1/3 h-96 w-96 rounded-full bg-[#8FA9C9] opacity-20 mix-blend-multiply blur-3xl"
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

        {/* 2a. SIGNALEMENT PRODUIT PÉRIMÉ — bouton CTA visible (sécurité conso) */}
        <ReportExpiredModal
          lotId={lot.id}
          productName={lot.product.name}
          fabricantId={lot.fabricantId}
          lotReference={lot.reference}
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

          {/* Conseils d'utilisation / Précautions / Conservation — remplis
              via l'assistant intelligent (produits types), modifiables par
              le fabricant. Section absente si rien n'a été renseigné. */}
          {(lot.product.usageTips ||
            lot.product.precautions ||
            lot.product.storageConditions) && (
            <WowAccordion
              title="Conseils & Précautions"
              icon="💡"
              defaultOpen={true}
              color="amber"
            >
              <ProductDetailsSection
                usageTips={lot.product.usageTips}
                precautions={lot.product.precautions}
                storageConditions={lot.product.storageConditions}
                showFreshness={false}
              />
            </WowAccordion>
          )}

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
            <div id="avis-consommateurs">
              <CompactReviews
                reviews={lot.reviews}
                averageRating={lot.product.averageRating}
                totalReviews={lot.product.totalReviews}
                lotId={lot.id}
                productName={lot.product.name}
              />
            </div>
          </WowAccordion>
        </div>

        {/* Similar products (still full-width, outside accordions) */}
        {similar.length > 0 && <SimilarProducts products={similar} />}

        {/* 5. FOOTER VÉRIFICATION GLOW — spectacular verification footer */}
        <VerificationGlow lot={lot} />
      </main>

      {/* Notification visuelle : propose de laisser un avis après 10s */}
      <ReviewPrompt
        productName={lot.product.name}
        reviewSectionId="avis-consommateurs"
      />

      <PublicFooter />
    </div>
  );
}
