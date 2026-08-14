import type { LotWithDetails } from "@/lib/public-data";
import { formatDate, daysUntil } from "@/lib/utils";

/**
 * CompactHistory — simplified lot history timeline for the accordion.
 *
 * Shows the events in a compact vertical list (emoji + title + date + location).
 * No large colored cards — just a clean timeline.
 *
 * Server component.
 */

type HistoryEvent = LotWithDetails["historyEvents"][number];

type Props = {
  events: HistoryEvent[];
};

const EVENT_EMOJI: Record<string, string> = {
  fabrication: "🏭",
  controle: "🔬",
  marche: "📦",
  actif: "✅",
  rappelle: "⚠️",
  expire: "⏰",
};

function emojiFor(type: string): string {
  return EVENT_EMOJI[type] ?? "📍";
}

export function CompactHistory({ events }: Props) {
  if (!events || events.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Aucun événement enregistré pour ce lot.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div
        className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200"
        aria-hidden
      />

      <ol className="space-y-3">
        {events.map((ev, i) => {
          const isLast = i === events.length - 1;
          return (
            <li key={ev.id} className="relative pl-10">
              <span
                className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm shadow-sm ring-2 ring-gray-100"
                aria-hidden
              >
                {emojiFor(ev.type)}
              </span>
              <div className="rounded-lg bg-gray-50 p-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-bold text-gray-900">
                    {ev.title}
                  </p>
                  {isLast && (
                    <span className="inline-flex items-center rounded-full bg-gray-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      Actuel
                    </span>
                  )}
                </div>
                {ev.description && (
                  <p className="mt-0.5 text-xs text-gray-600">
                    {ev.description}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
                  {ev.location && (
                    <span>📍 {ev.location}</span>
                  )}
                  <span>📅 {formatDate(ev.date)}</span>
                  {ev.time && <span>🕐 {ev.time}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
