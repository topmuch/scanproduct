"use client";

import {
  ArrowLeft,
  Download,
  Copy,
  AlertTriangle,
  Trash2,
  Eye,
  Tag,
  Calendar,
  MapPin,
  BarChart3,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { formatNombre } from "@/lib/fabricant-data";
import { useFabricantNav } from "@/lib/fabricant-store";
import { useLots, useProduits } from "@/lib/fabricant-data-store";
import { downloadQRCode, getScanUrl } from "@/lib/qr-utils";
import { ProductImage } from "@/components/fabricant/ProductImage";
import { toast } from "sonner";
import {
  PageHeader,
  SectionCard,
  StatusBadge,
  GradientButton,
  OutlineButton,
  EmptyState,
} from "../ui";

// ============================================================================
// Helpers
// ============================================================================
function formatDateFR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const PAYS_VENTE = ["Sénégal", "Mali", "Côte d'Ivoire"];

// ============================================================================
// Main component
// ============================================================================
export function LotDetailPage() {
  const { selectedId, setPage, openDetail } = useFabricantNav();
  const { lots, deleteLot, markLotRecalled } = useLots();
  const { produits } = useProduits();
  const [copied, setCopied] = useState(false);

  const lot = lots.find((l) => l.id === selectedId) || null;

  // If a lot id was selected but it no longer exists in the store (e.g. it
  // was deleted), redirect back to the lots list. We render nothing while
  // the navigation is pending to avoid flashing the "introuvable" state.
  useEffect(() => {
    if (selectedId && !lot) {
      setPage("lots");
    }
  }, [selectedId, lot, setPage]);

  if (!lot) {
    if (selectedId) {
      // Redirect in progress — render nothing.
      return null;
    }
    return (
      <div>
        <PageHeader title="Lot introuvable" subtitle="Le lot demandé n'existe pas." />
        <EmptyState
          icon="📦"
          title="Aucun lot sélectionné"
          subtitle="Veuillez sélectionner un lot depuis la liste."
          action={
            <OutlineButton onClick={() => setPage("lots")}>
              <ArrowLeft className="h-4 w-4" />
              Retour aux lots
            </OutlineButton>
          }
        />
      </div>
    );
  }

  const ingredients = lot.ingredients
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const scansParJour = Math.max(1, Math.round(lot.scans / 30));

  function copyLink() {
    const link = getScanUrl(lot!.id);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadQR() {
    // Encode the real public scan URL so the downloaded QR is scannable.
    downloadQRCode(getScanUrl(lot!.id), `${lot!.numero}-qr.png`);
    toast.success(`QR code de ${lot!.numero} téléchargé`);
  }

  function handleMarkRecalled() {
    markLotRecalled(lot!.id);
    toast.warning(`Lot ${lot!.numero} marqué comme rappelé`);
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Supprimer le lot ${lot!.numero} ? Cette action est irréversible.`
      )
    )
      return;
    deleteLot(lot!.id);
    toast.success(`Lot ${lot!.numero} supprimé`);
    setPage("lots");
  }

  return (
    <div>
      {/* Back + header */}
      <button
        onClick={() => setPage("lots")}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#2563EB] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux lots
      </button>

      <PageHeader
        title={lot.numero}
        subtitle={lot.produitNom}
      >
        <StatusBadge status={lot.status} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Informations du lot */}
          <SectionCard title="Informations du lot" subtitle="Détails généraux du lot">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <InfoField
                icon={<Tag className="h-4 w-4" />}
                label="Numéro de lot"
                value={
                  <span className="font-mono font-medium text-[#2563EB]">
                    {lot.numero}
                  </span>
                }
              />
              <InfoField
                icon={<Eye className="h-4 w-4" />}
                label="Produit"
                value={<span className="font-medium text-[#111827]">{lot.produitNom}</span>}
              />
              <InfoField
                icon={<Calendar className="h-4 w-4" />}
                label="Date de fabrication"
                value={formatDateFR(lot.dateFabrication)}
              />
              <InfoField
                icon={<Calendar className="h-4 w-4" />}
                label="Date de péremption"
                value={formatDateFR(lot.datePeremption)}
              />
              <InfoField
                icon={<MapPin className="h-4 w-4" />}
                label="Lieu de fabrication"
                value={lot.lieuFabrication}
              />
              <InfoField
                icon={<BarChart3 className="h-4 w-4" />}
                label="Statut"
                value={<StatusBadge status={lot.status} />}
              />
            </dl>
          </SectionCard>

          {/* Ingrédients */}
          <SectionCard title="Ingrédients" subtitle="Composition du produit">
            <div className="flex flex-wrap gap-2">
              {ingredients.length > 0 ? (
                ingredients.map((ing, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 text-[13px] font-medium text-[#374151]"
                  >
                    {ing}
                  </span>
                ))
              ) : (
                <span className="text-[13px] text-[#9CA3AF]">Aucun ingrédient renseigné.</span>
              )}
            </div>
          </SectionCard>

          {/* QR codes générés */}
          <SectionCard
            title="QR codes générés"
            subtitle={`${formatNombre(lot.qrCodes)} codes associés à ce lot`}
            action={
              <GradientButton className="!py-2" onClick={handleDownloadQR}>
                <Download className="h-4 w-4" />
                Télécharger le QR code
              </GradientButton>
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: Math.min(8, Math.max(1, lot.qrCodes)) }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3"
                >
                  <RealMiniQR lotId={lot.id} />
                  <span className="mt-2 font-mono text-[10px] text-[#6B7280]">
                    QR-{String(i + 1).padStart(3, "0")}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">
                    {Math.floor(Math.random() * 30) + 1} scans
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-[12px] text-[#9CA3AF]">
              Affichage de {Math.min(8, Math.max(1, lot.qrCodes))} QR codes sur {formatNombre(lot.qrCodes)} —{" "}
              <button
                className="font-medium text-[#2563EB] hover:underline"
                onClick={() => setPage("qr-codes")}
              >
                Voir tous les QR codes →
              </button>
            </p>
          </SectionCard>

          {/* Pays de vente */}
          <SectionCard title="Pays de vente" subtitle="Marchés où ce lot est commercialisé">
            <div className="flex flex-wrap gap-2">
              {PAYS_VENTE.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#D1FAE5] bg-[#D1FAE5]/40 px-3 py-1 text-[13px] font-medium text-[#065F46]"
                >
                  <span className="text-[14px]">🌍</span>
                  {p}
                </span>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-6">
          {/* Statistiques */}
          <SectionCard title="Statistiques" subtitle="Performance du lot">
            <div className="text-center">
              <p className="text-[12px] uppercase tracking-wide text-[#6B7280]">
                Scans totaux
              </p>
              <p className="mt-1 font-display text-[40px] font-bold leading-none text-[#2563EB]">
                {formatNombre(lot.scans)}
              </p>
            </div>
            <div className="mt-4 space-y-2 border-t border-[#F3F4F6] pt-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-[#6B7280]">
                  <BarChart3 className="h-4 w-4" />
                  Scans / jour (moyenne)
                </span>
                <span className="font-semibold text-[#111827]">
                  {formatNombre(scansParJour)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-[#6B7280]">
                  <Clock className="h-4 w-4" />
                  Dernière consultation
                </span>
                <span className="font-semibold text-[#111827]">il y a 3h</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-[#6B7280]">
                  <Tag className="h-4 w-4" />
                  QR codes générés
                </span>
                <span className="font-semibold text-[#111827]">
                  {formatNombre(lot.qrCodes)}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Actions */}
          <SectionCard title="Actions" subtitle="Gérer ce lot">
            <div className="space-y-2">
              <ActionButton
                icon={Download}
                label="Télécharger QR"
                onClick={handleDownloadQR}
              />
              <ActionButton
                icon={Copy}
                label={copied ? "Lien copié ✓" : "Copier le lien"}
                onClick={copyLink}
                active={copied}
              />
              <ActionButton
                icon={AlertTriangle}
                label="Marquer comme rappelé"
                variant="orange"
                onClick={handleMarkRecalled}
              />
              <ActionButton
                icon={Trash2}
                label="Supprimer"
                variant="red"
                onClick={handleDelete}
              />
            </div>
          </SectionCard>

          {/* Produit associé */}
          <SectionCard title="Produit associé" subtitle="Voir le produit parent">
            <button
              onClick={() => openDetail("produit-detail", lot.produitId)}
              className="flex w-full items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3 text-left transition-colors hover:bg-[#F9FAFB]"
            >
              <ProductImage
                src={lot.produitPhoto}
                alt={lot.produitNom}
                icon={lot.produitIcon}
                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-[#111827]">
                  {lot.produitNom}
                </p>
                <p className="truncate text-[12px] text-[#6B7280]">
                  {produits.find((p) => p.id === lot.produitId)?.marque || "Sarine Bio"} ·{" "}
                  {produits.find((p) => p.id === lot.produitId)?.categorie}
                </p>
              </div>
              <ArrowLeft className="h-4 w-4 rotate-180 text-[#9CA3AF]" />
            </button>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================
function InfoField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="mb-1 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-[#6B7280]">
        <span className="text-[#9CA3AF]">{icon}</span>
        {label}
      </dt>
      <dd className="text-[14px] text-[#374151]">{value}</dd>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  variant?: "default" | "orange" | "red";
  active?: boolean;
}) {
  const styles =
    variant === "red"
      ? "border-[#FEE2E2] bg-[#FEE2E2]/40 text-[#991B1B] hover:bg-[#FEE2E2]"
      : variant === "orange"
      ? "border-[#FED7AA] bg-[#FFF7ED] text-[#9A3412] hover:bg-[#FFEDD5]"
      : active
      ? "border-[#D1FAE5] bg-[#D1FAE5]/40 text-[#065F46]"
      : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]";
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-colors ${styles}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function RealMiniQR({ lotId }: { lotId: string }) {
  return (
    <QRCodeCanvas
      value={getScanUrl(lotId)}
      size={84}
      level="M"
      marginSize={0}
      fgColor="#111827"
      bgColor="#FFFFFF"
      style={{ width: "100%", height: "auto" }}
    />
  );
}
