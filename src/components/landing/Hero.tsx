"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  QrCode,
} from "lucide-react";

/**
 * Hero — full-bleed banner with an auto-playing image slider + overlaid copy.
 *
 * Premium redesign: layered cinematic scrim (vertical + brand navy tint +
 * radial vignette), floating brand-colored orbs for depth, a subtle dot grid
 * texture, a glassmorphism badge with emerald glow, a gradient accent on the
 * headline keyword, and a gradient primary CTA with a hover sheen.
 *
 * Homepage-specific copy (UNCHANGED):
 *   - Badge: "Passeport numérique"
 *   - Headline: "Garantissez l'authenticité de vos produits en un scan"
 *   - Primary CTA → /register ("Créer votre compte gratuit")
 *   - Secondary CTA → /produits ("Découvrir le catalogue")
 *
 * The primary CTA now uses the Prodtrust brand gradient (navy #00296F →
 * emerald #10b981) with an emerald glow shadow, reinforcing brand identity.
 *
 * Transition strategy (no white gap): all slides are stacked in the DOM at
 * all times (no AnimatePresence enter/exit). The active slide has opacity:1
 * + z-index:2; inactive slides have opacity:0 + z-index:1. Both layers fade
 * simultaneously, so the crossfade is seamless — the container background
 * is never visible.
 *
 * Accessibility:
 *   - Each slide has a descriptive alt text.
 *   - Arrows and dots are keyboard-focusable buttons with aria-labels.
 *   - The carousel respects prefers-reduced-motion (no auto-advance).
 *   - Decorative orbs/dot-grid are aria-hidden and pointer-events-none.
 */

type Slide = {
  webpSrc: string;
  pngSrc: string;
  alt: string;
};

const SLIDES: Slide[] = [
  {
    webpSrc: "/hero-slide-1.webp",
    pngSrc: "/hero-slide-1-opt.png",
    alt: "Prodtrust — une main tient un smartphone affichant l'application qui confirme l'authenticité d'une huile pure Natura après le scan de son QR code.",
  },
  {
    webpSrc: "/hero-slide-2.webp",
    pngSrc: "/hero-slide-2-opt.png",
    alt: "Prodtrust — une main scanne le QR code d'une bouteille de jus d'orange 100% naturel, affichant sur l'écran du smartphone la confirmation « Produit authentique » avec les détails d'origine, ingrédients et traçabilité garantie.",
  },
  {
    webpSrc: "/hero-slide-3.webp",
    pngSrc: "/hero-slide-3-opt.png",
    alt: "Prodtrust — un smartphone scanne un QR code sur un avocat au milieu de légumes frais, affichant l'écran « Passeport numérique du produit » confirmant un « Produit authentique » avec traçabilité complète.",
  },
];

const AUTOPLAY_MS = 6000;
const FADE_DURATION = 0.6; // seconds — kept short so crossfade feels snappy

