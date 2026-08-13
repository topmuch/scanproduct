import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { DemoSection } from "@/components/landing/DemoSection";
import { Testimonials } from "@/components/landing/Testimonials";
import { StatsBanner } from "@/components/landing/StatsBanner";
import { Pricing } from "@/components/landing/Pricing";
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
        <DemoSection />
        <Testimonials />
        <StatsBanner />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
