import { formatDateShort, daysUntil, cn } from "@/lib/utils";

/**
 * FreshnessGlow — spectacular freshness bar with glow + shimmer.
 *
 * Renders a glassmorphism card showing the freshness state of the lot
 * (days until expiry) with a gradient progress bar, animated indicator
 * dot and contextual color/message.
 *
 * Logic:
 *   > 90 days  → emerald  "Produit très frais"    ✨  glow-green
 *   > 30 days  → blue     "Bon à consommer"       ✅  glow-blue
 *   > 7 days   → amber    "À consommer bientôt"   ⏰  glow-orange
 *   > 0 days   → red      "Derniers jours !"      🚨  glow-red
 *   ≤ 0        → gray     "Produit expiré"        ❌  no glow
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

type FreshnessState = {
  gradient: string;
  glow: string;
  message: string;
  icon: string;
  barGradient: string;
  text: string;
};

function getFreshnessState(daysLeft: number): FreshnessState {
  if (daysLeft > 90) {
    return {
      gradient: "from-emerald-500 to-green-600",
      glow: "wow-shadow-glow-green",
      message: "Produit très frais",
      icon: "✨",
      barGradient: "from-emerald-400 via-emerald-500 to-green-500",
      text: "text-emerald-700",
    };
  }
  if (daysLeft > 30) {
    return {
      gradient: "from-blue-500 to-cyan-600",
      glow: "wow-shadow-glow-blue",
      message: "Bon à consommer",
      icon: "✅",
      barGradient: "from-blue-400 via-blue-500 to-cyan-500",
      text: "text-blue-700",
    };
  }
  if (daysLeft > 7) {
    return {
      gradient: "from-amber-500 to-orange-600",
      glow: "wow-shadow-glow-orange",
      message: "À consommer bientôt",
      icon: "⏰",
      barGradient: "from-amber-400 via-orange-500 to-orange-600",
      text: "text-amber-700",
    };
  }
  if (daysLeft > 0) {
    return {
      gradient: "from-red-500 to-rose-600",
      glow: "wow-shadow-glow-red",
      message: "Derniers jours !",
      icon: "🚨",
      barGradient: "from-red-400 via-red-500 to-rose-600",
      text: "text-red-700",
    };
  }
  return {
    gradient: "from-gray-400 to-gray-600",
    glow: "",
    message: "Produit expiré",
    icon: "❌",
    barGradient: "from-gray-300 via-gray-400 to-gray-500",
    text: "text-gray-700",
  };
}

export function FreshnessGlow({ expiryDate, manufactureDate }: Props) {
  const daysLeft = daysUntil(expiryDate) ?? 0;
  const totalDays = daysBetween(manufactureDate, expiryDate) ?? 0;
  const consumedDays = Math.max(totalDays - daysLeft, 0);
  const percentage =
    totalDays > 0
      ? Math.min((consumedDays / totalDays) * 100, 100)
      : daysLeft <= 0
        ? 100
        : 0;

  const state = getFreshnessState(daysLeft);
  const isExpired = daysLeft <= 0;

  return (
    <div className="wow-animate-scale-in relative overflow-hidden rounded-3xl wow-glass wow-shadow-card p-4 sm:p-5">
      {/* Subtle gradient background overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-5",
          state.gradient,
        )}
      />

      <div className="relative">
        {/* Top row: icon + message on left, DLC on right */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Animated icon box with ping ring */}
            <div className="relative flex-shrink-0">
              {!isExpired && (
                <span className="absolute inset-0 animate-ping rounded-2xl bg-current opacity-20" />
              )}
              <div
                className={cn(
                  "wow-animate-pulse-glow relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-lg sm:h-14 sm:w-14",
                  state.gradient,
                  state.glow,
                )}
              >
                <span aria-hidden>{state.icon}</span>
              </div>
            </div>

            <div>
              <div className={cn("text-lg font-bold", state.text)}>
                {isExpired ? "Expiré" : `Encore ${daysLeft} jours`}
              </div>
              <div className="text-sm text-gray-600">{state.message}</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              DLC
            </div>
            <div className="text-sm font-bold text-gray-900">
              {formatDateShort(expiryDate)}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative mt-4">
          <div className="relative h-4 overflow-hidden rounded-full bg-gray-200/70">
            {/* Shimmer background */}
            <div
              className="wow-animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              aria-hidden
            />

            {/* Gradient progress fill */}
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-1000",
                state.barGradient,
              )}
              style={{ width: `${percentage}%` }}
            >
              {/* White highlight overlay */}
              <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-white/30" />
            </div>

            {/* Animated indicator dot */}
            {!isExpired && percentage > 0 && percentage < 100 && (
              <div
                className="absolute top-1/2 h-6 w-6 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${percentage}%` }}
              >
                <span className="absolute inset-0 animate-ping rounded-full bg-white/60" />
                <div className="relative h-6 w-6 rounded-full border-4 border-white bg-white shadow-lg">
                  <div
                    className={cn(
                      "absolute inset-0 rounded-full bg-gradient-to-br opacity-80",
                      state.gradient,
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
          <span>
            {manufactureDate
              ? `Fabriqué le ${formatDateShort(manufactureDate)}`
              : ""}
          </span>
          <span className="font-medium">{Math.round(percentage)}% écoulé</span>
        </div>
      </div>
    </div>
  );
}
