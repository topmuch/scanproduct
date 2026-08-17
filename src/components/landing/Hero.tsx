"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  QrCode,
} from "lucide-react";

/**
 * Hero — full-bleed banner with an auto-playing image slider + overlaid copy.
 *
 * Mirrors the CatalogHero design (same height min-h 480→560→640px, same
 * gradient scrim overlay, same centered badge + h1 + paragraph + 2 CTAs)
 * so the homepage and the catalog page share a consistent visual language.
 *
 * Homepage-specific copy:
 *   - Badge: "Passeport numérique"
 *   - Headline: "Garantissez l'authenticité de vos produits en un scan"
 *   - Primary CTA → /register ("Créer votre compte gratuit")
 *   - Secondary CTA → /produits ("Découvrir le catalogue")
 *
 * The primary CTA keeps the homepage blue accent (#2563EB) to preserve the
 * SaaS landing page identity (the catalog page uses green #3BB77E).
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
    alt: "VerifScan — une main tient un smartphone affichant l'application qui confirme l'authenticité d'une huile pure Natura après le scan de son QR code.",
  },
  {
    webpSrc: "/hero-slide-2.webp",
    pngSrc: "/hero-slide-2-opt.png",
    alt: "VerifScan — une main scanne le QR code d'une bouteille de jus d'orange 100% naturel, affichant sur l'écran du smartphone la confirmation « Produit authentique » avec les détails d'origine, ingrédients et traçabilité garantie.",
  },
  {
    webpSrc: "/hero-slide-3.webp",
    pngSrc: "/hero-slide-3-opt.png",
    alt: "VerifScan — un smartphone scanne un QR code sur un avocat au milieu de légumes frais, affichant l'écran « Passeport numérique du produit » confirmant un « Produit authentique » avec traçabilité complète.",
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
      className="relative w-full overflow-hidden bg-[#0a0a0a] pt-16 lg:pt-20"
      aria-roledescription="carousel"
      aria-label="Présentation VerifScan"
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
        {/* Slides — same height as CatalogHero (480→560→640px) */}
        <div className="relative min-h-[480px] w-full sm:min-h-[560px] lg:min-h-[640px]">
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

          {/* Gradient scrim for overlay legibility (same as CatalogHero) */}
          <div
            className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-black/80 via-black/35 to-black/25"
            aria-hidden
          />
        </div>

        {/* ── Overlaid banner — same layout as CatalogHero ────── */}
        <div className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center px-4 sm:px-6">
          <div className="pointer-events-auto mx-auto max-w-3xl text-center">
            <motion.span
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-md sm:text-sm"
            >
              <ShieldCheck className="h-4 w-4" />
              Passeport numérique
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="mt-5 font-display text-[30px] font-bold leading-[1.1] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-[40px] lg:text-[52px]"
            >
              Garantissez l&apos;authenticité de vos produits en un scan
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] sm:text-[18px] lg:text-[20px]"
            >
              Le passeport numérique qui renforce la confiance de vos clients et
              protège votre marque contre la contrefaçon.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease: [0.4, 0, 0.2, 1] }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                href="/register"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#2563EB] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-black/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1D4ED8] hover:shadow-xl sm:w-auto"
              >
                Créer votre compte gratuit
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/produits"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-white/40 bg-white/10 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 sm:w-auto"
              >
                <QrCode className="h-4 w-4" />
                Découvrir le catalogue
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Arrows — appear on hover/focus, always visible on touch */}
        <button
          type="button"
          onClick={prev}
          aria-label="Image précédente"
          className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[#111827] shadow-md backdrop-blur-sm transition-all duration-200 hover:bg-white hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 sm:left-5 sm:h-12 sm:w-12 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Image suivante"
          className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[#111827] shadow-md backdrop-blur-sm transition-all duration-200 hover:bg-white hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 sm:right-5 sm:h-12 sm:w-12 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Dots */}
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
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-7 bg-white shadow-sm"
                  : "w-2.5 bg-white/50 hover:bg-white/80"
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
