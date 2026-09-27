"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Download,
  Copy,
  AlertTriangle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  formatNombre,
  type Lot,
} from "@/lib/fabricant-types";
import { useFabricantNav } from "@/lib/fabricant-store";
import { useFabricantData } from "../FabricantDataProvider";
import { downloadQRCode } from "@/lib/qr-utils";
import { ProductImage } from "@/components/fabricant/ProductImage";
import { toast } from "sonner";
import {
  PageHeader,
  SectionCard,
  StatusBadge,
  PillFilter,
  GradientButton,
  OutlineButton,
  EmptyState,
} from "../ui";

// ============================================================================
// Helpers
// ============================================================================
const TODAY = new Date("2026-07-26");

function formatDateFR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function daysUntil(iso: string): number {
  const perm = new Date(iso);
  return Math.ceil((perm.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
}

function isExpiringSoon(iso: string, days = 7): boolean {
  const d = daysUntil(iso);
  return d > 0 && d <= days;
}

// ============================================================================
// Constants
// ============================================================================
const PAGE_SIZE = 20;

// ============================================================================
// CSV export helper — builds a UTF-8 CSV (with BOM for Excel) from a list of
// lots and triggers a browser download.
// ============================================================================
function exportLotsCSV(lotsToExport: Lot[]): void {
  if (lotsToExport.length === 0) {
    toast.info("Aucun lot à exporter");
    return;
  }
  const headers = [
    "Numero",
    "Produit",
    "Date Fabrication",
    "Date Peremption",
    "Statut",
    "Scans",
    "QR Codes",
    "Ingredients",
    "Lieu Fabrication",
  ];
  const escape = (value: string | number) =>
    `"${String(value).replace(/"/g, '""')}"`;
  const rows = lotsToExport.map((l) =>
    [
      l.numero,
      l.produitNom,
      l.dateFabrication,
      l.datePeremption,
      l.status,
      l.scans,
      l.qrCodes,
      l.ingredients,
      l.lieuFabrication,
    ]
      .map(escape)
      .join(",")
  );
  const csv = [headers.map(escape).join(","), ...rows].join("\n");
  // Prepend BOM so Excel detects UTF-8 correctly.
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lots-export.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Copy-to-clipboard helper — builds a readable text summary of a lot.
// ============================================================================
function buildLotInfoText(lot: Lot): string {
  return [
    `Lot : ${lot.numero}`,
    `Produit : ${lot.produitNom}`,
    `Date de fabrication : ${formatDateFR(lot.dateFabrication)}`,
    `Date de péremption : ${formatDateFR(lot.datePeremption)}`,
    `Statut : ${lot.status}`,
    `Ingrédients : ${lot.ingredients}`,
    `Lieu de fabrication : ${lot.lieuFabrication}`,
  ].join("\n");
}

type StatusFilter = "tous" | "actif" | "rappelle" | "expire";
type DateFilter = "toutes" | "7j" | "30j" | "90j" | "perso";
type SortFilter = "recent" | "ancien" | "scans" | "peremption";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "actif", label: "Actifs" },
  { value: "rappelle", label: "Rappelés" },
  { value: "expire", label: "Expirés" },
];

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "toutes", label: "Toutes les dates" },
  { value: "7j", label: "7 derniers jours" },
  { value: "30j", label: "30 derniers jours" },
  { value: "90j", label: "90 derniers jours" },
  { value: "perso", label: "Personnalisé" },
];

const SORT_OPTIONS: { value: SortFilter; label: string }[] = [
  { value: "recent", label: "Plus récent" },
  { value: "ancien", label: "Plus ancien" },
  { value: "scans", label: "Plus scanné" },
  { value: "peremption", label: "Date péremption" },
];

