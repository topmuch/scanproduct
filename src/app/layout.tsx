import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VerifScan — La vérité au bout du scan | Traçabilité alimentaire par QR code",
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
    icon: "/logo.svg",
  },
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
