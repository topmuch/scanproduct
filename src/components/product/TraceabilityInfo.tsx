import { parseJsonArray, formatDate } from "@/lib/utils";
import type { LotWithDetails } from "@/lib/public-data";

type Props = {
  lot: LotWithDetails;
};

/**
 * TraceabilityInfo — card with traceability info (lot number, dates, locations,
 * sales countries) plus an ingredients section.
 * Server component.
 */
export function TraceabilityInfo({ lot }: Props) {
  const salesCountries = parseJsonArray<string>(lot.salesCountries);

  const cards = [
    {
      emoji: "🏷️",
      label: "Numéro de lot",
      value: lot.lotNumber ?? lot.reference,
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      span: "sm:col-span-2",
      mono: true,
    },
    {
      emoji: "📅",
      label: "Date de fabrication",
      value: lot.manufactureDate ? formatDate(lot.manufactureDate) : "—",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      emoji: "⏰",
      label: "Date de péremption",
      value: lot.expiryDate ? formatDate(lot.expiryDate) : "—",
      bg: "bg-orange-50",
      border: "border-orange-200",
    },
    {
      emoji: "🏭",
      label: "Lieu de fabrication",
      value: lot.manufacturingLocation ?? "—",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    {
      emoji: "🔄",
      label: "Lieu de transformation",
      value: lot.transformationLocation ?? "—",
      bg: "bg-green-50",
      border: "border-green-200",
    },
    {
      emoji: "🌍",
      label: "Pays de vente",
      value:
        salesCountries.length > 0 ? salesCountries.join(", ") : "—",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      span: "sm:col-span-2",
    },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
        📋 Informations de traçabilité
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`flex items-start gap-3 rounded-xl border ${c.border} ${c.bg} p-3 ${c.span ?? ""}`}
          >
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/80 text-base shadow-sm"
              aria-hidden
            >
              {c.emoji}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {c.label}
              </p>
              <p
                className={`mt-0.5 break-words text-sm font-semibold text-gray-900 ${
                  c.mono ? "font-mono" : ""
                }`}
              >
                {c.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Ingredients section */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden>
            🌾
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">
            Ingrédients
          </h3>
          {lot.weight && (
            <span className="ml-auto inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
              Poids net : {lot.weight}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          {lot.ingredients ?? "Ingrédients non renseignés pour ce lot."}
        </p>
      </div>
    </section>
  );
}
