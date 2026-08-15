// ============================================================================
// VerifScan — Catalogue de certifications produits
// ============================================================================
// Catalogue statique des certifications reconnues par VerifScan, utilisé par:
//   - DynamicProductForm (sélection à la création du produit)
//   - Page produit scanné (/p/[lotId]) — affichage riche avec emoji + catégorie
//
// Les certifications sont stockées sur `Product.certifications` (JSON-encoded
// Array<ProductCertification>). Chaque ligne peut référencer un cert du
// catalogue via son `id` (pour récupérer emoji/description/catégorie) ou
// être une entrée libre "Autre" sans id (rétro-compatible avec les données
// existantes).
//
// Le catalogue est client-safe (aucun import serveur) — peut être importé
// dans des composants client et serveur.
// ============================================================================

export type CertificationCategory =
  | "bio"
  | "fairtrade"
  | "safety"
  | "quality"
  | "religious"
  | "local";

export interface CertificationDef {
  /** Identifiant stable — utilisé comme clé dans ProductCertification.id */
  id: string;
  /** Nom officiel affiché (ex: "Bio Ecocert") */
  name: string;
  /** Emoji représentant le logo (placeholders en attendant les SVG officiels) */
  emoji: string;
  /** Description courte (1 phrase) */
  description: string;
  /** Catégorie pour le regroupement visuel */
  category: CertificationCategory;
  /** Organisme émetteur (ex: "Ecocert", "ISO", "Fairtrade International") */
  issuingBody: string;
  /** Slugs de catégories de produit concernées, ou ["all"] pour universel */
  validFor: string[];
  /** Couleur d'accent pour l'affichage (tailwind color name, ex: "emerald") */
  accent: string;
}

/**
 * Ligne de certification stockée sur Product.certifications (JSON-encoded).
 * Rétro-compatible avec le schéma existant {name, issuer, validUntil, fileUrl}.
 * Le champ `id` est optionnel — s'il est présent et correspond à une entrée
 * du catalogue, l'affichage public récupère l'emoji + la description.
 */
export interface ProductCertification {
  /** Catalog id (ex: "bio_ecocert") — undefined pour les certs personnalisés */
  id?: string;
  /** Nom affiché (recopié depuis le catalogue au moment de la sélection) */
  name: string;
  /** Organisme émetteur (recopié depuis le catalogue si préselectionné) */
  issuer?: string;
  /** Date d'expiration ISO (YYYY-MM-DD) — optionnelle */
  validUntil?: string;
  /** URL du document justificatif (PDF, image scannée) — optionnelle */
  fileUrl?: string;
}

// ----------------------------------------------------------------------------
// Catalogue — 28 certifications réparties sur 6 catégories
// ----------------------------------------------------------------------------

