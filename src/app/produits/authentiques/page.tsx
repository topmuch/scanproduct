import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { RubricHero, type RubricConfig } from "@/components/landing/RubricHero";
import { RubricProducts } from "@/components/landing/RubricProducts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Produits 100% authentiques — VerifScan",
  description:
    "Découvrez les produits VerifScan avec un score de transparence Or ou supérieur. Origine, lot, ingrédients et traçabilité vérifiés en un scan.",
  openGraph: {
    title: "Produits 100% authentiques — VerifScan",
    description:
      "Vérifiez l'origine et la traçabilité en un scan. Score de transparence Or ou supérieur.",
    type: "website",
  },
};

const HERO_CONFIG: RubricConfig = {
  title: "Produits 100% authentiques",
  subtitle:
    "Vérifiez l'origine et la traçabilité en un scan. Ces produits ont un score de transparence Or (≥71) ou supérieur — origine, lot, ingrédients et certifications vérifiés.",
  emoji: "✅",
  gradient: "bg-gradient-to-br from-[#FFF8E1] via-[#FFF3C4] to-[#FFE082]",
  accentText: "text-[#7A4D00]",
  emojiBg: "bg-[#FFE082]",
};

export default function AuthentiquesPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1 pt-20 lg:pt-20">
        <RubricHero config={HERO_CONFIG} />
        <RubricProducts rubric="authentiques" />
      </main>
      <Footer />
    </div>
  );
}
