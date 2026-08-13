"use client";

import { ScanLine, Building2, ShieldCheck, TrendingUp, Gift } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { CountUp } from "./CountUp";

type Stat = {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  decimals?: number;
  label: string;
};

const STATS: Stat[] = [
  { icon: <ScanLine className="h-8 w-8" />, value: 12458, label: "Produits scannés cette semaine" },
  { icon: <Building2 className="h-8 w-8" />, value: 250, suffix: "+", label: "Fabricants actifs" },
  { icon: <ShieldCheck className="h-8 w-8" />, value: 98, suffix: "%", label: "De confiance accrue" },
  { icon: <TrendingUp className="h-8 w-8" />, value: 35, suffix: "%", label: "D'augmentation des ventes" },
];

export function StatsBanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#2563EB] to-[#1E40AF] py-16 lg:py-20">
      {/* decorative blurred blobs */}
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-[#10B981]/20 blur-3xl" />

      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full bg-white/20 px-4 py-1.5 text-[13px] font-semibold uppercase tracking-[1px] text-white backdrop-blur">
            Impact réel
          </span>
          <h2 className="mt-4 font-display text-[28px] font-semibold leading-tight text-white sm:text-[36px] lg:text-[40px]">
            Des chiffres qui parlent d&apos;eux-mêmes
          </h2>
          <p className="mx-auto mt-3 max-w-[600px] text-base text-white/80">
            VerifScan génère de la confiance mesurable, semaine après semaine.
          </p>
        </AnimatedSection>

        {/* Stats grid */}
        <div className="mt-12 grid grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <AnimatedSection key={stat.label} index={i} className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur">
                {stat.icon}
              </div>
              <p className="mt-4 font-display text-[40px] font-bold leading-none text-white lg:text-[48px]">
                <CountUp end={stat.value} suffix={stat.suffix} decimals={stat.decimals ?? 0} />
              </p>
              <p className="mx-auto mt-2 max-w-[200px] text-sm text-white/80">{stat.label}</p>
            </AnimatedSection>
          ))}
        </div>

        {/* trial badge */}
        <AnimatedSection className="mt-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-medium text-white backdrop-blur">
            <Gift className="h-4 w-4" /> 14 jours d&apos;essai gratuit — sans carte bancaire
          </span>
        </AnimatedSection>
      </div>
    </section>
  );
}
