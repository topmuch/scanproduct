/**
 * INDUSTRIES — données des 12 métiers ("Un passeport numérique pour chaque métier").
 *
 * Module SANS "use client" : importable à la fois par le composant client
 * IndustryCards.tsx (cards de la landing) et par la page serveur
 * /metiers/[slug]/page.tsx (pages réelles référençables, generateStaticParams
 * + generateMetadata).
 */

export type Challenge = {
  emoji: string;
  title: string;
  text: string;
};

export type Solution = {
  emoji: string;
  title: string;
  text: string;
};

export type Industry = {
  id: string;
  emoji: string;
  /** Local image path in /public/images/industries — real photo for the card header & page hero */
  image: string;
  title: string;
  subtitle: string;
  description: string;
  /** Tailwind gradient classes for the card header band, e.g. "from-[#34D399] to-[#059669]" */
  gradient: string;
  /** Hex accent color for badges, bullets, CTA text — e.g. "#059669" */
  accent: string;
  /** Soft tint background (rgba) for the page hero — e.g. "rgba(5,150,105,0.08)" */
  accentSoft: string;
  features: string[];
  challenges: Challenge[];
  solutions: Solution[];
};

export const INDUSTRIES: Industry[] = [
  {
    id: "fruits-legumes",
    emoji: "🥭",
    image: "/images/industries/fruits-legumes.jpg",
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
    image: "/images/industries/boissons.jpg",
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
    image: "/images/industries/epices.png",
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
    image: "/images/industries/cosmetiques.jpg",
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
    image: "/images/industries/produits-de-la-mer.jpg",
    title: "Produits de la Mer",
    subtitle: "Traçabilité océan-assiette",
    description:
      "Conformité UE et lutte contre la pêche illégale. Zone de pêche, méthode de capture, date de transformation.",
    gradient: "from-[#22D3EE] to-[#022150]",
    accent: "#022150",
    accentSoft: "rgba(2, 33, 80,0.08)",
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
    image: "/images/industries/viandes.jpg",
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
    image: "/images/industries/cereales.jpg",
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
    image: "/images/industries/noix-fruits-secs.jpg",
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
    image: "/images/industries/huiles.jpg",
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
    image: "/images/industries/cafe-cacao.jpg",
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
    image: "/images/industries/miel.jpg",
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
    image: "/images/industries/produits-laitiers.jpg",
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

export function getIndustry(id: string): Industry | undefined {
  return INDUSTRIES.find((i) => i.id === id);
}
