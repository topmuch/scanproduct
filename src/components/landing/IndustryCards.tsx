"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { SectionBadge } from "./SectionBadge";

/**
 * IndustryCards — "Un passeport numérique pour chaque métier"
 *
 * Grid of 12 industry-specific cards displayed below the DemoSection on the
 * home page. Each card opens a rich modal (IndustryDetailDialog) with the
 * full "page dédiée" content: challenges, VerifScan solutions, and CTA.
 *
 * Why a modal and not a `/metiers/[slug]` route?
 *   The project intentionally exposes only the `/` route. The existing
 *   FeatureDetailDialog component established this pattern — dedicated
 *   content lives inside a scrollable dialog, not a separate route.
 */

type Challenge = {
  emoji: string;
  title: string;
  text: string;
};

type Solution = {
  emoji: string;
  title: string;
  text: string;
};

type Industry = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  /** Tailwind gradient classes for the card header band, e.g. "from-[#34D399] to-[#059669]" */
  gradient: string;
  /** Hex accent color for badges, bullets, CTA text — e.g. "#059669" */
  accent: string;
  /** Soft tint background (rgba) for the modal hero — e.g. "rgba(5,150,105,0.08)" */
  accentSoft: string;
  features: string[];
  challenges: Challenge[];
  solutions: Solution[];
};

