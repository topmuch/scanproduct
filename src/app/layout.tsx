import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { getFaviconUrl } from "@/lib/settings";

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
export async function generateMetadata(): Promise<Metadata> {
  const faviconUrl = await getFaviconUrl();
  const icon = faviconUrl || "/favicon.ico";

  return {
    title:
      "VerifScan — La vérité au bout du scan | Traçabilité alimentaire par QR code",
    description:
      "VerifScan est le passeport numérique pour vos produits. Garantissez l'authenticité, renforcez la confiance de vos clients et protégez votre marque contre la contrefaçon en un scan.",
    keywords: [
      "VerifScan",
      "traçabilité alimentaire",
      "QR code",
      "authenticité produit",
      "Sénégal",
      "CEDEAO",
      "agro-industrie",
      "anti-contrefaçon",
      "passeport numérique produit",
    ],
    authors: [{ name: "VerifScan" }],
    icons: {
      icon: [
        { url: icon },
        { url: "/icon-16.png", sizes: "16x16", type: "image/png" },
        { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icon-48.png", sizes: "48x48", type: "image/png" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: icon,
    },
    manifest: "/manifest.json",
    openGraph: {
      title: "VerifScan — La vérité au bout du scan",
      description:
        "Le passeport numérique qui renforce la confiance de vos clients et protège votre marque contre la contrefaçon.",
      siteName: "VerifScan",
      type: "website",
      locale: "fr_SN",
    },
    twitter: {
      card: "summary_large_image",
      title: "VerifScan — La vérité au bout du scan",
      description:
        "Garantissez l'authenticité de vos produits en un scan. Passeport numérique pour la traçabilité alimentaire.",
    },
  };
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
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
