"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Hero — full-width banner with an auto-playing image slider.
 *
 * Layout:
 *   1. A full-bleed carousel of 3 promotional images (edge-to-edge, no padding).
 *      Slides crossfade every 6s, pause on hover, with dot navigation + arrows.
 *   2. Right below the carousel, a centered text block explaining what the
 *      site is for, plus the primary CTA button.
 *
 * Accessibility:
 *   - Each slide has a descriptive alt text.
 *   - Arrows and dots are keyboard-focusable buttons with aria-labels.
 *   - The carousel respects prefers-reduced-motion (no auto-advance).
 */

type Slide = {
  src: string;
  alt: string;
};

const SLIDES: Slide[] = [
  {
    src: "/hero-slide-1.png",
    alt: "VerifScan — scan d'une bouteille de jus d'orange 100% naturel avec un smartphone, affichant le passeport numérique du produit : origine Sénégal, producteur Vergers de Casamance, authenticité vérifiée.",
  },
  {
    src: "/hero-slide-2.png",
    alt: "VerifScan — Authenticité vérifiée, confiance renforcée. Un scan garantit l'authenticité de vos produits et protège votre marque contre la contrefaçon.",
  },
  {
    src: "/hero-slide-3.png",
    alt: "VerifScan — scan d'un QR code sur un avocat pour tracer des fruits et légumes frais, avec sur l'écran du téléphone : authenticité garantie, origine vérifiée, traçabilité complète et confiance renforcée.",
  },
];

const AUTOPLAY_MS = 6000;

export function Hero() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
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
      setDirection(clamped >= prev ? 1 : -1);
      return clamped;
    });
  }, []);

  const next = useCallback(() => {
    setIndex((prev) => {
      const total = SLIDES.length;
      const n = (prev + 1) % total;
      setDirection(1);
      return n;
    });
  }, []);

  const prev = useCallback(() => {
    setIndex((p) => {
      const total = SLIDES.length;
      const n = (p - 1 + total) % total;
      setDirection(-1);
      return n;
    });
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
      className="relative w-full bg-white pt-16 lg:pt-20"
      aria-roledescription="carousel"
      aria-label="Présentation VerifScan"
    >
      {/* ── Slider ─────────────────────────────────────────────── */}
      <div
        className="group relative w-full overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="region"
        aria-label="Carrousel d'images, utilisez les flèches gauche et droite pour naviguer"
      >
        {/* Slides */}
        <div className="relative aspect-[1956/804] w-full sm:aspect-[1956/804]">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.img
              key={index}
              src={SLIDES[index].src}
              alt={SLIDES[index].alt}
              custom={direction}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 h-full w-full select-none object-cover"
              draggable={false}
              aria-hidden={false}
            />
          </AnimatePresence>

          {/* Subtle gradient overlay for legibility of controls */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent"
            aria-hidden
          />
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
          className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 sm:bottom-4"
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

      {/* ── Headline + value proposition ───────────────────────── */}
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
