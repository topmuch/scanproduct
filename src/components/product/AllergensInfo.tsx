import {
  parseJsonArray,
  parseJsonObject,
  getAllergens,
} from "@/lib/utils";
import type { LotWithDetails } from "@/lib/public-data";

type Props = {
  lot: LotWithDetails;
};

// Friendly labels for common nutrition keys (FR)
const NUTRITION_LABELS: Record<string, string> = {
  calories: "Calories",
  energy: "Énergie",
  proteins: "Protéines",
  proteines: "Protéines",
  carbs: "Glucides",
  glucides: "Glucides",
  fats: "Lipides",
  lipides: "Lipides",
  saturatedFats: "Graisses saturées",
  saturated: "Graisses saturées",
  fiber: "Fibres",
  fibres: "Fibres",
  sugar: "Sucres",
  sucres: "Sucres",
  salt: "Sel",
  sodium: "Sodium",
  omega3: "Oméga-3",
  omega6: "Oméga-6",
  omega9: "Oméga-9",
  vitaminE: "Vitamine E",
  vitamineE: "Vitamine E",
  vitaminC: "Vitamine C",
  calcium: "Calcium",
  iron: "Fer",
  fer: "Fer",
};

const NUTRITION_EMOJI: Record<string, string> = {
  calories: "🔥",
  energy: "🔥",
  proteins: "💪",
  proteines: "💪",
  carbs: "🍞",
  glucides: "🍞",
  fats: "🥑",
  lipides: "🥑",
  saturatedFats: "🧈",
  fiber: "🌾",
  fibres: "🌾",
  sugar: "🍬",
  sucres: "🍬",
  salt: "🧂",
  sodium: "🧂",
  omega3: "🐟",
  omega6: "🐟",
  omega9: "🐟",
  vitaminE: "💊",
  vitamineE: "💊",
  vitaminC: "🍊",
  calcium: "🦴",
  iron: "⚙️",
  fer: "⚙️",
};

function labelFor(key: string): string {
  return NUTRITION_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

function emojiFor(key: string): string {
  return NUTRITION_EMOJI[key] ?? "📊";
}

/**
 * AllergensInfo — card showing allergens, nutritional info, and warnings.
 * Server component.
 */
export function AllergensInfo({ lot }: Props) {
  const allergens = getAllergens(lot.allergens);
  const nutrition = parseJsonObject<Record<string, string>>(lot.nutritionalInfo);
  const warnings = parseJsonArray<string>(lot.warnings);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
        ⚠️ Allergènes & infos sanitaires
      </h2>

      {/* Allergens */}
      <div className="mt-4">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
          Allergènes
        </h3>
        {allergens.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
            <span aria-hidden>✅</span>
            <span>Aucun allergène connu pour ce produit.</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allergens.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-800"
              >
                <span aria-hidden>⚠️</span>
                {a}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Nutritional info */}
      {nutrition && Object.keys(nutrition).length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            Informations nutritionnelles
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(nutrition).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5"
              >
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white text-sm shadow-sm"
                  aria-hidden
                >
                  {emojiFor(k)}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    {labelFor(k)}
                  </p>
                  <p className="truncate text-sm font-bold text-gray-900">{v}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            Précautions d&apos;usage
          </h3>
          <ul className="space-y-2">
            {warnings.map((w, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900"
              >
                <span aria-hidden className="flex-shrink-0">
                  ⚠️
                </span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
