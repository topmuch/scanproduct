"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  QrCode,
  ScanLine,
  CheckCircle2,
  Globe,
} from "lucide-react";

/**
 * Hero — premium dark navy section with brand-colored effects.
 *
 * Design: solid navy background (#00296F) with floating gradient orbs,
 * dot grid texture, and a glassmorphism badge. NO bright slide images
 * in the foreground — the hero is intentionally dark and premium.
 *
 * Content (UNCHANGED from previous version):
 *   - Badge: "Passeport numérique"
 *   - Headline: "Garantissez l'authenticité de vos produits en un scan"
 *   - Primary CTA → /register ("Créer votre compte gratuit")
 *   - Secondary CTA → /produits ("Découvrir le catalogue")
 */

export function Hero() {
  return (
    <section
      id="accueil"
      className="relative w-full overflow-hidden bg-[#00296F] pt-16 lg:pt-20"
    >
      {/* ── Background layers ────────────────────────────────────── */}

      {/* Solid navy base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#00296F] via-[#001D4F] to-[#00296F]" />

      {/* Subtle slide images as dark texture (opacity 15%) */}
      <div
        className="absolute inset-0 opacity-[0.50]"
        style={{
          backgroundImage: "url(/hero-main.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      />

      {/* Dark overlay to ensure text legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" aria-hidden />

      {/* Floating brand-colored orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-[#10b981]/25 blur-3xl animate-float" />
        <div className="absolute -right-16 bottom-1/4 h-80 w-80 rounded-full bg-[#1A5DAA]/30 blur-3xl animate-float [animation-delay:1.2s]" />
        <div className="absolute right-1/4 top-12 h-40 w-40 rounded-full bg-[#f59e0b]/15 blur-3xl animate-float [animation-delay:2.4s]" />
      </div>

      {/* Dot grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        aria-hidden
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto flex min-h-[520px] max-w-5xl flex-col items-center justify-center px-4 py-20 text-center sm:min-h-[560px] lg:min-h-[640px] lg:py-24">
        {/* Badge */}
        <motion.span
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
          className="inline-flex items-center gap-2 rounded-full border border-[#10b981]/50 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_0_24px_rgba(16,185,129,0.3)] backdrop-blur-xl sm:text-sm"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] shadow-inner">
            <ShieldCheck className="h-3.5 w-3.5 text-white" />
          </span>
          Passeport numérique
        </motion.span>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className="mt-6 font-display text-[32px] font-bold leading-[1.08] tracking-[-0.01em] text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.55)] sm:text-[44px] lg:text-[56px]"
        >
          Garantissez{" "}
          <span className="bg-gradient-to-r from-[#34d399] to-[#10b981] bg-clip-text text-transparent">
            l&apos;authenticité
          </span>{" "}
          de vos produits en un scan
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-white/90 drop-shadow-[0_1px_10px_rgba(0,0,0,0.6)] sm:text-[18px] lg:text-[20px]"
        >
          Le passeport numérique qui renforce la confiance de vos clients et
          protège votre marque contre la contrefaçon.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease: [0.4, 0, 0.2, 1] }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/register"
            className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-[12px] bg-gradient-to-r from-[#10b981] to-[#34d399] px-7 py-3.5 text-base font-bold text-[#00296F] shadow-[0_10px_30px_-8px_rgba(16,185,129,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-8px_rgba(16,185,129,0.75)] sm:w-auto"
          >
            <span
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              aria-hidden
            />
            Créer votre compte gratuit
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/produits"
            className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] border border-white/40 bg-white/10 px-7 py-3.5 text-base font-semibold text-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/20 sm:w-auto"
          >
            <QrCode className="h-4 w-4 text-[#34d399]" />
            Découvrir le catalogue
          </Link>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-white/70 sm:text-sm"
        >
          <span className="flex items-center gap-1.5">
            <ScanLine className="h-4 w-4 text-[#34d399]" />
            QR code unique
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[#34d399]" />
            Anti-contrefaçon
          </span>
          <span className="flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-[#34d399]" />
            Traçabilité complète
          </span>
        </motion.div>
      </div>

      {/* Bottom fade to white */}
    </section>
  );
}
