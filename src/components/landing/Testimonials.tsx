"use client";

import { Star, Quote } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { SectionBadge } from "./SectionBadge";
import { CountUp } from "./CountUp";

type Testimonial = {
  initials: string;
  avatarBg: string;
  name: string;
  title: string;
  quote: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    initials: "MD",
    avatarBg: "bg-[#2563EB]",
    name: "Marième Diop",
    title: "Fondatrice — Jus de Bissap Sénégal",
    quote:
      "Grâce à VerifScan, nos ventes ont augmenté de 35% en 3 mois ! Nos clients scannent le QR code et ont immédiatement confiance. C'est un vrai game-changer pour les petits producteurs comme nous.",
  },
  {
    initials: "IN",
    avatarBg: "bg-[#10B981]",
    name: "Ibrahima Ndiaye",
    title: "Directeur Général — Térange Foods",
    quote:
      "Nous exportons maintenant vers 4 pays de la CEDEAO sans aucune difficulté douanière. Les documents générés par VerifScan sont acceptés partout. Un outil indispensable pour tout agro-industriel sérieux.",
  },
  {
    initials: "AS",
    avatarBg: "bg-[#F59E0B]",
    name: "Awa Sow",
    title: "Responsable Qualité — BioAfrica Cosmetics",
    quote:
      "La traçabilité de nos produits cosmétiques était un cauchemar. Avec VerifScan, tout est centralisé et nos clients adorent pouvoir vérifier l'origine des ingrédients. Le support est en plus très réactif.",
  },
];

const FOOTER_STATS = [
  { value: 250, suffix: "+", label: "Fabricants actifs" },
  { value: 4.9, decimals: 1, suffix: "/5", label: "Note moyenne" },
  { value: 12458, label: "Scans / semaine" },
  { value: 4, label: "pays CEDEAO couverts", prefix: "" },
];

export function Testimonials() {
  return (
    <section id="temoignages" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <SectionBadge bg="bg-[#FEE2E2]" color="text-[#DC2626]">
            Témoignages
          </SectionBadge>
          <h2 className="mt-4 font-display text-[28px] font-semibold leading-tight text-[#111827] sm:text-[36px] lg:text-[40px]">
            Ce que disent nos fabricants
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-base text-[#6B7280]">
            Plus de 250 entreprises nous font confiance pour authentifier leurs produits.
          </p>
        </AnimatedSection>

        {/* Cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {TESTIMONIALS.map((t, i) => (
            <AnimatedSection
              key={t.name}
              index={i}
              className="flex flex-col rounded-xl border-l-4 border-[#2563EB] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                  ))}
                </div>
                <Quote className="h-7 w-7 text-[#DBEAFE]" />
              </div>

              <p className="mt-4 flex-1 text-[15px] leading-relaxed text-[#374151]">
                “{t.quote}”
              </p>

              <div className="mt-6 flex items-center gap-3 border-t border-[#F3F4F6] pt-4">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${t.avatarBg} font-display text-sm font-bold text-white`}
                >
                  {t.initials}
                </span>
                <div className="leading-tight">
                  <p className="text-base font-semibold text-[#111827]">{t.name}</p>
                  <p className="text-[13px] text-[#6B7280]">{t.title}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Footer stats */}
        <AnimatedSection className="mt-14">
          <dl className="grid grid-cols-2 gap-6 rounded-2xl border border-[#F3F4F6] bg-[#F9FAFB] p-8 lg:grid-cols-4">
            {FOOTER_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <dt className="font-display text-[32px] font-bold text-[#111827]">
                  <CountUp
                    end={s.value}
                    prefix={s.prefix}
                    suffix={s.suffix}
                    decimals={s.decimals ?? 0}
                  />
                </dt>
                <dd className="mt-1 text-sm text-[#6B7280]">{s.label}</dd>
              </div>
            ))}
          </dl>
        </AnimatedSection>
      </div>
    </section>
  );
}
