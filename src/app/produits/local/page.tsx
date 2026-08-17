import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { RubricHero, type RubricConfig } from "@/components/landing/RubricHero";
import { RubricProducts } from "@/components/landing/RubricProducts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Soutenez nos produits — VerifScan",
  description:
    "Découvrez les produits fabriqués par nos producteurs locaux au Sénégal. Soutenez le savoir-faire d'ici et la traçabilité locale.",
  openGraph: {
    title: "Soutenez nos produits — VerifScan",
    description:
      "Producteurs locaux & savoir-faire d'ici. Soutenez nos fabricants sénégalais.",
    type: "website",
  },
};

const HERO_CONFIG: RubricConfig = {
  title: "Soutenez nos produits",
  subtitle:
    "Producteurs locaux & savoir-faire d'ici. Ces produits sont fabriqués par nos fabricants basés au Sénégal — soutenez l'économie locale et la traçabilité de proximité.",
  emoji: "🤝",
  gradient: "bg-gradient-to-br from-[#FCE4EC] via-[#F8BBD0] to-[#F48FB1]",
  accentText: "text-[#880E4F]",
  emojiBg: "bg-[#F8BBD0]",
};

export default function LocalPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1 pt-20 lg:pt-20">
        <RubricHero config={HERO_CONFIG} />
        <RubricProducts rubric="local" />
      </main>
      <Footer />
    </div>
  );
}
