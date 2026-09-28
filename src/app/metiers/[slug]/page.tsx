import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { INDUSTRIES, getIndustry } from "@/lib/industries";

/**
 * /metiers/[slug] — pages réelles des 12 métiers (ex-modale des cards de la
 * page d'accueil). Référencement Google complet : generateMetadata (title,
 * description, canonical, openGraph), generateStaticParams (SSG des 12 pages)
 * et JSON-LD BreadcrumbList + Service.
 */

const SITE_URL = "https://verifscan.sn";

export function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ slug: i.id }));
}

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) {
    return { title: "Métier introuvable — VerifScan", robots: { index: false, follow: true } };
  }
  const title = `Traçabilité ${industry.title} — Passeport numérique QR | VerifScan`;
  const description = `${industry.description} VerifScan accompagne les fabricants de ${industry.title.toLowerCase()} : QR code anti-contrefaçon, certificats digitaux et traçabilité complète.`;
  return {
    title,
    description,
    keywords: [
      `traçabilité ${industry.title.toLowerCase()}`,
      "passeport numérique produit",
      "QR code anti-contrefaçon",
      `export ${industry.title.toLowerCase()}`,
      "traçabilité alimentaire",
      "VerifScan",
    ],
    alternates: { canonical: `/metiers/${industry.id}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/metiers/${industry.id}`,
      type: "website",
      images: [{ url: industry.image, width: 1200, height: 630, alt: industry.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MetierPage({ params }: Props) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) notFound();

  const index = INDUSTRIES.findIndex((i) => i.id === industry.id);
  const prev = INDUSTRIES[(index - 1 + INDUSTRIES.length) % INDUSTRIES.length];
  const next = INDUSTRIES[(index + 1) % INDUSTRIES.length];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Métiers", item: `${SITE_URL}/#metiers` },
          { "@type": "ListItem", position: 3, name: industry.title },
        ],
      },
      {
        "@type": "Service",
        name: `Traçabilité et passeport numérique — ${industry.title}`,
        description: industry.description,
        provider: {
          "@type": "Organization",
          name: "VerifScan",
          url: SITE_URL,
        },
        areaServed: ["SN", "FR", "BE", "CH", "CA", "CI", "ML", "BF"],
      },
    ],
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO — real photo + brand color overlay */}
      <section className="relative flex min-h-[380px] flex-col items-center justify-center px-6 py-20 text-center text-white sm:min-h-[440px]">
        <Image
          src={industry.image}
          alt={industry.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${industry.accent}E6 0%, ${industry.accent}99 100%)`,
          }}
        />
        <span className="relative z-[1] flex h-16 w-16 items-center justify-center rounded-full bg-white/25 text-4xl backdrop-blur-sm">
          {industry.emoji}
        </span>
        <h1 className="relative z-[1] mt-4 max-w-3xl font-display text-3xl font-bold leading-tight drop-shadow-lg sm:text-4xl lg:text-5xl">
          {industry.title}
        </h1>
        <p className="relative z-[1] mt-3 text-lg text-white/95 sm:text-xl">
          {industry.subtitle}
        </p>
        <nav className="relative z-[1] mt-6 flex items-center gap-2 text-xs text-white/80 sm:text-sm">
          <Link href="/" className="transition-colors hover:text-white">
            Accueil
          </Link>
          <span>/</span>
          <Link href="/#metiers" className="transition-colors hover:text-white">
            Métiers
          </Link>
          <span>/</span>
          <span className="font-semibold text-white">{industry.title}</span>
        </nav>
      </section>

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          {/* Intro */}
          <p className="text-center text-[15px] leading-relaxed text-[#374151] sm:text-base">
            {industry.description}
          </p>

          {/* Challenges */}
          <section className="mt-14">
            <h2 className="mb-6 font-display text-2xl font-bold text-[#111827] sm:text-3xl">
              Vos défis
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {industry.challenges.map((c) => (
                <div
                  key={c.title}
                  className="rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] p-5"
                >
                  <div className="text-3xl">{c.emoji}</div>
                  <h3 className="mt-3 text-sm font-bold text-[#111827] sm:text-base">
                    {c.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                    {c.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Solutions */}
          <section className="mt-14">
            <h2 className="mb-6 font-display text-2xl font-bold text-[#111827] sm:text-3xl">
              La solution VerifScan
            </h2>
            <div className="space-y-4">
              {industry.solutions.map((s) => (
                <div
                  key={s.title}
                  className="flex gap-4 rounded-xl border border-[#F3F4F6] bg-white p-5 shadow-sm"
                >
                  <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl"
                    style={{ backgroundColor: industry.accentSoft }}
                  >
                    {s.emoji}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#111827]">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">
                      {s.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Features recap */}
          <section className="mt-14">
            <div
              className="flex flex-wrap items-center gap-2 rounded-xl p-5"
              style={{ backgroundColor: industry.accentSoft }}
            >
              <Sparkles
                className="h-5 w-5 flex-shrink-0"
                style={{ color: industry.accent }}
              />
              <span className="text-sm font-semibold text-[#111827]">
                Points forts :
              </span>
              {industry.features.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#374151]"
                >
                  <Check className="h-3 w-3" style={{ color: industry.accent }} />
                  {f}
                </span>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section
            className="mt-14 flex flex-col items-center gap-4 rounded-2xl px-6 py-10 text-center"
            style={{ backgroundColor: industry.accentSoft }}
          >
            <h2 className="font-display text-2xl font-bold text-[#111827]">
              Prêt à digitaliser votre métier ?
            </h2>
            <p className="max-w-md text-sm text-[#6B7280]">
              Rejoignez les fabricants sénégalais qui font confiance à
              VerifScan pour la traçabilité de leurs produits.
            </p>
            <a
              href="/register"
              className="inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90"
              style={{ backgroundColor: industry.accent }}
            >
              Créer mon passeport numérique
              <ArrowRight className="h-4 w-4" />
            </a>
          </section>

          {/* Prev / next navigation between métiers */}
          <nav className="mt-14 grid gap-3 sm:grid-cols-2">
            <Link
              href={`/metiers/${prev.id}`}
              className="group flex items-center gap-3 rounded-xl border border-[#F3F4F6] p-4 transition-colors hover:border-[#E5E7EB] hover:bg-[#F9FAFB]"
            >
              <ArrowLeft className="h-4 w-4 flex-shrink-0 text-[#9CA3AF] transition-transform group-hover:-translate-x-0.5" />
              <span>
                <span className="block text-xs text-[#9CA3AF]">Métier précédent</span>
                <span className="text-sm font-semibold text-[#111827]">
                  {prev.emoji} {prev.title}
                </span>
              </span>
            </Link>
            <Link
              href={`/metiers/${next.id}`}
              className="group flex items-center justify-end gap-3 rounded-xl border border-[#F3F4F6] p-4 text-right transition-colors hover:border-[#E5E7EB] hover:bg-[#F9FAFB]"
            >
              <span>
                <span className="block text-xs text-[#9CA3AF]">Métier suivant</span>
                <span className="text-sm font-semibold text-[#111827]">
                  {next.emoji} {next.title}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-[#9CA3AF] transition-transform group-hover:translate-x-0.5" />
            </Link>
          </nav>
        </div>
      </main>
    </div>
  );
}
