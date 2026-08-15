"use client";

import { FileText, QrCode, TrendingUp, ArrowRight } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { getScanUrl } from "@/lib/qr-utils";
import { AnimatedSection } from "./AnimatedSection";
import { SectionBadge } from "./SectionBadge";

/**
 * HowItWorks — "3 étapes simples pour la confiance de vos clients"
 *
 * Three ENLARGED step cards, each with:
 *   - A large generated illustration (top) showing the step in action.
 *   - The step number badge.
 *   - The title + description.
 *
 * The previous small 72px number circle + 96px icon bubble have been replaced
 * by larger card surfaces so each step reads as a real content block rather
 * than a timeline node.
 */

type Step = {
  number: number;
  illustration: string;
  illustrationAlt: string;
  title: string;
  description: string;
  numberBg: string;
  accent: string;
  accentSoft: string;
};

const STEPS: Step[] = [
  {
    number: 1,
    illustration: "/features/step-create-product.png",
    illustrationAlt: "Création d'un produit VerifScan sur tablette",
    title: "Créez votre produit",
    description:
      "Ajoutez les détails de vos produits : nom, ingrédients, dates de fabrication et péremption, logo, certifications. Tout est centralisé sur une fiche propre et professionnelle.",
    numberBg: "bg-[#2563EB]",
    accent: "text-[#2563EB]",
    accentSoft: "bg-[#EFF6FF]",
  },
  {
    number: 2,
    illustration: "/features/step-generate-qr.png",
    illustrationAlt: "Génération de QR codes pour étiquettes de produit",
    title: "Générez le QR code",
    description:
      "Un QR code unique est créé pour chaque lot, prêt à imprimer sur vos étiquettes. Chaque code est sécurisé et infalsifiable, lié à votre compte fabricant.",
    numberBg: "bg-[#10B981]",
    accent: "text-[#10B981]",
    accentSoft: "bg-[#F0FDF4]",
  },
  {
    number: 3,
    illustration: "/features/step-share-track.png",
    illustrationAlt: "Clients scannant et suivi des scans sur carte",
    title: "Partagez et suivez",
    description:
      "Vos clients scannent et accèdent à la fiche authentique. Vous suivez en temps réel les scans, retours clients et zones de consommation.",
    numberBg: "bg-[#F59E0B]",
    accent: "text-[#F59E0B]",
    accentSoft: "bg-[#FFFBEB]",
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

        {/* Enlarged step cards */}
        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          {STEPS.map((step, i) => (
            <AnimatedSection
              as="article"
              key={step.number}
              index={i}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_40px_rgba(0,0,0,0.10)]"
            >
              {/* Large illustration */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F3F4F6]">
                <img
                  src={step.illustration}
                  alt={step.illustrationAlt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Step number badge, overlapping the illustration */}
                <span
                  className={`absolute left-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full ${step.numberBg} font-display text-xl font-bold text-white shadow-lg ring-4 ring-white/90`}
                >
                  {step.number}
                </span>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <h3 className="font-display text-[22px] font-semibold text-[#111827] sm:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#4B5563]">
                  {step.description}
                </p>
              </div>
            </AnimatedSection>
          ))}
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

        {/* CTA — pointe vers l'inscription plutôt que la section tarifs
            (la section Pricing a été retirée de la home le 2025-08-15). */}
        <AnimatedSection className="mt-10 text-center">
          <a
            href="/register"
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