export const CERTIFICATIONS: Record<string, CertificationDef> = {
  // ── BIOLOGIQUE / ORGANIC ───────────────────────────────────────────────
  bio_ecocert: {
    id: "bio_ecocert",
    name: "Bio Ecocert",
    emoji: "🌿",
    description: "Certification biologique européenne délivrée par Ecocert",
    category: "bio",
    issuingBody: "Ecocert",
    validFor: ["all"],
    accent: "emerald",
  },
  usda_organic: {
    id: "usda_organic",
    name: "USDA Organic",
    emoji: "🇺🇸",
    description: "Certification biologique américaine (USDA National Organic Program)",
    category: "bio",
    issuingBody: "USDA",
    validFor: ["all"],
    accent: "emerald",
  },
  eu_organic: {
    id: "eu_organic",
    name: "EU Organic",
    emoji: "🇪🇺",
    description: "Logo biologique de l'Union Européenne",
    category: "bio",
    issuingBody: "Union Européenne",
    validFor: ["all"],
    accent: "emerald",
  },
  bio_senegal: {
    id: "bio_senegal",
    name: "Bio Sénégal",
    emoji: "🇸🇳",
    description: "Certification biologique locale sénégalaise",
    category: "bio",
    issuingBody: "Institut Sénégalais de Normalisation (ASN)",
    validFor: ["all"],
    accent: "emerald",
  },
  africa_bio: {
    id: "africa_bio",
    name: "Africa Bio",
    emoji: "🌍",
    description: "Certification biologique africaine pour l'export intra-Afrique",
    category: "bio",
    issuingBody: "African Organic Network (AfrONet)",
    validFor: ["all"],
    accent: "emerald",
  },
  bio_coherence: {
    id: "bio_coherence",
    name: "Bio Cohérence",
    emoji: "🌿",
    description: "Cahier des charges bio français strict, au-delà du règlement UE",
    category: "bio",
    issuingBody: "Fédération Bio Cohérence",
    validFor: ["all"],
    accent: "emerald",
  },

  // ── COMMERCE ÉQUITABLE / FAIR TRADE ────────────────────────────────────
  fairtrade: {
    id: "fairtrade",
    name: "Fairtrade International",
    emoji: "⚖️",
    description: "Commerce équitable international — garantit un prix minimum juste",
    category: "fairtrade",
    issuingBody: "Fairtrade International (FLO)",
    validFor: ["all"],
    accent: "amber",
  },
  fair_trade_usa: {
    id: "fair_trade_usa",
    name: "Fair Trade USA",
    emoji: "🇺🇸",
    description: "Certification de commerce équitable pour le marché américain",
    category: "fairtrade",
    issuingBody: "Fair Trade USA",
    validFor: ["all"],
    accent: "amber",
  },
  wfto: {
    id: "wfto",
    name: "WFTO",
    emoji: "🌐",
    description: "World Fair Trade Organization — organisation de producteurs équitables",
    category: "fairtrade",
    issuingBody: "WFTO",
    validFor: ["all"],
    accent: "amber",
  },

  // ── SÉCURITÉ ALIMENTAIRE ───────────────────────────────────────────────
  haccp: {
    id: "haccp",
    name: "HACCP",
    emoji: "🛡️",
    description: "Analyse des dangers et points critiques pour leur maîtrise",
    category: "safety",
    issuingBody: "Codex Alimentarius",
    validFor: ["all"],
    accent: "blue",
  },
  iso22000: {
    id: "iso22000",
    name: "ISO 22000",
    emoji: "📜",
    description: "Management de la sécurité des denrées alimentaires",
    category: "safety",
    issuingBody: "ISO",
    validFor: ["all"],
    accent: "blue",
  },
  fssc22000: {
    id: "fssc22000",
    name: "FSSC 22000",
    emoji: "🏭",
    description: "Food Safety System Certification — reconnu par la GFSI",
    category: "safety",
    issuingBody: "Foundation FSSC 22000",
    validFor: ["all"],
    accent: "blue",
  },
  brc: {
    id: "brc",
    name: "BRCGS Food Safety",
    emoji: "🇬🇧",
    description: "British Retail Consortium Global Standard — référence UK",
    category: "safety",
    issuingBody: "BRCGS",
    validFor: ["all"],
    accent: "blue",
  },
  ifs: {
    id: "ifs",
    name: "IFS Food",
    emoji: "🇫🇷",
    description: "International Featured Standards — référence France/Europe",
    category: "safety",
    issuingBody: "IFS Management",
    validFor: ["all"],
    accent: "blue",
  },

  // ── QUALITÉ & ENVIRONNEMENT ────────────────────────────────────────────
  global_gap: {
    id: "global_gap",
    name: "Global GAP",
    emoji: "✅",
    description: "Bonnes pratiques agricoles mondiales (Good Agricultural Practices)",
    category: "quality",
    issuingBody: "GLOBALG.A.P.",
    validFor: ["all"],
    accent: "green",
  },
  rainforest: {
    id: "rainforest",
    name: "Rainforest Alliance",
    emoji: "🐸",
    description: "Agriculture durable et conservation de la biodiversité",
    category: "quality",
    issuingBody: "Rainforest Alliance",
    validFor: ["all"],
    accent: "green",
  },
  utz: {
    id: "utz",
    name: "UTZ Certified",
    emoji: "🌱",
    description: "Café et cacao durables (désormais intégré à Rainforest Alliance)",
    category: "quality",
    issuingBody: "UTZ Certified",
    validFor: ["all"],
    accent: "green",
  },
  msc: {
    id: "msc",
    name: "MSC",
    emoji: "🐟",
    description: "Marine Stewardship Council — pêche durable sauvage",
    category: "quality",
    issuingBody: "MSC",
    validFor: ["all"],
    accent: "cyan",
  },
  asc: {
    id: "asc",
    name: "ASC",
    emoji: "🐠",
    description: "Aquaculture Stewardship Council — élevage de poissons responsable",
    category: "quality",
    issuingBody: "ASC",
    validFor: ["all"],
    accent: "cyan",
  },
  label_rouge: {
    id: "label_rouge",
    name: "Label Rouge",
    emoji: "🏆",
    description: "Signe français de qualité supérieure",
    category: "quality",
    issuingBody: "INAO (France)",
    validFor: ["all"],
    accent: "rose",
  },
  aop: {
    id: "aop",
    name: "AOP",
    emoji: "🏆",
    description: "Appellation d'Origine Protégée — terroir et savoir-faire",
    category: "quality",
    issuingBody: "INAO (UE)",
    validFor: ["all"],
    accent: "amber",
  },
  igp: {
    id: "igp",
    name: "IGP",
    emoji: "📍",
    description: "Indication Géographique Protégée",
    category: "quality",
    issuingBody: "INAO (UE)",
    validFor: ["all"],
    accent: "amber",
  },
  rspo: {
    id: "rspo",
    name: "RSPO",
    emoji: "🌴",
    description: "Roundtable on Sustainable Palm Oil — huile de palme durable",
    category: "quality",
    issuingBody: "RSPO",
    validFor: ["all"],
    accent: "green",
  },

  // ── RELIGIEUSES ────────────────────────────────────────────────────────
  halal: {
    id: "halal",
    name: "Halal",
    emoji: "☪️",
    description: "Conforme aux règles alimentaires islamiques",
    category: "religious",
    issuingBody: "Organisme Halal certifié",
    validFor: ["all"],
    accent: "violet",
  },
  kosher: {
    id: "kosher",
    name: "Kosher",
    emoji: "✡️",
    description: "Conforme aux règles alimentaires juives (Casher)",
    category: "religious",
    issuingBody: "Rabbinat certifié",
    validFor: ["all"],
    accent: "violet",
  },

  // ── CERTIFICATIONS LOCALES (SÉNÉGAL / AFRIQUE DE L'OUEST) ──────────────
  made_in_senegal: {
    id: "made_in_senegal",
    name: "Made in Senegal",
    emoji: "🇸🇳",
    description: "Fabriqué au Sénégal — label de production locale",
    category: "local",
    issuingBody: "APIX Sénégal",
    validFor: ["all"],
    accent: "orange",
  },
  normes_senegalaises: {
    id: "normes_senegalaises",
    name: "Normes Sénégalaises (ASN)",
    emoji: "📋",
    description: "Conformité aux normes de l'Association Sénégalaise de Normalisation",
    category: "local",
    issuingBody: "ASN",
    validFor: ["all"],
    accent: "orange",
  },
  cedao: {
    id: "cedao",
    name: "CEDEAO / ECOWAS",
    emoji: "🌍",
    description: "Conformité aux normes de la Communauté Économique des États de l'Afrique de l'Ouest",
    category: "local",
    issuingBody: "CEDEAO (ECOWAS)",
    validFor: ["all"],
    accent: "orange",
  },
};