// ============================================================================
// Main component
// ============================================================================
export function LotsPage() {
  const { setPage, openDetail } = useFabricantNav();
  const { data, refresh } = useFabricantData();
  const produits = data.products;
  const lots = data.lots;
  const quotaRestant = data.abonnement
    ? Math.max(
        0,
        data.abonnement.quota.qrCodes.limite - data.abonnement.quota.qrCodes.utilise,
      )
    : 0;

  // Filters state
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState<string>("tous");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("tous");
  const [dateFilter, setDateFilter] = useState<DateFilter>("toutes");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortFilter, setSortFilter] = useState<SortFilter>("recent");

  // Table state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openMenuId) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-lot-menu]")) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  // Filtered + sorted lots
  const filteredLots = useMemo(() => {
    let result = [...lots];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.numero.toLowerCase().includes(q) ||
          l.produitNom.toLowerCase().includes(q)
      );
    }

    // Product filter
    if (productFilter !== "tous") {
      result = result.filter((l) => l.produitId === productFilter);
    }

    // Status filter
    if (statusFilter !== "tous") {
      result = result.filter((l) => l.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== "toutes" && dateFilter !== "perso") {
      const days = parseInt(dateFilter, 10);
      const cutoff = new Date(TODAY);
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter((l) => new Date(l.dateFabrication) >= cutoff);
    } else if (dateFilter === "perso") {
      if (dateFrom) {
        result = result.filter((l) => new Date(l.dateFabrication) >= new Date(dateFrom));
      }
      if (dateTo) {
        result = result.filter((l) => new Date(l.dateFabrication) <= new Date(dateTo));
      }
    }

    // Sort
    switch (sortFilter) {
      case "recent":
        result.sort((a, b) => b.dateFabrication.localeCompare(a.dateFabrication));
        break;
      case "ancien":
        result.sort((a, b) => a.dateFabrication.localeCompare(b.dateFabrication));
        break;
      case "scans":
        result.sort((a, b) => b.scans - a.scans);
        break;
      case "peremption":
        result.sort((a, b) => a.datePeremption.localeCompare(b.datePeremption));
        break;
    }

    return result;
  }, [lots, search, productFilter, statusFilter, dateFilter, dateFrom, dateTo, sortFilter]);

  // Reset to page 1 when filters change — adjust state during render
  // (recommended React pattern, see https://react.dev/learn/you-might-not-need-an-effect)
  const filterKey = `${search}|${productFilter}|${statusFilter}|${dateFilter}|${dateFrom}|${dateTo}|${sortFilter}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setCurrentPage(1);
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLots.length / PAGE_SIZE));
  const pageLots = filteredLots.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const startIdx = filteredLots.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(currentPage * PAGE_SIZE, filteredLots.length);

  // Selection (only on current page)
  const pageIds = pageLots.map((l) => l.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  function toggleSelectAll() {
    const next = new Set(selectedIds);
    if (allPageSelected) {
      pageIds.forEach((id) => next.delete(id));
    } else {
      pageIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // ---- Bulk action handlers ------------------------------------------------
  async function handleBulkDownloadQR() {
    const selectedLots = lots.filter((l) => selectedIds.has(l.id));
    if (selectedLots.length === 0) return;
    toast.info(
      `Téléchargement de ${selectedLots.length} QR codes en cours…`
    );
    for (let i = 0; i < selectedLots.length; i++) {
      const l = selectedLots[i];
      await downloadQRCode(l.numero, `${l.numero}-qr.png`);
      if (i < selectedLots.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    toast.success(`${selectedLots.length} QR codes téléchargés`);
    clearSelection();
  }

  function handleBulkMarkRecalled() {
    const count = selectedIds.size;
    if (count === 0) return;
    Promise.all(
      Array.from(selectedIds).map((id) =>
        fetch(`/api/lots/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "RECALLED" }),
        }).catch(() => null),
      ),
    ).then((results) => {
      const ok = results.filter((r) => r && r.ok).length;
      if (ok > 0) {
        toast.warning(`${ok} lot${ok > 1 ? "s" : ""} marqué${ok > 1 ? "s" : ""} comme rappelé${ok > 1 ? "s" : ""}`);
        refresh();
      }
      if (ok < count) {
        toast.error(`${count - ok} lot(s) n'ont pas pu être mis à jour`);
      }
      clearSelection();
    });
  }

  function handleBulkExportCSV() {
    const selectedLots = lots.filter((l) => selectedIds.has(l.id));
    const list = selectedLots.length > 0 ? selectedLots : filteredLots;
    exportLotsCSV(list);
    if (list.length > 0) {
      toast.success(`${list.length} lots exportés en CSV`);
    }
  }

  function handleBulkDelete() {
    const count = selectedIds.size;
    if (count === 0) return;
    if (
      !window.confirm(
        `Supprimer ${count} lot${count > 1 ? "s" : ""} ? Cette action est irréversible.`
      )
    )
      return;
    Promise.all(
      Array.from(selectedIds).map((id) =>
        fetch(`/api/lots/${id}`, { method: "DELETE" }).catch(() => null),
      ),
    ).then((results) => {
      const ok = results.filter((r) => r && r.ok).length;
      if (ok > 0) {
        toast.success(`${ok} lot${ok > 1 ? "s" : ""} supprimé${ok > 1 ? "s" : ""}`);
        refresh();
      }
      if (ok < count) {
        toast.error(`${count - ok} lot(s) n'ont pas pu être supprimés`);
      }
      clearSelection();
    });
  }

  // ---- Single-row action handlers -----------------------------------------
  function handleRowDownloadQR(lot: Lot) {
    downloadQRCode(lot.numero, `${lot.numero}-qr.png`);
    toast.success(`QR code de ${lot.numero} téléchargé`);
  }

  function handleRowCopyInfos(lot: Lot) {
    const text = buildLotInfoText(lot);
    // Try the modern async clipboard API first, then fall back to a
    // temporary textarea + execCommand("copy") for non-secure contexts
    // (HTTP) or browsers where the Clipboard API is unavailable.
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        () => toast.success("Infos copiées dans le presse-papier"),
        () => fallbackCopy(text)
      );
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text: string) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) toast.success("Infos copiées dans le presse-papier");
      else toast.error("Impossible de copier les infos");
    } catch {
      toast.error("Impossible de copier les infos");
    }
  }

  async function handleRowMarkRecalled(lot: Lot) {
    try {
      const res = await fetch(`/api/lots/${lot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RECALLED" }),
      });
      if (!res.ok) throw new Error("Échec de la mise à jour");
      toast.warning(`Lot ${lot.numero} marqué comme rappelé`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inattendue");
    }
  }

  async function handleRowDelete(lot: Lot) {
    if (
      !window.confirm(
        `Supprimer le lot ${lot.numero} ? Cette action est irréversible.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/lots/${lot.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec de la suppression");
      }
      toast.success(`Lot ${lot.numero} supprimé`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inattendue");
    }
  }

  // Pagination buttons
  function getPageNumbers(): (number | "...")[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }

  return (
    <div className="relative">
      <PageHeader title="Gestion des Lots" subtitle={`${lots.length} lots créés`}>
        <GradientButton onClick={() => setPage("lot-create")}>
          <Plus className="h-4 w-4" />
          Nouveau lot
        </GradientButton>
      </PageHeader>

      {/* Filters bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Rechercher par numéro de lot, produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#022150] focus:outline-none focus:ring-2 focus:ring-[#022150]/10"
          />
        </div>

        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#374151] focus:border-[#022150] focus:outline-none"
        >
          <option value="tous">Tous les produits</option>
          {produits.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
            </option>
          ))}
        </select>

        <PillFilter
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#374151] focus:border-[#022150] focus:outline-none"
        >
          {DATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={sortFilter}
          onChange={(e) => setSortFilter(e.target.value as SortFilter)}
          className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#374151] focus:border-[#022150] focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom date range */}
      {dateFilter === "perso" && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3">
          <span className="text-[13px] font-medium text-[#374151]">Période :</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-md border border-[#E5E7EB] bg-white px-2 text-[13px] text-[#374151] focus:border-[#022150] focus:outline-none"
          />
          <span className="text-[13px] text-[#9CA3AF]">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-md border border-[#E5E7EB] bg-white px-2 text-[13px] text-[#374151] focus:border-[#022150] focus:outline-none"
          />
        </div>
      )}

      {/* Bulk actions bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="sticky top-[70px] z-30 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#022150]/20 bg-[#F0F4F9] px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#022150] px-2.5 py-1 text-[12px] font-semibold text-white">
                {selectedIds.size}
              </span>
              <span className="text-[14px] font-medium text-[#0A2B5F]">
                {selectedIds.size === 1 ? "lot sélectionné" : "lots sélectionnés"}
              </span>
              <button
                onClick={clearSelection}
                className="text-[13px] text-[#022150] hover:underline"
              >
                Tout désélectionner
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleBulkDownloadQR}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
              >
                <Download className="h-4 w-4" />
                Télécharger QR codes
              </button>
              <button
                onClick={handleBulkMarkRecalled}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
              >
                <AlertTriangle className="h-4 w-4" />
                Marquer comme rappelés
              </button>
              <button
                onClick={handleBulkExportCSV}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
              >
                <Download className="h-4 w-4" />
                Exporter CSV
              </button>
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#FEE2E2] bg-[#FEE2E2] px-3 py-1.5 text-[13px] font-medium text-[#991B1B] hover:bg-[#FECACA]"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lots table */}
      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="w-12 px-4 py-3">
                  <StyledCheckbox
                    checked={allPageSelected}
                    indeterminate={somePageSelected && !allPageSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <Th>Numéro de lot</Th>
                <Th>Produit</Th>
                <Th>Date fabrication</Th>
                <Th>Date péremption</Th>
                <Th>Statut</Th>
                <Th className="text-right">Scans</Th>
                <Th className="text-right">QR codes</Th>
                <Th className="w-14">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {pageLots.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon="📦"
                      title="Aucun lot trouvé"
                      subtitle="Ajustez vos filtres ou créez un nouveau lot."
                    />
                  </td>
                </tr>
              ) : (
                pageLots.map((lot) => (
                  <LotRow
                    key={lot.id}
                    lot={lot}
                    selected={selectedIds.has(lot.id)}
                    onToggle={() => toggleSelect(lot.id)}
                    menuOpen={openMenuId === lot.id}
                    onToggleMenu={() =>
                      setOpenMenuId(openMenuId === lot.id ? null : lot.id)
                    }
                    onVoirDetail={() => openDetail("lot-detail", lot.id)}
                    onDownloadQR={() => handleRowDownloadQR(lot)}
                    onCopyInfos={() => handleRowCopyInfos(lot)}
                    onMarkRecalled={() => handleRowMarkRecalled(lot)}
                    onDelete={() => handleRowDelete(lot)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] px-4 py-3">
          <p className="text-[13px] text-[#6B7280]">
            Affichage {startIdx}-{endIdx} sur {filteredLots.length}
          </p>
          <div className="flex items-center gap-1">
            <PaginationButton
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </PaginationButton>
            {getPageNumbers().map((p, i) =>
              p === "..." ? (
                <span key={`e${i}`} className="px-2 text-[13px] text-[#9CA3AF]">
                  …
                </span>
              ) : (
                <PaginationButton
                  key={p}
                  active={p === currentPage}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </PaginationButton>
              )
            )}
            <PaginationButton
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </PaginationButton>
          </div>
        </div>
      </div>

      {/* La création de lot se fait désormais sur une page dédiée :
          bouton "Nouveau lot" → setPage("lot-create") */}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wide text-[#6B7280] ${className}`}
    >
      {children}
    </th>
  );
}

function StyledCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex h-5 w-5 items-center justify-center rounded border-2 transition-colors"
      style={{
        borderColor: checked || indeterminate ? "#022150" : "#D1D5DB",
        backgroundColor: checked || indeterminate ? "#022150" : "white",
      }}
    >
      {checked && !indeterminate && <Check className="h-3.5 w-3.5 text-white" />}
      {indeterminate && <div className="h-0.5 w-3 rounded bg-white" />}
    </button>
  );
}

function LotRow({
  lot,
  selected,
  onToggle,
  menuOpen,
  onToggleMenu,
  onVoirDetail,
  onDownloadQR,
  onCopyInfos,
  onMarkRecalled,
  onDelete,
}: {
  lot: Lot;
  selected: boolean;
  onToggle: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onVoirDetail: () => void;
  onDownloadQR: () => void;
  onCopyInfos: () => void;
  onMarkRecalled: () => void;
  onDelete: () => void;
}) {
  const expiringSoon = isExpiringSoon(lot.datePeremption);
  const borderLeftColor = lot.status === "rappelle"
    ? "#EF4444"
    : expiringSoon
    ? "#F59E0B"
    : lot.status === "expire"
    ? "#D1D5DB"
    : "transparent";

  return (
    <tr
      className="border-b border-[#F3F4F6] transition-colors hover:bg-[#F9FAFB]"
      style={{ borderLeft: `3px solid ${borderLeftColor}` }}
    >
      <td className="px-4 py-3">
        <StyledCheckbox checked={selected} onChange={onToggle} />
      </td>
      <td className="px-4 py-3">
        <span
          className="font-mono text-[14px] font-medium"
          style={{ color: "#022150" }}
        >
          {lot.numero}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <ProductImage
            src={lot.produitPhoto}
            alt={lot.produitNom}
            icon={lot.produitIcon}
            className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
          />
          <span className="text-[14px] font-semibold text-[#111827]">
            {lot.produitNom}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-[13px] text-[#374151]">
        {formatDateFR(lot.dateFabrication)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-[#374151]">
            {formatDateFR(lot.datePeremption)}
          </span>
          {expiringSoon && lot.status !== "rappelle" && (
            <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={lot.status} />
      </td>
      <td className="px-4 py-3 text-right text-[14px] font-medium text-[#111827]">
        {formatNombre(lot.scans)}
      </td>
      <td className="px-4 py-3 text-right text-[14px] text-[#374151]">
        {formatNombre(lot.qrCodes)}
      </td>
      <td className="relative px-4 py-3" data-lot-menu>
        <button
          onClick={onToggleMenu}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F6]"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-4 top-12 z-20 w-52 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-lg"
            >
              <MenuItem
                icon={Eye}
                label="Voir détails"
                onClick={() => {
                  onToggleMenu();
                  onVoirDetail();
                }}
              />
              <MenuItem
                icon={Download}
                label="Télécharger QR"
                onClick={() => {
                  onToggleMenu();
                  onDownloadQR();
                }}
              />
              <MenuItem
                icon={Copy}
                label="Copier infos"
                onClick={() => {
                  onToggleMenu();
                  onCopyInfos();
                }}
              />
              <MenuItem
                icon={AlertTriangle}
                label="Marquer comme rappelé"
                onClick={() => {
                  onToggleMenu();
                  onMarkRecalled();
                }}
              />
              <div className="my-1 border-t border-[#F3F4F6]" />
              <MenuItem
                icon={Trash2}
                label="Supprimer"
                danger
                onClick={() => {
                  onToggleMenu();
                  onDelete();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </td>
    </tr>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-[#F9FAFB] ${
        danger ? "text-[#EF4444]" : "text-[#374151]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function PaginationButton({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-[13px] font-medium transition-colors ${
        active
          ? "bg-[#022150] text-white"
          : disabled
          ? "cursor-not-allowed text-[#D1D5DB]"
          : "border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
      }`}
    >
      {children}
    </button>
  );
}

