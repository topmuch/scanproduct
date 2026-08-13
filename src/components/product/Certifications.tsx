import { CheckCircle2, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { LotWithDetails } from "@/lib/public-data";

type Props = {
  lotCerts: LotWithDetails["lotCerts"];
  fabricantCerts: LotWithDetails["fabricantCerts"];
};

/**
 * Certifications — card listing both lot-level and manufacturer-level certifications.
 * Server component.
 */
export function Certifications({ lotCerts, fabricantCerts }: Props) {
  const hasLotCerts = lotCerts && lotCerts.length > 0;
  const hasFabCerts = fabricantCerts && fabricantCerts.length > 0;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
        🏆 Certifications & qualité
      </h2>

      <div className="mt-4 space-y-5">
        {/* Lot certifications */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            Certifications du lot
          </h3>
          {hasLotCerts ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {lotCerts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3"
                >
                  <span
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm"
                    aria-hidden
                  >
                    📜
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">{c.name}</p>
                    {c.issuer && (
                      <p className="text-xs text-gray-600">Délivré par {c.issuer}</p>
                    )}
                    <p className="mt-1 text-[11px] text-gray-500">
                      Ajoutée le {formatDate(c.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              Aucune certification spécifique à ce lot.
            </p>
          )}
        </div>

        {/* Fabricant certifications */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            Certifications du fabricant
          </h3>
          {hasFabCerts ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fabricantCerts.map((c) => {
                const expired =
                  c.expirationDate && new Date(c.expirationDate) < new Date();
                const isActive = c.isActive && !expired;
                return (
                  <div
                    key={c.id}
                    className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-3"
                  >
                    <span
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm"
                      aria-hidden
                    >
                      📜
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-900">{c.name}</p>
                        {isActive ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700">
                            <AlertCircle className="h-3 w-3" /> Expirée
                          </span>
                        )}
                      </div>
                      {c.issuer && (
                        <p className="text-xs text-gray-600">Délivré par {c.issuer}</p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                        {c.issueDate && (
                          <span>Émise : {formatDate(c.issueDate)}</span>
                        )}
                        {c.expirationDate && (
                          <span>Expire : {formatDate(c.expirationDate)}</span>
                        )}
                        {c.certificateNumber && (
                          <span className="font-mono">N° {c.certificateNumber}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              Aucune certification enregistrée pour ce fabricant.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
