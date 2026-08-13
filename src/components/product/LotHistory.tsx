import { formatDate, daysUntil } from "@/lib/utils";
import type { LotWithDetails } from "@/lib/public-data";

type HistoryEvent = LotWithDetails["historyEvents"][number];

type Props = {
  events: HistoryEvent[];
  daysUntilExpiration: number | null;
};

const EVENT_CONFIG: Record<
  string,
  { emoji: string; color: string; ring: string; bg: string; text: string }
> = {
  fabrication: {
    emoji: "🏭",
    color: "bg-green-500",
    ring: "ring-green-100",
    bg: "bg-green-50",
    text: "text-green-900",
  },
  controle: {
    emoji: "🔬",
    color: "bg-purple-500",
    ring: "ring-purple-100",
    bg: "bg-purple-50",
    text: "text-purple-900",
  },
  marche: {
    emoji: "📦",
    color: "bg-blue-500",
    ring: "ring-blue-100",
    bg: "bg-blue-50",
    text: "text-blue-900",
  },
  actif: {
    emoji: "✅",
    color: "bg-yellow-500",
    ring: "ring-yellow-100",
    bg: "bg-yellow-50",
    text: "text-yellow-900",
  },
  rappelle: {
    emoji: "⚠️",
    color: "bg-red-500",
    ring: "ring-red-100",
    bg: "bg-red-50",
    text: "text-red-900",
  },
  expire: {
    emoji: "⏰",
    color: "bg-gray-500",
    ring: "ring-gray-100",
    bg: "bg-gray-50",
    text: "text-gray-900",
  },
};

function getConfig(type: string) {
  return (
    EVENT_CONFIG[type] ?? {
      emoji: "📍",
      color: "bg-gray-500",
      ring: "ring-gray-100",
      bg: "bg-gray-50",
      text: "text-gray-900",
    }
  );
}

/**
 * LotHistory — vertical timeline of the lot's history events.
 * Server component.
 */
export function LotHistory({ events, daysUntilExpiration }: Props) {
  if (!events || events.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
          ⏱️ Historique du lot
        </h2>
        <p className="mt-4 text-sm text-gray-500">
          Aucun événement enregistré pour ce lot.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
        ⏱️ Historique du lot
      </h2>

      <div className="relative mt-5">
        {/* Vertical line */}
        <div
          className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gray-200 sm:left-[22px]"
          aria-hidden
        />

        <ol className="space-y-5">
          {events.map((ev, i) => {
            const cfg = getConfig(ev.type);
            const isLast = i === events.length - 1;
            return (
              <li key={ev.id} className="relative pl-12 sm:pl-16">
                <span
                  className={`absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full ${cfg.color} text-base text-white shadow-md ring-4 ${cfg.ring} sm:h-11 sm:w-11`}
                  aria-hidden
                >
                  {cfg.emoji}
                </span>
                <div
                  className={`rounded-xl border border-gray-200 ${cfg.bg} p-3 sm:p-4`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">
                      {ev.title}
                    </h3>
                    {isLast && (
                      <span className="inline-flex items-center rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Actuel
                      </span>
                    )}
                    {ev.type === "actif" && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-800">
                        En cours
                      </span>
                    )}
                  </div>

                  {ev.description && (
                    <p className="mt-1 text-xs text-gray-700 sm:text-sm">
                      {ev.description}
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                    {ev.location && (
                      <span className="inline-flex items-center gap-1">
                        📍 {ev.location}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      📅 {formatDate(ev.date)}
                    </span>
                    {ev.time && (
                      <span className="inline-flex items-center gap-1">
                        🕐 {ev.time}
                      </span>
                    )}
                  </div>

                  {ev.type === "actif" &&
                    daysUntilExpiration !== null &&
                    daysUntilExpiration > 0 && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-yellow-100 p-2.5 text-xs text-yellow-900">
                        <span aria-hidden>⏰</span>
                        <span>
                          Péremption dans{" "}
                          <strong>
                            {daysUntilExpiration} jour
                            {daysUntilExpiration > 1 ? "s" : ""}
                          </strong>
                        </span>
                      </div>
                    )}
                  {ev.type === "actif" &&
                    daysUntilExpiration !== null &&
                    daysUntilExpiration <= 0 && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-100 p-2.5 text-xs text-red-900">
                        <span aria-hidden>⚠️</span>
                        <span>
                          Ce lot a atteint ou dépassé sa date de péremption.
                        </span>
                      </div>
                    )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
