import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { CatalogSlider } from "@/components/landing/CatalogSlider";
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
         * Page d'accueil — présentation SaaS de VerifScan.
         *
         * Le hero (slider d'images + proposition de valeur + CTA) attire
         * l'attention, puis les sections suivantes expliquent le concept :
         * chiffres clés, fonctionnement, fonctionnalités, démo interactive,
         * métiers ciblés, témoignages, newsletter et appel final.
         *
         * Le catalogue marketplace (catégories, bannières promo, nouveautés,
         * produits populaires…) a été déplacé vers /produits.
         */}
        <Hero />
        <CatalogSlider />
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
