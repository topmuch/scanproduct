// ============================================================================
// CertificationsSection — affichage public des certifications produit
// ============================================================================
// Affiche les certifications stockées sur Product.certifications (JSON-encoded
// ProductCertification[]) avec une mise en valeur : emoji, nom, organisme
// émetteur, description du catalogue, date d'expiration + lien vers le
// document justificatif.
//
// Composant serveur (pas de "use client") — peut être rendu dans la page
// /p/[lotId] qui est server-rendered avec revalidation.
// ============================================================================

import {
  Award,
  Calendar,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  lookupCertification,
  formatCertificationExpiry,
  isCertificationExpired,
  type ProductCertification,
  type CertificationCategory,
} from "@/lib/certifications";

// ── Mapping statique des couleurs (cf. CertificationSelector) ─────────────
const ACCENT: Record<
  string,
  { bg: string; bgSoft: string; text: string; textStrong: string; border: string; gradient: string }
> = {
  emerald: {
    bg: "bg-emerald-50",
    bgSoft: "bg-emerald-100",
    text: "text-emerald-700",
    textStrong: "text-emerald-900",
    border: "border-emerald-200",
    gradient: "from-emerald-50 to-green-50",
  },
  amber: {
    bg: "bg-amber-50",
    bgSoft: "bg-amber-100",
    text: "text-amber-700",
    textStrong: "text-amber-900",
    border: "border-amber-200",
    gradient: "from-amber-50 to-yellow-50",
  },
  blue: {
    bg: "bg-blue-50",
    bgSoft: "bg-blue-100",
    text: "text-blue-700",
    textStrong: "text-blue-900",
    border: "border-blue-200",
    gradient: "from-blue-50 to-sky-50",
  },
  green: {
    bg: "bg-green-50",
    bgSoft: "bg-green-100",
    text: "text-green-700",
    textStrong: "text-green-900",
    border: "border-green-200",
    gradient: "from-green-50 to-emerald-50",
  },
  cyan: {
    bg: "bg-cyan-50",
    bgSoft: "bg-cyan-100",
    text: "text-cyan-700",
    textStrong: "text-cyan-900",
    border: "border-cyan-200",
    gradient: "from-cyan-50 to-sky-50",
  },
  rose: {
    bg: "bg-rose-50",
    bgSoft: "bg-rose-100",
    text: "text-rose-700",
    textStrong: "text-rose-900",
    border: "border-rose-200",
    gradient: "from-rose-50 to-pink-50",
  },
  violet: {
    bg: "bg-violet-50",
    bgSoft: "bg-violet-100",
    text: "text-violet-700",
    textStrong: "text-violet-900",
    border: "border-violet-200",
    gradient: "from-violet-50 to-purple-50",
  },
  orange: {
    bg: "bg-orange-50",
    bgSoft: "bg-orange-100",
    text: "text-orange-700",
    textStrong: "text-orange-900",
    border: "border-orange-200",
    gradient: "from-orange-50 to-amber-50",
  },
  slate: {
    bg: "bg-slate-50",
    bgSoft: "bg-slate-100",
    text: "text-slate-700",
    textStrong: "text-slate-900",
    border: "border-slate-200",
    gradient: "from-slate-50 to-gray-50",
  },
};

function accentOf(accent: string | undefined) {
  return ACCENT[accent ?? "slate"] ?? ACCENT.slate;
}

export interface CertificationsSectionProps {
  /** Lignes de certifications produit (depuis Product.certifications JSON) */
  certifications: ProductCertification[];
  /** Classe wrapper optionnelle */
  className?: string;
  /** Afficher le titre de section (défaut: true) */
  showTitle?: boolean;
  /** Variante compacte pour les accordéons (défaut: false) */
  compact?: boolean;
}