const INDUSTRIES: Industry[] = [
  {
    id: "fruits-legumes",
    emoji: "🥭",
    title: "Fruits & Légumes Frais",
    subtitle: "Exportez en toute confiance",
    description:
      "Créez votre passeport numérique pour l'export vers l'Europe et au-delà. Traçabilité complète, certificats phytosanitaires digitaux, conformité Global GAP.",
    gradient: "from-[#34D399] to-[#059669]",
    accent: "#059669",
    accentSoft: "rgba(5,150,105,0.08)",
    features: ["Global GAP", "Phytosanitaire", "Champ → Export"],
    challenges: [
      {
        emoji: "📋",
        title: "Certificats phytosanitaires",
        text: "Documents obligatoires pour l'export UE, longs à obtenir et à vérifier.",
      },
      {
        emoji: "🚜",
        title: "Traçabilité complète",
        text: "Du champ au client final, chaque étape doit être tracée et documentée.",
      },
      {
        emoji: "✅",
        title: "Normes Global GAP",
        text: "Certifications exigées par les distributeurs européens.",
      },
    ],
    solutions: [
      {
        emoji: "📱",
        title: "QR code unique par lot",
        text: "Chaque lot de mangues, tomates ou oignons reçoit un QR code traçable contenant toutes les informations d'export.",
      },
      {
        emoji: "📄",
        title: "Certificats digitaux",
        text: "Stockez et partagez vos certificats phytosanitaires, Global GAP, et Bio de manière sécurisée.",
      },
      {
        emoji: "🌐",
        title: "Conformité UE automatique",
        text: "Génération automatique des documents requis pour l'export vers l'Europe.",
      },
    ],
  },
  {
    id: "boissons",
    emoji: "🥤",
    title: "Boissons & Jus",
    subtitle: "Rassurez vos consommateurs",
    description:
      "Transparence totale sur vos ingrédients et votre processus de fabrication. Nutri-Score, allergènes, composition détaillée.",
    gradient: "from-[#38BDF8] to-[#0284C7]",
    accent: "#0284C7",
    accentSoft: "rgba(2,132,199,0.08)",
    features: ["Ingrédients tracés", "Nutri-Score", "Allergènes"],
    challenges: [
      {
        emoji: "🧪",
        title: "Composition opaque",
        text: "Les consommateurs veulent connaître exactement ce qu'ils boivent.",
      },
      {
        emoji: "⚠️",
        title: "Allergènes non signalés",
        text: "Risque sanitaire et perte de confiance si un allergène n'est pas affiché.",
      },
      {
        emoji: "🏭",
        title: "Processus de fabrication",
        text: "Difficile de prouver la qualité et l'hygiène de la chaîne de production.",
      },
    ],
    solutions: [
      {
        emoji: "📱",
        title: "QR code par lot",
        text: "Chaque bouteille ou pack porte un QR code menant à la fiche complète du lot.",
      },
      {
        emoji: "📊",
        title: "Nutri-Score affiché",
        text: "Le Nutri-Score et les valeurs nutritionnelles sont visibles en un scan.",
      },
      {
        emoji: "🛡️",
        title: "Allergènes mis en avant",
        text: "Liste claire des allergènes, alerte immédiate pour les consommateurs sensibles.",
      },
    ],
  },
  {
    id: "epices",
    emoji: "🌶️",
    title: "Épices & Aromates",
    subtitle: "Valorisez l'authenticité",
    description:
      "Prouvez l'origine et la pureté de vos épices. Lutte contre la contrefaçon, certifications bio et équitables.",
    gradient: "from-[#F87171] to-[#EA580C]",
    accent: "#EA580C",
    accentSoft: "rgba(234,88,12,0.08)",
    features: ["Anti-contrefaçon", "Origine garantie", "Bio & Fair Trade"],
    challenges: [
      {
        emoji: "❌",
        title: "Contrefaçon fréquente",
        text: "Les épices sont parmi les produits les plus falsifiés au monde.",
      },
      {
        emoji: "🌍",
        title: "Origine difficile à prouver",
        text: "Le consommateur ne peut pas vérifier la région ou la méthode de culture.",
      },
      {
        emoji: "📜",
        title: "Certifications multiples",
        text: "Bio, équitable, origine géographique — difficile à centraliser et partager.",
      },
    ],
    solutions: [
      {
        emoji: "🔐",
        title: "QR code infalsifiable",
        text: "Chaque lot d'épices porte un QR code lié à un passeport numérique sécurisé.",
      },
      {
        emoji: "📍",
        title: "Origine géolocalisée",
        text: "Région de culture, coopérative, date de récolte visibles en un scan.",
      },
      {
        emoji: "📜",
        title: "Certifications centralisées",
        text: "Bio, Fair Trade, origine — tous vos certificats regroupés en un seul endroit.",
      },
    ],
  },
  {
    id: "cosmetiques",
    emoji: "🧴",
    title: "Cosmétiques Naturels",
    subtitle: "Créez un passeport numérique pour rassurer vos clients",
    description:
      "Traçabilité des ingrédients naturels et bio. Huiles essentielles, beurres végétaux, extraits naturels.",
    gradient: "from-[#F472B6] to-[#E11D48]",
    accent: "#E11D48",
    accentSoft: "rgba(225,29,72,0.08)",
    features: ["Ingrédients naturels", "Bio certifié", "Traçabilité totale"],
    challenges: [
      {
        emoji: "🌿",
        title: "Origine des ingrédients",
        text: "Les clients veulent savoir d'où viennent les huiles et beurres végétaux.",
      },
      {
        emoji: "🧪",
        title: "Composition transparente",
        text: "INCI complet, allergènes, perturbateurs endocriniens à signaler.",
      },
      {
        emoji: "🐰",
        title: "Cruelty-free & Bio",
        text: "Les certifications doivent être prouvées, pas seulement affirmées.",
      },
    ],
    solutions: [
      {
        emoji: "📱",
        title: "Passeport produit numérique",
        text: "Chaque flacon porte un QR code menant à la fiche complète du produit.",
      },
      {
        emoji: "🌱",
        title: "Traçabilité des ingrédients",
        text: "Origine botanique, mode d'extraction, certifications bio de chaque composant.",
      },
      {
        emoji: "✅",
        title: "Certifications vérifiables",
        text: "Cosmébio, Ecocert, cruelty-free — le client vérifie en un scan.",
      },
    ],
  },
  {
    id: "produits-de-la-mer",
    emoji: "🐟",
    title: "Produits de la Mer",
    subtitle: "Traçabilité océan-assiette",
    description:
      "Conformité UE et lutte contre la pêche illégale. Zone de pêche, méthode de capture, date de transformation.",
    gradient: "from-[#22D3EE] to-[#2563EB]",
    accent: "#2563EB",
    accentSoft: "rgba(37,99,235,0.08)",
    features: ["Conformité UE", "Catch Certificate", "MSC / ASC"],
    challenges: [
      {
        emoji: "🎣",
        title: "Pêche illégale (IUU)",
        text: "L'UE refuse les produits sans preuve de capture légale.",
      },
      {
        emoji: "📍",
        title: "Zone de pêche",
        text: "Le consommateur veut connaître l'origine exacte du poisson.",
      },
      {
        emoji: "❄️",
        title: "Chaîne du froid",
        text: "Du bateau à l'assiette, la température doit être contrôlée et prouvée.",
      },
    ],
    solutions: [
      {
        emoji: "📱",
        title: "Catch Certificate digital",
        text: "QR code intégrant le certificat de capture légal exigé par l'UE.",
      },
      {
        emoji: "🗺️",
        title: "Zone de pêche cartographiée",
        text: "Zone FAO, méthode de capture, nom du bateau visibles en un scan.",
      },
      {
        emoji: "🏆",
        title: "Certifications MSC / ASC",
        text: "Pêche durable et aquaculture responsable prouvées par certificats vérifiables.",
      },
    ],
  },
  {
    id: "viandes",
    emoji: "🥩",
    title: "Viandes & Volailles",
    subtitle: "De l'élevage à l'assiette",
    description:
      "Traçabilité sanitaire complète. Origine de l'animal, alimentation, abattoir agréé, chaîne du froid.",
    gradient: "from-[#EF4444] to-[#BE123C]",
    accent: "#BE123C",
    accentSoft: "rgba(190,18,60,0.08)",
    features: ["Traçabilité élevage", "Abattoir agréé", "Chaîne du froid"],
    challenges: [
      {
        emoji: "🐮",
        title: "Origine de l'animal",
        text: "Le consommateur veut connaître l'élevage, l'alimentation, le bien-être animal.",
      },
      {
        emoji: "🏥",
        title: "Conformité sanitaire",
        text: "Abattoirs agréés, contrôles vétérinaires, normes d'hygiène strictes.",
      },
      {
        emoji: "❄️",
        title: "Chaîne du froid",
        text: "Rupture de chaîne = danger sanitaire. Chaque étape doit être tracée.",
      },
    ],
    solutions: [
      {
        emoji: "📱",
        title: "QR code par carcasse",
        text: "Chaque lot de viande porte un QR code lié à l'animal d'origine.",
      },
      {
        emoji: "🏡",
        title: "Élevage transparent",
        text: "Ferme d'origine, alimentation, conditions d'élevage affichées au scan.",
      },
      {
        emoji: "🏥",
        title: "Agréments vérifiables",
        text: "Numéro d'agrément abattoir, contrôles vétérinaires, certifications halal accessibles.",
      },
    ],
  },
  {
    id: "cereales",
    emoji: "🌾",
    title: "Céréales & Légumineuses",
    subtitle: "Exportez vos récoltes",
    description:
      "Qualité et conformité pour les marchés internationaux. Riz, maïs, mil, niébé. Contrôle des mycotoxines.",
    gradient: "from-[#FBBF24] to-[#CA8A04]",
    accent: "#CA8A04",
    accentSoft: "rgba(202,138,4,0.08)",
    features: ["Contrôle qualité", "Mycotoxines", "Export CEDEAO"],
    challenges: [
      {
        emoji: "🍄",
        title: "Mycotoxines",
        text: "Aflatoxines et ochratoxines — limites strictes à l'export, contrôles obligatoires.",
      },
      {
        emoji: "📦",
        title: "Calibrage et qualité",
        text: "Les marchés internationaux exigent des standards de calibre et d'humidité.",
      },
      {
        emoji: "🌍",
        title: "Conformité CEDEAO & UE",
        text: "Documents phytosanitaires et certificats d'origine requis.",
      },
    ],
    solutions: [
      {
        emoji: "📱",
        title: "QR code par sac / lot",
        text: "Chaque sac de riz ou de mil porte un QR code avec la fiche complète du lot.",
      },
      {
        emoji: "🔬",
        title: "Résultats labo intégrés",
        text: "Contrôles mycotoxines, humidité, impuretés accessibles au scan.",
      },
      {
        emoji: "📜",
        title: "Certificats d'export",
        text: "Phytosanitaire, origine, qualité — générés et partagés depuis la plateforme.",
      },
    ],
  },
  {
    id: "noix-fruits-secs",
    emoji: "🥜",
    title: "Noix & Fruits Secs",
    subtitle: "Qualité certifiée à l'export",
    description:
      "Cajou, arachide, amandes. Contrôle des aflatoxines, calibrage, certifications bio. Prêts pour l'Europe.",
    gradient: "from-[#FB923C] to-[#C2410C]",
    accent: "#C2410C",
    accentSoft: "rgba(194,65,12,0.08)",
    features: ["Aflatoxines", "Calibrage", "Bio certifié"],
    challenges: [
      {
        emoji: "☣️",
        title: "Aflatoxines",
        text: "Les noix sont particulièrement sensibles aux aflatoxines — seuils UE très stricts.",
      },
      {
        emoji: "📐",
        title: "Calibrage",
        text: "Les acheteurs internationaux exigent des calibres précis et homogènes.",
      },
      {
        emoji: "🌱",
        title: "Certifications bio",
        text: "Demande croissante pour les noix bio certifiées à l'export.",
      },
    ],
    solutions: [
      {
        emoji: "📱",
        title: "QR code par lot d'export",
        text: "Chaque sac de cajou ou d'arachide porte un QR code avec la fiche qualité.",
      },
      {
        emoji: "🔬",
        title: "Contrôles aflatoxines",
        text: "Résultats de laboratoire intégrés directement dans le passeport numérique.",
      },
      {
        emoji: "✅",
        title: "Bio & calibrage certifiés",
        text: "Certifications bio, calibre, origine — tout est vérifiable en un scan.",
      },
    ],
  },
  {
    id: "huiles",
    emoji: "🫒",
    title: "Huiles & Corps Gras",
    subtitle: "Pureté et authenticité garanties",
    description:
      "Traçabilité de l'extraction à la bouteille. Huile d'arachide, de palme, d'olive. Méthode d'extraction tracée.",
    gradient: "from-[#EAB308] to-[#A16207]",
    accent: "#A16207",
    accentSoft: "rgba(161,98,7,0.08)",
    features: ["Extraction tracée", "Pureté garantie", "Qualité premium"],
    challenges: [
      {
        emoji: "🛢️",
        title: "Adultération",
        text: "Mélange avec des huiles moins chères — fraude fréquente dans le secteur.",
      },
      {
        emoji: "⚙️",
        title: "Méthode d'extraction",
        text: "Pression à froid vs solvants — le consommateur veut le savoir.",
      },
      {
        emoji: "📋",
        title: "Qualité et pureté",
        text: "Acidité, indice de peroxyde, composés volatils à documenter.",
      },
    ],
    solutions: [
      {
        emoji: "📱",
        title: "QR code par bouteille",
        text: "Chaque bouteille porte un QR code lié au lot de production.",
      },
      {
        emoji: "⚙️",
        title: "Extraction transparente",
        text: "Méthode d'extraction, température, date de pressage affichées au scan.",
      },
      {
        emoji: "🔬",
        title: "Analyses de pureté",
        text: "Résultats d'acidité, peroxyde, composition en acides gras accessibles.",
      },
    ],
  },
  {
    id: "cafe-cacao",
    emoji: "☕",
    title: "Café & Cacao",
    subtitle: "Valorisez votre terroir",
    description:
      "Du champ à la tasse, traçabilité complète. Variété, altitude, méthode de transformation, Fair Trade et Bio.",
    gradient: "from-[#D97706] to-[#78350F]",
    accent: "#92400E",
    accentSoft: "rgba(146,64,14,0.08)",
    features: ["Terroir valorisé", "Fair Trade", "Traçabilité complète"],
    challenges: [
      {
        emoji: "🌍",
        title: "Valoriser le terroir",
        text: "Variété, altitude, région — autant d'éléments qui justifient un prix premium.",
      },
      {
        emoji: "⚙️",
        title: "Méthode de transformation",
        text: "Fermentation, séchage, torréfaction — chaque étape impacte la qualité.",
      },
      {
        emoji: "🤝",
        title: "Fair Trade & Bio",
        text: "Les consommateurs européens exigent des preuves de commerce équitable.",
      },
    ],
    solutions: [
      {
        emoji: "📱",
        title: "QR code du champ à la tasse",
        text: "Chaque sac de café ou tablette de chocolat porte un QR code complet.",
      },
      {
        emoji: "📍",
        title: "Terroir géolocalisé",
        text: "Variété, altitude, coopérative, date de récolte visibles au scan.",
      },
      {
        emoji: "🤝",
        title: "Certifications Fair Trade & Bio",
        text: "Fairtrade, Rainforest Alliance, Bio — toutes vérifiables en un scan.",
      },
    ],
  },
  {
    id: "miel",
    emoji: "🍯",
    title: "Miel & Produits de la Ruche",
    subtitle: "Authenticité du miel garantie",
    description:
      "Lutte contre la fraude et traçabilité florale. Origine florale, zone de production, méthode d'extraction.",
    gradient: "from-[#FCD34D] to-[#EA580C]",
    accent: "#D97706",
    accentSoft: "rgba(217,119,6,0.08)",
    features: ["Anti-fraude", "Origine florale", "Pureté"],
    challenges: [
      {
        emoji: "❌",
        title: "Fraude au miel",
        text: "Adulteration au sirop de sucre — un problème majeur sur le marché mondial.",
      },
      {
        emoji: "🌸",
        title: "Origine florale",
        text: "Le type de fleur (acacia, baobab, etc.) définit le goût et le prix.",
      },
      {
        emoji: "📍",
        title: "Zone de production",
        text: "Région, type de ruche, méthode d'extraction à documenter.",
      },
    ],
    solutions: [
      {
        emoji: "📱",
        title: "QR code par pot",
        text: "Chaque pot de miel porte un QR code lié à sa ruche d'origine.",
      },
      {
        emoji: "🌸",
        title: "Origine florale certifiée",
        text: "Type de fleurs, zone de butinage, analyse pollinique accessibles au scan.",
      },
      {
        emoji: "🔬",
        title: "Pureté analysée",
        text: "Résultats d'analyse (HMF, humidité, sucres ajoutés) intégrés au passeport.",
      },
    ],
  },
  {
    id: "produits-laitiers",
    emoji: "🥛",
    title: "Produits Laitiers",
    subtitle: "Fraîcheur et sécurité",
    description:
      "Traçabilité de la ferme au produit fini. Lait, yaourt, fromage. Origine du lait, traitement, chaîne du froid.",
    gradient: "from-[#7DD3FC] to-[#4F46E5]",
    accent: "#4F46E5",
    accentSoft: "rgba(79,70,229,0.08)",
    features: ["Traçabilité ferme", "Chaîne du froid", "Sécurité sanitaire"],
    challenges: [
      {
        emoji: "🐄",
        title: "Origine du lait",
        text: "Le consommateur veut connaître la ferme, l'alimentation du troupeau.",
      },
      {
        emoji: "🌡️",
        title: "Chaîne du froid",
        text: "Du pis à la boutique, la température doit être contrôlée sans rupture.",
      },
      {
        emoji: "🧀",
        title: "Transformation",
        text: "Pasteurisation, maturation, affinage — chaque étape à documenter.",
      },
    ],
    solutions: [
      {
        emoji: "📱",
        title: "QR code par produit",
        text: "Chaque pot de yaourt ou fromage porte un QR code vers sa fiche complète.",
      },
      {
        emoji: "🐄",
        title: "Ferme d'origine",
        text: "Nom de la ferme, race, alimentation du troupeau affichées au scan.",
      },
      {
        emoji: "🌡️",
        title: "Chaîne du froid tracée",
        text: "Température de collecte, transformation, transport — vérifiables en un scan.",
      },
    ],
  },
];

