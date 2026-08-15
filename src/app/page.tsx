import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { StatsBanner } from "@/components/landing/StatsBanner";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { DemoSection } from "@/components/landing/DemoSection";
import { CatalogSlider } from "@/components/landing/CatalogSlider";
import { IndustryCards } from "@/components/landing/IndustryCards";
import { Testimonials } from "@/components/landing/Testimonials";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

// Force dynamic rendering — the CatalogSlider is an async server component
// that fetches from the DB. Without this flag, `next build` tries to
// statically pre-render the home page at build time, which fails in Docker
// (DATABASE_URL points to a non-existent file during build) and causes the
// build to hang at "Creating an optimized production build ...".
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        {/*
         * Page d'accueil — flow de conversion réorganisé.
         *
         * Principe : "show, don't tell". On front-load la PREUVE (vrais
         * produits scannables) et on explique le processus TÔT, pour réduire
         * la friction cognitive. Les capacités profondes (Features) et la
         * démo interactive viennent APRÈS que le visiteur a vu que ça marche
         * pour de vrai.
         *
         * 1. Hero        → Hook (qui, quoi, pourquoi maintenant)
         * 2. Stats       → Trust signals (crédibilité immédiate par les chiffres)
         * 3. Catalog     → PREUVE : vrais produits avec QR codes (show don't tell)
         * 4. HowItWorks  → Processus en 3 étapes (réduit la friction "comment ?")
         * 5. Features    → Capacités clés (deep dive pour les intéressés)
         * 6. Demo        → Démo interactive (engagement actif)
         * 7. Industries  → Cas d'usage par métier (le visiteur se reconnaît)
         * 8. Testimonials→ Preuve sociale (ce que disent les autres)
         * 9. FinalCTA    → Poussée de conversion finale
         */}
        <Hero />
        <StatsBanner />
        <CatalogSlider />
        <HowItWorks />
        <Features />
        <DemoSection />
        <IndustryCards />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
