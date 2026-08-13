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
  ArrowLeft,
  Tag,
  RefreshCw,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LOTS,
  PRODUITS,
  PAYS_CEDEAO,
  formatNombre,
  type Lot,
} from "@/lib/fabricant-data";
import { useFabricantNav } from "@/lib/fabricant-store";
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
const QUOTA_RESTANT = 2660; // QR codes restants (mock)

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
  const { openDetail } = useFabricantNav();

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

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);

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
    let result = [...LOTS];

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
  }, [search, productFilter, statusFilter, dateFilter, dateFrom, dateTo, sortFilter]);

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
      <PageHeader title="Gestion des Lots" subtitle={`${LOTS.length} lots créés`}>
        <GradientButton onClick={() => setModalOpen(true)}>
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
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10"
          />
        </div>

        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#374151] focus:border-[#2563EB] focus:outline-none"
        >
          <option value="tous">Tous les produits</option>
          {PRODUITS.map((p) => (
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
          className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#374151] focus:border-[#2563EB] focus:outline-none"
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
          className="h-10 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] text-[#374151] focus:border-[#2563EB] focus:outline-none"
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
            className="h-9 rounded-md border border-[#E5E7EB] bg-white px-2 text-[13px] text-[#374151] focus:border-[#2563EB] focus:outline-none"
          />
          <span className="text-[13px] text-[#9CA3AF]">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-md border border-[#E5E7EB] bg-white px-2 text-[13px] text-[#374151] focus:border-[#2563EB] focus:outline-none"
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
            className="sticky top-[70px] z-30 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2563EB]/20 bg-[#EFF6FF] px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#2563EB] px-2.5 py-1 text-[12px] font-semibold text-white">
                {selectedIds.size}
              </span>
              <span className="text-[14px] font-medium text-[#1E40AF]">
                {selectedIds.size === 1 ? "lot sélectionné" : "lots sélectionnés"}
              </span>
              <button
                onClick={clearSelection}
                className="text-[13px] text-[#2563EB] hover:underline"
              >
                Tout désélectionner
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]">
                <Download className="h-4 w-4" />
                Télécharger QR codes
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]">
                <AlertTriangle className="h-4 w-4" />
                Marquer comme rappelés
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#374151] hover:bg-[#F9FAFB]">
                <Download className="h-4 w-4" />
                Exporter CSV
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-[#FEE2E2] bg-[#FEE2E2] px-3 py-1.5 text-[13px] font-medium text-[#991B1B] hover:bg-[#FECACA]">
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

      {/* Multi-step creation modal */}
      <AnimatePresence>
        {modalOpen && (
          <CreationModal
            onClose={() => setModalOpen(false)}
            onVoirLot={(id) => {
              setModalOpen(false);
              openDetail("lot-detail", id);
            }}
          />
        )}
      </AnimatePresence>
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
        borderColor: checked || indeterminate ? "#2563EB" : "#D1D5DB",
        backgroundColor: checked || indeterminate ? "#2563EB" : "white",
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
}: {
  lot: Lot;
  selected: boolean;
  onToggle: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onVoirDetail: () => void;
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
          style={{ color: "#2563EB" }}
        >
          {lot.numero}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <img
            src={lot.produitPhoto}
            alt={lot.produitNom}
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
              <MenuItem icon={Download} label="Télécharger QR" onClick={onToggleMenu} />
              <MenuItem icon={Copy} label="Copier infos" onClick={onToggleMenu} />
              <MenuItem icon={AlertTriangle} label="Marquer comme rappelé" onClick={onToggleMenu} />
              <div className="my-1 border-t border-[#F3F4F6]" />
              <MenuItem icon={Trash2} label="Supprimer" danger onClick={onToggleMenu} />
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
          ? "bg-[#2563EB] text-white"
          : disabled
          ? "cursor-not-allowed text-[#D1D5DB]"
          : "border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
      }`}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Multi-step creation modal
// ============================================================================
function CreationModal({
  onClose,
  onVoirLot,
}: {
  onClose: () => void;
  onVoirLot: (id: string) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [done, setDone] = useState(false);

  // Step 1 — product
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");

  // Step 2 — lot info
  const todayIso = TODAY.toISOString().split("T")[0];
  const [numero, setNumero] = useState("LOT-2026-07-001");
  const [dateFab, setDateFab] = useState(todayIso);
  const [datePerm, setDatePerm] = useState(() => {
    const d = new Date(TODAY);
    d.setDate(d.getDate() + 365);
    return d.toISOString().split("T")[0];
  });
  const [ingredients, setIngredients] = useState("");
  const [poids, setPoids] = useState("");
  const [lieuFab, setLieuFab] = useState("");
  const [lieuTrans, setLieuTrans] = useState("");
  const [lieuIdentique, setLieuIdentique] = useState(false);
  const [paysVente, setPaysVente] = useState<Set<string>>(
    new Set(["Sénégal", "Mali", "Côte d'Ivoire"])
  );
  const [notes, setNotes] = useState("");

  // Step 3 — QR codes
  const [qrCount, setQrCount] = useState(100);
  const [qrTaille, setQrTaille] = useState<"petit" | "moyen" | "grand">("moyen");
  const [formats, setFormats] = useState<Set<string>>(new Set(["png", "pdf"]));
  const [optLot, setOptLot] = useState(true);
  const [optNom, setOptNom] = useState(true);
  const [optLogo, setOptLogo] = useState(true);
  const [optMarges, setOptMarges] = useState(false);
  const [etiquettesPage, setEtiquettesPage] = useState(20);
  const [qrCouleur, setQrCouleur] = useState("#000000");

  const selectedProduct = PRODUITS.find((p) => p.id === selectedProductId) || null;
  const quotaApres = Math.max(0, QUOTA_RESTANT - qrCount);
  const tailleMo = Math.round(qrCount * 0.15 * 10) / 10;

  function toggleFormat(f: string) {
    const next = new Set(formats);
    if (next.has(f)) next.delete(f);
    else next.add(f);
    setFormats(next);
  }

  function togglePays(p: string) {
    const next = new Set(paysVente);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setPaysVente(next);
  }

  function genererNumero() {
    const rnd = Math.floor(Math.random() * 900) + 100;
    setNumero(`LOT-2026-07-${rnd}`);
  }

  function reset() {
    setStep(1);
    setDone(false);
    setSelectedProductId(null);
    setProductSearch("");
    setNumero("LOT-2026-07-001");
    setDateFab(todayIso);
    setIngredients("");
    setPoids("");
    setLieuFab("");
    setLieuTrans("");
    setLieuIdentique(false);
    setPaysVente(new Set(["Sénégal", "Mali", "Côte d'Ivoire"]));
    setNotes("");
    setQrCount(100);
    setQrTaille("moyen");
    setFormats(new Set(["png", "pdf"]));
    setOptLot(true);
    setOptNom(true);
    setOptLogo(true);
    setOptMarges(false);
    setEtiquettesPage(20);
    setQrCouleur("#000000");
  }

  // Step validity
  const step1Valid = !!selectedProductId;
  const step2Valid =
    numero.trim() !== "" &&
    dateFab !== "" &&
    datePerm !== "" &&
    ingredients.trim() !== "" &&
    lieuFab.trim() !== "" &&
    paysVente.size > 0;
  const step3Valid = qrCount > 0 && formats.size > 0;

  // Filtered products for searchable select
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return PRODUITS;
    const q = productSearch.toLowerCase();
    return PRODUITS.filter(
      (p) =>
        p.nom.toLowerCase().includes(q) || p.marque.toLowerCase().includes(q)
    );
  }, [productSearch]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="my-8 w-full max-w-[700px] overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {!done ? (
          <>
            {/* Header with steps */}
            <div className="border-b border-[#F3F4F6] px-6 pt-6 pb-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-[20px] font-bold text-[#111827]">
                  Créer un nouveau lot
                </h2>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F3F4F6]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <StepProgress current={step} />
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
              {step === 1 && (
                <Step1Product
                  selectedProductId={selectedProductId}
                  onSelect={setSelectedProductId}
                  search={productSearch}
                  onSearch={setProductSearch}
                  filteredProducts={filteredProducts}
                />
              )}
              {step === 2 && (
                <Step2Info
                  numero={numero}
                  onNumero={setNumero}
                  onGenerer={genererNumero}
                  dateFab={dateFab}
                  onDateFab={setDateFab}
                  datePerm={datePerm}
                  onDatePerm={setDatePerm}
                  ingredients={ingredients}
                  onIngredients={setIngredients}
                  poids={poids}
                  onPoids={setPoids}
                  lieuFab={lieuFab}
                  onLieuFab={setLieuFab}
                  lieuTrans={lieuTrans}
                  onLieuTrans={setLieuTrans}
                  lieuIdentique={lieuIdentique}
                  onLieuIdentique={(v) => {
                    setLieuIdentique(v);
                    if (v) setLieuTrans(lieuFab);
                  }}
                  paysVente={paysVente}
                  onTogglePays={togglePays}
                  onSelectAllPays={() => setPaysVente(new Set(PAYS_CEDEAO))}
                  onDeselectAllPays={() => setPaysVente(new Set())}
                  notes={notes}
                  onNotes={setNotes}
                />
              )}
              {step === 3 && (
                <Step3QR
                  qrCount={qrCount}
                  onQrCount={setQrCount}
                  qrTaille={qrTaille}
                  onQrTaille={setQrTaille}
                  formats={formats}
                  onToggleFormat={toggleFormat}
                  optLot={optLot}
                  onOptLot={setOptLot}
                  optNom={optNom}
                  onOptNom={setOptNom}
                  optLogo={optLogo}
                  onOptLogo={setOptLogo}
                  optMarges={optMarges}
                  onOptMarges={setOptMarges}
                  etiquettesPage={etiquettesPage}
                  onEtiquettesPage={setEtiquettesPage}
                  qrCouleur={qrCouleur}
                  onQrCouleur={setQrCouleur}
                  productName={selectedProduct?.nom || "Produit"}
                  lotNumero={numero}
                  quotaApres={quotaApres}
                  tailleMo={tailleMo}
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-4">
              <div>
                {step > 1 && (
                  <OutlineButton onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
                    <ArrowLeft className="h-4 w-4" />
                    Précédent
                  </OutlineButton>
                )}
              </div>
              <div className="flex items-center gap-2">
                <OutlineButton onClick={onClose}>Annuler</OutlineButton>
                {step < 3 && (
                  <GradientButton
                    disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
                    onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </GradientButton>
                )}
                {step === 3 && (
                  <GradientButton disabled={!step3Valid} onClick={() => setDone(true)}>
                    <Tag className="h-4 w-4" />
                    Créer le lot et générer QR codes
                  </GradientButton>
                )}
              </div>
            </div>
          </>
        ) : (
          <SuccessState
            numero={numero}
            productName={selectedProduct?.nom || "Produit"}
            qrCount={qrCount}
            onVoirLot={() => onVoirLot("l88")}
            onAutre={() => reset()}
            onClose={onClose}
          />
        )}
      </motion.div>
    </div>
  );
}

// ============================================================================
// Step progress bar
// ============================================================================
function StepProgress({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Produit" },
    { n: 2, label: "Informations" },
    { n: 3, label: "QR Codes" },
  ] as const;
  const progress = (current - 1) / (steps.length - 1);

  return (
    <div className="relative">
      {/* connecting line */}
      <div className="absolute left-0 right-0 top-4 h-0.5 bg-[#E5E7EB]">
        <div
          className="h-full bg-gradient-to-r from-[#2563EB] to-[#10B981] transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="relative flex items-center justify-between">
        {steps.map((s) => {
          const isDone = s.n < current;
          const isActive = s.n === current;
          return (
            <div key={s.n} className="flex flex-col items-center gap-1.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold transition-colors"
                style={{
                  backgroundColor: isDone
                    ? "#10B981"
                    : isActive
                    ? "#2563EB"
                    : "#E5E7EB",
                  color: isDone || isActive ? "white" : "#6B7280",
                }}
              >
                {isDone ? <Check className="h-4 w-4" /> : s.n}
              </div>
              <span
                className="text-[12px] font-medium"
                style={{ color: isActive || isDone ? "#111827" : "#9CA3AF" }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Step 1 — Product selection
// ============================================================================
function Step1Product({
  selectedProductId,
  onSelect,
  search,
  onSearch,
  filteredProducts,
}: {
  selectedProductId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearch: (s: string) => void;
  filteredProducts: typeof PRODUITS;
}) {
  const [open, setOpen] = useState(false);
  const selected = PRODUITS.find((p) => p.id === selectedProductId) || null;

  return (
    <div>
      <label className="mb-1.5 block text-[14px] font-medium text-[#374151]">
        Produit <span className="text-[#EF4444]">*</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-11 w-full items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-3 text-left focus:border-[#2563EB] focus:outline-none"
        >
          {selected ? (
            <span className="flex items-center gap-2.5">
              <img
                src={selected.photo}
                alt=""
                className="h-8 w-8 rounded object-cover"
              />
              <span>
                <span className="block text-[14px] font-medium text-[#111827]">
                  {selected.nom}
                </span>
                <span className="block text-[12px] text-[#6B7280]">
                  {selected.marque} · {selected.categorie}
                </span>
              </span>
            </span>
          ) : (
            <span className="text-[14px] text-[#9CA3AF]">
              Sélectionnez un produit…
            </span>
          )}
          <ChevronRight
            className={`h-4 w-4 text-[#9CA3AF] transition-transform ${
              open ? "rotate-90" : ""
            }`}
          />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-lg"
            >
              <div className="border-b border-[#F3F4F6] p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder="Rechercher un produit…"
                    className="h-9 w-full rounded-md border border-[#E5E7EB] bg-white pl-8 pr-2 text-[13px] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[13px] text-[#6B7280]">
                    Aucun produit trouvé.
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSelect(p.id);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-[#F9FAFB]"
                    >
                      <img
                        src={p.photo}
                        alt=""
                        className="h-8 w-8 rounded object-cover"
                      />
                      <span className="flex-1">
                        <span className="block text-[13px] font-medium text-[#111827]">
                          {p.nom}
                        </span>
                        <span className="block text-[12px] text-[#6B7280]">
                          {p.marque} · {p.categorie}
                        </span>
                      </span>
                      {selectedProductId === p.id && (
                        <Check className="h-4 w-4 text-[#2563EB]" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        className="mt-3 inline-block text-[13px] font-medium text-[#2563EB] hover:underline"
      >
        + Créer un nouveau produit
      </a>
    </div>
  );
}

// ============================================================================
// Step 2 — Lot info
// ============================================================================
function Step2Info(props: {
  numero: string;
  onNumero: (s: string) => void;
  onGenerer: () => void;
  dateFab: string;
  onDateFab: (s: string) => void;
  datePerm: string;
  onDatePerm: (s: string) => void;
  ingredients: string;
  onIngredients: (s: string) => void;
  poids: string;
  onPoids: (s: string) => void;
  lieuFab: string;
  onLieuFab: (s: string) => void;
  lieuTrans: string;
  onLieuTrans: (s: string) => void;
  lieuIdentique: boolean;
  onLieuIdentique: (v: boolean) => void;
  paysVente: Set<string>;
  onTogglePays: (p: string) => void;
  onSelectAllPays: () => void;
  onDeselectAllPays: () => void;
  notes: string;
  onNotes: (s: string) => void;
}) {
  const daysToPerm = Math.ceil(
    (new Date(props.datePerm).getTime() - new Date(props.dateFab).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Numéro de lot" required>
          <div className="flex gap-2">
            <input
              value={props.numero}
              onChange={(e) => props.onNumero(e.target.value)}
              className="h-10 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 font-mono text-[14px] focus:border-[#2563EB] focus:outline-none"
            />
            <button
              type="button"
              onClick={props.onGenerer}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Générer
            </button>
          </div>
        </Field>
        <Field label="Poids / Contenance">
          <input
            value={props.poids}
            onChange={(e) => props.onPoids(e.target.value)}
            placeholder="ex. 500ml, 250g…"
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] focus:border-[#2563EB] focus:outline-none"
          />
        </Field>
        <Field label="Date de fabrication" required>
          <input
            type="date"
            value={props.dateFab}
            onChange={(e) => props.onDateFab(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] focus:border-[#2563EB] focus:outline-none"
          />
        </Field>
        <Field label="Date de péremption" required hint={`Dans ${daysToPerm} jours`}>
          <input
            type="date"
            value={props.datePerm}
            onChange={(e) => props.onDatePerm(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] focus:border-[#2563EB] focus:outline-none"
          />
        </Field>
      </div>

      <Field label="Ingrédients" required>
        <textarea
          value={props.ingredients}
          onChange={(e) => props.onIngredients(e.target.value)}
          placeholder="Eau, sucre, bissap, citron..."
          rows={3}
          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] focus:border-[#2563EB] focus:outline-none"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Lieu de fabrication" required>
          <input
            value={props.lieuFab}
            onChange={(e) => props.onLieuFab(e.target.value)}
            placeholder="Dakar, Sénégal"
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] focus:border-[#2563EB] focus:outline-none"
          />
        </Field>
        <Field label="Lieu de transformation">
          <input
            value={props.lieuIdentique ? props.lieuFab : props.lieuTrans}
            onChange={(e) => props.onLieuTrans(e.target.value)}
            disabled={props.lieuIdentique}
            placeholder="Dakar, Sénégal"
            className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] focus:border-[#2563EB] focus:outline-none disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
          />
        </Field>
      </div>
      <label className="-mt-2 flex cursor-pointer items-center gap-2 text-[13px] text-[#374151]">
        <input
          type="checkbox"
          checked={props.lieuIdentique}
          onChange={(e) => props.onLieuIdentique(e.target.checked)}
          className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
        />
        Identique au lieu de fabrication
      </label>

      <Field label="Pays de vente" required>
        <div className="mb-2 flex items-center gap-3">
          <button
            type="button"
            onClick={props.onSelectAllPays}
            className="text-[12px] font-medium text-[#2563EB] hover:underline"
          >
            Tout sélectionner
          </button>
          <button
            type="button"
            onClick={props.onDeselectAllPays}
            className="text-[12px] font-medium text-[#6B7280] hover:underline"
          >
            Tout désélectionner
          </button>
          <span className="ml-auto text-[12px] text-[#6B7280]">
            {props.paysVente.size} / {PAYS_CEDEAO.length} sélectionnés
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#E5E7EB] p-3 sm:grid-cols-3">
          {PAYS_CEDEAO.map((p) => {
            const checked = props.paysVente.has(p);
            return (
              <label
                key={p}
                className="flex cursor-pointer items-center gap-2 text-[13px] text-[#374151]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => props.onTogglePays(p)}
                  className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                />
                {p}
              </label>
            );
          })}
        </div>
      </Field>

      <Field label="Notes internes">
        <textarea
          value={props.notes}
          onChange={(e) => props.onNotes(e.target.value)}
          placeholder="Notes internes (non visibles par les consommateurs)…"
          rows={2}
          className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] focus:border-[#2563EB] focus:outline-none"
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[14px] font-medium text-[#374151]">
          {label}
          {required && <span className="text-[#EF4444]"> *</span>}
        </label>
        {hint && <span className="text-[12px] text-[#6B7280]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// Step 3 — QR codes
// ============================================================================
function Step3QR(props: {
  qrCount: number;
  onQrCount: (n: number) => void;
  qrTaille: "petit" | "moyen" | "grand";
  onQrTaille: (t: "petit" | "moyen" | "grand") => void;
  formats: Set<string>;
  onToggleFormat: (f: string) => void;
  optLot: boolean;
  onOptLot: (v: boolean) => void;
  optNom: boolean;
  onOptNom: (v: boolean) => void;
  optLogo: boolean;
  onOptLogo: (v: boolean) => void;
  optMarges: boolean;
  onOptMarges: (v: boolean) => void;
  etiquettesPage: number;
  onEtiquettesPage: (n: number) => void;
  qrCouleur: string;
  onQrCouleur: (s: string) => void;
  productName: string;
  lotNumero: string;
  quotaApres: number;
  tailleMo: number;
}) {
  return (
    <div className="space-y-5">
      <Field
        label="Nombre de QR codes"
        required
        hint={`Quota restant : ${formatNombre(QUOTA_RESTANT)} QR codes`}
      >
        <input
          type="number"
          min={1}
          value={props.qrCount}
          onChange={(e) => props.onQrCount(Math.max(1, parseInt(e.target.value, 10) || 0))}
          className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] focus:border-[#2563EB] focus:outline-none"
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Options section */}
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[13px] font-semibold text-[#374151]">Taille</p>
            <div className="flex gap-2">
              {[
                { v: "petit", l: "Petit (2cm)" },
                { v: "moyen", l: "Moyen (3cm)" },
                { v: "grand", l: "Grand (5cm)" },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => props.onQrTaille(o.v as "petit" | "moyen" | "grand")}
                  className={`flex-1 rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors ${
                    props.qrTaille === o.v
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                      : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-[#374151]">Format</p>
            <div className="flex gap-2">
              {["png", "pdf", "svg"].map((f) => {
                const checked = props.formats.has(f);
                return (
                  <label
                    key={f}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[12px] font-medium uppercase transition-colors ${
                      checked
                        ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                        : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => props.onToggleFormat(f)}
                      className="h-3.5 w-3.5 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                    />
                    {f}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-[#374151]">
              Options impression
            </p>
            <div className="space-y-2 rounded-lg border border-[#E5E7EB] p-3">
              <CheckOption label="Inclure numéro de lot" checked={props.optLot} onChange={props.onOptLot} />
              <CheckOption label="Inclure nom produit" checked={props.optNom} onChange={props.onOptNom} />
              <CheckOption label="Inclure logo marque" checked={props.optLogo} onChange={props.onOptLogo} />
              <CheckOption label="Marges de découpe" checked={props.optMarges} onChange={props.onOptMarges} />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[13px] text-[#374151]">Étiquettes / page</span>
                <select
                  value={props.etiquettesPage}
                  onChange={(e) => props.onEtiquettesPage(parseInt(e.target.value, 10))}
                  className="h-8 rounded-md border border-[#E5E7EB] bg-white px-2 text-[13px] focus:border-[#2563EB] focus:outline-none"
                >
                  {[10, 20, 30, 40].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-[#374151]">Couleur QR</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={props.qrCouleur}
                onChange={(e) => props.onQrCouleur(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-[#E5E7EB] bg-white p-1"
              />
              <span
                className="inline-flex h-10 items-center rounded-lg border border-[#E5E7EB] px-3 font-mono text-[13px] uppercase text-[#374151]"
                style={{ backgroundColor: `${props.qrCouleur}10` }}
              >
                {props.qrCouleur}
              </span>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <p className="mb-2 text-[13px] font-semibold text-[#374151]">Aperçu</p>
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-5">
            <div className="mx-auto mb-3 max-w-[180px] rounded-lg border border-[#E5E7EB] bg-white p-3">
              <QRPreview color={props.qrCouleur} />
              <div className="mt-2 border-t border-[#F3F4F6] pt-2 text-center">
                <p className="text-[11px] font-semibold text-[#111827]">
                  {props.productName}
                </p>
                {props.optLot && (
                  <p className="font-mono text-[10px] text-[#6B7280]">
                    {props.lotNumero}
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-[12px] text-[#6B7280]">
                {props.qrCount} QR codes · {Array.from(props.formats).join(", ").toUpperCase()} · ~{props.tailleMo} MB
              </p>
              <p className="mt-1 text-[12px] font-medium text-[#374151]">
                Quota restant après : {formatNombre(props.quotaApres)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#374151]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
      />
      {label}
    </label>
  );
}

// ============================================================================
// Mock QR code preview (deterministic grid)
// ============================================================================
function QRPreview({ color }: { color: string }) {
  // 11x11 grid with deterministic pseudo-random pattern + corner markers
  const N = 11;
  const cells: boolean[] = [];
  for (let i = 0; i < N * N; i++) {
    const r = Math.floor(i / N);
    const c = i % N;
    const inCorner =
      (r < 3 && c < 3) || (r < 3 && c >= N - 3) || (r >= N - 3 && c < 3);
    if (inCorner) {
      // outer ring + center for finder pattern
      const rr = r < 3 ? r : r - (N - 3);
      const cc = c < 3 ? c : c - (N - 3);
      cells.push(rr === 1 && cc === 1);
    } else {
      // pseudo-random based on position
      cells.push((r * 7 + c * 13 + (r * c) % 5) % 3 === 0);
    }
  }
  return (
    <div
      className="grid w-full gap-0"
      style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}
    >
      {cells.map((on, i) => (
        <div
          key={i}
          className="aspect-square"
          style={{ backgroundColor: on ? color : "white" }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Success state
// ============================================================================
function SuccessState({
  numero,
  productName,
  qrCount,
  onVoirLot,
  onAutre,
  onClose,
}: {
  numero: string;
  productName: string;
  qrCount: number;
  onVoirLot: () => void;
  onAutre: () => void;
  onClose: () => void;
}) {
  return (
    <div className="px-6 py-10 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#D1FAE5]"
      >
        <Check className="h-8 w-8 text-[#065F46]" />
      </motion.div>
      <h2 className="font-display text-[20px] font-bold text-[#111827]">
        ✅ Lot créé avec succès !
      </h2>
      <p className="mt-1 text-[14px] text-[#6B7280]">
        Le lot a été créé et les QR codes sont en cours de génération.
      </p>

      <div className="mx-auto mt-5 max-w-md rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-left">
        <div className="grid grid-cols-2 gap-y-2 text-[13px]">
          <span className="text-[#6B7280]">Numéro de lot</span>
          <span className="text-right font-mono font-medium text-[#2563EB]">{numero}</span>
          <span className="text-[#6B7280]">Produit</span>
          <span className="text-right font-medium text-[#111827]">{productName}</span>
          <span className="text-[#6B7280]">QR codes générés</span>
          <span className="text-right font-medium text-[#111827]">{formatNombre(qrCount)}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <GradientButton onClick={onClose}>
          <Download className="h-4 w-4" />
          Télécharger QR codes
        </GradientButton>
        <OutlineButton onClick={onVoirLot}>
          <Eye className="h-4 w-4" />
          Voir le lot
        </OutlineButton>
        <OutlineButton onClick={onAutre}>
          <Plus className="h-4 w-4" />
          Créer un autre lot
        </OutlineButton>
      </div>
    </div>
  );
}
