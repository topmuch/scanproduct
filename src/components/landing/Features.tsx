"use client";

import { Smartphone, Globe, BarChart3, ArrowRight, Check } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { SectionBadge } from "./SectionBadge";

/**
 * Features — "Des fonctionnalités conçues pour votre succès"
 *
 * Three detailed explanatory cards for the core pillars of VerifScan:
 *   1. Traçabilité totale   (blue)
 *   2. Export simplifié      (green)
 *   3. Statistiques utiles    (amber)
 *
 * Each card now includes:
 *   - A generated illustration (top) showing the feature in action.
 *   - The icon + title + description.
 *   - A bullet list of 3 concrete sub-benefits.
 *   - A "Découvrir" link.
 *
 * The section background is a soft multi-color gradient (blue → green → amber)
 * so the three cards visually echo their respective brand color, exactly as
 * requested ("mettre un fond multicolors ces 3 cards").
 */

type Feature = {
  icon: React.ReactNode;
  title: string;
  description: string;
  illustration: string;
  /** Card gradient background (subtle tint of the feature's brand color). */
  cardGradient: string;
  /** Accent color used for the icon badge, bullets, and top border. */
  accent: string;
  accentSoft: string;
  bulletColor: string;
  bullets: string[];
  link: string;
};

const FEATURES: Feature[] = [
  {
    icon: <Smartphone className="h-6 w-6" />,
    title: "Traçabilité totale",
    description:
      "Chaque lot dispose d'un QR code unique lié à une fiche produit complète. Vos clients accèdent à la vérité en un scan, où qu'ils soient.",
    illustration: "/features/feature-tracabilite.png",
    cardGradient: "from-[#EFF6FF] via-[#F0FDF4] to-white",
    accent: "text-[#2563EB]",
    accentSoft: "bg-[#2563EB]",
    bulletColor: "text-[#2563EB]",
    bullets: [
      "Ingrédients, origine et certifications visibles en 1 scan",
      "Historique complet de fabrication et de péremption",
      "Fiche produit infalsifiable, liée à votre compte fabricant",
    ],
    link: "Découvrir la traçabilité",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Export simplifié",
    description:
      "Préparez vos dossiers de conformité pour les marchés internationaux avec des documents normalisés générés automatiquement depuis vos lots.",
    illustration: "/features/feature-export.png",
    cardGradient: "from-[#F0FDF4] via-[#ECFEFF] to-white",
    accent: "text-[#10B981]",
    accentSoft: "bg-[#10B981]",
    bulletColor: "text-[#10B981]",
    bullets: [
      "Documents conformes CEDEAO, UE et USA prêts à l'emploi",
      "Génération automatique depuis les données de vos lots",
      "Gain de temps sur chaque dossier d'export",
    ],
    link: "Découvrir l'export",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Statistiques utiles",
    description:
      "Suivez en temps réel les scans par région, par produit, par période. Identifiez vos marchés les plus dynamiques et optimisez votre distribution.",
    illustration: "/features/feature-statistiques.png",
    cardGradient: "from-[#FFFBEB] via-[#FFF7ED] to-white",
    accent: "text-[#F59E0B]",
    accentSoft: "bg-[#F59E0B]",
    bulletColor: "text-[#D97706]",
    bullets: [
      "Carte de chaleur des scans par région",
      "Classement de vos produits les plus scannés",
      "Tendances mensuelles et trimestrielles",
    ],
    link: "Découvrir les stats",
  },
];

export function Features() {
  return (
    <section
      id="fonctionnalites"
      className="relative overflow-hidden bg-gradient-to-br from-[#EFF6FF] via-[#F0FDF4] to-[#FFFBEB] py-16 sm:py-20 lg:py-24"
    >
      {/* soft multi-color blobs to reinforce the "multicolor" backdrop */}
      <div
        className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-[#2563EB]/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-1/3 h-96 w-96 rounded-full bg-[#10B981]/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-1/3 h-80 w-80 rounded-full bg-[#F59E0B]/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <SectionBadge>Pourquoi VerifScan ?</SectionBadge>
          <h2 className="mt-4 font-display text-[28px] font-semibold leading-tight text-[#111827] sm:text-[36px] lg:text-[40px]">
            Des fonctionnalités conçues pour votre succès
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-base text-[#6B7280]">
            Tout ce dont vous avez besoin pour renforcer la confiance de vos
            clients et développer votre marché en toute sérénité.
          </p>
        </AnimatedSection>

        {/* Cards grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {FEATURES.map((feature, i) => (
            <AnimatedSection
              key={feature.title}
              index={i}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br ${feature.cardGradient} shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_40px_rgba(0,0,0,0.12)]`}
            >
              {/* top accent bar */}
              <span
                className={`h-1.5 w-full ${feature.accentSoft}`}
                aria-hidden
              />

              {/* Illustration */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-white/40">
                <img
                  src={feature.illustration}
                  alt={feature.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ${feature.accent}`}
                  >
                    {feature.icon}
                  </span>
                  <h3 className="font-display text-xl font-semibold text-[#111827]">
                    {feature.title}
                  </h3>
                </div>

                <p className="mt-4 text-[15px] leading-relaxed text-[#4B5563]">
                  {feature.description}
                </p>

                {/* Bullet list of concrete benefits */}
                <ul className="mt-5 space-y-2.5">
                  {feature.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2 text-[14px] leading-relaxed text-[#374151]"
                    >
                      <Check
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${feature.bulletColor}`}
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#"
                  className={`mt-6 inline-flex items-center gap-1 text-sm font-semibold ${feature.accent} transition-colors hover:opacity-80`}
                >
                  {feature.link}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