export function CertificationsSection({
  certifications,
  className = "",
  showTitle = true,
  compact = false,
}: CertificationsSectionProps) {
  // Aucune certification → état vide discret
  if (!certifications || certifications.length === 0) {
    if (compact) {
      return (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center">
          <Award className="h-5 w-5 shrink-0 text-[#9CA3AF]" />
          <p className="text-sm text-[#6B7280]">
            Aucune certification enregistrée pour ce produit.
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-10 text-center">
        <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
          <Award className="h-6 w-6 text-[#9CA3AF]" />
        </div>
        <p className="text-sm font-medium text-[#6B7280]">
          Aucune certification enregistrée pour ce produit
        </p>
        <p className="mt-1 text-xs text-[#9CA3AF]">
          Le fabricant n&apos;a pas encore déclaré de certification.
        </p>
      </div>
    );
  }

  // Groupe les certifications par catégorie pour un affichage organisé
  const byCategory = new Map<CertificationCategory, ProductCertification[]>();
  const uncategorized: ProductCertification[] = [];
  for (const cert of certifications) {
    const def = lookupCertification(cert);
    if (def) {
      const arr = byCategory.get(def.category) ?? [];
      arr.push(cert);
      byCategory.set(def.category, arr);
    } else {
      uncategorized.push(cert);
    }
  }

  return (
    <div className={className}>
      {showTitle && (
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#10B981]" />
          <h3 className="text-base font-bold text-[#111827]">
            Certifications du produit
          </h3>
          <span className="ml-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-xs font-semibold text-[#047857]">
            {certifications.length}
          </span>
        </div>
      )}

      <div className={compact ? "space-y-3" : "space-y-5"}>
        {CATEGORY_ORDER.filter((cat) => byCategory.has(cat)).map((cat) => {
          const meta = CATEGORY_LABELS[cat];
          const certs = byCategory.get(cat)!;
          return (
            <div key={cat}>
              {!compact && (
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm">{meta.emoji}</span>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-[#374151]">
                    {meta.label}
                  </h4>
                </div>
              )}
              <div
                className={
                  compact
                    ? "space-y-2"
                    : "grid grid-cols-1 gap-3 sm:grid-cols-2"
                }
              >
                {certs.map((cert, idx) => {
                  const def = lookupCertification(cert);
                  const ac = accentOf(def?.accent);
                  const expired = isCertificationExpired(cert.validUntil);
                  const expiryLabel = formatCertificationExpiry(
                    cert.validUntil,
                  );
                  return (
                    <div
                      key={`${cert.id ?? cert.name}-${idx}`}
                      className={`rounded-xl border-2 ${ac.border} bg-gradient-to-br ${ac.gradient} p-4 transition-shadow hover:shadow-md`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${ac.bgSoft} text-2xl`}
                        >
                          {def?.emoji ?? "🏅"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#111827]">
                              {cert.name}
                            </span>
                            {expired ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                                <AlertCircle className="h-3 w-3" />
                                Expirée
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full ${ac.bgSoft} px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ac.text}`}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Validée
                              </span>
                            )}
                          </div>
                          {def?.description && (
                            <p className="mt-1 text-xs leading-relaxed text-[#4B5563]">
                              {def.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6B7280]">
                            {cert.issuer ?? def?.issuingBody ? (
                              <span className="inline-flex items-center gap-1">
                                <Award className="h-3 w-3" />
                                {cert.issuer ?? def?.issuingBody}
                              </span>
                            ) : null}
                            {expiryLabel && (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Valable jusqu&apos;au {expiryLabel}
                              </span>
                            )}
                            {cert.fileUrl && (
                              <a
                                href={cert.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 font-medium ${ac.text} underline-offset-2 hover:underline`}
                              >
                                <FileText className="h-3 w-3" />
                                Voir le document
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Certifications personnalisées (hors catalogue) */}
        {uncategorized.length > 0 && (
          <div>
            {!compact && (
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm">🏅</span>
                <h4 className="text-xs font-bold uppercase tracking-wide text-[#374151]">
                  Autres certifications
                </h4>
              </div>
            )}
            <div
              className={
                compact ? "space-y-2" : "grid grid-cols-1 gap-3 sm:grid-cols-2"
              }
            >
              {uncategorized.map((cert, idx) => {
                const expired = isCertificationExpired(cert.validUntil);
                const expiryLabel = formatCertificationExpiry(
                  cert.validUntil,
                );
                return (
                  <div
                    key={`custom-${cert.name}-${idx}`}
                    className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl">
                        🏅
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#111827]">
                            {cert.name}
                          </span>
                          {expired ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                              <AlertCircle className="h-3 w-3" />
                              Expirée
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Validée
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6B7280]">
                          {cert.issuer && (
                            <span className="inline-flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              {cert.issuer}
                            </span>
                          )}
                          {expiryLabel && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Valable jusqu&apos;au {expiryLabel}
                            </span>
                          )}
                          {cert.fileUrl && (
                            <a
                              href={cert.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-slate-700 underline-offset-2 hover:underline"
                            >
                              <FileText className="h-3 w-3" />
                              Voir le document
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
