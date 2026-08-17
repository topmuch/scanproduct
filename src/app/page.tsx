import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { TopCategories } from "@/components/landing/TopCategories";
import { PromoBanners } from "@/components/landing/PromoBanners";
import { CatalogSlider } from "@/components/landing/CatalogSlider";
import { PopularProducts } from "@/components/landing/PopularProducts";
import { DiscoverSection } from "@/components/landing/DiscoverSection";
import { ExpiringSection } from "@/components/landing/ExpiringSection";
import { ProductTabsSection } from "@/components/landing/ProductTabsSection";
import { StatsBanner } from "@/components/landing/StatsBanner";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { DemoSection } from "@/components/landing/DemoSection";
import { IndustryCards } from "@/components/landing/IndustryCards";
import { Testimonials } from "@/components/landing/Testimonials";
import { NewsletterBanner } from "@/components/landing/NewsletterBanner";
import { FeaturesBar } from "@/components/landing/FeaturesBar";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

// Force dynamic rendering — multiple sections fetch from the DB. Without this
// flag, `next build` tries to statically pre-render the home page at build
// time, which fails in Docker (DATABASE_URL points to a non-existent file
// during build) and causes the build to hang.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        {/*
         * Page d'accueil — hybride marketplace + SaaS.
         *
         * Partie 1 — Marketplace (Nest grocery style) : Hero, catégories,
         * bannières, nouveautés carousel, produits populaires, à découvrir,
         * bientôt périmés, tabs listes. Donnent tout de suite accès aux vrais
         * produits scannables, comme demandé (Option B).
         *
         * Partie 2 — SaaS explicatif : Stats, HowItWorks, Features, Demo,
         * Industries, Testimonials. Expliquent ce que VerifScan apporte au-delà
         * d'un simple catalogue.
         *
         * Partie 3 — Conversion : Newsletter, Features Bar, Final CTA.
         */}
        <Hero />
        <TopCategories />
        <PromoBanners />
        <CatalogSlider />
        <PopularProducts />
        <DiscoverSection />
        <ExpiringSection />
        <ProductTabsSection />
        <StatsBanner />
        <HowItWorks />
        <Features />
        <DemoSection />
        <IndustryCards />
        <Testimonials />
        <NewsletterBanner />
        <FeaturesBar />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
