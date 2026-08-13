"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, ShieldCheck, Lock, TrendingUp } from "lucide-react";
import { PhoneMockup } from "./PhoneMockup";
import { CountUp } from "./CountUp";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.4, 0, 0.2, 1] as const },
  }),
};

const CLIENTS = [
  "Sarine Bio",
  "Térange Foods",
  "Bissap Premium",
  "Sénégal Agro",
  "Dakar Foods",
  "BioAfrica",
];

export function Hero() {
  return (
    <section
      id="accueil"
      className="relative overflow-hidden bg-gradient-to-b from-[#EFF6FF] via-[#F0FDF4] to-white pt-24 pb-16 sm:pt-28 lg:pt-32"
    >
      {/* decorative top grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(37,99,235,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(37,99,235,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8">
        {/* LEFT column */}
        <div className="text-center lg:text-left">
          <motion.span
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2 text-sm font-medium text-[#2563EB]"
          >
            <Lock className="h-3.5 w-3.5" />
            Passeport numérique pour vos produits
          </motion.span>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-5 font-display text-[36px] font-bold leading-[1.1] text-[#111827] sm:text-[44px] lg:text-[56px]"
          >
            Garantissez l&apos;<span className="text-[#2563EB]">authenticité</span> de vos produits en un scan
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mx-auto mt-5 max-w-[540px] text-[18px] leading-relaxed text-[#4B5563] lg:mx-0"
          >
            Le passeport numérique qui renforce la confiance de vos clients et protège votre marque contre la contrefaçon.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-7 flex flex-col items-center gap-4 sm:flex-row lg:items-start"
          >
            <a
              href="#pricing"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#2563EB] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1D4ED8] hover:shadow-xl hover:shadow-[#2563EB]/40 sm:w-auto"
            >
              Créer votre compte gratuit
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <div className="flex flex-col gap-1.5 text-left sm:flex-row sm:items-center sm:gap-4">
              <span className="flex items-center gap-1.5 text-sm text-[#6B7280]">
                <Check className="h-4 w-4 text-[#10B981]" /> Aucune carte bancaire requise
              </span>
              <span className="flex items-center gap-1.5 text-sm text-[#6B7280]">
                <Check className="h-4 w-4 text-[#10B981]" /> 14 jours d&apos;essai gratuit
              </span>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.dl
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-10 grid grid-cols-3 gap-4 border-t border-[#E5E7EB] pt-6"
          >
            <div className="text-center lg:text-left">
              <dt className="font-display text-[28px] font-bold text-[#111827]">
                <CountUp end={12458} />
              </dt>
              <dd className="text-[13px] text-[#6B7280]">produits scannés cette semaine</dd>
            </div>
            <div className="text-center lg:text-left">
              <dt className="font-display text-[28px] font-bold text-[#111827]">
                <CountUp end={98} suffix="%" />
              </dt>
              <dd className="text-[13px] text-[#6B7280]">de confiance en plus avec VerifScan</dd>
            </div>
            <div className="text-center lg:text-left">
              <dt className="font-display text-[28px] font-bold text-[#111827]">
                <CountUp end={250} suffix="+" />
              </dt>
              <dd className="text-[13px] text-[#6B7280]">fabricants actifs</dd>
            </div>
          </motion.dl>

          {/* Client logos */}
          <motion.div
            custom={5}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-10"
          >
            <p className="text-center text-[11px] font-semibold uppercase tracking-[1.5px] text-[#9CA3AF] lg:text-left">
              Ils nous font confiance à travers le Sénégal
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:justify-start">
              {CLIENTS.map((name) => (
                <span
                  key={name}
                  className="font-display text-sm font-semibold text-[#9CA3AF] opacity-70 transition-all duration-300 hover:opacity-100 hover:text-[#374151]"
                >
                  {name}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* RIGHT column: phone mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="relative flex justify-center py-6 lg:py-0"
        >
          <PhoneMockup />
        </motion.div>
      </div>

      {/* tiny trust ribbon */}
      <div className="relative mx-auto mt-14 max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[#6B7280]">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#10B981]" /> Anti-contrefaçon certifié
          </span>
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[#2563EB]" /> Sécurisé par blockchain
          </span>
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#F59E0B]" /> +35% de ventes en moyenne
          </span>
        </div>
      </div>
    </section>
  );
}
