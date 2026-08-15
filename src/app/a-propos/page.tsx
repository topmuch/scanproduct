import type { Metadata } from "next";
import Link from "next/link";
import {
  Target,
  Eye,
  ShieldCheck,
  Users,
  Leaf,
  Globe2,
  Lock,
  Heart,
  ArrowRight,
  MapPin,
  Sprout,
  QrCode,
  TrendingUp,
} from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "À propos — VerifScan",
  description:
    "VerifScan est né au Sénégal pour offrir aux fabricants ouest-africains un passeport numérique qui garantit l'authenticité, la traçabilité et la transparence de leurs produits.",
  openGraph: {
    title: "À propos — VerifScan",
    description:
      "Découvrez la mission, la vision et les valeurs de VerifScan, le passeport numérique pour l'agro-industrie ouest-africaine.",
    type: "website",
  },
};

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Authenticité",
    text: "Chaque produit vérifié par VerifScan porte un QR code unique, infalsifiable et lié à un lot précis. La confiance redevient la norme.",
    color: "#2563EB",
  },
  {
    icon: Leaf,
    title: "Transparence",
    text: "Du champ à l'assiette, nous rendons visible toute la chaîne de valeur : origine, ingrédients, certifications, dates clés.",
    color: "#10B981",
  },
  {
    icon: Lock,
    title: "Sécurité",
    text: "Nos enregistrements sont sécurisés par blockchain et signatures cryptographiques. Aucune falsification n'est possible.",
    color: "#0F172A",
  },
  {
    icon: Heart,
    title: "Proximité",
    text: "Conçu à Dakar pour les réalités ouest-africaines : nous parlons la langue des fabricants, des distributeurs et des consommateurs de la région.",
    color: "#F59E0B",
  },
  {
    icon: Globe2,
    title: "Inclusion",
    text: "VerifScan accompagne aussi bien les grandes coopératives que les petits transformateurs, sans frais cachés ni barrières techniques.",
    color: "#2563EB",
  },
  {
    icon: Sprout,
    title: "Impact",
    text: "Nous voulons que chaque scan renforce le revenu du producteur, la confiance du consommateur et la souveraineté alimentaire de la CEDEAO.",
    color: "#10B981",
  },
];

const STATS = [
  { value: "2024", label: "Fondée à Dakar", icon: MapPin },
  { value: "CEDEAO", label: "Zone d'action prioritaire", icon: Globe2 },
  { value: "100%", label: "Passeports vérifiables", icon: ShieldCheck },
  { value: "1 scan", label: "Pour révéler toute l'histoire", icon: QrCode },
];

const TIMELINE = [
  {
    year: "2024",
    title: "L'idée",
    text: "Plusieurs producteurs sénégalais de jus locaux et de céréales transformées témoignent d'un fléau : la contrefaçon détruit leurs marges et la confiance des consommateurs. L'idée d'un passeport numérique QR naît d'une discussion à Dakar.",
  },
  {
    year: "2024",
    title: "Le prototype",
    text: "Premier MVP fonctionnel : génération de QR codes uniques par lot, page produit publique, enregistrement horodaté des événements de chaîne.",
  },
  {
    year: "2025",
    title: "Premiers partenaires",
    text: "Plusieurs transformateurs agro-alimentaires du Sénégal adoptent VerifScan. Le catalogue public commence à croître et les premiers scans consommateurs sont enregistrés.",
  },
  {
    year: "2026",
    title: "L'expansion",
    text: "Extension vers les marchés de la CEDEAO. VerifScan devient une référence de transparence pour l'agro-industrie ouest-africaine.",
  },
];

