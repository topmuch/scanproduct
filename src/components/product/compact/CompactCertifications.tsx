import { CheckCircle2, AlertCircle } from "lucide-react";
import type { LotWithDetails } from "@/lib/public-data";
import { formatDate } from "@/lib/utils";

/**
 * CompactCertifications — certifications content for the accordion.
 * Shows lot + fabricant certifications in a compact list.
 *
 * Server component.
 */

type Props = {
  lotCerts: LotWithDetails["lotCerts"];
  fabricantCerts: LotWithDetails["fabricantCerts"];
};

export function CompactCertifications({ lotCerts, fabricantCerts }: Props) {
  const hasLotCerts = lotCerts && lotCerts.length > 0;
  const hasFabCerts = fabricantCerts && fabricantCerts.length > 0;

  if (!hasLotCerts && !hasFabCerts) {
    return (
      <p className="text-sm text-gray-500">
        Aucune certification enregistrée pour ce produit.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Lot certifications */}
      {hasLotCerts && (
        <div>
          <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
            Certifications du lot
          </h4>
          <div className="space-y-1.5">
            {lotCerts.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-2"
              >
                <span aria-hidden className="text-base">
                  📜
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900">{c.name}</p>
                  {c.issuer && (
                    <p className="text-[10px] text-gray-600">
                      {c.issuer}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fabricant certifications */}
      {hasFabCerts && (
        <div>
          <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
            Certifications du fabricant
          </h4>
          <div className="space-y-1.5">
            {fabricantCerts.map((c) => {
              const expired =
                c.expirationDate && new Date(c.expirationDate) < new Date();
              const isActive = c.isActive && !expired;
              return (
                <div
                  key={c.id}
                  className="flex items-start gap-2 rounded-lg border border-green-100 bg-green-50 p-2"
                >
                  <span aria-hidden className="text-base">
                    📜
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <p className="text-xs font-bold text-gray-900">
                        {c.name}
                      </p>
                      {isActive ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                    {c.issuer && (
                      <p className="text-[10px] text-gray-600">{c.issuer}</p>
                    )}
                    {c.expirationDate && (
                      <p className="text-[10px] text-gray-500">
                        Expire le {formatDate(c.expirationDate)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
