"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Plus,
  Search,
  Download,
  Eye,
  MoreVertical,
  Copy,
  Trash2,
  QrCode as QrCodeIcon,
  X,
  Check,
} from "lucide-react";
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  GradientButton,
  OutlineButton,
  ProgressBar,
  PillFilter,
} from "@/components/fabricant/ui";
import { formatNombre } from "@/lib/fabricant-types";
import { useFabricantData } from "../FabricantDataProvider";
import { downloadQRCode, getScanUrl } from "@/lib/qr-utils";
import { toast } from "sonner";

// ============================================================================
// QRCodeDisplay — real scannable QR code using qrcode.react.
// Encodes the public scan URL `${origin}/p/<lotId>` (built by getScanUrl from
// @/lib/qr-utils) so every QR is fully functional and resolves to the lot's
// digital passport page.
// ============================================================================
function QRCodeDisplay({
  lotId,
  size = 150,
  color = "#000000",
}: {
  lotId: string;
  size?: number;
  color?: string;
}) {
  const url = getScanUrl(lotId);
  return (
    <QRCodeCanvas
      value={url}
      size={size}
      fgColor={color}
      bgColor="#FFFFFF"
      level="M"
      marginSize={1}
      style={{ width: size, height: size }}
    />
  );
}

// ============================================================================
// Small reusable filter dropdown (native select for mobile-friendliness)
// ============================================================================
function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#374151] outline-none transition-colors hover:border-[#2563EB] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================================
// Generation modal
// ============================================================================
function GenerationModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const { data, refresh } = useFabricantData();
  const lots = data.lots;
  const [lotId, setLotId] = useState(lots[0]?.id ?? "");
  const [nombre, setNombre] = useState(100);
  const [taille, setTaille] = useState<"petit" | "moyen" | "grand">("moyen");
  const [formats, setFormats] = useState<Record<string, boolean>>({ png: true, pdf: true, svg: false });
  const [options, setOptions] = useState<Record<string, boolean>>({
    lot: true,
    produit: true,
    logo: false,
    marges: false,
  });
  const [couleur, setCouleur] = useState("#000000");
  const [submitting, setSubmitting] = useState(false);

  const quotaRestant = Math.max(
    0,
    data.abonnement.quota.qrCodes.limite - data.abonnement.quota.qrCodes.utilise,
  );

  if (!open) return null;

  const selectedFormats = Object.entries(formats)
    .filter(([, v]) => v)
    .map(([k]) => k.toUpperCase());
  const tailleLabel = taille === "petit" ? "2 cm" : taille === "moyen" ? "3 cm" : "5 cm";
  const tailleMb = nombre * (taille === "petit" ? 0.08 : taille === "moyen" ? 0.15 : 0.3);
  const resumeMb = Math.max(0.5, tailleMb).toFixed(tailleMb < 10 ? 1 : 0);

  const toggle = (
    obj: Record<string, boolean>,
    set: (v: Record<string, boolean>) => void,
    key: string
  ) => set({ ...obj, [key]: !obj[key] });

  const handleSubmit = async () => {
    if (!lotId) {
      onSuccess("⚠️ Veuillez sélectionner un lot");
      return;
    }
    if (nombre > quotaRestant) {
      onSuccess(`⚠️ Quota insuffisant — restant : ${formatNombre(quotaRestant)}`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/qr-codes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotId,
          quantity: Math.min(100, nombre),
          options: {
            color: couleur,
            includeLotNumber: options.lot,
            includeProductName: options.produit,
            includeLogo: options.logo,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec de la génération");
      }
      const json = await res.json();
      onSuccess(`✅ ${formatNombre(json.count ?? nombre)} QR codes générés avec succès`);
      refresh();
      onClose();
    } catch (e) {
      onSuccess(e instanceof Error ? `⚠️ ${e.message}` : "⚠️ Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  };

  const labelRow = "flex items-center gap-2 text-[13px] text-[#374151]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-[600px] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F3F4F6] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563EB] to-[#10B981] text-white">
              <QrCodeIcon className="h-5 w-5" />
            </div>
            <h2 className="font-display text-[18px] font-bold text-[#111827]">Générer des QR codes</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Lot */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">
              Sélectionner un lot <span className="text-[#EF4444]">*</span>
            </label>
            <select
              value={lotId}
              onChange={(e) => setLotId(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#374151] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            >
              {lots.slice(0, 12).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.numero} — {l.produitNom}
                </option>
              ))}
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">
              Nombre de QR codes
            </label>
            <input
              type="number"
              min={1}
              max={quotaRestant}
              value={nombre}
              onChange={(e) => setNombre(Math.max(1, Math.min(quotaRestant || 1, Number(e.target.value) || 0)))}
              className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] font-medium text-[#111827] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            />
            <p className="mt-1 text-[12px] text-[#9CA3AF]">Quota restant : {formatNombre(quotaRestant)}</p>
          </div>

          {/* Taille */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Taille</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "petit", label: "Petit", sub: "2 cm" },
                { v: "moyen", label: "Moyen", sub: "3 cm" },
                { v: "grand", label: "Grand", sub: "5 cm" },
              ].map((t) => {
                const active = taille === t.v;
                return (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => setTaille(t.v as typeof taille)}
                    className={
                      "rounded-lg border px-3 py-2 text-left transition-all " +
                      (active
                        ? "border-[#2563EB] bg-[#2563EB]/5 ring-1 ring-[#2563EB]"
                        : "border-[#E5E7EB] bg-white hover:border-[#9CA3AF]")
                    }
                  >
                    <div className="text-[13px] font-semibold text-[#111827]">{t.label}</div>
                    <div className="text-[11px] text-[#6B7280]">{t.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Format</label>
            <div className="flex flex-wrap gap-4">
              {(["png", "pdf", "svg"] as const).map((f) => (
                <label key={f} className={labelRow + " cursor-pointer"}>
                  <input
                    type="checkbox"
                    checked={formats[f]}
                    onChange={() => toggle(formats, setFormats, f)}
                    className="h-4 w-4 rounded border-[#E5E7EB] accent-[#2563EB]"
                  />
                  <span className="font-semibold uppercase">{f}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Options</label>
            <div className="grid grid-cols-2 gap-y-2">
              {[
                { key: "lot", label: "Inclure numéro de lot" },
                { key: "produit", label: "Inclure nom produit" },
                { key: "logo", label: "Inclure logo" },
                { key: "marges", label: "Marges découpe" },
              ].map((o) => (
                <label key={o.key} className={labelRow + " cursor-pointer"}>
                  <input
                    type="checkbox"
                    checked={options[o.key]}
                    onChange={() => toggle(options, setOptions, o.key)}
                    className="h-4 w-4 rounded border-[#E5E7EB] accent-[#2563EB]"
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Couleur + Preview */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Couleur</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={couleur}
                  onChange={(e) => setCouleur(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-[#E5E7EB] bg-white p-1"
                />
                <span className="font-mono text-[13px] text-[#374151]">{couleur.toUpperCase()}</span>
              </div>

              <div className="mt-4 rounded-lg bg-[#F9FAFB] p-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                  Résumé
                </p>
                <p className="text-[13px] font-medium text-[#111827]">
                  {formatNombre(nombre)} QR codes · {selectedFormats.join(", ") || "—"} · ~{resumeMb}{" "}
                  MB
                </p>
                <p className="mt-0.5 text-[12px] text-[#6B7280]">Taille : {tailleLabel}</p>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Aperçu</label>
              <div className="flex flex-col items-center rounded-lg border border-[#E5E7EB] bg-white p-3">
                <QRCodeDisplay lotId="preview" size={120} color={couleur} />
                {options.lot && (
                  <p className="mt-2 font-mono text-[10px] text-[#6B7280]">{lots.find((l) => l.id === lotId)?.numero ?? "—"}</p>
                )}
                {options.produit && (
                  <p className="mt-0.5 text-[10px] text-[#6B7280]">Jus de Bissap Premium</p>
                )}
                <p className="mt-0.5 text-[9px] text-[#9CA3AF]">VerifScan · {tailleLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#F3F4F6] px-6 py-4">
          <OutlineButton onClick={onClose}>Annuler</OutlineButton>
          <GradientButton onClick={handleSubmit} disabled={!lotId || selectedFormats.length === 0 || submitting}>
            <Plus className="h-4 w-4" />
            {submitting ? "Génération…" : "Générer"}
          </GradientButton>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main page
// ============================================================================
type StatusFilter = "Tous" | "Actifs" | "Desactives";
type SortFilter = "recent" | "ancien" | "plusScan" | "moinsScan";
type DateFilter = "7j" | "30j" | "90j" | "perso";

const PER_PAGE = 12;

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function QRCodesPage() {
  const { data, refresh } = useFabricantData();
  const qrCodes = data.qrCodes;
  const stats = data.stats;
  const abonnement = data.abonnement;
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<string>("Tous");
  const [lotFilter, setLotFilter] = useState<string>("Tous");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Tous");
  const [sortFilter, setSortFilter] = useState<SortFilter>("recent");
  const [dateFilter, setDateFilter] = useState<DateFilter>("30j");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  // Reset to page 1 whenever filters change — using the "adjust during render"
  // pattern recommended by React instead of setState-in-effect.
  const filterKey = `${search}|${productFilter}|${lotFilter}|${statusFilter}|${sortFilter}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  // Auto-dismiss notice
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const uniqueProduits = useMemo(() => {
    const set = new Set(qrCodes.map((q) => q.produitNom));
    return Array.from(set);
  }, [qrCodes]);
  const uniqueLots = useMemo(() => {
    const set = new Set(qrCodes.map((q) => q.lotNumero));
    return Array.from(set);
  }, [qrCodes]);

  const filtered = useMemo(() => {
    let list = qrCodes.filter((q) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !q.code.toLowerCase().includes(s) &&
          !q.lotNumero.toLowerCase().includes(s) &&
          !q.produitNom.toLowerCase().includes(s)
        )
          return false;
      }
      if (productFilter !== "Tous" && q.produitNom !== productFilter) return false;
      if (lotFilter !== "Tous" && q.lotNumero !== lotFilter) return false;
      if (statusFilter === "Actifs" && q.status !== "actif") return false;
      if (statusFilter === "Desactives" && q.status !== "desactive") return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortFilter === "recent") return b.dateGeneration.localeCompare(a.dateGeneration);
      if (sortFilter === "ancien") return a.dateGeneration.localeCompare(b.dateGeneration);
      if (sortFilter === "plusScan") return b.scans - a.scans;
      if (sortFilter === "moinsScan") return a.scans - b.scans;
      return 0;
    });
    return list;
  }, [qrCodes, search, productFilter, lotFilter, statusFilter, sortFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allSelected = paged.every((q) => prev.has(q.id));
      const next = new Set(prev);
      if (allSelected) paged.forEach((q) => next.delete(q.id));
      else paged.forEach((q) => next.add(q.id));
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const totalQuota = abonnement.quota.qrCodes.limite;
  // Real usage from the abonnement context — reflects the actual QR code
  // count from the database.
  const usedQuota = abonnement.quota.qrCodes.utilise;
  const remaining = totalQuota - usedQuota;

  const allVisibleSelected = paged.length > 0 && paged.every((q) => selectedIds.has(q.id));

  return (
    <div className="relative mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Notice */}
      {notice && (
        <div className="fixed left-1/2 top-5 z-[60] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-xl border border-[#10B981]/30 bg-white px-4 py-2.5 text-[13px] font-semibold text-[#065F46] shadow-lg">
            <Check className="h-4 w-4 text-[#10B981]" />
            {notice}
          </div>
        </div>
      )}

      {/* Header */}
      <PageHeader title="Mes QR Codes" subtitle={`${formatNombre(usedQuota)} QR codes générés`}>
        <OutlineButton onClick={() => setNotice("📦 Export ZIP en cours de préparation…")}>
          <Download className="h-4 w-4" />
          Exporter tout
        </OutlineButton>
        <GradientButton onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Générer des QR codes
        </GradientButton>
      </PageHeader>

      {/* Quota banner */}
      <div className="mb-5 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#111827]">Quota QR codes</span>
              <span className="text-[14px] text-[#6B7280]">
                {formatNombre(usedQuota)} / {formatNombre(totalQuota)} utilisés
              </span>
            </div>
            <ProgressBar value={usedQuota} max={totalQuota} height="h-2.5" />
          </div>
          <div className="md:text-right">
            <p className="text-[13px] font-medium text-[#111827]">
              {formatNombre(remaining)} restants
            </p>
            <p className="text-[12px] text-[#9CA3AF]">Quota mensuel — Plan {abonnement.plan}</p>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par ID, lot, produit..."
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-[13px] text-[#111827] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
          />
        </div>
        <FilterSelect
          value={productFilter}
          onChange={setProductFilter}
          options={[
            { value: "Tous", label: "Tous les produits" },
            ...uniqueProduits.map((p) => ({ value: p, label: p })),
          ]}
          className="min-w-[170px]"
        />
        <FilterSelect
          value={lotFilter}
          onChange={setLotFilter}
          options={[
            { value: "Tous", label: "Tous les lots" },
            ...uniqueLots.map((l) => ({ value: l, label: l })),
          ]}
          className="min-w-[180px]"
        />
        <PillFilter<StatusFilter>
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "Tous", label: "Tous" },
            { value: "Actifs", label: "Actifs" },
            { value: "Desactives", label: "Désactivés" },
          ]}
        />
        <FilterSelect<DateFilter>
          value={dateFilter}
          onChange={setDateFilter}
          options={[
            { value: "7j", label: "7 derniers jours" },
            { value: "30j", label: "30 derniers jours" },
            { value: "90j", label: "90 derniers jours" },
            { value: "perso", label: "Personnalisé" },
          ]}
          className="min-w-[150px]"
        />
        <FilterSelect<SortFilter>
          value={sortFilter}
          onChange={setSortFilter}
          options={[
            { value: "recent", label: "Plus récent" },
            { value: "ancien", label: "Plus ancien" },
            { value: "plusScan", label: "Plus scanné" },
            { value: "moinsScan", label: "Moins scanné" },
          ]}
          className="min-w-[150px]"
        />
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2563EB]/30 bg-[#2563EB]/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearSelection}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2563EB] text-white"
              aria-label="Effacer la sélection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <span className="text-[13px] font-semibold text-[#111827]">
              {selectedIds.size} QR code{selectedIds.size > 1 ? "s" : ""} sélectionné
              {selectedIds.size > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                const count = selectedIds.size;
                if (count === 0) return;
                toast.info(`Téléchargement de ${count} QR codes…`);
                const selected = qrCodes.filter((q) => selectedIds.has(q.id));
                for (let i = 0; i < selected.length; i++) {
                  await downloadQRCode(
                    getScanUrl(selected[i].lotId),
                    `qr-${selected[i].code}.png`
                  );
                  if (i < selected.length - 1) {
                    await new Promise((r) => setTimeout(r, 200));
                  }
                }
                toast.success(`${count} QR codes téléchargés`);
                clearSelection();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
            >
              <Download className="h-3.5 w-3.5" />
              Télécharger
            </button>
            <button
              type="button"
              onClick={() => {
                setNotice(`🔵 ${selectedIds.size} QR codes désactivés`);
                clearSelection();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
            >
              Désactiver
            </button>
            <button
              type="button"
              onClick={() => setNotice(`📦 Export ZIP de ${selectedIds.size} QR codes…`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
            >
              Exporter ZIP
            </button>
            <button
              type="button"
              onClick={async () => {
                const count = selectedIds.size;
                if (count === 0) return;
                if (
                  !window.confirm(
                    `Supprimer ${count} QR code${count > 1 ? "s" : ""} ? Cette action est irréversible.`
                  )
                )
                  return;
                const results = await Promise.all(
                  Array.from(selectedIds).map((id) =>
                    fetch(`/api/qr-codes/${id}`, { method: "DELETE" }).catch(() => null),
                  ),
                );
                const ok = results.filter((r) => r && r.ok).length;
                if (ok > 0) {
                  toast.success(
                    `${ok} QR code${ok > 1 ? "s" : ""} supprimé${ok > 1 ? "s" : ""}`
                  );
                  refresh();
                }
                if (ok < count) {
                  toast.error(`${count - ok} suppression(s) échouée(s)`);
                }
                clearSelection();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] px-3 py-1.5 text-[12px] font-semibold text-[#991B1B] transition-colors hover:bg-[#FEE2E2]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </button>
          </div>
        </div>
      )}

      {/* Select all visible (only when there are results) */}
      {paged.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleSelectAllVisible}
            className="h-4 w-4 rounded border-[#E5E7EB] accent-[#2563EB]"
            id="select-all"
          />
          <label htmlFor="select-all" className="text-[12px] text-[#6B7280]">
            Sélectionner tous les QR codes visibles ({paged.length})
          </label>
        </div>
      )}

      {/* Grid or empty state */}
      {paged.length === 0 ? (
        <EmptyState icon="📱" title="Aucun QR code trouvé" subtitle="Essayez d'ajuster vos filtres ou de générer de nouveaux QR codes." />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {paged.map((q) => {
            const selected = selectedIds.has(q.id);
            const menuOpen = openMenuId === q.id;
            return (
              <div
                key={q.id}
                className={
                  "relative rounded-lg border bg-white p-4 transition-all hover:shadow-md " +
                  (selected ? "border-[#2563EB] ring-1 ring-[#2563EB]" : "border-[#E5E7EB]")
                }
              >
                {/* Checkbox */}
                <label className="absolute left-2.5 top-2.5 z-10 flex h-5 w-5 cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelect(q.id)}
                    className="h-4 w-4 rounded border-[#E5E7EB] accent-[#2563EB]"
                  />
                </label>

                {/* QR image */}
                <div className="flex justify-center pt-2">
                  <div className="rounded-md border border-[#F3F4F6] p-2">
                    <QRCodeDisplay lotId={q.lotId} size={150} />
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-3 text-center">
                  <p className="truncate font-mono text-[12px] text-[#6B7280]" title={q.code}>
                    {q.code}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] font-semibold text-[#111827]" title={q.lotNumero}>
                    {q.lotNumero}
                  </p>
                  <p className="truncate text-[12px] text-[#6B7280]" title={q.produitNom}>
                    {q.produitNom}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{formatDate(q.dateGeneration)}</p>
                  <p className="mt-1 text-[13px] font-medium text-[#111827]">
                    📱 {formatNombre(q.scans)} scans
                  </p>
                  <div className="mt-2 flex justify-center">
                    <StatusBadge status={q.status} />
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    title="Télécharger"
                    onClick={() => {
                      downloadQRCode(getScanUrl(q.lotId), `qr-${q.code}.png`);
                      toast.success(`QR code ${q.code} téléchargé`);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#374151] transition-colors hover:bg-[#F9FAFB]"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title="Voir"
                    onClick={() => setNotice(`👁️ Aperçu de ${q.code}`)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#374151] transition-colors hover:bg-[#F9FAFB]"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      title="Plus d'actions"
                      onClick={() => setOpenMenuId(menuOpen ? null : q.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#374151] transition-colors hover:bg-[#F9FAFB]"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 top-9 z-50 w-44 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(q.code).then(
                                  () => toast.success("Code copié dans le presse-papier"),
                                  () => toast.error("Impossible de copier le code")
                                );
                              } else {
                                toast.error("Presse-papier non disponible");
                              }
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#374151] hover:bg-[#F9FAFB]"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copier le code
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNotice(`🔵 ${q.code} désactivé`);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#374151] hover:bg-[#F9FAFB]"
                          >
                            Désactiver
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setOpenMenuId(null);
                              if (
                                !window.confirm(
                                  `Supprimer le QR code ${q.code} ? Cette action est irréversible.`
                                )
                              )
                                return;
                              try {
                                const res = await fetch(`/api/qr-codes/${q.id}`, { method: "DELETE" });
                                if (!res.ok) {
                                  const err = await res.json().catch(() => ({}));
                                  throw new Error(err.error || "Échec de la suppression");
                                }
                                toast.success(`QR code ${q.code} supprimé`);
                                refresh();
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "Erreur inattendue");
                              }
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-semibold text-[#991B1B] hover:bg-[#FEF2F2]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Supprimer
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-[13px] text-[#6B7280]">
            Affichage {(currentPage - 1) * PER_PAGE + 1}-
            {Math.min(currentPage * PER_PAGE, filtered.length)} sur {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#374151] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Précédent
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              const active = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={
                    "inline-flex h-9 w-9 items-center justify-center rounded-lg border text-[13px] font-semibold transition-colors " +
                    (active
                      ? "border-[#2563EB] bg-[#2563EB] text-white"
                      : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]")
                  }
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px] font-medium text-[#374151] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Generation modal */}
      <GenerationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(msg) => setNotice(msg)}
      />
    </div>
  );
}