export default function AboutPage() {
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
                "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.45) 0, transparent 45%), radial-gradient(circle at 80% 60%, rgba(16,185,129,0.35) 0, transparent 50%)",
            }}
          />
          <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur">
              <MapPin className="h-3.5 w-3.5 text-[#10B981]" />
              Conçu à Dakar · Pour l&apos;Afrique de l&apos;Ouest
            </span>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              La vérité au bout du scan.
              <span className="block bg-gradient-to-r from-[#60A5FA] via-[#34D399] to-[#FBBF24] bg-clip-text text-transparent">
                Née au Sénégal, pour l&apos;agro-industrie ouest-africaine.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
              VerifScan est un passeport numérique pour les produits
              transformés. Nous transformons un simple QR code en une
              preuve d&apos;authenticité, un journal de traçabilité complet et
              un pont de confiance entre fabricants et consommateurs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/produits"
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-colors hover:bg-[#1D4ED8]"
              >
                Explorer le catalogue
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/#contact"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
              >
                Devenir partenaire
              </Link>
            </div>
          </div>
        </section>

        {/* MISSION & VISION */}
        <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm sm:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                <Target className="h-6 w-6" />
              </div>
              <h2 className="mt-6 font-display text-2xl font-bold text-[#111827] sm:text-3xl">
                Notre mission
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#374151]">
                Offrir à chaque fabricant ouest-africain, quelles que soient
                sa taille et ses ressources, un moyen simple et abordable
                de prouver l&apos;authenticité de ses produits. Nous voulons
                que la contrefaçon cesse d&apos;être une fatalité et que
                chaque consommateur puisse, d&apos;un simple scan, savoir
                ce qu&apos;il achète, d&apos;où cela vient et qui l&apos;a
                fabriqué.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm sm:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#10B981]">
                <Eye className="h-6 w-6" />
              </div>
              <h2 className="mt-6 font-display text-2xl font-bold text-[#111827] sm:text-3xl">
                Notre vision
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#374151]">
                Une Afrique de l&apos;Ouest où la confiance alimentaire est la
                règle, pas l&apos;exception. Où un jus de bissap produit à
                Saint-Louis vaut, aux yeux du consommateur, autant qu&apos;un
                produit importé premium. Où les revenus des transformateurs
                locaux sont protégés et où la transparence devient un
                avantage compétitif et non une contrainte.
              </p>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="bg-[#F9FAFB] py-16 lg:py-20">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-[#F3F4F6] bg-white p-6 text-center shadow-sm"
                >
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 font-display text-2xl font-bold text-[#111827] sm:text-3xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs text-[#6B7280] sm:text-sm">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* VALUES */}
        <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#2563EB]">
              Nos valeurs
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-[#111827] sm:text-4xl">
              Ce qui guide chacune de nos décisions
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#6B7280]">
              Six principes ancrés dans les réalités du terrain ouest-africain,
              qui orientent notre produit, nos partenariats et notre croissance.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="group rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${v.color}15`, color: v.color }}
                >
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-[#111827]">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                  {v.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* STORY / TIMELINE */}
        <section className="bg-[#0F172A] py-16 text-white lg:py-24">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                Notre histoire
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
                De Dakar à toute la CEDEAO
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-white/70">
                VerifScan n&apos;est pas né dans une salle de réunion
                occidentale, mais sur le terrain, avec des transformateurs
                locaux confrontés quotidiennement à la contrefaçon.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {TIMELINE.map((t, i) => (
                <div
                  key={i}
                  className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
                >
                  <div className="font-display text-sm font-semibold text-[#34D399]">
                    {t.year}
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold text-white">
                    {t.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">
                    {t.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TEAM / IMPACT */}
        <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#10B981]">
                Notre équipe
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold text-[#111827] sm:text-4xl">
                Une équipe locale, obsessionnelle sur l&apos;impact
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#374151]">
                VerifScan réunit des ingénieurs, des experts en
                agro-industrie et des passionnés de la souveraineté
                alimentaire. Nous travaillons à Dakar, en lien direct avec
                les transformateurs, pour construire un outil qui sert
                réellement le terrain.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Une équipe pluridisciplinaire 100% basée en Afrique de l'Ouest",
                  "Un produit co-construit avec des fabricants partenaires",
                  "Un support en français, wolof et anglais",
                  "Une roadmap transparente et alimentée par les retours terrain",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[15px] text-[#374151]"
                  >
                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-[#10B981]">
                      <Users className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#E5E7EB] bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] p-6 text-white shadow-sm">
                <TrendingUp className="h-8 w-8 text-white/90" />
                <div className="mt-4 font-display text-3xl font-bold">
                  +
                </div>
                <p className="mt-1 text-sm text-white/80">
                  De nouveaux fabricants rejoignent VerifScan chaque mois
                  pour protéger leur marque.
                </p>
              </div>
              <div className="rounded-2xl border border-[#E5E7EB] bg-gradient-to-br from-[#10B981] to-[#059669] p-6 text-white shadow-sm">
                <QrCode className="h-8 w-8 text-white/90" />
                <div className="mt-4 font-display text-3xl font-bold">
                  1 scan
                </div>
                <p className="mt-1 text-sm text-white/80">
                  Suffit à un consommateur pour révéler toute l&apos;histoire
                  d&apos;un produit.
                </p>
              </div>
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:col-span-2">
                <ShieldCheck className="h-8 w-8 text-[#2563EB]" />
                <h3 className="mt-4 font-display text-lg font-semibold text-[#111827]">
                  Sécurité de bout en bout
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                  Chaque passeport numérique est signé cryptographiquement et
                  son historique est stocké de manière infalsifiable.
                  Aucune falsification n&apos;est possible après émission.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#0F172A] p-10 text-white shadow-xl sm:p-14">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Prêt à protéger votre marque&nbsp;?
              </h2>
              <p className="mt-4 text-base text-white/80">
                Rejoignez les fabricants qui font déjà confiance à VerifScan
                pour garantir l&apos;authenticité de leurs produits et
                renforcer la relation avec leurs clients.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#2563EB] shadow-md transition-colors hover:bg-white/90"
                >
                  Devenir partenaire
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/produits"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                >
                  Voir le catalogue
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
