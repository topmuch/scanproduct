"use client";

import { Smartphone, Globe, BarChart3, ArrowRight } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { SectionBadge } from "./SectionBadge";

type Feature = {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  link: string;
};

const FEATURES: Feature[] = [
  {
    icon: <Smartphone className="h-7 w-7" />,
    iconBg: "bg-[#EFF6FF]",
    iconColor: "text-[#2563EB]",
    title: "Traçabilité totale",
    description:
      "Chaque lot dispose d'un QR code unique lié à une fiche produit complète : ingrédients, dates, origine, certifications. Vos clients accèdent à la vérité en un scan.",
    link: "Découvrir la traçabilité",
  },
  {
    icon: <Globe className="h-7 w-7" />,
    iconBg: "bg-[#F0FDF4]",
    iconColor: "text-[#10B981]",
    title: "Export simplifié",
    description:
      "Préparez vos dossiers de conformité pour les marchés internationaux (CEDEAO, UE, USA) avec des documents normalisés générés automatiquement depuis vos lots.",
    link: "Découvrir l'export",
  },
  {
    icon: <BarChart3 className="h-7 w-7" />,
    iconBg: "bg-[#FFFBEB]",
    iconColor: "text-[#F59E0B]",
    title: "Statistiques utiles",
    description:
      "Suivez en temps réel les scans par région, par produit, par période. Identifiez vos marchés les plus dynamiques et optimisez votre distribution.",
    link: "Découvrir les stats",
  },
];

export function Features() {
  return (
    <section id="fonctionnalites" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <SectionBadge>Pourquoi VerifScan ?</SectionBadge>
          <h2 className="mt-4 font-display text-[28px] font-semibold leading-tight text-[#111827] sm:text-[36px] lg:text-[40px]">
            Des fonctionnalités conçues pour votre succès
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-base text-[#6B7280]">
            Tout ce dont vous avez besoin pour renforcer la confiance de vos clients et développer votre marché en toute sérénité.
          </p>
        </AnimatedSection>

        {/* Cards grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {FEATURES.map((feature, i) => (
            <AnimatedSection
              key={feature.title}
              index={i}
              className="group relative flex flex-col rounded-2xl border border-[#F3F4F6] bg-white p-8 shadow-[0_4px_6px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_20px_25px_rgba(0,0,0,0.1)]"
            >
              <span
                className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.iconBg} ${feature.iconColor}`}
              >
                {feature.icon}
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold text-[#111827]">
                {feature.title}
              </h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#4B5563]">
                {feature.description}
              </p>
              <a
                href="#"
                className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#2563EB] transition-colors hover:text-[#1D4ED8]"
              >
                {feature.link}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
