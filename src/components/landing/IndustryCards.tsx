"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { AnimatedSection } from "./AnimatedSection";
import { SectionBadge } from "./SectionBadge";
import { INDUSTRIES, type Industry } from "@/lib/industries";

/**
 * IndustryCards — "Un passeport numérique pour chaque métier"
 *
 * Grid of 12 industry-specific cards displayed below the DemoSection on the
 * home page. Each card is a real link to its dedicated page /metiers/[slug]
 * (SEO-referencable, crawlable, shareable) — replacing the former modal,
 * per user request. The full content (challenges, solutions, features, CTA)
 * lives in src/lib/industries.ts and is rendered by /metiers/[slug]/page.tsx.
 */
export { INDUSTRIES };

function IndustryCard({
  industry,
  index,
}: {
  industry: Industry;
  index: number;
}) {
  return (
    <AnimatedSection index={index} as="article">
      <Link
        href={`/metiers/${industry.id}`}
        className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border-2 border-[#F3F4F6] bg-white text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_20px_50px_rgba(0,0,0,0.10)]"
      >
        {/* Real image header with brand color tint */}
        <div className="relative h-44 overflow-hidden">
          <Image
            src={industry.image}
            alt={industry.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Brand color gradient overlay for identity & legibility */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, ${industry.accent}66 0%, transparent 55%)`,
            }}
          />
          {/* Emoji chip — keeps the playful identity cue */}
          <span className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl shadow-md backdrop-blur-sm">
            {industry.emoji}
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display text-lg font-bold leading-tight text-[#111827] transition-colors group-hover:text-[#022150]">
            {industry.title}
          </h3>

          <p
            className="mt-1 text-sm font-semibold"
            style={{ color: industry.accent }}
          >
            {industry.subtitle}
          </p>

          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#6B7280]">
            {industry.description}
          </p>

          {/* Feature pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {industry.features.map((f) => (
              <span
                key={f}
                className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs font-medium text-[#6B7280]"
              >
                {f}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-[#022150] transition-all group-hover:gap-2">
            En savoir plus
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    </AnimatedSection>
  );
}

export function IndustryCards() {
  return (
    <section className="bg-white py-20 sm:py-24" id="metiers">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection className="mb-12 text-center">
          <SectionBadge bg="bg-[#F0F4F9]" color="text-[#022150]">
            🎯 Par métier
          </SectionBadge>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-[#111827] sm:text-4xl">
            Un passeport numérique pour{" "}
            <span className="bg-gradient-to-r from-[#022150] to-[#10B981] bg-clip-text text-transparent">
              chaque métier
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base text-[#6B7280] sm:text-lg">
            Que vous soyez producteur de fruits, transformateur de cacao ou
            fabricant de cosmétiques, VerifScan s&apos;adapte à vos besoins
            spécifiques.
          </p>
        </AnimatedSection>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {INDUSTRIES.map((industry, index) => (
            <IndustryCard key={industry.id} industry={industry} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
