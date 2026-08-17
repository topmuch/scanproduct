import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { TopCategories } from "@/components/landing/TopCategories";
import { PromoBanners } from "@/components/landing/PromoBanners";
import { CatalogSlider } from "@/components/landing/CatalogSlider";
import { PopularProducts } from "@/components/landing/PopularProducts";
import { DiscoverSection } from "@/components/landing/DiscoverSection";
import { ExpiringSection } from "@/components/landing/ExpiringSection";
import { ProductTabsSection } from "@/components/landing/ProductTabsSection";
import { FeaturesBar } from "@/components/landing/FeaturesBar";

// Force dynamic rendering — multiple sections fetch from the DB (products,
// categories, lots…). Without this flag, `next build` tries to statically
// pre-render at build time, which fails in Docker (no DB file during build).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalogue — VerifScan",
  description:
    "Découvrez les produits authentiques vérifiés par VerifScan. Parcourez les catégories, les nouveautés, les produits populaires et ceux bientôt périmés.",
  openGraph: {
    title: "Catalogue — VerifScan",
    description:
      "Découvrez les produits authentiques vérifiés par VerifScan. Scannez le QR code de chaque produit pour accéder à son passeport numérique.",
    type: "website",
  },
};

export default function CatalogPage() {
  // pt-20 compensates the fixed landing Header (h-20 = 80px).
  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1 pt-20 lg:pt-20">
        {/*
         * Page Catalogue — design marketplace (Nest grocery style).
         *
         * Top catégories → bannières promo → Nouveautés (carousel) →
         * Produits populaires → À découvrir → Bientôt périmés →
         * Listes par onglets → Features bar.
         *
         * Chaque carte produit propose un bouton « Scanner le QR » qui
         * redirige vers /p/[lotId] (passeport numérique du lot).
         */}
        <TopCategories />
        <PromoBanners />
        <CatalogSlider />
        <PopularProducts />
        <DiscoverSection />
        <ExpiringSection />
        <ProductTabsSection />
        <FeaturesBar />
      </main>
      <Footer />
    </div>
  );
}
