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
