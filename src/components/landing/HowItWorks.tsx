"use client";

import { FileText, QrCode, TrendingUp, ArrowRight } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { SectionBadge } from "./SectionBadge";

type Step = {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  circleBg: string;
  ringColor: string;
};

const STEPS: Step[] = [
  {
    number: 1,
    icon: <FileText className="h-7 w-7" />,
    title: "Créez votre produit",
    description:
      "Ajoutez les détails de vos produits : nom, ingrédients, dates de fabrication et péremption, logo, certifications. Tout est centralisé sur une fiche propre et professionnelle.",
    circleBg: "bg-[#2563EB]",
    ringColor: "ring-[#2563EB]/20",
  },
  {
    number: 2,
    icon: <QrCode className="h-7 w-7" />,
    title: "Générez le QR code",
    description:
      "Un QR code unique est créé pour chaque lot, prêt à imprimer sur vos étiquettes. Chaque code est sécurisé et infalsifiable, lié à votre compte fabricant.",
    circleBg: "bg-[#10B981]",
    ringColor: "ring-[#10B981]/20",
  },
  {
    number: 3,
    icon: <TrendingUp className="h-7 w-7" />,
    title: "Partagez et suivez",
    description:
      "Vos clients scannent et accèdent à la fiche authentique. Vous suivez en temps réel les scans, retours clients et zones de consommation.",
    circleBg: "bg-[#F59E0B]",
    ringColor: "ring-[#F59E0B]/20",
  },
];

export function HowItWorks() {
  return (
    <section id="concept" className="bg-[#F9FAFB] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <SectionBadge bg="bg-[#FEF3C7]" color="text-[#D97706]">
            Simple &amp; rapide
          </SectionBadge>
          <h2 className="mt-4 font-display text-[28px] font-semibold leading-tight text-[#111827] sm:text-[36px] lg:text-[40px]">
            3 étapes simples pour la confiance de vos clients
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-base text-[#6B7280]">
            Commencez en moins de 5 minutes, sans formation technique.
          </p>
        </AnimatedSection>

        {/* Timeline */}
        <div className="relative mt-14">
          {/* horizontal connector (desktop) */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-9 hidden h-0.5 lg:block"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #2563EB 18%, #10B981 50%, #F59E0B 82%, transparent 100%)",
            }}
            aria-hidden
          />

          <ol className="relative grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-8">
            {STEPS.map((step, i) => (
              <AnimatedSection as="li" key={step.number} index={i} className="relative">
                {/* number circle */}
                <div className="flex justify-center lg:mb-0">
                  <span
                    className={`relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-full ${step.circleBg} text-white shadow-lg ring-8 ${step.ringColor}`}
                  >
                    <span className="font-display text-2xl font-bold">{step.number}</span>
                  </span>
                </div>

                {/* icon bubble */}
                <div className="mt-6 flex justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-[#374151] shadow-sm">
                    {step.icon}
                  </span>
                </div>

                <div className="mt-4 text-center">
                  <h3 className="font-display text-xl font-semibold text-[#111827]">
                    {step.title}
                  </h3>
                  <p className="mx-auto mt-3 max-w-[340px] text-[15px] leading-relaxed text-[#4B5563]">
                    {step.description}
                  </p>
                </div>

                {/* vertical connector for mobile */}
                {i < STEPS.length - 1 && (
                  <span
                    className="mx-auto mt-8 block h-8 w-0.5 rounded bg-gradient-to-b from-[#2563EB] to-[#10B981] lg:hidden"
                    aria-hidden
                  />
                )}
              </AnimatedSection>
            ))}
          </ol>
        </div>

        {/* Process mini-illustration */}
        <AnimatedSection className="mt-14">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-5 text-sm shadow-sm sm:gap-4">
            <span className="inline-flex items-center gap-2 rounded-lg bg-[#EFF6FF] px-3 py-2 font-medium text-[#2563EB]">
              <FileText className="h-4 w-4" /> Fiche produit
            </span>
            <ArrowRight className="h-4 w-4 text-[#9CA3AF]" />
            <span className="inline-flex items-center gap-2 rounded-lg bg-[#F0FDF4] px-3 py-2 font-medium text-[#10B981]">
              <QrCode className="h-4 w-4" /> QR code unique
            </span>
            <ArrowRight className="h-4 w-4 text-[#9CA3AF]" />
            <span className="inline-flex items-center gap-2 rounded-lg bg-[#FFFBEB] px-3 py-2 font-medium text-[#D97706]">
              <TrendingUp className="h-4 w-4" /> Scan &amp; suivi
            </span>
          </div>
        </AnimatedSection>

        {/* CTA */}
        <AnimatedSection className="mt-10 text-center">
          <a
            href="#pricing"
            className="group inline-flex items-center gap-2 rounded-[10px] bg-[#2563EB] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1D4ED8]"
          >
            Démarrer maintenant
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </AnimatedSection>
      </div>
    </section>
  );
}
