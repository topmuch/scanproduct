import { formatDistanceToNow } from "@/lib/utils";

type Props = {
  scans: number;
  verified: boolean;
  registeredAt: Date | string | null;
  certifications: number;
};

/**
 * QuickStats — 4-card grid with pastel backgrounds showing key product metrics.
 * Server component.
 */
export function QuickStats({ scans, verified, registeredAt, certifications }: Props) {
  const cards = [
    {
      emoji: "🔍",
      value: scans.toLocaleString("fr-FR"),
      label: "Scans effectués",
      bg: "bg-blue-50",
      border: "border-blue-200",
      iconBg: "bg-blue-100",
      text: "text-blue-900",
    },
    {
      emoji: "✓",
      value: verified ? "Vérifié" : "Non vérifié",
      label: "Vérifié par VerifScan",
      bg: verified ? "bg-green-50" : "bg-gray-50",
      border: verified ? "border-green-200" : "border-gray-200",
      iconBg: verified ? "bg-green-100" : "bg-gray-200",
      text: verified ? "text-green-900" : "text-gray-700",
    },
    {
      emoji: "⏰",
      value: registeredAt ? formatDistanceToNow(registeredAt) : "—",
      label: "Fabricant inscrit",
      bg: "bg-purple-50",
      border: "border-purple-200",
      iconBg: "bg-purple-100",
      text: "text-purple-900",
    },
    {
      emoji: "🏆",
      value: String(certifications),
      label: "Certifications",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      iconBg: "bg-yellow-100",
      text: "text-yellow-900",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`flex flex-col gap-2 rounded-xl border-2 ${c.border} ${c.bg} p-4 transition-all hover:shadow-md`}
        >
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.iconBg} text-base font-bold`}
            aria-hidden
          >
            {c.emoji}
          </div>
          <div>
            <p className={`text-lg font-bold leading-tight ${c.text} sm:text-xl`}>
              {c.value}
            </p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
              {c.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
