import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CatalogSlider } from "@/components/landing/CatalogSlider";
import { DemoSection } from "@/components/landing/DemoSection";
import { IndustryCards } from "@/components/landing/IndustryCards";
import { Testimonials } from "@/components/landing/Testimonials";
import { StatsBanner } from "@/components/landing/StatsBanner";
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
        <Hero />
        <Features />
        <HowItWorks />
        <CatalogSlider />
        <DemoSection />
        <IndustryCards />
        <Testimonials />
        <StatsBanner />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