// ----------------------------------------------------------------------------
// Métadonnées par catégorie (pour titres de section + couleurs de groupe)
// ----------------------------------------------------------------------------

export const CATEGORY_LABELS: Record<
  CertificationCategory,
  { label: string; emoji: string; description: string; accent: string }
> = {
  bio: {
    label: "Biologique & Organic",
    emoji: "🌱",
    description: "Produits issus de l'agriculture biologique",
    accent: "emerald",
  },
  fairtrade: {
    label: "Commerce Équitable",
    emoji: "🤝",
    description: "Garantit un revenu juste aux producteurs",
    accent: "amber",
  },
  safety: {
    label: "Sécurité Alimentaire",
    emoji: "🛡️",
    description: "Maîtrise des dangers sanitaires",
    accent: "blue",
  },
  quality: {
    label: "Qualité & Environnement",
    emoji: "🏅",
    description: "Démarches qualité, environnement et terroir",
    accent: "green",
  },
  religious: {
    label: "Religieuses",
    emoji: "☪️",
    description: "Conformité aux règles alimentaires religieuses",
    accent: "violet",
  },
  local: {
    label: "Certifications Locales",
    emoji: "🇸🇳",
    description: "Labels sénégalais et ouest-africains",
    accent: "orange",
  },
};

export const CATEGORY_ORDER: CertificationCategory[] = [
  "bio",
  "fairtrade",
  "safety",
  "quality",
  "religious",
  "local",
];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Retourne toutes les certifications d'une catégorie donnée. */
export function getCertificationsByCategory(
  category: CertificationCategory,
): CertificationDef[] {
  return Object.values(CERTIFICATIONS).filter((c) => c.category === category);
}