function IndustryCard({
  industry,
  index,
  onOpen,
}: {
  industry: Industry;
  index: number;
  onOpen: (i: Industry) => void;
}) {
  return (
    <AnimatedSection index={index} as="article">
      <button
        type="button"
        onClick={() => onOpen(industry)}
        className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border-2 border-[#F3F4F6] bg-white text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_20px_50px_rgba(0,0,0,0.10)]"
      >
        {/* Gradient header with emoji */}
        <div
          className={`relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br ${industry.gradient}`}
        >
          <span className="text-6xl drop-shadow-lg transition-transform duration-300 group-hover:scale-110">
            {industry.emoji}
          </span>
          {/* Decorative circles */}
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-white/10" />
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display text-lg font-bold leading-tight text-[#111827] transition-colors group-hover:text-[#2563EB]">
            {industry.title}
          </h3>

          <p
            className="mt-1 text-sm font-semibold"
            style={{ color: industry.accent }}
          >
            {industry.subtitle}
          </p>

          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#6B7280]">
            {industry.description}
          </p>

          {/* Feature pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {industry.features.map((f) => (
              <span
                key={f}
                className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs font-medium text-[#6B7280]"
              >
                {f}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-[#2563EB] transition-all group-hover:gap-2">
            En savoir plus
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>
    </AnimatedSection>
  );
}

function IndustryDetailDialog({
  industry,
  onClose,
}: {
  industry: Industry | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!industry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-2xl gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        {industry && (
          <ScrollArea className="max-h-[85vh]">
            {/* Hero */}
            <div
              className={`relative flex flex-col items-center justify-center bg-gradient-to-br ${industry.gradient} px-6 py-12 text-center text-white`}
            >
              <span className="text-7xl drop-shadow-lg">
                {industry.emoji}
              </span>
              <DialogTitle className="mt-4 font-display text-3xl font-bold leading-tight">
                {industry.title}
              </DialogTitle>
              <DialogDescription className="mt-2 text-lg text-white/90">
                {industry.subtitle}
              </DialogDescription>
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/10" />
              {/* Custom close button — white on colored gradient hero */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-8 px-6 py-8">
              {/* Intro */}
              <p className="text-center text-[15px] leading-relaxed text-[#374151]">
                {industry.description}
              </p>

              {/* Challenges */}
              <section>
                <h3 className="mb-4 font-display text-xl font-bold text-[#111827]">
                  Vos défis
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {industry.challenges.map((c) => (
                    <div
                      key={c.title}
                      className="rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] p-4"
                    >
                      <div className="text-3xl">{c.emoji}</div>
                      <h4 className="mt-2 text-sm font-bold text-[#111827]">
                        {c.title}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">
                        {c.text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Solutions */}
              <section>
                <h3 className="mb-4 font-display text-xl font-bold text-[#111827]">
                  La solution VerifScan
                </h3>
                <div className="space-y-3">
                  {industry.solutions.map((s) => (
                    <div
                      key={s.title}
                      className="flex gap-4 rounded-xl border border-[#F3F4F6] bg-white p-4 shadow-sm"
                    >
                      <div
                        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl"
                        style={{ backgroundColor: industry.accentSoft }}
                      >
                        {s.emoji}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#111827]">
                          {s.title}
                        </h4>
                        <p className="mt-1 text-sm leading-relaxed text-[#6B7280]">
                          {s.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Features recap */}
              <section>
                <div
                  className="flex flex-wrap items-center gap-2 rounded-xl p-4"
                  style={{ backgroundColor: industry.accentSoft }}
                >
                  <Sparkles
                    className="h-5 w-5 flex-shrink-0"
                    style={{ color: industry.accent }}
                  />
                  <span className="text-sm font-semibold text-[#111827]">
                    Points forts :
                  </span>
                  {industry.features.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#374151]"
                    >
                      <Check
                        className="h-3 w-3"
                        style={{ color: industry.accent }}
                      />
                      {f}
                    </span>
                  ))}
                </div>
              </section>

              {/* CTA */}
              <section
                className="flex flex-col items-center gap-4 rounded-2xl px-6 py-8 text-center"
                style={{ backgroundColor: industry.accentSoft }}
              >
                <h3 className="font-display text-xl font-bold text-[#111827]">
                  Prêt à digitaliser votre métier ?
                </h3>
                <p className="max-w-md text-sm text-[#6B7280]">
                  Rejoignez les fabricants sénégalais qui font confiance à
                  VerifScan pour la traçabilité de leurs produits.
                </p>
                <a
                  href="/register"
                  className="inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90"
                  style={{ backgroundColor: industry.accent }}
                >
                  Créer mon passeport numérique
                  <ArrowRight className="h-4 w-4" />
                </a>
              </section>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function IndustryCards() {
  const [selected, setSelected] = useState<Industry | null>(null);

  const handleOpen = useCallback((i: Industry) => setSelected(i), []);
  const handleClose = useCallback(() => setSelected(null), []);

  return (
    <section className="bg-white py-20 sm:py-24" id="metiers">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection className="mb-12 text-center">
          <SectionBadge bg="bg-[#EFF6FF]" color="text-[#2563EB]">
            🎯 Par métier
          </SectionBadge>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-[#111827] sm:text-4xl">
            Un passeport numérique pour{" "}
            <span className="bg-gradient-to-r from-[#2563EB] to-[#10B981] bg-clip-text text-transparent">
              chaque métier
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base text-[#6B7280] sm:text-lg">
            Que vous soyez producteur de fruits, transformateur de cacao ou
            fabricant de cosmétiques, VerifScan s'adapte à vos besoins
            spécifiques.
          </p>
        </AnimatedSection>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {INDUSTRIES.map((industry, index) => (
            <IndustryCard
              key={industry.id}
              industry={industry}
              index={index}
              onOpen={handleOpen}
            />
          ))}
        </div>
      </div>

      <IndustryDetailDialog industry={selected} onClose={handleClose} />
    </section>
  );
}
