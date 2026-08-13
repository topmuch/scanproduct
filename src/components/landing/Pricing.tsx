"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Star, Sparkles, ArrowRight } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { SectionBadge } from "./SectionBadge";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  subtitle: string;
  monthly: number;
  yearly: number;
  features: string[];
  cta: string;
  highlighted?: boolean;
  buttonClass: string;
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    subtitle: "Pour les petites entreprises qui démarrent",
    monthly: 10000,
    yearly: 84000, // ~30% off (10000*12=120000 -> 84000)
    features: [
      "Jusqu'à 5 produits",
      "500 QR codes par mois",
      "Statistiques basiques",
      "Page produit publique",
      "Support email (48h)",
      "1 utilisateur",
    ],
    cta: "Choisir Starter",
    buttonClass:
      "border border-[#2563EB] text-[#2563EB] bg-white hover:bg-[#EFF6FF]",
  },
  {
    name: "Pro",
    subtitle: "Pour les PME en croissance",
    monthly: 25000,
    yearly: 210000, // 25000*12=300000 -> 210000
    features: [
      "Jusqu'à 50 produits",
      "5 000 QR codes par mois",
      "Statistiques avancées + export",
      "Marketplace B2B intégrée",
      "Support prioritaire (24h)",
      "5 utilisateurs inclus",
      "Documents d'export CEDEAO",
      "API publique",
    ],
    cta: "Choisir Pro",
    highlighted: true,
    buttonClass:
      "bg-gradient-to-r from-[#2563EB] to-[#10B981] text-white hover:shadow-lg hover:shadow-[#2563EB]/30",
  },
  {
    name: "Business",
    subtitle: "Pour les grands groupes et exportateurs",
    monthly: 75000,
    yearly: 630000, // 75000*12=900000 -> 630000
    features: [
      "Produits illimités",
      "QR codes illimités",
      "Statistiques temps réel + BI",
      "Multi-sociétés",
      "Support dédié (4h)",
      "Utilisateurs illimités",
      "Documents export UE / USA",
      "API + Webhooks",
      "SLA 99.9%",
    ],
    cta: "Choisir Business",
    buttonClass:
      "border border-[#10B981] text-[#10B981] bg-white hover:bg-[#F0FDF4]",
  },
];

function formatFCFA(n: number) {
  return n.toLocaleString("fr-FR");
}

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection className="mx-auto max-w-2xl text-center">
          <SectionBadge bg="bg-[#EFF6FF]" color="text-[#2563EB]">
            Tarifs
          </SectionBadge>
          <h2 className="mt-4 font-display text-[28px] font-semibold leading-tight text-[#111827] sm:text-[36px] lg:text-[40px]">
            Des formules adaptées à votre entreprise
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-base text-[#6B7280]">
            Aucun engagement, annulation à tout moment. Économisez 30% avec le paiement annuel.
          </p>
        </AnimatedSection>

        {/* Toggle */}
        <AnimatedSection className="mt-8 flex items-center justify-center">
          <div className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={cn(
                "relative rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                !annual ? "text-white" : "text-[#374151] hover:text-[#111827]"
              )}
            >
              {!annual && (
                <motion.span
                  layoutId="pricing-toggle"
                  className="absolute inset-0 rounded-full bg-[#2563EB]"
                  transition={{ type: "spring", damping: 28, stiffness: 350 }}
                />
              )}
              <span className="relative">Mensuel</span>
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={cn(
                "relative rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                annual ? "text-white" : "text-[#374151] hover:text-[#111827]"
              )}
            >
              {annual && (
                <motion.span
                  layoutId="pricing-toggle"
                  className="absolute inset-0 rounded-full bg-[#10B981]"
                  transition={{ type: "spring", damping: 28, stiffness: 350 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                Annuel
                <span className="rounded-full bg-[#F59E0B]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#D97706]">
                  -30%
                </span>
              </span>
            </button>
          </div>
        </AnimatedSection>

        {/* Plans */}
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {PLANS.map((plan, i) => {
            const price = annual ? Math.round(plan.yearly / 12) : plan.monthly;
            const oldPrice = annual ? plan.monthly : null;
            return (
              <AnimatedSection
                key={plan.name}
                index={i}
                className={cn(
                  "relative flex flex-col rounded-2xl p-8 transition-all duration-300",
                  plan.highlighted
                    ? "border-2 border-[#2563EB] bg-gradient-to-b from-[#EFF6FF] to-[#F0FDF4] shadow-[0_20px_40px_rgba(37,99,235,0.15)] lg:-translate-y-3"
                    : "border border-[#E5E7EB] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(0,0,0,0.08)]"
                )}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
                    <Star className="h-3 w-3 fill-white" /> Le plus populaire
                  </span>
                )}

                <h3 className="font-display text-2xl font-semibold text-[#111827]">{plan.name}</h3>
                <p className="mt-1 text-sm text-[#6B7280]">{plan.subtitle}</p>

                <div className="mt-5 flex items-end gap-2">
                  <span className="font-display text-[36px] font-bold leading-none text-[#111827]">
                    {formatFCFA(price)}
                  </span>
                  <span className="mb-1 text-sm text-[#6B7280]">FCFA/mois</span>
                </div>
                <div className="mt-1 flex h-5 items-center gap-2">
                  {oldPrice && (
                    <span className="text-sm text-[#9CA3AF] line-through">
                      {formatFCFA(oldPrice)} FCFA
                    </span>
                  )}
                  {annual && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#10B981]">
                      <Sparkles className="h-3 w-3" /> économisez 30%
                    </span>
                  )}
                </div>

                <a
                  href="#"
                  className={cn(
                    "mt-6 inline-flex items-center justify-center gap-1.5 rounded-[10px] px-5 py-3 text-sm font-semibold transition-all duration-300",
                    plan.buttonClass
                  )}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </a>

                <ul className="mt-6 space-y-3 border-t border-[#E5E7EB] pt-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[#374151]">
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full",
                          plan.highlighted ? "bg-[#10B981]" : "bg-[#D1FAE5]"
                        )}
                      >
                        <Check
                          className={cn(
                            "h-3 w-3",
                            plan.highlighted ? "text-white" : "text-[#10B981]"
                          )}
                        />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </AnimatedSection>
            );
          })}
        </div>

        {/* Bottom note */}
        <AnimatedSection className="mt-10 text-center">
          <p className="text-sm text-[#6B7280]">
            💡 Économisez 30% avec le paiement annuel —{" "}
            <a href="#contact" className="font-semibold text-[#2563EB] hover:underline">
              Besoin d&apos;une formule sur mesure ? Parlons-en →
            </a>
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
