"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, ShieldCheck, Lock, TrendingUp } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { getScanUrl } from "@/lib/qr-utils";
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

        {/* RIGHT column: real product scan visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="relative flex justify-center py-6 lg:py-0"
        >
          <div className="relative w-full max-w-[440px]">
            {/* Decorative blurred circles */}
            <div className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full bg-[#2563EB]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -right-12 h-56 w-56 rounded-full bg-[#10B981]/10 blur-3xl" />
            <div className="pointer-events-none absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-[#F59E0B]/10 blur-3xl" />

            {/* Main floating composition */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              {/* Main product image — no card/frame, gradient background blends with hero */}
              <div className="relative">
                <img
                  src="/products/jus-bissap-hero.png"
                  alt="Jus de Bissap Premium scanné avec VerifScan"
                  className="h-[420px] w-full rounded-3xl object-cover"
                />
                {/* Top brand chip */}
                <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#111827] shadow-sm backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                  VerifScan · Passeport numérique
                </div>
              </div>

              {/* Scan UI card overlapping the product (bottom-left) */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="absolute -bottom-6 left-2 z-20 w-[270px] rounded-2xl border border-[#E5E7EB] bg-white/95 p-4 shadow-xl backdrop-blur sm:-left-6"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#D1FAE5]">
                    <ShieldCheck className="h-5 w-5 text-[#10B981]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#10B981]">
                      Produit authentique
                    </p>
                    <p className="truncate text-sm font-bold text-[#111827]">
                      Jus de Bissap Premium
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-[#2563EB]">
                      LOT-2026-07-001
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-[#10B981] px-2 py-1 text-[10px] font-bold leading-none text-white">
                    95/100
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 border-t border-[#F3F4F6] pt-2 text-[10px] text-[#6B7280]">
                  <Check className="h-3 w-3 text-[#10B981]" />
                  Vérifié le 26 juil. 2026
                </div>
              </motion.div>

              {/* QR code badge (top-right) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
                className="absolute -right-3 top-6 z-20 rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-xl sm:-right-6"
              >
                <div className="rounded-lg bg-white p-1">
                  <QRCodeCanvas
                    value={getScanUrl("demo-bissap")}
                    size={80}
                    level="M"
                    marginSize={1}
                  />
                </div>
                <p className="mt-1 text-center text-[9px] font-semibold uppercase tracking-wide text-[#2563EB]">
                  Scannez
                </p>
              </motion.div>
            </motion.div>

            {/* Floating decorative badge: Blockchain (top-left) */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              className="absolute -left-2 top-16 z-30 flex items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#2563EB] shadow-lg backdrop-blur sm:-left-6"
            >
              <Lock className="h-3.5 w-3.5" />
              ✓ Blockchain
            </motion.div>

            {/* Floating decorative badge: +35% ventes (bottom-right) */}
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.25, duration: 0.5 }}
              className="absolute -right-2 bottom-24 z-30 flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#D97706] shadow-lg backdrop-blur sm:-right-4"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              +35% ventes
            </motion.div>
          </div>
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
