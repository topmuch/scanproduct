import { TrendingUp, Check, Lightbulb } from "lucide-react";
import {
  LEVEL_CONFIG,
  getPercentileRank,
  type TransparencyResult,
} from "@/lib/utils";

/**
 * TransparencyLite — compact transparency score for the accordion.
 *
 * Unlike the full TransparencyScore component (which shows a detailed
 * breakdown of every criterion with sub-criteria and progress bars), this
 * "lite" version shows just:
 *   - The big score + percentage
 *   - The level badge
 *   - A single progress bar
 *   - Top X% percentile
 *   - The first 3 improvement tips (if any)
 *
 * Server component.
 */

type Props = {
  transparency: TransparencyResult;
};

const GRADIENT_MAP: Record<string, string> = {
  bronze: "from-amber-400 to-orange-500",
  argent: "from-gray-400 to-gray-500",
  or: "from-yellow-400 to-amber-500",
  platine: "from-purple-400 to-violet-500",
};

export function TransparencyLite({ transparency }: Props) {
  const { score, maxScore, level, percentage, improvements } = transparency;
  const config = LEVEL_CONFIG[level];
  const percentile = getPercentileRank(score);
  const gradient = GRADIENT_MAP[level];

  return (
    <div className="space-y-3">
      {/* Score summary */}
      <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-3">
        <span
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm ring-1 ring-gray-100"
          aria-hidden
        >
          {config.icon}
        </span>
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-gray-900">
              {score}
            </span>
            <span className="text-sm font-semibold text-gray-400">
              /{maxScore}
            </span>
            <span className="ml-2 text-sm font-bold text-gray-700">
              ({percentage}%)
            </span>
          </div>
          <p className={`text-xs font-semibold ${config.textColor}`}>
            {config.label}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700">
          <TrendingUp className="h-3 w-3" />
          Top {percentile}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Improvements (max 3) */}
      {improvements && improvements.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-bold text-amber-900">
              Suggestions d&apos;amélioration
            </p>
          </div>
          <ul className="mt-1.5 space-y-1">
            {improvements.slice(0, 3).map((imp, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-[11px] text-amber-800"
              >
                <span className="mt-1 inline-block h-1 w-1 flex-shrink-0 rounded-full bg-amber-500" />
                <span>{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
