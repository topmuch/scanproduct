import type { Metadata } from "next";
import Link from "next/link";
import {
  Briefcase,
  Sparkles,
  Heart,
  Users,
  Globe2,
  Sprout,
  Rocket,
  GraduationCap,
  HeartHandshake,
  MapPin,
  MailOpen,
  ArrowRight,
  Clock,
} from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { NewsletterSignup } from "@/components/public/NewsletterSignup";

export const metadata: Metadata = {
  title: "Carrières — VerifScan",
  description:
    "Rejoignez VerifScan, le passeport numérique de l'agro-industrie ouest-africaine. Découvrez nos valeurs, nos avantages et nos offres à venir.",
  openGraph: {
    title: "Carrières — VerifScan",
    description:
      "Carrières chez VerifScan : valeurs, avantages et postes à pourvoir bientôt.",
    type: "website",
  },
};

const VALUES = [
  {
    icon: Heart,
    title: "Impact réel",
    text: "Chaque ligne de code participe à protéger les revenus des producteurs ouest-africains et la confiance des consommateurs.",
  },
  {
    icon: Users,
    title: "Équipe pluridisciplinaire",
    text: "Ingénieurs, agronomes, designers, spécialistes du terrain : nous croisons les regards pour construire le bon produit.",
  },
  {
    icon: Globe2,
    title: "Ancrage local",
    text: "Basés à Dakar, nous concevons un produit pensé pour les réalités de la CEDEAO, avec une vraie obsession : l'impact terrain.",
  },
  {
    icon: Sprout,
    title: "Croissance maîtrisée",
    text: "Nous grandissons sans compromis sur la qualité. Rejoindre VerifScan, c'est construire une référence de long terme.",
  },
];

const BENEFITS = [
  {
    icon: Rocket,
    title: "Projets à fort impact",
    text: "Des sujets techniques ambitieux au service d'une mission sociale : traçabilité, sécurité, expérience utilisateur.",
  },
  {
    icon: GraduationCap,
    title: "Apprentissage continu",
    text: "Budget formation, mentorat, temps dédié à l'expérimentation : nous investissons dans votre croissance.",
  },
  {
    icon: HeartHandshake,
    title: "Équilibre vie pro / vie perso",
    text: "Horaires flexibles, télétravail possible, congés respectés. La performance ne se paie pas par l'épuisement.",
  },
  {
    icon: MapPin,
    title: "Ancrage à Dakar",
    text: "Bureau à Dakar, à proximité des fabricants partenaires, avec des déplacements terrain réguliers en CEDEAO.",
  },
];

const POSITIONS = [
  {
    team: "Engineering",
    title: "Développeur(se) Full-Stack Next.js",
    location: "Dakar, Sénégal",
    type: "CDI",
    summary:
      "Construire les nouvelles fonctionnalités de la plateforme VerifScan, en lien direct avec les retours terrain des fabricants.",
  },
  {
    team: "Product",
    title: "Product Manager — Agro-industrie",
    location: "Dakar, Sénégal",
    type: "CDI",
    summary:
      "Piloter la roadmap produit, prioriser les chantiers et transformer les besoins du terrain en spécifications claires.",
  },
  {
    team: "Field",
    title: "Chargé(e) de partenariats fabricants",
    location: "Dakar + déplacements CEDEAO",
    type: "CDI",
    summary:
      "Identifier, convaincre et accompagner les transformateurs agro-alimentaires dans leur adoption de VerifScan.",
  },
];

