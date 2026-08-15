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
        {/* 1. Hero — Hook: value proposition + primary CTA */}
        <Hero />
        {/* 2. Stats — Trust signals immediately after the hook (builds credibility) */}
        <StatsBanner />
        {/* 3. Features — What you get (key capabilities) */}
        <Features />
        {/* 4. HowItWorks — How it works (3 simple steps) */}
        <HowItWorks />
        {/* 5. Demo — See it in action (interactive product preview) */}
        <DemoSection />
        {/* 6. CatalogSlider — Real products (proof it works) */}
        <CatalogSlider />
        {/* 7. IndustryCards — Use cases by industry (relevance) */}
        <IndustryCards />
        {/* 8. Testimonials — Social proof (what others say) */}
        <Testimonials />
        {/* 9. FinalCTA — Final conversion push */}
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
