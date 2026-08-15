"use client";

import { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Search,
  Layers,
  FileText,
  Download,
  CheckSquare,
  Square,
  Loader2,
  Check,
  AlertCircle,
  Settings2,
  Image as ImageIcon,
} from "lucide-react";
import {
  PageHeader,
  EmptyState,
} from "@/components/fabricant/ui";
import { formatNombre } from "@/lib/fabricant-types";
import { useFabricantData } from "../FabricantDataProvider";
import { getScanUrl } from "@/lib/qr-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================
type BulkResult = {
  success: boolean;
  totalGenerated: number;
  lotsProcessed: number;
  results: Array<{
    lotId: string;
    lotNumber: string | null;
    productName: string;
    count: number;
    qrCodes: Array<{ id: string; imageUrl: string; publicUrl: string }>;
  }>;
};

// ============================================================================
// BulkQRPage — bulk QR code generation + PDF label sheet export.
//
// Features:
//   1. Multi-lot selection with search + select-all
//   2. Customization: brand color, logo, lot number, product name
//   3. "Générer en masse" → POST /api/qr-codes/bulk-generate (renders PNGs
//      server-side, stores imageUrl, persists DB rows)
//   4. "PDF étiquettes" → POST /api/qr-codes/labels-pdf (A4 label sheet
//      with QR + product name + lot number, auto-paginated)
// ============================================================================
export function BulkQRPage() {
  const { data } = useFabricantData();

  // ── Selection state ───────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // ── Options state ─────────────────────────────────────────────────
  const [perLot, setPerLot] = useState(1);
  const [color, setColor] = useState("#000000");
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includeLotNumber, setIncludeLotNumber] = useState(true);
  const [includeProductName, setIncludeProductName] = useState(true);

  // PDF layout options
  const [labelsPerRow, setLabelsPerRow] = useState(3);
  const [cutLines, setCutLines] = useState(true);

  // ── Generation state ──────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);

  // ── Filtered lots (search) ────────────────────────────────────────
  const filteredLots = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.lots;
    return data.lots.filter(
      (l) =>
        l.numero.toLowerCase().includes(q) ||
        l.produitNom.toLowerCase().includes(q)
    );
  }, [data.lots, search]);

  // ── Selection handlers ────────────────────────────────────────────
  const toggleLot = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredLots.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLots.map((l) => l.id)));
    }
  };

  const selectedLots = data.lots.filter((l) => selectedIds.has(l.id));
  const totalQRCodes = selectedLots.length * perLot;

  // ── Generate bulk (PNGs) ──────────────────────────────────────────
  const handleGenerate = async () => {
    if (selectedLots.length === 0) {
      toast.error("Sélectionnez au moins un lot");
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/qr-codes/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotIds: Array.from(selectedIds),
          perLot,
          options: {
            size: 512,
            color,
            includeLogo,
            includeLotNumber,
            includeProductName,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec de la génération");
      setResult(json);
      toast.success(`${formatNombre(json.totalGenerated)} QR codes générés avec succès`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de génération");
    } finally {
      setGenerating(false);
    }
  };

  // ── Generate PDF label sheet ──────────────────────────────────────
  const handleGeneratePdf = async () => {
    if (selectedLots.length === 0) {
      toast.error("Sélectionnez au moins un lot");
      return;
    }
    setGeneratingPdf(true);
    try {
      const res = await fetch("/api/qr-codes/labels-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotIds: Array.from(selectedIds),
          perLot,
          options: {
            size: 400,
            color,
            includeLogo,
            includeLotNumber,
            includeProductName,
            labelsPerRow,
            cutLines,
          },
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Échec de la génération du PDF");
      }
      // Trigger download of the PDF blob.
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `etiquettes-qr-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF d'étiquettes téléchargé");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de génération PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // ── Preview QR (first selected lot) ───────────────────────────────
  const previewLot = selectedLots[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Génération en masse"
        subtitle="Générez des QR codes pour plusieurs lots à la fois, avec logo de marque et couleurs personnalisées. Exportez en PDF pour l'impression d'étiquettes."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ════════════════════════════════════════════════════════════
            LEFT: Lot selection
        ════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          {/* Search + select all */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un lot ou produit..."
                  className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>
              <button
                type="button"
                onClick={toggleAll}
                className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                {selectedIds.size === filteredLots.length && filteredLots.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-[#2563EB]" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400" />
                )}
                {selectedIds.size === filteredLots.length && filteredLots.length > 0
                  ? "Tout désélectionner"
                  : "Tout sélectionner"}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {formatNombre(selectedIds.size)} lot(s) sélectionné(s) ·{" "}
              {formatNombre(filteredLots.length)} lot(s) affiché(s)
            </p>
          </div>

          {/* Lot list */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            {filteredLots.length === 0 ? (
              <EmptyState
                icon={<Layers className="h-8 w-8 text-gray-400" />}
                title="Aucun lot trouvé"
                subtitle="Créez d'abord des lots dans la section Lots."
              />
            ) : (
              <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-100">
                {filteredLots.map((lot) => {
                  const isSelected = selectedIds.has(lot.id);
                  return (
                    <label
                      key={lot.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-gray-50",
                        isSelected && "bg-[#2563EB]/5"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleLot(lot.id)}
                        className="flex-shrink-0"
                        aria-label={isSelected ? "Désélectionner" : "Sélectionner"}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-[#2563EB]" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-300" />
                        )}
                      </button>
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                        {lot.produitPhoto ? (
                          <img
                            src={lot.produitPhoto}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg">{lot.produitIcon || "📦"}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {lot.produitNom}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          Lot {lot.numero} · {formatNombre(lot.qrCodes)} QR existants ·{" "}
                          {formatNombre(lot.scans)} scans
                        </p>
                      </div>
                      <span
                        className={cn(
                          "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          lot.status === "actif"
                            ? "bg-green-100 text-green-700"
                            : lot.status === "rappelle"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {lot.status}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            RIGHT: Options + preview + actions
        ════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          {/* Options */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-[#2563EB]" />
              <h3 className="text-sm font-bold text-gray-900">Personnalisation</h3>
            </div>

            {/* Per-lot quantity */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                QR codes par lot
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={perLot}
                onChange={(e) => setPerLot(Math.min(500, Math.max(1, parseInt(e.target.value) || 1)))}
                className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Total: {formatNombre(totalQRCodes)} QR codes
              </p>
            </div>

            {/* Color */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Couleur du QR
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-gray-200"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 flex-1 rounded-lg border border-gray-200 px-3 text-sm font-mono outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <ToggleRow
                label="Logo de marque"
                desc="Votre logo au centre du QR"
                checked={includeLogo}
                onChange={setIncludeLogo}
              />
              <ToggleRow
                label="Numéro de lot"
                desc="Texte sous le QR"
                checked={includeLotNumber}
                onChange={setIncludeLotNumber}
              />
              <ToggleRow
                label="Nom du produit"
                desc="Texte sous le QR"
                checked={includeProductName}
                onChange={setIncludeProductName}
              />
            </div>
          </div>

          {/* PDF layout options */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#10B981]" />
              <h3 className="text-sm font-bold text-gray-900">Mise en page PDF</h3>
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Étiquettes par ligne
              </label>
              <select
                value={labelsPerRow}
                onChange={(e) => setLabelsPerRow(parseInt(e.target.value))}
                className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm outline-none focus:border-[#2563EB]"
              >
                <option value={2}>2 (grand format)</option>
                <option value={3}>3 (standard)</option>
                <option value={4}>4 (compact)</option>
                <option value={5}>5 (dense)</option>
              </select>
            </div>
            <ToggleRow
              label="Lignes de découpe"
              desc="Pointillés autour des étiquettes"
              checked={cutLines}
              onChange={setCutLines}
            />
          </div>

          {/* Preview */}
          {previewLot && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-gray-900">Aperçu</h3>
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-lg border border-gray-100 bg-white p-3">
                  <QRCodeCanvas
                    value={getScanUrl(previewLot.id)}
                    size={160}
                    fgColor={color}
                    bgColor="#FFFFFF"
                    level={includeLogo ? "H" : "M"}
                    marginSize={1}
                  />
                </div>
                <p className="text-xs font-medium text-gray-600">
                  {previewLot.produitNom}
                </p>
                <p className="text-[11px] text-gray-400">Lot {previewLot.numero}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || selectedIds.size === 0}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-md shadow-[#2563EB]/25 transition-all hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4" />
                  Générer {formatNombre(totalQRCodes)} QR codes
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={generatingPdf || selectedIds.size === 0}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#10B981] bg-white px-4 text-sm font-semibold text-[#10B981] transition-all hover:bg-[#10B981] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generatingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération PDF...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  PDF étiquettes A4
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          Results
      ════════════════════════════════════════════════════════════ */}
      {result && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
              <Check className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-green-900">
                {formatNombre(result.totalGenerated)} QR codes générés
              </h3>
              <p className="text-xs text-green-700">
                {result.lotsProcessed} lot(s) traité(s) · images PNG enregistrées
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {result.results.map((r) => (
              <div
                key={r.lotId}
                className="rounded-lg border border-green-100 bg-white p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.productName}</p>
                    <p className="text-xs text-gray-500">Lot {r.lotNumber || "—"}</p>
                  </div>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                    {r.count} QR
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.qrCodes.slice(0, 8).map((qr) => (
                    <a
                      key={qr.id}
                      href={qr.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-white transition-transform hover:scale-105"
                      title="Cliquer pour voir l'image"
                    >
                      <img
                        src={qr.imageUrl}
                        alt={`QR ${r.lotNumber}`}
                        className="h-full w-full object-contain"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                        <Download className="h-4 w-4 text-white" />
                      </div>
                    </a>
                  ))}
                  {r.qrCodes.length > 8 && (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs font-medium text-gray-500">
                      +{r.qrCodes.length - 8}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              Les QR codes sont aussi disponibles dans la section{" "}
              <strong>QR Codes</strong>. Utilisez le bouton{" "}
              <strong>PDF étiquettes</strong> pour imprimer une planche A4.
            </span>
          </div>
        </div>
      )}

      {/* Empty state when no lots at all */}
      {data.lots.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <EmptyState
            icon={<ImageIcon className="h-10 w-10 text-gray-400" />}
            title="Aucun lot disponible"
            subtitle="Vous devez créer au moins un lot avant de pouvoir générer des QR codes en masse."
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ToggleRow — reusable switch row
// ============================================================================
function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg p-2 transition-colors hover:bg-gray-50">
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <p className="text-[10px] text-gray-400">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 flex-shrink-0 rounded-full transition-colors",
          checked ? "bg-[#2563EB]" : "bg-gray-300"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </button>
    </label>
  );
}
