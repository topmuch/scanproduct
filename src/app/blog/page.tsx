import type { Metadata } from "next";
import Link from "next/link";
import {
  Newspaper,
  ArrowRight,
  Sparkles,
  Tag,
  Clock,
  MailOpen,
  Rss,
  QrCode,
  ShieldCheck,
  Sprout,
  BarChart3,
} from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { NewsletterSignup } from "@/components/public/NewsletterSignup";

export const metadata: Metadata = {
  title: "Blog — VerifScan",
  description:
    "Le blog VerifScan : actualités, analyses et témoignages sur la traçabilité alimentaire, l'agro-industrie ouest-africaine et la lutte contre la contrefaçon.",
  openGraph: {
    title: "Blog — VerifScan",
    description:
      "Actualités et analyses sur la traçabilité alimentaire en Afrique de l'Ouest.",
    type: "website",
  },
};

const PLACEHOLDER_ARTICLES = [
  {
    icon: QrCode,
    category: "Produit",
    title: "Comment fonctionne un passeport numérique VerifScan",
    excerpt:
      "Du QR code généré en usine jusqu'à la page consultée par le consommateur : découvrez le cheminement complet d'un passeport numérique.",
    readTime: "6 min",
    color: "#2563EB",
  },
  {
    icon: ShieldCheck,
    category: "Anti-contrefaçon",
    title: "Lutter contre la contrefaçon dans le jus de bissap",
    excerpt:
      "Le jus de bissap est l'un des produits les plus contrefaits au Sénégal. Comment la traçabilité QR peut-elle protéger les producteurs locaux ?",
    readTime: "8 min",
    color: "#10B981",
  },
  {
    icon: Sprout,
    category: "Agro-industrie",
    title: "5 certifications qui valorisent vos produits locaux",
    excerpt:
      "Bio, HACCP, halal, label qualité Sénégal, commerce équitable : lesquelles afficher sur votre passeport numérique pour rassurer vos clients ?",
    readTime: "5 min",
    color: "#F59E0B",
  },
  {
    icon: BarChart3,
    category: "Données",
    title: "Mesurer l'impact de la transparence sur vos ventes",
    excerpt:
      "Les consommateurs scannent-ils vraiment les QR codes ? Que font-ils après ? Les premiers chiffres de notre étude terrain 2025.",
    readTime: "7 min",
    color: "#2563EB",
  },
];

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <PublicHeader />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden bg-[#0F172A] text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 30%, rgba(37,99,235,0.45) 0, transparent 45%), radial-gradient(circle at 85% 70%, rgba(16,185,129,0.30) 0, transparent 50%)",
            }}
          />
          <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
              <Newspaper className="h-3.5 w-3.5 text-[#34D399]" />
              Le blog VerifScan
            </span>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Bientôt, ici, la{" "}
              <span className="bg-gradient-to-r from-[#60A5FA] via-[#34D399] to-[#FBBF24] bg-clip-text text-transparent">
                vérité sur la traçabilité.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
              Analyses, retours terrain, études de cas et bonnes pratiques
              autour de la traçabilité alimentaire en Afrique de
              l&apos;Ouest. Notre blog est en préparation : inscrivez-vous
              pour être prévenu du lancement.
            </p>

            {/* Newsletter signup */}
            <div className="mt-10 max-w-xl rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur sm:p-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <MailOpen className="h-4 w-4 text-[#34D399]" />
                Newsletter
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Recevez nos prochains articles directement dans votre boîte
                mail. Pas de spam, désinscription en un clic.
              </p>
              <div className="mt-4">
                <NewsletterSignup
                  id="blog-newsletter"
                  buttonLabel="Prévenez-moi"
                  successMessage="Vous serez prévenu dès la publication du premier article."
                />
              </div>
            </div>
          </div>
        </section>

        {/* COMING SOON BANNER */}
        <section className="border-b border-[#F3F4F6] bg-white">
          <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-[#EFF6FF] px-6 py-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB]">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#111827]">
                    Le blog arrive très prochainement
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    Notre équipe rédactionnelle finalise les premiers articles.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white">
                <Clock className="h-3 w-3" />
                Bientôt disponible
              </span>
            </div>
          </div>
        </section>

        {/* PLACEHOLDER ARTICLES */}
        <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#111827] sm:text-3xl">
                À venir
              </h2>
              <p className="mt-2 text-sm text-[#6B7280]">
                Un aperçu des sujets sur lesquels nous travaillons.
              </p>
            </div>
            <span className="hidden items-center gap-1.5 text-xs text-[#6B7280] sm:flex">
              <Rss className="h-3.5 w-3.5" />
              Flux RSS bientôt disponible
            </span>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLACEHOLDER_ARTICLES.map((a) => (
              <article
                key={a.title}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                {/* Top color stripe */}
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: a.color }}
                  aria-hidden
                />
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        backgroundColor: `${a.color}15`,
                        color: a.color,
                      }}
                    >
                      <Tag className="h-3 w-3" />
                      {a.category}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#92400E]">
                      <Clock className="h-2.5 w-2.5" />
                      Bientôt
                    </span>
                  </div>

                  <div
                    className="mt-5 flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${a.color}15`,
                      color: a.color,
                    }}
                  >
                    <a.icon className="h-5 w-5" />
                  </div>

                  <h3 className="mt-4 font-display text-base font-semibold text-[#111827]">
                    {a.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-[#6B7280]">
                    {a.excerpt}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-[#F3F4F6] pt-4">
                    <span className="text-xs text-[#9CA3AF]">
                      Lecture · {a.readTime}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#9CA3AF]">
                      Bientôt disponible
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#2563EB] p-10 text-white shadow-xl sm:p-14">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">
                  Une idée de sujet&nbsp;?
                </h2>
                <p className="mt-3 text-sm text-white/80 sm:text-base">
                  Vous aimeriez lire un article sur un sujet précis lié à
                  la traçabilité alimentaire en Afrique de l&apos;Ouest ?
                  Écrivez-nous : nos rédacteurs étudient toutes les
                  propositions.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/#contact"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#2563EB] shadow-md transition-colors hover:bg-white/90"
                  >
                    Proposer un sujet
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/produits"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                  >
                    Explorer le catalogue
                  </Link>
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur sm:p-8">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <MailOpen className="h-4 w-4 text-[#34D399]" />
                  Newsletter
                </div>
                <p className="mt-2 text-sm text-white/70">
                  Soyez le premier informé du lancement du blog et des
                  nouveaux articles.
                </p>
                <div className="mt-4">
                  <NewsletterSignup
                    id="blog-newsletter-2"
                    buttonLabel="Prévenez-moi"
                    successMessage="Inscription enregistrée. À très vite !"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
