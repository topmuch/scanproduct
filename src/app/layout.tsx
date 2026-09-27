import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { getFaviconUrl } from "@/lib/settings";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

/**
 * Self-hosted fonts (next/font/local).
 *
 * WHY NOT next/font/google:
 * `next/font/google` downloads font files from Google's CDN at BUILD time.
 * In restricted build environments (Docker/Coolify with no outbound
 * internet, or flaky network), this fails with "module-not-found" errors
 * pointing at `[next]/internal/font/google/inter_*.module.css` and aborts
 * the whole build. Self-hosting the woff2 files eliminates that runtime
 * dependency entirely — the build works offline.
 *
 * The woff2 files in ./fonts/ were fetched once from fonts.gstatic.com
 * (latin subset only, matching the previous `subsets: ["latin"]` config).
 * Inter v20 is a variable font, so all four weights point to the same
 * file — the browser picks the weight from the `wght` axis.
 *
 * To update a font: re-download from
 *   https://fonts.gstatic.com/s/<family>/<v>/<hash>.woff2
 * (URLs are visible in the Google Fonts CSS response) and replace the
 * corresponding file in ./fonts/.
 */
const poppins = localFont({
  src: [
    { path: "./fonts/poppins-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/poppins-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

const inter = localFont({
  src: [
    // Inter v20 is a variable font — same file serves all weights.
    { path: "./fonts/inter-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-latin.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-latin.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter-latin.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Viewport — sets the browser address bar color on mobile so it matches the
 * VerifScan blue brand. This applies on EVERY page (homepage, /produits and
 * /p/[lotId] reached by scanning a QR code), giving an app-like feel even
 * before the user installs the PWA.
 */
export const viewport: Viewport = {
  themeColor: "#022150",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

/**
 * Dynamic metadata — reads the custom favicon URL (if any) from the Setting
 * table so the SuperAdmin can change the favicon without redeploying.
 *
 * Falls back to the default static `/favicon.ico` (in public/) when no
 * custom favicon has been uploaded. Also includes apple-touch-icon and
 * manifest for full PWA support.
 *
 * `generateMetadata` runs on the server for every page load, but the
 * `getFaviconUrl()` helper caches the DB result for 60s to avoid excess
 * queries.
 */
/**
 * Site public — utilisé par metadataBase, OpenGraph et le sitemap.
 * Le domaine verifscan.sn est le domaine canonique du site vitrine + scan.
 */
export const SITE_URL = "https://verifscan.sn";

// Cache-buster des icônes : incrémenter à chaque changement de logo/favicon
// pour contourner le cache navigateur/PWA.
const ICON_V = "?v=6";

/**
 * Mots-clés SEO — ciblage francophone : Sénégal / Afrique de l'Ouest,
 * Europe francophone (France, Belgique, Suisse) et Canada/Québec.
 * Meta `keywords` (poids faible chez Google, utile Bing/autres) + reprise
 * dans les descriptions et JSON-LD (poids fort).
 */
export const SITE_KEYWORDS = [
  // Solution & concept
  "VerifScan",
  "passeport numérique",
  "passeport numérique produit",
  "passeport produit",
  "identité numérique produit",
  // Problématique : fraude & contrefaçon
  "contrefaçon",
  "anti-contrefaçon",
  "lutte contre la contrefaçon",
  "produit contrefait",
  "fraude",
  "lutte contre la fraude",
  "fraude alimentaire",
  "authentification produit",
  "vérifier authenticité produit",
  "authenticité produit",
  "protéger sa marque",
  // Traçabilité
  "traçabilité alimentaire",
  "traçabilité cosmétique",
  "traçabilité produit",
  "suivi des lots",
  "traçabilité QR code",
  "QR code traçabilité",
  "QR code anti-contrefaçon",
  "QR code authentification",
  "scan produit",
  "étiquette QR code",
  "GS1",
  "GTIN",
  "digital link GS1",
  "blockchain",
  "transparence produit",
  "information consommateur",
  "confiance consommateur",
  // Secteurs
  "agro-alimentaire",
  "agro-industrie",
  "cosmétique",
  "beauté naturelle",
  "produits bio",
  "nutrition",
  // Marchés cibles
  "Sénégal",
  "Dakar",
  "Afrique de l'Ouest",
  "CEDEAO",
  "Afrique francophone",
  "France",
  "Belgique",
  "Suisse",
  "Canada",
  "Québec",
  "Europe francophone",
];

export async function generateMetadata(): Promise<Metadata> {
  const faviconUrl = await getFaviconUrl();
  const icon = faviconUrl || `/icon.png${ICON_V}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default:
        "VerifScan — Passeport numérique produit | Traçabilité alimentaire & cosmétique, anti-contrefaçon par QR code",
      template: "%s",
    },
    description:
      "VerifScan est le passeport numérique de vos produits alimentaires et cosmétiques : un QR code unique qui garantit l'authenticité, assure la traçabilité du lot et protège votre marque contre la contrefaçon et la fraude. Sénégal, Afrique de l'Ouest, Europe francophone et Canada.",
    keywords: SITE_KEYWORDS,
    authors: [{ name: "VerifScan" }],
    creator: "VerifScan",
    publisher: "VerifScan",
    category: "technology",
    applicationName: "VerifScan",
    // NB : pas de `canonical` ici — il serait hérité par toutes les pages et
    // pointerait tout vers l'accueil. Chaque page publique définit le sien.
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: [
        { url: icon },
        { url: `/icon-16.png${ICON_V}`, sizes: "16x16", type: "image/png" },
        { url: `/icon-32.png${ICON_V}`, sizes: "32x32", type: "image/png" },
        { url: `/icon-48.png${ICON_V}`, sizes: "48x48", type: "image/png" },
      ],
      apple: [
        { url: `/apple-icon.png${ICON_V}`, sizes: "180x180", type: "image/png" },
      ],
      shortcut: icon,
    },
    manifest: "/manifest.json",
    openGraph: {
      title: "VerifScan — Passeport numérique produit | La vérité au bout du scan",
      description:
        "Le passeport numérique qui renforce la confiance de vos clients et protège votre marque contre la contrefaçon : traçabilité alimentaire et cosmétique par QR code, vérification d'authenticité en un scan.",
      url: "/",
      siteName: "VerifScan",
      type: "website",
      locale: "fr_SN",
      alternateLocale: ["fr_FR", "fr_CA", "fr_BE"],
      images: [
        {
          url: "/og-image.png?v=6",
          width: 1200,
          height: 630,
          alt: "VerifScan — Passeport numérique produit : traçabilité et authenticité par QR code",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "VerifScan — Passeport numérique produit",
      description:
        "Garantissez l'authenticité de vos produits en un scan. Traçabilité alimentaire & cosmétique, lutte contre la contrefaçon par QR code.",
      images: ["/og-image.png?v=6"],
    },
  };
}

/**
 * JSON-LD — données structurées Google (rich results).
 * Organization : identité de marque, contact, zone desservie (francophonie).
 * WebSite : association du nom du site au domaine canonique.
 */
function JsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "VerifScan",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description:
      "Passeport numérique produit : traçabilité alimentaire et cosmétique, authentification par QR code et lutte contre la contrefaçon pour les fabricants.",
    email: "contact@verifscan.com",
    telephone: "+221784858822",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Lot n°13, Ouest Foire",
      addressLocality: "Dakar",
      addressCountry: "SN",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+221784858822",
        email: "contact@verifscan.com",
        contactType: "customer service",
        availableLanguage: ["fr"],
      },
    ],
    areaServed: [
      { "@type": "Country", name: "Sénégal" },
      { "@type": "Country", name: "Afrique de l'Ouest" },
      { "@type": "Country", name: "France" },
      { "@type": "Country", name: "Belgique" },
      { "@type": "Country", name: "Suisse" },
      { "@type": "Country", name: "Canada" },
    ],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "VerifScan",
    inLanguage: "fr",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${inter.variable} font-sans antialiased bg-white text-[#111827]`}
      >
        {children}
        <JsonLd />
        <ServiceWorkerRegister />
        <InstallPrompt />
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
