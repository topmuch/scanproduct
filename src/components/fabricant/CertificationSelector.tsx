"use client";

// ============================================================================
// CertificationSelector — sélecteur de certifications produits
// ============================================================================
// Remplace l'ancien éditeur inline à 4 inputs par ligne dans DynamicProductForm.
//
// Fonctionnement :
//   1. Le fabricant clique sur "+ Ajouter une certification"
//   2. Un modal s'ouvre avec les 28 certifications du catalogue, groupées par
//      catégorie (Bio / Équitable / Sécurité / Qualité / Religieuses / Locales)
//   3. Au clic sur une certification du catalogue, une ligne est ajoutée avec
//      id + name + issuer pré-remplis — il ne reste qu'à saisir la date
//      d'expiration et optionnellement l'URL du document justificatif
//   4. Un bouton "+ Autre (personnalisée)" permet d'ajouter une certification
//      hors catalogue (id undefined, name libre)
//   5. Les lignes sélectionnées s'affichent sous le sélecteur avec leur emoji
//      et un bouton de suppression
//
// Le composant est contrôlé : `value` est un ProductCertification[] et
// `onChange` reçoit le tableau mis à jour à chaque modification.
// ============================================================================

import { useMemo, useState } from "react";
import {
  Search,
  X,
  Plus,
  Award,
  Calendar,
  Link2,
  Check,
  ShieldCheck,
} from "lucide-react";
import {
  CERTIFICATIONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  getCertificationsGrouped,
  lookupCertification,
  formatCertificationExpiry,
  isCertificationExpired,
  type CertificationDef,
  type ProductCertification,
} from "@/lib/certifications";

// ── Mapping statique des couleurs d'accent vers les classes Tailwind ────
// Tailwind v4 ne peut pas détecter les classes générées dynamiquement
// (ex: `bg-${accent}-50`), donc on liste explicitement toutes les variantes
// utilisées. Les noms doivent correspondre aux valeurs `accent` définies
// dans le catalogue `lib/certifications.ts`.
const ACCENT_CLASSES: Record<
  string,
  { bg: string; bgSoft: string; text: string; textStrong: string; border: string }
> = {
  emerald: {
    bg: "bg-emerald-50",
    bgSoft: "bg-emerald-100",
    text: "text-emerald-700",
    textStrong: "text-emerald-800",
    border: "border-emerald-200",
  },
  amber: {
    bg: "bg-amber-50",
    bgSoft: "bg-amber-100",
    text: "text-amber-700",
    textStrong: "text-amber-800",
    border: "border-amber-200",
  },
  blue: {
    bg: "bg-blue-50",
    bgSoft: "bg-blue-100",
    text: "text-blue-700",
    textStrong: "text-blue-800",
    border: "border-blue-200",
  },
  green: {
    bg: "bg-green-50",
    bgSoft: "bg-green-100",
    text: "text-green-700",
    textStrong: "text-green-800",
    border: "border-green-200",
  },
  cyan: {
    bg: "bg-cyan-50",
    bgSoft: "bg-cyan-100",
    text: "text-cyan-700",
    textStrong: "text-cyan-800",
    border: "border-cyan-200",
  },
  rose: {
    bg: "bg-rose-50",
    bgSoft: "bg-rose-100",
    text: "text-rose-700",
    textStrong: "text-rose-800",
    border: "border-rose-200",
  },
  violet: {
    bg: "bg-violet-50",
    bgSoft: "bg-violet-100",
    text: "text-violet-700",
    textStrong: "text-violet-800",
    border: "border-violet-200",
  },
  orange: {
    bg: "bg-orange-50",
    bgSoft: "bg-orange-100",
    text: "text-orange-700",
    textStrong: "text-orange-800",
    border: "border-orange-200",
  },
  slate: {
    bg: "bg-slate-50",
    bgSoft: "bg-slate-100",
    text: "text-slate-700",
    textStrong: "text-slate-800",
    border: "border-slate-200",
  },
};

function accentClasses(accent: string | undefined) {
  return ACCENT_CLASSES[accent ?? "slate"] ?? ACCENT_CLASSES.slate;
}

export interface CertificationSelectorProps {
  value: ProductCertification[];
  onChange: (next: ProductCertification[]) => void;
  /** Slug de catégorie de produit (pour filtrer) — optionnel */
  productCategory?: string;
  /** Nombre max de certifications (défaut: 20) */
  max?: number;
  /** Désactive le composant (pendant la soumission) */
  disabled?: boolean;
  /** Label affiché au-dessus du sélecteur */
  label?: string;
}

