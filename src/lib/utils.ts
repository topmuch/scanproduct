import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date as "12 janvier 2025" (French long format).
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Format a date as "12/01/2025" (French short format).
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Human-readable "il y a X" (time ago) in French.
 */
export function formatDistanceToNow(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 0) return "à venir";
  if (diffInSeconds < 60) return "quelques secondes";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} jours`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} sem.`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} mois`;
  return `${Math.floor(diffInSeconds / 31536000)} an(s)`;
}

/**
 * Calculate the number of days until a date (can be negative if past).
 */
export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

// ---------------------------------------------------------------------------
// Transparency score types
// ---------------------------------------------------------------------------

export type TransparencySubCriterion = {
  label: string;
  points: number;
  achieved: boolean;
};

export type TransparencyDetail = {
  criterion: string;
  score: number;
  max: number;
  subCriteria?: TransparencySubCriterion[];
};

export type TransparencyLevel = "bronze" | "argent" | "or" | "platine";

export type TransparencyResult = {
  score: number;
  maxScore: number;
  level: TransparencyLevel;
  percentage: number;
  details: TransparencyDetail[];
  improvements: string[];
};

export const LEVEL_CONFIG: Record<
  TransparencyLevel,
  { label: string; icon: string; color: string; bgColor: string; borderColor: string; textColor: string }
> = {
  bronze: {
    label: "Traçabilité basique",
    icon: "🥉",
    color: "#D97706",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    textColor: "text-amber-900",
  },
  argent: {
    label: "Bonne transparence",
    icon: "🥈",
    color: "#6B7280",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-300",
    textColor: "text-gray-900",
  },
  or: {
    label: "Transparence élevée",
    icon: "🥇",
    color: "#F59E0B",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
    textColor: "text-yellow-900",
  },
  platine: {
    label: "Transparence exemplaire",
    icon: "💎",
    color: "#8B5CF6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    textColor: "text-purple-900",
  },
};

export function getLevelFromScore(score: number): TransparencyLevel {
  if (score >= 91) return "platine";
  if (score >= 71) return "or";
  if (score >= 41) return "argent";
  return "bronze";
}

export function getPercentileRank(score: number): number {
  if (score >= 95) return 5;
  if (score >= 90) return 10;
  if (score >= 85) return 15;
  if (score >= 80) return 25;
  if (score >= 70) return 40;
  if (score >= 60) return 60;
  return 80;
}

// ---------------------------------------------------------------------------
// Types matching the Prisma models (loosely, for score calculation input)
// ---------------------------------------------------------------------------

type TransparencyInput = {
  lotNumber?: string | null;
  manufactureDate?: Date | string | null;
  expiryDate?: Date | string | null;
  ingredients?: string | null;
  manufacturingLocation?: string | null;
  transformationLocation?: string | null;
  salesCountries?: string | null; // JSON string array
  allergens?: string | null; // JSON string
  nutritionalInfo?: string | null; // JSON string
  certifications?: unknown[] | null;
  fabricant: {
    name?: string | null;
    companyName?: string | null;
    logoUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    whatsapp?: string | null;
    isVerified?: boolean | null;
  };
};

/**
 * Calculate the transparency score (0–100) for a lot.
 *
 * Criteria (total 100 pts):
 *   1. Identité fabricant        (15 pts)
 *   2. Origine connue            (15 pts)
 *   3. Numéro de lot             (10 pts)
 *   4. Dates complètes           (15 pts)
 *   5. Composition détaillée     (20 pts)
 *   6. Certifications            (15 pts)
 *   7. Contact accessible        (10 pts)
 */
export function calculateTransparencyScore(lot: TransparencyInput): TransparencyResult {
  let score = 0;
  const details: TransparencyDetail[] = [];
  const improvements: string[] = [];

  const manufacturer = lot.fabricant || {};

  // 1. Identité fabricant (15 pts)
  let identityScore = 0;
  const identitySubs: TransparencySubCriterion[] = [];
  if (manufacturer.companyName || manufacturer.name) {
    identityScore += 5;
    identitySubs.push({ label: "Nom entreprise", points: 5, achieved: true });
  } else {
    identitySubs.push({ label: "Nom entreprise", points: 5, achieved: false });
    improvements.push("Renseignez le nom de l'entreprise");
  }
  if (manufacturer.logoUrl) {
    identityScore += 3;
    identitySubs.push({ label: "Logo", points: 3, achieved: true });
  } else {
    identitySubs.push({ label: "Logo", points: 3, achieved: false });
    improvements.push("Ajoutez un logo d'entreprise");
  }
  if (manufacturer.address) {
    identityScore += 4;
    identitySubs.push({ label: "Adresse complète", points: 4, achieved: true });
  } else {
    identitySubs.push({ label: "Adresse complète", points: 4, achieved: false });
    improvements.push("Complétez l'adresse de l'entreprise");
  }
  if (manufacturer.phone && manufacturer.email) {
    identityScore += 3;
    identitySubs.push({ label: "Contacts vérifiés", points: 3, achieved: true });
  } else {
    identitySubs.push({ label: "Contacts vérifiés", points: 3, achieved: false });
    improvements.push("Ajoutez un email et un téléphone vérifiés");
  }
  score += identityScore;
  details.push({ criterion: "Identité du fabricant", score: identityScore, max: 15, subCriteria: identitySubs });

  // 2. Origine connue (15 pts)
  let originScore = 0;
  const originSubs: TransparencySubCriterion[] = [];
  let countries: string[] = [];
  try {
    countries = lot.salesCountries ? JSON.parse(lot.salesCountries) : [];
  } catch {
    countries = [];
  }
  if (countries.length > 0) {
    originScore += 7;
    originSubs.push({ label: "Pays de vente", points: 7, achieved: true });
  } else {
    originSubs.push({ label: "Pays de vente", points: 7, achieved: false });
    improvements.push("Précisez les pays de vente");
  }
  if (lot.manufacturingLocation) {
    originScore += 4;
    originSubs.push({ label: "Lieu de fabrication", points: 4, achieved: true });
  } else {
    originSubs.push({ label: "Lieu de fabrication", points: 4, achieved: false });
    improvements.push("Précisez le lieu de fabrication");
  }
  if (lot.transformationLocation) {
    originScore += 4;
    originSubs.push({ label: "Lieu de transformation", points: 4, achieved: true });
  } else {
    originSubs.push({ label: "Lieu de transformation", points: 4, achieved: false });
    improvements.push("Précisez le lieu de transformation");
  }
  score += originScore;
  details.push({ criterion: "Origine connue", score: originScore, max: 15, subCriteria: originSubs });

  // 3. Numéro de lot (10 pts)
  const lotNumScore = lot.lotNumber && lot.lotNumber.length > 3 ? 10 : 0;
  score += lotNumScore;
  details.push({
    criterion: "Numéro de lot",
    score: lotNumScore,
    max: 10,
    subCriteria: [
      { label: "Numéro de lot valide", points: 10, achieved: lotNumScore === 10 },
    ],
  });

  // 4. Dates complètes (15 pts)
  let dateScore = 0;
  const dateSubs: TransparencySubCriterion[] = [];
  if (lot.manufactureDate) {
    dateScore += 7;
    dateSubs.push({ label: "Date de fabrication", points: 7, achieved: true });
  } else {
    dateSubs.push({ label: "Date de fabrication", points: 7, achieved: false });
    improvements.push("Ajoutez la date de fabrication");
  }
  if (lot.expiryDate) {
    dateScore += 8;
    dateSubs.push({ label: "Date de péremption", points: 8, achieved: true });
  } else {
    dateSubs.push({ label: "Date de péremption", points: 8, achieved: false });
    improvements.push("Ajoutez la date de péremption");
  }
  score += dateScore;
  details.push({ criterion: "Dates complètes", score: dateScore, max: 15, subCriteria: dateSubs });

  // 5. Composition détaillée (20 pts)
  let compositionScore = 0;
  const compSubs: TransparencySubCriterion[] = [];
  if (lot.ingredients) {
    compositionScore += 10;
    compSubs.push({ label: "Ingrédients", points: 10, achieved: true });
  } else {
    compSubs.push({ label: "Ingrédients", points: 10, achieved: false });
    improvements.push("Ajoutez la liste des ingrédients");
  }
  let hasAllergens = false;
  try {
    const a = lot.allergens ? JSON.parse(lot.allergens) : null;
    hasAllergens = Array.isArray(a) && a.length > 0;
  } catch {
    hasAllergens = false;
  }
  if (hasAllergens) {
    compositionScore += 5;
    compSubs.push({ label: "Allergènes", points: 5, achieved: true });
  } else {
    compSubs.push({ label: "Allergènes", points: 5, achieved: false });
    improvements.push("Renseignez les allergènes éventuels");
  }
  if (lot.nutritionalInfo && lot.nutritionalInfo !== "{}") {
    compositionScore += 5;
    compSubs.push({ label: "Infos nutritionnelles", points: 5, achieved: true });
  } else {
    compSubs.push({ label: "Infos nutritionnelles", points: 5, achieved: false });
    improvements.push("Ajoutez les informations nutritionnelles");
  }
  score += compositionScore;
  details.push({ criterion: "Composition détaillée", score: compositionScore, max: 20, subCriteria: compSubs });

  // 6. Certifications (15 pts, max 3 × 5)
  const certCount = Array.isArray(lot.certifications) ? lot.certifications.length : 0;
  const certScore = Math.min(certCount * 5, 15);
  score += certScore;
  details.push({
    criterion: "Certifications",
    score: certScore,
    max: 15,
    subCriteria: [
      { label: `${certCount} certification(s)`, points: certScore, achieved: certScore > 0 },
    ],
  });
  if (certScore < 15) {
    improvements.push("Ajoutez des certifications (Bio, ISO, Halal…) pour gagner jusqu'à 15 points");
  }

  // 7. Contact accessible (10 pts)
  let contactScore = 0;
  const contactSubs: TransparencySubCriterion[] = [];
  if (manufacturer.whatsapp) {
    contactScore += 4;
    contactSubs.push({ label: "WhatsApp", points: 4, achieved: true });
  } else {
    contactSubs.push({ label: "WhatsApp", points: 4, achieved: false });
  }
  if (manufacturer.email) {
    contactScore += 3;
    contactSubs.push({ label: "Email", points: 3, achieved: true });
  } else {
    contactSubs.push({ label: "Email", points: 3, achieved: false });
  }
  if (manufacturer.phone) {
    contactScore += 3;
    contactSubs.push({ label: "Téléphone", points: 3, achieved: true });
  } else {
    contactSubs.push({ label: "Téléphone", points: 3, achieved: false });
  }
  score += contactScore;
  details.push({ criterion: "Contact accessible", score: contactScore, max: 10, subCriteria: contactSubs });
  if (contactScore < 10) {
    improvements.push("Rendez tous vos contacts accessibles (WhatsApp, email, téléphone)");
  }

  const level = getLevelFromScore(score);
  return {
    score,
    maxScore: 100,
    level,
    percentage: Math.round((score / 100) * 100),
    details,
    improvements,
  };
}

// ---------------------------------------------------------------------------
// Helpers for JSON fields stored as strings (SQLite)
// ---------------------------------------------------------------------------

export function parseJsonArray<T = string>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function parseJsonObject<T = Record<string, unknown>>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Get a readable list of allergens from a JSON string.
 */
export function getAllergens(value: string | null | undefined): string[] {
  const arr = parseJsonArray<string>(value);
  if (arr.length > 0) return arr;
  // If empty but the field is null/undefined, "Aucun allergène connu"
  return [];
}

/**
 * Get the transparency badge style for a given level.
 */
export function getTransparencyBadgeStyle(level: TransparencyLevel): string {
  const c = LEVEL_CONFIG[level];
  return `${c.bgColor} ${c.textColor} border ${c.borderColor}`;
}
