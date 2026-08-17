import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { RubricHero, type RubricConfig } from "@/components/landing/RubricHero";
import { RubricProducts } from "@/components/landing/RubricProducts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Certifié pour l'export — VerifScan",
  description:
    "Découvrez les produits VerifScan certifiés pour l'export. Normes internationales, conformité et traçabilité complète pour les marchés internationaux.",
  openGraph: {
    title: "Certifié pour l'export — VerifScan",
    description:
      "Normes internationales & traçabilité complète. Produits prêts pour l'export.",
    type: "website",
  },
};

const HERO_CONFIG: RubricConfig = {
  title: "Certifié pour l'export",
  subtitle:
    "Normes internationales & traçabilité complète. Ces produits sont marqués pour l'export et disposent des documents de conformité nécessaires pour les marchés internationaux.",
  emoji: "🌍",
  gradient: "bg-gradient-to-br from-[#E8F5E9] via-[#C8E6C9] to-[#A5D6A7]",
  accentText: "text-[#1B5E20]",
  emojiBg: "bg-[#A5D6A7]",
};

export default function ExportPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1 pt-20 lg:pt-20">
        <RubricHero config={HERO_CONFIG} />
        <RubricProducts rubric="export" />
      </main>
      <Footer />
    </div>
  );
}
