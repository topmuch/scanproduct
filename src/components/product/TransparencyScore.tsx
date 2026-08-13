import { Check, X, Lightbulb, TrendingUp } from "lucide-react";
import {
  LEVEL_CONFIG,
  getPercentileRank,
  type TransparencyResult,
} from "@/lib/utils";

type Props = {
  transparency: TransparencyResult;
};

/**
 * TransparencyScore — large card showing the VerifScan transparency score with
 * progress bar, level badge, detailed criteria breakdown, and improvement tips.
 * Server component.
 */
export function TransparencyScore({ transparency }: Props) {
  const { score, maxScore, level, percentage, details, improvements } = transparency;
  const config = LEVEL_CONFIG[level];
  const percentile = getPercentileRank(score);

  // gradient per level
  const gradientMap: Record<string, string> = {
    bronze: "from-amber-400 to-orange-500",
    argent: "from-gray-400 to-gray-500",
    or: "from-yellow-400 to-amber-500",
    platine: "from-purple-400 to-violet-500",
  };
  const gradient = gradientMap[level];

  return (
    <section
      className={`overflow-hidden rounded-2xl border-2 ${config.borderColor} ${config.bgColor}`}
    >
      {/* Header */}
      <div className="border-b border-black/5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm ring-1 ring-black/5"
              aria-hidden
            >
              {config.icon}
            </span>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Score de transparence VerifScan
              </h2>
              <p className={`text-lg font-bold ${config.textColor}`}>
                {config.label}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-gray-900">
                {score}
              </span>
              <span className="text-lg font-semibold text-gray-400">/{maxScore}</span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {percentage}% de transparence
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-4 w-full overflow-hidden rounded-full bg-white/70 ring-1 ring-black/5">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-gray-600">
              Top {percentile}% des fabricants
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 font-semibold text-gray-700 ring-1 ring-black/5">
              <TrendingUp className="h-3 w-3 text-green-600" />
              Niveau {level}
            </span>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 sm:p-6">
        {details.map((d) => {
          const ratio = d.max > 0 ? (d.score / d.max) * 100 : 0;
          return (
            <div
              key={d.criterion}
              className="rounded-xl border border-black/5 bg-white/80 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {d.criterion}
                </h3>
                <span className="text-xs font-bold text-gray-700">
                  {d.score}/{d.max}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700"
                  style={{ width: `${ratio}%` }}
                />
              </div>
              {d.subCriteria && d.subCriteria.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {d.subCriteria.map((s) => (
                    <li
                      key={s.label}
                      className="flex items-center gap-2 text-xs text-gray-600"
                    >
                      {s.achieved ? (
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                          <Check className="h-3 w-3" />
                        </span>
                      ) : (
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                          <X className="h-3 w-3" />
                        </span>
                      )}
                      <span className={s.achieved ? "text-gray-700" : "text-gray-400"}>
                        {s.label}
                      </span>
                      <span className="ml-auto font-semibold text-gray-500">
                        +{s.points}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Improvements */}
      {improvements.length > 0 && (
        <div className="mx-5 mb-5 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-4 sm:mx-6 sm:mb-6">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-600" />
            <h3 className="text-sm font-bold text-amber-900">
              Suggestions d&apos;amélioration
            </h3>
          </div>
          <ul className="mt-2 space-y-1.5">
            {improvements.slice(0, 5).map((imp, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-amber-800"
              >
                <span className="mt-1.5 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-amber-500" />
                <span>{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bottom badge */}
      <div className="border-t border-black/5 bg-white/50 px-5 py-3 sm:px-6">
        <p className="text-center text-xs font-medium text-gray-600">
          Ce fabricant fait partie du{" "}
          <span className="font-bold text-gray-900">top {percentile}%</span> en
          matière de transparence
        </p>
      </div>
    </section>
  );
}
