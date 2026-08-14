import type { LotWithDetails } from "@/lib/public-data";
import { parseJsonArray, formatDate } from "@/lib/utils";

/**
 * CompactTraceability — traceability info for the accordion (no outer card).
 *
 * Server component.
 */

type Props = {
  lot: LotWithDetails;
};

type InfoRow = {
  emoji: string;
  label: string;
  value: string;
  mono?: boolean;
};

export function CompactTraceability({ lot }: Props) {
  const salesCountries = parseJsonArray<string>(lot.salesCountries);

  const rows: InfoRow[] = [
    {
      emoji: "🏷️",
      label: "Numéro de lot",
      value: lot.lotNumber ?? lot.reference ?? "—",
      mono: true,
    },
    {
      emoji: "📅",
      label: "Date de fabrication",
      value: lot.manufactureDate
        ? formatDate(lot.manufactureDate)
        : "—",
    },
    {
      emoji: "⏰",
      label: "Date de péremption",
      value: lot.expiryDate ? formatDate(lot.expiryDate) : "—",
    },
    {
      emoji: "🏭",
      label: "Lieu de fabrication",
      value: lot.manufacturingLocation ?? "—",
    },
    {
      emoji: "🔄",
      label: "Lieu de transformation",
      value: lot.transformationLocation ?? "—",
    },
    {
      emoji: "🌍",
      label: "Pays de vente",
      value:
        salesCountries.length > 0 ? salesCountries.join(", ") : "—",
    },
  ];

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-start gap-3 rounded-lg bg-gray-50 p-2.5"
        >
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-sm shadow-sm"
            aria-hidden
          >
            {r.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              {r.label}
            </p>
            <p
              className={`mt-0.5 break-words text-sm font-semibold text-gray-900 ${
                r.mono ? "font-mono" : ""
              }`}
            >
              {r.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
