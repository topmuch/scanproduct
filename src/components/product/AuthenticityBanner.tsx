import { CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Props = {
  status: string;
  manufacturerName: string | null;
  verifiedAt: Date | null;
};

/**
 * AuthenticityBanner — top banner showing the product's authenticity status.
 * Green for ACTIVE, red for RECALLED, orange for EXPIRED.
 * Server component.
 */
export function AuthenticityBanner({ status, manufacturerName, verifiedAt }: Props) {
  if (status === "RECALLED") {
    return (
      <div className="relative overflow-hidden rounded-2xl border-2 border-red-300 bg-gradient-to-r from-red-500 to-red-600 p-5 text-white shadow-lg sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              PRODUIT RAPPELÉ
            </h2>
            <p className="mt-1 text-sm text-white/90 sm:text-base">
              Ce lot a été rappelé par {manufacturerName ?? "le fabricant"}. Il est
              déconseillé de l&apos;utiliser ou de le consommer. Contactez le fabricant
              pour plus d&apos;informations.
            </p>
          </div>
          {verifiedAt && (
            <div className="rounded-lg bg-white/15 px-3 py-2 text-xs font-medium sm:text-sm">
              Vérifié le {formatDate(verifiedAt)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === "EXPIRED") {
    return (
      <div className="relative overflow-hidden rounded-2xl border-2 border-orange-300 bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-white shadow-lg sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              PRODUIT EXPIRÉ
            </h2>
            <p className="mt-1 text-sm text-white/90 sm:text-base">
              La date de péremption de ce lot a été dépassée. Il est déconseillé de
              l&apos;utiliser ou de le consommer.
            </p>
          </div>
          {verifiedAt && (
            <div className="rounded-lg bg-white/15 px-3 py-2 text-xs font-medium sm:text-sm">
              Vérifié le {formatDate(verifiedAt)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ACTIVE — default green banner
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-green-300 bg-gradient-to-r from-green-500 to-emerald-600 p-5 text-white shadow-lg sm:p-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/30">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            PRODUIT AUTHENTIQUE ET VÉRIFIÉ
          </h2>
          <p className="mt-1 text-sm text-white/90 sm:text-base">
            Ce passeport numérique a été vérifié par VerifScan et authentifié par{" "}
            {manufacturerName ?? "le fabricant"}. Traçabilité garantie.
          </p>
        </div>
        {verifiedAt && (
          <div className="rounded-lg bg-white/15 px-3 py-2 text-xs font-medium sm:text-sm">
            Vérifié le {formatDate(verifiedAt)}
          </div>
        )}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 right-16 h-24 w-24 rounded-full bg-white/10"
      />
    </div>
  );
}
