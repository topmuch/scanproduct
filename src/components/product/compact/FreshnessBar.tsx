import { formatDateShort, daysUntil } from "@/lib/utils";

/**
 * FreshnessBar — visual freshness indicator.
 *
 * Shows how many days are left before expiry, with a colored progress bar
 * that fills as time passes. The color and message change dynamically:
 *   > 90 days  → emerald  "Produit très frais"
 *   > 30 days  → blue      "Bon à consommer"
 *   > 7 days   → amber     "À consommer bientôt"
 *   > 0 days   → red       "Derniers jours !"
 *   ≤ 0        → gray      "Produit expiré"
 *
 * Server component.
 */

type Props = {
  expiryDate: Date | string | null;
  manufactureDate: Date | string | null;
};

function daysBetween(
  start: Date | string | null,
  end: Date | string | null,
): number | null {
  if (!start || !end) return null;
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

export function FreshnessBar({ expiryDate, manufactureDate }: Props) {
  const daysLeft = daysUntil(expiryDate) ?? 0;
  const totalDays = daysBetween(manufactureDate, expiryDate) ?? 0;
  const consumedDays = Math.max(totalDays - daysLeft, 0);
  const percentage =
    totalDays > 0
      ? Math.min((consumedDays / totalDays) * 100, 100)
      : daysLeft <= 0
        ? 100
        : 0;

  let color: string;
  let gradient: string;
  let message: string;
  let icon: string;

  if (daysLeft > 90) {
    color = "text-emerald-700";
    gradient = "from-emerald-400 to-green-500";
    message = "Produit très frais";
    icon = "🟢";
  } else if (daysLeft > 30) {
    color = "text-blue-700";
    gradient = "from-blue-400 to-blue-600";
    message = "Bon à consommer";
    icon = "✅";
  } else if (daysLeft > 7) {
    color = "text-amber-700";
    gradient = "from-amber-400 to-orange-500";
    message = "À consommer bientôt";
    icon = "⏰";
  } else if (daysLeft > 0) {
    color = "text-red-700";
    gradient = "from-orange-500 to-red-500";
    message = "Derniers jours !";
    icon = "⚠️";
  } else {
    color = "text-gray-700";
    gradient = "from-gray-400 to-gray-600";
    message = "Produit expiré";
    icon = "❌";
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            {icon}
          </span>
          <div>
            <div className={`text-sm font-bold ${color}`}>
              {daysLeft > 0 ? `Encore ${daysLeft} jours` : "Expiré"}
            </div>
            <div className="text-xs text-gray-500">{message}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500">DLC</div>
          <div className="text-sm font-bold text-gray-900">
            {formatDateShort(expiryDate)}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${gradient} transition-all duration-1000`}
          style={{ width: `${percentage}%` }}
        />
        {/* Position indicator */}
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-gray-300 bg-white shadow-md"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-gray-400">
        <span>
          {manufactureDate
            ? `Fabriqué le ${formatDateShort(manufactureDate)}`
            : ""}
        </span>
        <span>{Math.round(percentage)}% écoulé</span>
      </div>
    </div>
  );
}
