// ============================================================================
// ProductDetailsSection — Conseils & Précautions sur la page produit publique
// ============================================================================
// Composant d'affichage commun :
//   - Page CLASSIQUE /p/[lotId] (données du Product, dates du Lot)
//   - Réutilisable pour la version artisan
//
// Contenu :
//   - Bandeau de fraîcheur coloré (optionnel — la page classique a déjà
//     FreshnessGlow, on le masque alors)
//   - Dates de fabrication / péremption
//   - Conseils d'utilisation (numérotés)
//   - Précautions d'emploi (encadré rouge)
//   - Conditions de conservation (encadré bleu)
// ============================================================================

import {
  getDaysUntilExpiration,
  getFreshnessStatus,
  formatDateFr,
} from "@/lib/expiration-calculator";

interface Props {
  usageTips?: string[];
  precautions?: string[];
  storageConditions?: string;
  manufacturingDate?: Date | string | null;
  expirationDate?: Date | string | null;
  /** Masquer le bandeau de fraîcheur (si la page a déjà son propre bandeau). */
  showFreshness?: boolean;
}

/** Parse un champ JSON-encoded (array de strings) — ne lève jamais. */
function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (v): v is string => typeof v === "string" && v.trim().length > 0,
        );
      }
    } catch {
      // Tolère aussi le format « une entrée par ligne » (usageTips artisan)
      const lines = value
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);
      if (lines.length > 0) return lines;
    }
  }
  return [];
}

const GRADIENTS: Record<string, string> = {
  green: "from-green-500 to-emerald-600",
  blue: "from-blue-500 to-cyan-600",
  orange: "from-orange-500 to-amber-600",
  red: "from-red-500 to-rose-600",
};

export function ProductDetailsSection({
  usageTips,
  precautions,
  storageConditions,
  manufacturingDate,
  expirationDate,
  showFreshness = true,
}: Props) {
  const tips = parseStringArray(usageTips);
  const precos = parseStringArray(precautions);

  const expDate = expirationDate ? new Date(expirationDate) : null;
  const mfgDate = manufacturingDate ? new Date(manufacturingDate) : null;
  const daysLeft = expDate ? getDaysUntilExpiration(expDate) : null;
  const freshness = daysLeft !== null ? getFreshnessStatus(daysLeft) : null;
  const isCritical = freshness?.status === "expired" || freshness?.status === "critical";

  // Rien à afficher → ne pas rendre de section vide.
  if (tips.length === 0 && precos.length === 0 && !storageConditions) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Bandeau de fraîcheur */}
      {showFreshness && freshness && daysLeft !== null && (
        <div
          className={`rounded-2xl bg-gradient-to-r ${
            GRADIENTS[freshness.color] ?? GRADIENTS.green
          } p-5 text-white shadow-lg`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">{freshness.message}</p>
              <p className="mt-1 text-3xl font-bold">
                {daysLeft > 0 ? `${daysLeft} jours restants` : "Expiré"}
              </p>
            </div>
            <span className="text-5xl">{freshness.icon}</span>
          </div>
        </div>
      )}

      {/* Dates */}
      {showFreshness && (mfgDate || expDate) && (
        <div className="grid grid-cols-2 gap-4">
          {mfgDate && (
            <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
              <p className="mb-1 text-xs font-medium text-green-700">🏭 Fabriqué le</p>
              <p className="text-sm font-bold text-green-900">{formatDateFr(mfgDate)}</p>
            </div>
          )}
          {expDate && (
            <div
              className={`rounded-2xl border p-4 ${
                isCritical ? "border-red-200 bg-red-50" : "border-amber-100 bg-amber-50"
              }`}
            >
              <p
                className={`mb-1 text-xs font-medium ${
                  isCritical ? "text-red-700" : "text-amber-700"
                }`}
              >
                ⏳ {freshness?.status === "expired" ? "Expiré le" : "À utiliser avant"}
              </p>
              <p className={`text-sm font-bold ${isCritical ? "text-red-900" : "text-amber-900"}`}>
                {formatDateFr(expDate)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Conseils d'utilisation */}
      {tips.length > 0 && (
        <div className="rounded-2xl border border-stone-100 bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="text-2xl">💡</span> Conseils d&apos;utilisation
          </h3>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Précautions */}
      {precos.length > 0 && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="text-2xl">⚠️</span> Précautions
          </h3>
          <ul className="space-y-2">
            {precos.map((prec, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="font-bold text-red-500">•</span>
                <span className="text-sm text-gray-700">{prec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conservation */}
      {storageConditions && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900">
            <span className="text-2xl">📍</span> Conservation
          </h3>
          <p className="text-sm leading-relaxed text-gray-700">{storageConditions}</p>
        </div>
      )}
    </div>
  );
}
