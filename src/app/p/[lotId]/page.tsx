import Link from "next/link";
import type { Metadata } from "next";

import {
  getLotWithDetails,
  getSimilarProducts,
  recordScan,
} from "@/lib/public-data";
import { daysUntil } from "@/lib/utils";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { MockProductPassport, isMockLotId } from "@/components/public/MockProductPassport";

import { AuthenticityBanner } from "@/components/product/AuthenticityBanner";
import { ProductHeader } from "@/components/product/ProductHeader";
import { QuickStats } from "@/components/product/QuickStats";
import { TransparencyScore } from "@/components/product/TransparencyScore";
import { TraceabilityInfo } from "@/components/product/TraceabilityInfo";
import { LotHistory } from "@/components/product/LotHistory";
import { Certifications } from "@/components/product/Certifications";
import { AllergensInfo } from "@/components/product/AllergensInfo";
import { QRCodeSection } from "@/components/product/QRCodeSection";
import { ContactManufacturer } from "@/components/product/ContactManufacturer";
import { ReviewsSection } from "@/components/product/ReviewsSection";
import { SimilarProducts } from "@/components/product/SimilarProducts";
import { VerificationFooter } from "@/components/product/VerificationFooter";

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
    // Check if it's a mock lot ID (l1, l2, p1, etc.)
    if (isMockLotId(lotId)) {
      return {
        title: "Passeport numérique VerifScan",
        description: "Produit vérifié par VerifScan — la vérité au bout du scan.",
        openGraph: {
          title: "Passeport numérique VerifScan",
          description: "Produit vérifié par VerifScan — la vérité au bout du scan.",
          type: "website",
        },
      };
    }
    return { title: "Produit introuvable — VerifScan" };
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
}: {
  params: Promise<{ lotId: string }>;
}) {
  const { lotId } = await params;

  let lot: Awaited<ReturnType<typeof getLotWithDetails>> = null;
  try {
    lot = await getLotWithDetails(lotId);
  } catch (e) {
    // This is the real "server-side exception" path. Log it clearly so we
    // can debug, then fall through to the not-found / mock handling below.
    console.error("[ProductPage /p/[lotId]] getLotWithDetails threw:", e);
  }

  if (!lot) {
    // Check if this is a mock lot ID (l1, l2, p1, …) from the fabricant
    // dashboard demo data. If so, render a mock product passport so the
    // scanned QR code actually shows product info instead of "introuvable".
    if (isMockLotId(lotId)) {
      return <MockProductPassport lotId={lotId} />;
    }

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

  // Fire and forget — don't block the page render on scan recording
  void recordScan(lot.id).catch((e) =>
    console.error("[ProductPage] recordScan failed:", e),
  );

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

  const daysToExpiry = daysUntil(lot.expiryDate);
  const totalCerts =
    (lot.lotCerts?.length ?? 0) + (lot.fabricantCerts?.length ?? 0);

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <PublicHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
        <AuthenticityBanner
          status={lot.status}
          manufacturerName={lot.fabricant.companyName ?? lot.fabricant.name}
          verifiedAt={lot.verifiedAt}
        />

        <ProductHeader
          product={lot.product}
          lot={lot}
          fabricant={lot.fabricant}
        />

        <QuickStats
          scans={lot.scanCount ?? lot.totalScans ?? 0}
          verified={Boolean(lot.isVerified || lot.fabricant.isVerified)}
          registeredAt={lot.fabricant.createdAt}
          certifications={totalCerts}
        />

        <TransparencyScore transparency={lot.transparency} />

        <TraceabilityInfo lot={lot} />

        <LotHistory
          events={lot.historyEvents}
          daysUntilExpiration={daysToExpiry}
        />

        <Certifications
          lotCerts={lot.lotCerts}
          fabricantCerts={lot.fabricantCerts}
        />

        <AllergensInfo lot={lot} />

        <QRCodeSection lot={lot} />

        <ContactManufacturer fabricant={lot.fabricant} />

        <ReviewsSection
          reviews={lot.reviews}
          averageRating={lot.product.averageRating}
          totalReviews={lot.product.totalReviews}
        />

        {similar.length > 0 && <SimilarProducts products={similar} />}

        <VerificationFooter lot={lot} />
      </main>

      <PublicFooter />
    </div>
  );
}
