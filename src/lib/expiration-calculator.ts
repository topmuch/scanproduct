// ============================================================================
// expiration-calculator — Calcul automatique des dates de péremption
// ============================================================================
// Utilisé par :
//   - SmartProductSelector / formulaires produit + lot (auto-calcul)
//   - /api/calculate-expiration (calcul serveur)
//   - ProductDetailsSection (badge de fraîcheur page publique)
// ============================================================================

/**
 * Calcule la date de péremption à partir de la date de fabrication.
 *
 * @param manufacturingDate Date de fabrication du lot/produit.
 * @param shelfLifeMonths   Durée de conservation en mois (entier, 0 = ignorer).
 * @param shelfLifeDays     Durée fine en jours — prime sur les mois quand
 *                          définie et > 0 (ex. pain artisanal : 7 jours).
 * @returns Nouvelle Date (l'entrée n'est jamais mutée).
 */
export function calculateExpirationDate(
  manufacturingDate: Date,
  shelfLifeMonths: number,
  shelfLifeDays?: number,
): Date {
  const expDate = new Date(manufacturingDate.getTime());
  if (shelfLifeDays !== undefined && shelfLifeDays > 0) {
    expDate.setDate(expDate.getDate() + shelfLifeDays);
    return expDate;
  }
  // setMonth gère nativement les débordements (31 janvier + 1 mois → 28/29
  // février) sans lever d'exception.
  expDate.setMonth(expDate.getMonth() + (shelfLifeMonths || 0));
  return expDate;
}

/**
 * Nombre de jours entiers restants avant la date de péremption.
 * Valeur négative = produit expiré depuis |valeur| jours.
 */
export function getDaysUntilExpiration(expirationDate: Date): number {
  const now = new Date();
  // Normalisation à minuit pour compter des journées complètes plutôt que
  // des millisecondes brutes (sinon « 0 jours » tarde à arriver).
  const start = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = start(expirationDate) - start(now);
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export type FreshnessStatus =
  | "fresh"
  | "good"
  | "warning"
  | "critical"
  | "expired";

export interface FreshnessInfo {
  status: FreshnessStatus;
  label: string;
  /** Nom de couleur Tailwind (bg-green-… etc.) pour composants dynamiques. */
  color: "green" | "blue" | "orange" | "red";
  icon: string;
  message: string;
}

/**
 * Statut de fraîcheur lisible par le consommateur, à partir des jours
 * restants. Seuils adaptés aux produits frais artisanaux :
 *   ≤ 0 → expiré | ≤ 30 → derniers jours | ≤ 90 → bientôt | ≤ 180 → bon | sinon frais
 */
export function getFreshnessStatus(daysLeft: number): FreshnessInfo {
  if (daysLeft < 0) {
    return {
      status: "expired",
      label: "Expiré",
      color: "red",
      icon: "❌",
      message: "Ce produit ne doit plus être utilisé",
    };
  }

  if (daysLeft <= 30) {
    return {
      status: "critical",
      label: "Derniers jours",
      color: "red",
      icon: "🚨",
      message: "À utiliser rapidement",
    };
  }

  if (daysLeft <= 90) {
    return {
      status: "warning",
      label: "À consommer bientôt",
      color: "orange",
      icon: "⏰",
      message: "Pensez à l'utiliser dans les semaines à venir",
    };
  }

  if (daysLeft <= 180) {
    return {
      status: "good",
      label: "Bon à utiliser",
      color: "blue",
      icon: "✅",
      message: "Produit en bon état",
    };
  }

  return {
    status: "fresh",
    label: "Très frais",
    color: "green",
    icon: "✨",
    message: "Produit récemment fabriqué",
  };
}

/**
 * Formate une date en français long : « 12 janvier 2026 ».
 * SSR-safe : Intl.DateTimeFormat avec le fuseau du serveur/client.
 */
export function formatDateFr(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}
