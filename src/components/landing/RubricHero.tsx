/**
 * RubricHero — static colored banner for rubric pages.
 *
 * Unlike the CatalogHero (which has a slider), this is a simpler static
 * banner with a solid gradient background, an emoji, title, subtitle and
 * a back-to-catalog link. Used on /produits/authentiques, /produits/local,
 * /produits/export.
 *
 * Pure server component — no client-side interactivity needed.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export type RubricConfig = {
  title: string;
  subtitle: string;
  emoji: string;
  /** Tailwind classes for the gradient background */
  gradient: string;
  /** Tailwind class for the accent text color */
  accentText: string;
  /** Tailwind class for the emoji badge background */
  emojiBg: string;
};

export function RubricHero({ config }: { config: RubricConfig }) {
  return (
    <section
      className={`relative overflow-hidden ${config.gradient}`}
      aria-labelledby="rubric-hero-title"
    >
      <div className="mx-auto max-w-[1320px] px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="flex flex-col items-center text-center">
          {/* Emoji badge */}
          <span
            className={`flex h-20 w-20 items-center justify-center rounded-full ${config.emojiBg} text-4xl shadow-lg sm:h-24 sm:w-24 sm:text-5xl`}
            aria-hidden
          >
            {config.emoji}
          </span>

          {/* Title */}
          <h1
            id="rubric-hero-title"
            className={`mt-6 font-display text-[28px] font-bold leading-tight ${config.accentText} sm:text-[36px] lg:text-[44px]`}
          >
            {config.title}
          </h1>

          {/* Subtitle */}
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#3A3A3A] sm:text-[17px]">
            {config.subtitle}
          </p>

          {/* Back to catalog link */}
          <Link
            href="/produits"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-4 py-2 text-sm font-semibold text-[#1A1A1A] backdrop-blur transition-all hover:bg-white hover:gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au catalogue
          </Link>
        </div>
      </div>
    </section>
  );
}
