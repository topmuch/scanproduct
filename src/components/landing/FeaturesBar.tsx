import { Tag, Truck, BadgePercent, LayoutGrid, RefreshCw } from "lucide-react";

/**
 * FeaturesBar — Nest-style bottom features bar (5 icons).
 *
 * Adapted to VerifScan's value props:
 *   - Transparence totale — Score /100 affiché pour chaque produit
 *   - Scan gratuit — QR code généré pour chaque lot
 *   - Alertes de rappel — Notifications en temps réel
 *   - Large catalogue — Plus de 500 produits vérifiés
 *   - Sans engagement — Aucune carte requise pour scanner
 */
export function FeaturesBar() {
  const features = [
    {
      icon: Tag,
      title: "Transparence totale",
      subtitle: "Score /100 pour chaque produit",
    },
    {
      icon: Truck,
      title: "Scan gratuit",
      subtitle: "QR généré pour chaque lot",
    },
    {
      icon: BadgePercent,
      title: "Alertes de rappel",
      subtitle: "Notifications temps réel",
    },
    {
      icon: LayoutGrid,
      title: "Large catalogue",
      subtitle: "500+ produits vérifiés",
    },
    {
      icon: RefreshCw,
      title: "Sans engagement",
      subtitle: "Aucune carte requise",
    },
  ];

  return (
    <section className="border-y border-[#ECECEC] bg-white py-8" aria-label="Avantages VerifScan">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {features.map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#F2FCEC] text-[#3BB77E]">
                <f.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-[13px] font-bold text-[#1A1A1A]">{f.title}</p>
                <p className="text-[11px] text-[#7A7A7A]">{f.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