/** Liste groupée par catégorie — pratique pour les sélecteurs. */
export function getCertificationsGrouped(): Record<
  CertificationCategory,
  CertificationDef[]
> {
  const grouped = {} as Record<CertificationCategory, CertificationDef[]>;
  for (const cat of CATEGORY_ORDER) {
    grouped[cat] = getCertificationsByCategory(cat);
  }
  return grouped;
}

/**
 * Résout une ProductCertification (ligne stockée) vers sa définition de
 * catalogue. Renvoie null si :
 *   - la ligne n'a pas d'id, ou
 *   - l'id ne correspond à aucune entrée du catalogue (cert personnalisé).
 *
 * En fallback, tente une correspondance par nom insensible à la casse pour
 * rétro-compatibilité avec les anciennes données sans id.
 */
export function lookupCertification(
  cert: ProductCertification,
): CertificationDef | null {
  if (cert.id && CERTIFICATIONS[cert.id]) {
    return CERTIFICATIONS[cert.id];
  }
  if (cert.name) {
    const name = cert.name.toLowerCase().trim();
    const byName = Object.values(CERTIFICATIONS).find(
      (c) => c.name.toLowerCase() === name,
    );
    if (byName) return byName;
  }
  return null;
}

/**
 * Parse le JSON stocké sur Product.certifications (string | null) en tableau
 * typé. Robuste aux anciennes données malformées — ne lance jamais d'erreur.
 */
export function parseProductCertifications(
  raw: string | null | undefined,
): ProductCertification[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r): r is ProductCertification => {
        if (!r || typeof r !== "object") return false;
        return typeof (r as ProductCertification).name === "string";
      })
      .map((r) => ({
        id: typeof r.id === "string" ? r.id : undefined,
        name: String(r.name),
        issuer: r.issuer ? String(r.issuer) : undefined,
        validUntil: r.validUntil ? String(r.validUntil) : undefined,
        fileUrl: r.fileUrl ? String(r.fileUrl) : undefined,
      }));
  } catch {
    return [];
  }
}

/** Formate une date ISO (YYYY-MM-DD) en "MM/YYYY" lisible. */
export function formatCertificationExpiry(isoDate?: string): string | null {
  if (!isoDate) return null;
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return null;
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return null;
  }
}

/** Indique si une certification est expirée (true) ou valide (false). */
export function isCertificationExpired(isoDate?: string): boolean {
  if (!isoDate) return false;
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return false;
    return d.getTime() < Date.now();
  } catch {
    return false;
  }
}
