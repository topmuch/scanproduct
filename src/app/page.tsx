"use client";

import { useState } from "react";
import { LayoutDashboard, Globe, ArrowLeftRight, Factory } from "lucide-react";
import { FabricantShell } from "@/components/fabricant/FabricantShell";
import { AdminShell } from "@/components/admin/AdminShell";
import { Header as LandingHeader } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { StatsBanner } from "@/components/landing/StatsBanner";
import { Pricing } from "@/components/landing/Pricing";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

type View = "landing" | "admin" | "fabricant";

export default function Home() {
  const [view, setView] = useState<View>("fabricant");

  if (view === "admin") {
    return (
      <div className="relative">
        <ViewSwitcher view={view} onChange={setView} />
        <AdminShell />
      </div>
    );
  }

  if (view === "fabricant") {
    return (
      <div className="relative">
        <ViewSwitcher view={view} onChange={setView} />
        <FabricantShell />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <ViewSwitcher view={view} onChange={setView} />
      <LandingHeader />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <StatsBanner />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function ViewSwitcher({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const items: { key: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "landing", label: "Landing", icon: Globe },
    { key: "fabricant", label: "Fabricant", icon: Factory },
    { key: "admin", label: "SuperAdmin", icon: LayoutDashboard },
  ];
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-white/95 p-1 shadow-lg backdrop-blur">
      {items.map((it) => {
        const active = view === it.key;
        const Icon = it.icon;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
              active ? "bg-[#2563EB] text-white" : "text-[#6B7280] hover:bg-[#F3F4F6]"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{it.label}</span>
          </button>
        );
      })}
      <span className="mx-1 hidden h-4 w-px bg-[#E5E7EB] sm:block" aria-hidden />
      <ArrowLeftRight className="hidden h-3.5 w-3.5 text-[#9CA3AF] sm:block" aria-hidden />
    </div>
  );
}
