import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { ContactForm } from "@/components/public/ContactForm";
import { MessageCircle, Clock, Globe2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact — VerifScan",
  description:
    "Contactez l'équipe VerifScan. Demandez une démo, devenez partenaire ou posez vos questions sur notre solution de traçabilité alimentaire par QR code.",
  openGraph: {
    title: "Contact — VerifScan",
    description:
      "Une question ? Notre équipe vous répond sous 24 heures. Email, téléphone, formulaire — choisissez le canal qui vous convient.",
    type: "website",
  },
};

const QUICK_INFO = [
  {
    icon: Clock,
    title: "Horaires",
    text: "Lun – Ven : 9h – 18h",
    sub: "Samedi : 9h – 13h",
  },
  {
    icon: Globe2,
    title: "Zone d'action",
    text: "Sénégal & CEDEAO",
    sub: "Interventions régionales",
  },
  {
    icon: MessageCircle,
    title: "Réponse",
    text: "Sous 24 heures",
    sub: "Du lundi au vendredi",
  },
];

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#2563EB] via-[#1E40AF] to-[#0F172A] py-16 text-white sm:py-20">
          {/* Decorative gradient orbs */}
          <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#10B981]/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#F59E0B]/20 blur-3xl" />

          <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/90 backdrop-blur-sm">
                <MessageCircle className="h-3.5 w-3.5" /> Contactez-nous
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                Parlons de votre{" "}
                <span className="bg-gradient-to-r from-[#60A5FA] to-[#34D399] bg-clip-text text-transparent">
                  projet
                </span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
                Que vous soyez fabricant, distributeur ou simplement curieux de
                VerifScan, notre équipe est à votre écoute pour vous accompagner.
              </p>
            </div>
          </div>
        </section>

        {/* Quick info bar */}
        <section className="border-b border-[#F3F4F6] bg-white">
          <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
            {QUICK_INFO.map((item) => (
              <div key={item.title} className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF]">
                  <item.icon className="h-5 w-5 text-[#2563EB]" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    {item.title}
                  </p>
                  <p className="text-[15px] font-bold text-[#111827]">
                    {item.text}
                  </p>
                  <p className="text-xs text-[#6B7280]">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Form + info section */}
        <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8">
          <ContactForm />
        </section>

        {/* CTA */}
        <section className="border-t border-[#F3F4F6] bg-white py-14">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold text-[#111827] sm:text-3xl">
              Prêt à digitaliser la traçabilité de vos produits ?
            </h2>
            <p className="mt-3 text-[15px] text-[#6B7280]">
              Rejoignez les fabricants qui font déjà confiance à VerifScan pour
              garantir l&apos;authenticité de leurs produits.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/register"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#2563EB] to-[#10B981] px-6 py-3 text-[15px] font-semibold text-white shadow-md shadow-[#2563EB]/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                Devenir partenaire
              </a>
              <a
                href="/produits"
                className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-6 py-3 text-[15px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
              >
                Voir le catalogue
              </a>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
