import type { Metadata } from "next";
import { buildAlternates } from "@/lib/seo";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { ContactForm } from "@/components/public/ContactForm";
import {
  VERIFSCAN_ADDRESS,
  VERIFSCAN_DIRECTIONS_URL,
  VERIFSCAN_MAP_EMBED,
} from "@/lib/contact";
import { MessageCircle, Navigation, MapPin, Clock } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  return {
  title:
    "Contact & Itinéraire — VerifScan Dakar (Ouest Foire) | Email, Téléphone, Carte",
  description:
    "Contactez VerifScan : contact@verifscan.com · +221 77 382 18 22 · Lot n°13, Ouest Foire, Dakar, Sénégal. Carte Google Maps, itinéraire, horaires et formulaire — réponse sous 24h.",
  alternates: await buildAlternates("/contact"),
  openGraph: {
    title: "Contact & Itinéraire — VerifScan Dakar (Ouest Foire)",
    description:
      "Email, téléphone, carte et itinéraire : notre équipe vous répond sous 24 heures. Lot n°13, Ouest Foire, Dakar, Sénégal.",
    url: "/contact",
    type: "website",
    images: ["/og-image.png?v=6"],
  },
  };
}

/**
 * JSON-LD — LocalBusiness avec adresse postale complète, géolocalisation
 * Ouest Foire (Dakar) et horaires : éligible au panneau « Infos lieu » Google.
 */
function LocalBusinessJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://verifscan.com/#localbusiness",
    name: "VerifScan",
    description:
      "Passeport numérique produit : traçabilité alimentaire et cosmétique, authentification QR code, lutte contre la contrefaçon.",
    url: "https://verifscan.com/contact",
    telephone: "+221773821822",
    email: "contact@verifscan.com",
    image: "https://verifscan.com/og-image.png",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Lot n°13, Ouest Foire",
      addressLocality: "Dakar",
      addressRegion: "Dakar",
      addressCountry: "SN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 14.7294,
      longitude: -17.4568,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "09:00",
        closes: "13:00",
      },
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+221773821822",
        email: "contact@verifscan.com",
        contactType: "customer service",
        areaServed: ["SN", "FR", "BE", "CH", "CA"],
        availableLanguage: ["fr"],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const CONTACT_CHANNELS = [
  {
    icon: MessageCircle,
    label: "Email",
    value: "contact@verifscan.com",
    href: "mailto:contact@verifscan.com",
  },
  {
    icon: Clock,
    label: "Téléphone / WhatsApp",
    value: "+221 77 382 18 22",
    href: "tel:+221773821822",
  },
  {
    icon: MapPin,
    label: "Adresse",
    value: "Lot n°13, Ouest Foire — Dakar",
    href: VERIFSCAN_DIRECTIONS_URL,
  },
];

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <LocalBusinessJsonLd />
      <PublicHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#022150] via-[#0A2B5F] to-[#0F172A] py-16 text-white sm:py-20">
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
                <span className="bg-gradient-to-r from-[#4E74A8] to-[#34D399] bg-clip-text text-transparent">
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

        {/* Canaux de contact — email / téléphone / adresse */}
        <section className="border-b border-[#F3F4F6] bg-white">
          <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
            {CONTACT_CHANNELS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group flex items-center gap-4"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#F0F4F9] transition-colors group-hover:bg-[#022150]">
                  <item.icon className="h-5 w-5 text-[#022150] transition-colors group-hover:text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                    {item.label}
                  </p>
                  <p className="truncate text-[15px] font-bold text-[#111827] transition-colors group-hover:text-[#022150]">
                    {item.value}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Formulaire + infos détaillées */}
        <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8">
          <ContactForm />
        </section>

        {/* Carte + itinéraire */}
        <section
          id="nous-trouver"
          aria-label="Nous trouver — carte et itinéraire"
          className="border-t border-[#F3F4F6] bg-white py-14"
        >
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-8 max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#F0F4F9] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#022150]">
                <MapPin className="h-3.5 w-3.5" /> Nous trouver
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold text-[#111827] sm:text-3xl">
                Rendez-nous visite à Ouest Foire, Dakar
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#6B7280]">
                {VERIFSCAN_ADDRESS} — ouvrez l&apos;itinéraire depuis votre
                position en un clic, ou appelez-nous, nous vous guiderons.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Carte interactive */}
              <div className="overflow-hidden rounded-2xl border border-[#F3F4F6] shadow-sm lg:col-span-2">
                <iframe
                  src={VERIFSCAN_MAP_EMBED}
                  width="100%"
                  height="100%"
                  className="h-[320px] w-full sm:h-[420px]"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Carte — VerifScan, Ouest Foire, Dakar, Sénégal"
                />
              </div>

              {/* Adresse + horaires + CTA */}
              <div className="flex flex-col gap-6">
                <div className="rounded-2xl border border-[#F3F4F6] bg-white p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#FFFBEB]">
                      <MapPin className="h-5 w-5 text-[#F59E0B]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                        Adresse
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold leading-relaxed text-[#111827]">
                        Lot n°13, Ouest Foire
                        <br />
                        Dakar, Sénégal
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-start gap-4 border-t border-[#F3F4F6] pt-5">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#F0F9FF]">
                      <Clock className="h-5 w-5 text-[#0EA5E9]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                        Horaires d&apos;ouverture
                      </p>
                      <p className="mt-0.5 text-[15px] font-semibold text-[#111827]">
                        Lundi – Vendredi : 9h – 18h
                      </p>
                      <p className="text-sm text-[#6B7280]">
                        Samedi : 9h – 13h
                      </p>
                    </div>
                  </div>
                </div>

                <a
                  href={VERIFSCAN_DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#022150] to-[#10B981] px-6 py-4 text-[15px] font-semibold text-white shadow-md shadow-[#022150]/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <Navigation className="h-5 w-5" />
                  Obtenir l&apos;itinéraire
                </a>
                <a
                  href="tel:+221773821822"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#022150] px-6 py-3.5 text-[15px] font-semibold text-[#022150] transition-colors hover:bg-[#F0F4F9]"
                >
                  Appeler le +221 77 382 18 22
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-[#F3F4F6] bg-[#F9FAFB] py-14">
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
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#022150] to-[#10B981] px-6 py-3 text-[15px] font-semibold text-white shadow-md shadow-[#022150]/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
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