export default function CarrieresPage() {
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
                "radial-gradient(circle at 15% 25%, rgba(37,99,235,0.45) 0, transparent 45%), radial-gradient(circle at 80% 75%, rgba(16,185,129,0.30) 0, transparent 50%)",
            }}
          />
          <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
              <Briefcase className="h-3.5 w-3.5 text-[#34D399]" />
              Carrières chez VerifScan
            </span>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Construisons ensemble la{" "}
              <span className="bg-gradient-to-r from-[#60A5FA] via-[#34D399] to-[#FBBF24] bg-clip-text text-transparent">
                transparence alimentaire
              </span>{" "}
              en Afrique de l&apos;Ouest.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
              VerifScan est une aventure humaine au service d&apos;une
              mission concrète : protéger les producteurs locaux contre la
              contrefaçon et donner aux consommateurs accès à la vérité sur
              ce qu&apos;ils achètent. Rejoignez-nous.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#postes"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#1D4ED8]"
              >
                Voir les postes à venir
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#alertes"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
              >
                S&apos;inscrire aux alertes
              </a>
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
                    Recrutement en préparation
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    Nous finalisons nos premières offres d&apos;emploi.
                    Inscrivez-vous pour être informé(e) dès leur publication.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white">
                <Clock className="h-3 w-3" />
                Postes à pourvoir bientôt
              </span>
            </div>
          </div>
        </section>

        {/* VALUES */}
        <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#2563EB]">
              Nos valeurs
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-[#111827] sm:text-4xl">
              Ce qui nous fait avancer
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#6B7280]">
              Quatre principes simples qui guident notre recrutement, nos
              décisions et notre culture d&apos;équipe au quotidien.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-base font-semibold text-[#111827]">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                  {v.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* BENEFITS */}
        <section className="bg-[#F9FAFB] py-16 lg:py-20">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#10B981]">
                Nos avantages
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold text-[#111827] sm:text-4xl">
                Ce que nous offrons
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#6B7280]">
                Un environnement de travail exigeant mais bienveillant,
                pensé pour vous permettre de donner le meilleur de
                vous-même.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className="rounded-2xl border border-[#F3F4F6] bg-white p-6 shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#10B981]">
                    <b.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-display text-base font-semibold text-[#111827]">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                    {b.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* OPEN POSITIONS */}
        <section
          id="postes"
          className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#2563EB]">
                Postes à pourvoir
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold text-[#111827] sm:text-4xl">
                Nos offres à venir
              </h2>
              <p className="mt-2 text-sm text-[#6B7280]">
                Les fiches de poste détaillées seront publiées ici très
                prochainement.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1.5 text-xs font-semibold text-[#92400E]">
              <Clock className="h-3 w-3" />
              {POSITIONS.length} postes en préparation
            </span>
          </div>

          <div className="mt-8 grid gap-4">
            {POSITIONS.map((p) => (
              <div
                key={p.title}
                className="group flex flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-all hover:border-[#2563EB]/30 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                        {p.team}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#92400E]">
                        <Clock className="h-2.5 w-2.5" />
                        Bientôt
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-lg font-semibold text-[#111827]">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">
                      {p.summary}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {p.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />
                        {p.type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2 text-xs font-medium text-[#6B7280] sm:w-auto">
                    Poste à pourvoir bientôt
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* JOB ALERTS */}
        <section
          id="alertes"
          className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-8"
        >
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#2563EB] p-10 text-white shadow-xl sm:p-14">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">
                  Soyez alerté(e) dès qu&apos;un poste ouvre
                </h2>
                <p className="mt-3 text-sm text-white/80 sm:text-base">
                  Laissez-nous votre email : nous vous préviendrons dès
                  qu&apos;une offre est publiée, en priorité pour les
                  profils qui nous intéressent.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/a-propos"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#2563EB] shadow-md transition-colors hover:bg-white/90"
                  >
                    Découvrir VerifScan
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="mailto:contact@verifscan.sn"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                  >
                    Candidature spontanée
                  </a>
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur sm:p-8">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <MailOpen className="h-4 w-4 text-[#34D399]" />
                  Alerte emploi
                </div>
                <p className="mt-2 text-sm text-white/70">
                  Un email dès qu&apos;une offre correspond à votre profil.
                  Désinscription en un clic.
                </p>
                <div className="mt-4">
                  <NewsletterSignup
                    id="careers-alert"
                    buttonLabel="M'alerter"
                    successMessage="Merci ! Vous serez informé(e) dès la publication des premières offres."
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
