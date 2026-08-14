import type { LotWithDetails } from "@/lib/public-data";
import {
  parseJsonArray,
  parseJsonObject,
  getAllergens,
} from "@/lib/utils";

/**
 * CompactIngredients — ingredients + allergens + nutrition content for the
 * accordion. No outer section/card wrapper (the AccordionSection provides it).
 *
 * Server component.
 */

type Props = {
  lot: LotWithDetails;
};

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
  return (
    NUTRITION_LABELS[key] ??
    key.charAt(0).toUpperCase() + key.slice(1)
  );
}

function emojiFor(key: string): string {
  return NUTRITION_EMOJI[key] ?? "📊";
}

export function CompactIngredients({ lot }: Props) {
  const allergens = getAllergens(lot.allergens);
  const nutrition = parseJsonObject<Record<string, string>>(
    lot.nutritionalInfo,
  );
  const warnings = parseJsonArray<string>(lot.warnings);
  const hasNutrition = nutrition && Object.keys(nutrition).length > 0;

  return (
    <div className="space-y-4">
      {/* Ingredients */}
      <div>
        <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
          🌾 Ingrédients
          {lot.weight && (
            <span className="ml-2 inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 ring-1 ring-gray-200">
              {lot.weight}
            </span>
          )}
        </h4>
        <p className="text-sm leading-relaxed text-gray-700">
          {lot.ingredients ?? "Ingrédients non renseignés pour ce lot."}
        </p>
      </div>

      {/* Allergens */}
      <div>
        <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
          ⚠️ Allergènes
        </h4>
        {allergens.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-2.5 text-xs text-green-900">
            <span aria-hidden>✅</span>
            <span>Aucun allergène connu pour ce produit.</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {allergens.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800"
              >
                <span aria-hidden>⚠️</span>
                {a}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Nutrition */}
      {hasNutrition && (
        <div>
          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
            📊 Informations nutritionnelles
          </h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(nutrition).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2"
              >
                <span
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-white text-xs shadow-sm"
                  aria-hidden
                >
                  {emojiFor(k)}
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                    {labelFor(k)}
                  </p>
                  <p className="truncate text-xs font-bold text-gray-900">
                    {v}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
            ⚠️ Précautions d&apos;usage
          </h4>
          <ul className="space-y-1.5">
            {warnings.map((w, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-2.5 text-xs text-yellow-900"
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
    </div>
  );
}