export function CertificationSelector({
  value,
  onChange,
  productCategory,
  max = 20,
  disabled = false,
  label = "Certifications",
}: CertificationSelectorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [customOpen, setCustomOpen] = useState(false);

  const grouped = useMemo(() => getCertificationsGrouped(), []);

  // ── Filtre recherche (sur name, description, issuingBody) ──────────────
  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase().trim();
    const filtered: Record<string, CertificationDef[]> = {};
    for (const cat of CATEGORY_ORDER) {
      const matches = grouped[cat].filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.issuingBody.toLowerCase().includes(q),
      );
      if (matches.length > 0) filtered[cat] = matches;
    }
    return filtered;
  }, [grouped, search]);

  // Indique si une certification du catalogue est déjà sélectionnée
  const selectedIds = new Set(
    value.map((v) => v.id).filter((id): id is string => !!id),
  );

  // ── Ajout d'une certification du catalogue ─────────────────────────────
  function addFromCatalog(def: CertificationDef) {
    if (selectedIds.has(def.id)) return; // déjà sélectionnée
    if (value.length >= max) return;
    onChange([
      ...value,
      {
        id: def.id,
        name: def.name,
        issuer: def.issuingBody,
      },
    ]);
    setModalOpen(false);
    setSearch("");
  }

  // ── Ajout d'une certification personnalisée ────────────────────────────
  function addCustom() {
    const name = customName.trim();
    if (!name || value.length >= max) return;
    onChange([
      ...value,
      {
        id: undefined,
        name,
      },
    ]);
    setCustomName("");
    setCustomOpen(false);
    setModalOpen(false);
  }

  // ── Mise à jour d'un champ d'une ligne existante ───────────────────────
  function updateRow(idx: number, patch: Partial<ProductCertification>) {
    onChange(
      value.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  }

  // ── Suppression d'une ligne ────────────────────────────────────────────
  function removeRow(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
          <Award className="h-4 w-4 text-[#10B981]" />
          {label}
        </label>
        {value.length > 0 && (
          <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-xs font-semibold text-[#047857]">
            {value.length} {value.length > 1 ? "certifications" : "certification"}
          </span>
        )}
      </div>

      {/* Lignes sélectionnées */}
      {value.length > 0 ? (
        <div className="space-y-3">
          {value.map((row, idx) => {
            const def = lookupCertification(row);
            const expired = isCertificationExpired(row.validUntil);
            const ac = accentClasses(def?.accent);
            return (
              <div
                key={`${row.id ?? row.name}-${idx}`}
                className="rounded-xl border border-[#E5E7EB] bg-white p-3 transition-colors hover:border-[#10B981]/40"
              >
                {/* Ligne 1 : emoji + nom + issuer + bouton suppression */}
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ac.bg} text-xl`}
                  >
                    {def?.emoji ?? "🏅"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-[#111827]">
                        {row.name}
                      </span>
                      {def && (
                        <span
                          className={`shrink-0 rounded-full ${ac.bgSoft} px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ac.text}`}
                        >
                          {CATEGORY_LABELS[def.category].label}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-[#6B7280]">
                      {row.issuer ?? def?.issuingBody ?? "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    disabled={disabled}
                    aria-label={`Supprimer ${row.name}`}
                    className="shrink-0 rounded-lg p-1.5 text-[#9CA3AF] transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626] disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Ligne 2 : date d'expiration + URL du document */}
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                      <Calendar className="mr-1 inline h-3 w-3" />
                      Valable jusqu&apos;au
                    </label>
                    <input
                      type="date"
                      value={row.validUntil ?? ""}
                      onChange={(e) =>
                        updateRow(idx, { validUntil: e.target.value })
                      }
                      disabled={disabled}
                      className={`w-full rounded-lg border bg-white px-2.5 py-1.5 text-sm text-[#111827] outline-none transition-colors focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] disabled:opacity-50 ${
                        expired
                          ? "border-[#FCA5A5] bg-[#FEF2F2]"
                          : "border-[#E5E7EB]"
                      }`}
                    />
                    {expired && (
                      <p className="mt-1 text-[11px] font-medium text-[#DC2626]">
                        ⚠ Expirée
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                      <Link2 className="mr-1 inline h-3 w-3" />
                      URL document (PDF)
                    </label>
                    <input
                      type="url"
                      placeholder="https://…"
                      value={row.fileUrl ?? ""}
                      onChange={(e) =>
                        updateRow(idx, { fileUrl: e.target.value })
                      }
                      disabled={disabled}
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center">
          <div className="mb-1 text-3xl">🏆</div>
          <p className="text-sm text-[#6B7280]">
            Aucune certification sélectionnée
          </p>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            Ajoutez vos certifications (Bio, Halal, HACCP, ISO 22000…)
          </p>
        </div>
      )}

      {/* Bouton "Ajouter" */}
      {value.length < max && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#10B981]/30 bg-[#ECFDF5] px-4 py-2.5 text-sm font-semibold text-[#047857] transition-colors hover:border-[#10B981] hover:bg-[#D1FAE5] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Ajouter une certification
        </button>
      )}

      {/* ── Modal de sélection ─────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-[#111827]">
                  <ShieldCheck className="h-5 w-5 text-[#10B981]" />
                  Sélectionner une certification
                </h3>
                <p className="mt-0.5 text-xs text-[#6B7280]">
                  {Object.keys(CERTIFICATIONS).length} certifications
                  reconnues au catalogue
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Fermer"
                className="rounded-lg p-2 text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Barre de recherche */}
            <div className="border-b border-[#E5E7EB] px-5 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher (Bio, Halal, ISO, Ecocert…)"
                  className="w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] py-2 pl-9 pr-3 text-sm text-[#111827] outline-none transition-colors focus:border-[#10B981] focus:bg-white focus:ring-1 focus:ring-[#10B981]"
                />
              </div>
            </div>

            {/* Liste des certifications groupées par catégorie */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {Object.keys(filteredGrouped).length === 0 ? (
                <div className="py-10 text-center text-sm text-[#6B7280]">
                  Aucune certification ne correspond à « {search} »
                </div>
              ) : (
                <div className="space-y-5">
                  {CATEGORY_ORDER.filter((cat) => filteredGrouped[cat]).map(
                    (cat) => {
                      const meta = CATEGORY_LABELS[cat];
                      return (
                        <div key={cat}>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-base">{meta.emoji}</span>
                            <h4 className="text-xs font-bold uppercase tracking-wide text-[#111827]">
                              {meta.label}
                            </h4>
                            <span className="text-[11px] text-[#9CA3AF]">
                              · {meta.description}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {filteredGrouped[cat].map((cert) => {
                              const isSelected = selectedIds.has(cert.id);
                              return (
                                <button
                                  key={cert.id}
                                  type="button"
                                  onClick={() => addFromCatalog(cert)}
                                  disabled={isSelected}
                                  className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                                    isSelected
                                      ? "border-[#10B981] bg-[#ECFDF5]"
                                      : "border-[#E5E7EB] hover:border-[#10B981]/40 hover:bg-[#F0FDF4]"
                                  }`}
                                >
                                  <span className="text-2xl">{cert.emoji}</span>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-[#111827]">
                                      {cert.name}
                                    </div>
                                    <div className="truncate text-[11px] text-[#6B7280]">
                                      {cert.issuingBody}
                                    </div>
                                  </div>
                                  {isSelected ? (
                                    <Check className="h-4 w-4 shrink-0 text-[#10B981]" />
                                  ) : (
                                    <Plus className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    },
                  )}

                  {/* Lien "Autre certification" */}
                  {!customOpen ? (
                    <button
                      type="button"
                      onClick={() => setCustomOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#9CA3AF] py-2.5 text-sm font-medium text-[#6B7280] transition-colors hover:border-[#111827] hover:text-[#111827]"
                    >
                      <Plus className="h-4 w-4" />
                      Autre certification (personnalisée)
                    </button>
                  ) : (
                    <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                      <label className="mb-1 block text-xs font-semibold text-[#111827]">
                        Nom de la certification
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustom();
                            }
                          }}
                          placeholder="Ex: Certificat phytosanitaire ANSD"
                          className="flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm outline-none focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                        />
                        <button
                          type="button"
                          onClick={addCustom}
                          disabled={!customName.trim()}
                          className="rounded-lg bg-[#10B981] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#059669] disabled:opacity-50"
                        >
                          Ajouter
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomOpen(false);
                            setCustomName("");
                          }}
                          className="rounded-lg px-2 py-1.5 text-sm text-[#6B7280] hover:text-[#111827]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[#E5E7EB] px-5 py-3">
              <span className="text-xs text-[#9CA3AF]">
                {value.length}/{max} sélectionnées
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg bg-[#111827] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#374151]"
              >
                Terminé
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Export d'un helper pour formatter les dates d'expiration (réutilisé par
// l'affichage public).
// ----------------------------------------------------------------------------
export { formatCertificationExpiry };
