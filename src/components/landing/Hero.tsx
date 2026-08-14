"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Hero — full-width banner version.
 *
 * Layout:
 *   1. A full-bleed promotional banner image (edge-to-edge, no padding).
 *   2. Right below the banner, a centered text block explaining what the
 *      site is for: the headline "Garantissez l'authenticité de vos produits
 *      en un scan" and a supporting paragraph, plus the primary CTA button.
 *
 * The image is rendered edge-to-edge (no horizontal padding, no max-width)
 * so it occupies the entire width of the hero section. It keeps its natural
 * aspect ratio (nothing cropped) and scales down gracefully on mobile.
 *
 * The text block below is constrained to a comfortable reading width
 * (max-w-3xl) and centered so it stays readable on every screen size.
 */
export function Hero() {
  return (
    <section id="accueil" className="relative w-full bg-white pt-16 lg:pt-20">
      {/* Full-width promotional banner */}
      <motion.img
        src="/hero-banner.png"
        alt="VerifScan — Authenticité vérifiée, confiance renforcée. Un scan garantit l'authenticité de vos produits et protège votre marque contre la contrefaçon."
        initial={{ opacity: 0, scale: 1.01 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        className="block h-auto w-full select-none"
        draggable={false}
      />

      {/* Headline + value proposition, directly under the banner */}
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-14 lg:py-16">
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className="font-display text-[28px] font-bold leading-[1.15] text-[#111827] sm:text-[36px] lg:text-[44px]"
        >
          Garantissez l&apos;authenticité de vos produits en un scan
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="mx-auto mt-4 max-w-2xl text-[16px] leading-relaxed text-[#4B5563] sm:text-[18px]"
        >
          Le passeport numérique qui renforce la confiance de vos clients et
          protège votre marque contre la contrefaçon.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease: [0.4, 0, 0.2, 1] }}
          className="mt-8"
        >
          <Link
            href="/register"
            className="group inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#2563EB] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#2563EB]/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1D4ED8] hover:shadow-xl hover:shadow-[#2563EB]/40"
          >
            Créer votre compte gratuit
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