export function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotionRef = useRef(false);

  // Detect prefers-reduced-motion once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = mq.matches;
  }, []);

  const goTo = useCallback((next: number) => {
    setIndex((prev) => {
      const total = SLIDES.length;
      const clamped = ((next % total) + total) % total;
      return clamped;
    });
  }, []);

  const next = useCallback(() => {
    setIndex((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prev = useCallback(() => {
    setIndex((p) => (p - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // Autoplay with pause-on-hover.
  useEffect(() => {
    if (paused || reduceMotionRef.current) return;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, next]);

  // Keyboard navigation when the slider is focused.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  };

  return (
    <section
      id="accueil"
      className="relative w-full overflow-hidden bg-[#001a3a] pt-16 lg:pt-20"
      aria-roledescription="carousel"
      aria-label="Présentation Prodtrust"
    >
      {/* ── Slider ─────────────────────────────────────────────── */}
      <div
        className="group relative w-full"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Carrousel d'images, utilisez les flèches gauche et droite pour naviguer"
      >
        {/* Slides — slightly taller for a more premium presence */}
        <div className="relative min-h-[520px] w-full sm:min-h-[600px] lg:min-h-[680px]">
          {SLIDES.map((slide, i) => {
            const isActive = i === index;
            return (
              <motion.picture
                key={i}
                initial={false}
                animate={{ opacity: isActive ? 1 : 0 }}
                transition={{ duration: FADE_DURATION, ease: [0.4, 0, 0.2, 1] }}
                style={{ zIndex: isActive ? 2 : 1 }}
                className="absolute inset-0 h-full w-full select-none"
                aria-hidden={!isActive}
              >
                <source srcSet={slide.webpSrc} type="image/webp" />
                <img
                  src={slide.pngSrc}
                  alt={isActive ? slide.alt : ""}
                  className="h-full w-full object-cover"
                  draggable={false}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              </motion.picture>
            );
          })}

          {/* Multi-layer cinematic scrim — depth + legibility + brand tint */}
          <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden>
            {/* Vertical legibility scrim (darker at bottom for copy) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />
            {/* Brand navy tint to anchor identity */}
            <div className="absolute inset-0 bg-[#00296F]/25" />
            {/* Radial vignette for center-focused depth */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.55)_100%)]" />
          </div>

          {/* Decorative floating brand-colored orbs (depth + warmth) */}
          <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden>
            <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-[#10b981]/20 blur-3xl animate-float" />
            <div className="absolute -right-16 bottom-1/4 h-80 w-80 rounded-full bg-[#00296F]/35 blur-3xl animate-float [animation-delay:1.2s]" />
            <div className="absolute right-1/4 top-12 h-40 w-40 rounded-full bg-[#f59e0b]/12 blur-3xl animate-float [animation-delay:2.4s]" />
          </div>

          {/* Subtle dot grid texture — premium tech feel */}
          <div
            className="pointer-events-none absolute inset-0 z-[3] opacity-[0.12]"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />
        </div>

        {/* ── Overlaid banner ─────────────────────────────────── */}
        <div className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center px-4 sm:px-6">
          <div className="pointer-events-auto mx-auto max-w-3xl text-center">
            {/* Badge — premium glass with emerald glow + icon chip */}
            <motion.span
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
              className="inline-flex items-center gap-2 rounded-full border border-[#10b981]/40 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_0_24px_rgba(16,185,129,0.25)] backdrop-blur-xl sm:text-sm"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] shadow-inner">
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </span>
              Passeport numérique
            </motion.span>

            {/* Headline — gradient accent on "l'authenticité" */}
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

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-white/90 drop-shadow-[0_1px_10px_rgba(0,0,0,0.6)] sm:text-[18px] lg:text-[20px]"
            >
              Le passeport numérique qui renforce la confiance de vos clients et
              protège votre marque contre la contrefaçon.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease: [0.4, 0, 0.2, 1] }}
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              {/* Primary CTA — navy→emerald gradient + emerald glow + hover sheen */}
              <Link
                href="/register"
                className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-[12px] bg-gradient-to-r from-[#00296F] to-[#10b981] px-7 py-3.5 text-base font-semibold text-white shadow-[0_10px_30px_-8px_rgba(16,185,129,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-8px_rgba(16,185,129,0.65)] sm:w-auto"
              >
                <span
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                  aria-hidden
                />
                Créer votre compte gratuit
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              {/* Secondary CTA — premium glass with emerald icon accent */}
              <Link
                href="/produits"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] border border-white/30 bg-white/10 px-7 py-3.5 text-base font-semibold text-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/20 sm:w-auto"
              >
                <QrCode className="h-4 w-4 text-[#34d399]" />
                Découvrir le catalogue
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Dots — emerald active with glow */}
        <div
          className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 sm:bottom-6"
          role="tablist"
          aria-label="Sélectionner une image"
        >
          {SLIDES.map((s, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Aller à l'image ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-8 bg-gradient-to-r from-[#10b981] to-[#34d399] shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                  : "w-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>

        {/* Live region for screen readers */}
        <span className="sr-only" aria-live="polite">
          Image {index + 1} sur {SLIDES.length}
        </span>
      </div>
    </section>
  );
}
