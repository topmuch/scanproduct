"use client";

import { ArrowRight, Phone, Check } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";

const BENEFITS = [
  "14 jours d'essai gratuit",
  "Aucun engagement",
  "Support client inclus",
  "Configuration en 5 minutes",
];

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F9FAFB] to-[#EFF6FF] py-16 sm:py-20 lg:py-24">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#2563EB]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-[#10B981]/10 blur-3xl" />

      <AnimatedSection className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-[28px] font-bold leading-tight text-[#111827] sm:text-[36px] lg:text-[40px]">
          Prêt à renforcer la confiance de vos clients ?
        </h2>
        <p className="mx-auto mt-4 max-w-[600px] text-[18px] leading-relaxed text-[#4B5563]">
          Commencez gratuitement dès maintenant, sans carte bancaire. Rejoignez les 250+ fabricants qui font déjà confiance à VerifScan.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-[#2563EB] to-[#10B981] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#2563EB]/40 sm:w-auto"
          >
            Créer votre compte gratuit
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#contact"
            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-[#2563EB] bg-white px-7 py-3.5 text-base font-semibold text-[#2563EB] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#EFF6FF] sm:w-auto"
          >
            <Phone className="h-4 w-4" />
            Voir une démo en direct
          </a>
        </div>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BENEFITS.map((b) => (
            <li
              key={b}
              className="flex items-center justify-center gap-2 text-sm text-[#6B7280] sm:justify-start"
            >
              <Check className="h-4 w-4 flex-shrink-0 text-[#10B981]" />
              {b}
            </li>
          ))}
        </ul>
      </AnimatedSection>
    </section>
  );
}
