"use client";

import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import {
  ArrowLeft,
  Pencil,
  QrCode,
  BarChart3,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Package,
  Tag,
  Calendar,
  Layers,
  X,
  ChevronDown,
  Upload,
  Loader2,
} from "lucide-react";
import {
  CountUpNumber,
  EmptyState,
  GradientButton,
  OutlineButton,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../ui";
import {
  CATEGORIES,
  MARQUE,
  formatNombre,
  type Lot,
  type Product,
  type ProductStatus,
} from "@/lib/fabricant-data";
import { useFabricantNav } from "@/lib/fabricant-store";
import { useProduits, useLots } from "@/lib/fabricant-data-store";
import { ProductImage } from "@/components/fabricant/ProductImage";
import { getScanUrl, downloadQRCode } from "@/lib/qr-utils";
import { toast } from "sonner";

// ============================================================================
// Info row
// ============================================================================
function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#F3F4F6] py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[13px] font-medium text-[#6B7280]">{label}</span>
      <span className="text-[14px] text-[#111827] sm:text-right">
        {children}
      </span>
    </div>
  );
}

// ============================================================================
// Mini KPI
// ============================================================================
function MiniKpi({
  icon,
  iconBg,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div
        className="mb-2 flex h-10 w-10 items-center justify-center rounded-full text-[18px]"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <p className="text-[12px] text-[#6B7280]">{label}</p>
      <p className="mt-0.5 font-display text-[24px] font-bold leading-none text-[#111827]">
        <CountUpNumber end={value} suffix={suffix} />
      </p>
    </div>
  );
}

// ============================================================================
// Action button (sidebar)
// ============================================================================
function ActionButton({
  icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
        variant === "danger"
          ? "border-[#FEE2E2] bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEE2E2]"
          : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
      }`}
    >
      <span className={variant === "danger" ? "text-[#EF4444]" : "text-[#6B7280]"}>
        {icon}
      </span>
      {label}
    </button>
  );
}

// ============================================================================
// Lot row
// ============================================================================
function LotRow({ lot }: { lot: Lot }) {
  return (
    <tr className="border-t border-[#F3F4F6]">
      <td className="px-4 py-2.5 text-[13px] font-medium text-[#111827]">
        {lot.numero}
      </td>
      <td className="px-4 py-2.5 text-[13px] text-[#6B7280]">
        {lot.dateFabrication}
      </td>
      <td className="px-4 py-2.5">
        <StatusBadge status={lot.status} />
      </td>
      <td className="px-4 py-2.5 text-right text-[13px] text-[#374151]">
        {formatNombre(lot.scans)}
      </td>
    </tr>
  );
}

// ============================================================================
// Shared input style
// ============================================================================
const inputClass =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
      {children}
      {required && <span className="ml-0.5 text-[#EF4444]">*</span>}
    </label>
  );
}

// ============================================================================
// Edit modal — lets the fabricant update the product info inline.
// ============================================================================
function EditProductModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { updateProduct } = useProduits();
  const [nom, setNom] = useState(product.nom);
  const [marque, setMarque] = useState(product.marque);
  const [categorie, setCategorie] = useState(product.categorie);
  const [poids, setPoids] = useState(product.poids);
  const [description, setDescription] = useState(product.description);
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [imageUrl, setImageUrl] = useState(product.photo);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cat = CATEGORIES.find((c) => c.nom === categorie);
  const catIcon = cat?.icon ?? "📦";
  const canSubmit = nom.trim().length > 0;

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner un fichier image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le fichier dépasse 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Échec de l'upload.");
        return;
      }
      setImageUrl(data.url);
    } catch {
      toast.error("Erreur réseau lors de l'upload.");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    if (!canSubmit) return;
    updateProduct(product.id, {
      nom: nom.trim(),
      marque: marque.trim() || MARQUE.nom,
      categorie,
      categorieIcon: catIcon,
      poids: poids.trim(),
      description: description.trim(),
      status,
      photo: imageUrl,
    });
    toast.success("Produit mis à jour avec succès");
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-[700px] overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F3F4F6] px-6 py-4">
          <div>
            <h2 className="font-display text-[18px] font-bold text-[#111827]">
              Modifier le produit
            </h2>
            <p className="mt-0.5 text-[13px] text-[#6B7280]">
              Mettez à jour les informations de votre produit.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F9FAFB]"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="grid max-h-[calc(92vh-130px)] grid-cols-1 gap-6 overflow-y-auto px-6 py-5 lg:grid-cols-5">
          {/* Left form */}
          <div className="space-y-4 lg:col-span-3">
            <div>
              <FieldLabel required>Nom du produit</FieldLabel>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel required>Marque</FieldLabel>
              <input
                type="text"
                value={marque}
                onChange={(e) => setMarque(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Catégorie</FieldLabel>
                <div className="relative">
                  <select
                    value={categorie}
                    onChange={(e) => setCategorie(e.target.value)}
                    className={`${inputClass} appearance-none pr-9`}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.nom}>
                        {c.icon} {c.nom}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Poids / Contenance</FieldLabel>
                <input
                  type="text"
                  value={poids}
                  onChange={(e) => setPoids(e.target.value)}
                  placeholder="500ml"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className={`${inputClass} resize-none`}
              />
            </div>
            <div>
              <FieldLabel>Statut</FieldLabel>
              <div className="flex gap-2">
                {(
                  [
                    { v: "actif", l: "Actif", c: "#10B981" },
                    { v: "brouillon", l: "Brouillon", c: "#F59E0B" },
                    { v: "masque", l: "Masqué", c: "#6B7280" },
                  ] as const
                ).map((o) => {
                  const selected = status === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setStatus(o.v)}
                      className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${
                        selected
                          ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                          : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
                      }`}
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: o.c }}
                      />
                      {o.l}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right — image upload */}
          <div className="lg:col-span-2">
            <FieldLabel>Photo du produit</FieldLabel>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
              className={`relative flex h-[200px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
                dragActive
                  ? "border-[#2563EB] bg-[#EFF6FF]"
                  : "border-[#E5E7EB] bg-[#F9FAFB]"
              }`}
            >
              {imageUrl ? (
                <>
                  <img
                    src={imageUrl}
                    alt="Aperçu"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-[#6B7280] shadow hover:bg-white"
                    aria-label="Retirer la photo"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 text-[#6B7280]"
                >
                  {uploading ? (
                    <Loader2 size={28} className="animate-spin" />
                  ) : (
                    <Upload size={28} />
                  )}
                  <span className="text-[13px] font-medium">
                    {uploading ? "Upload…" : "Cliquez ou glissez une image"}
                  </span>
                  <span className="text-[11px] text-[#9CA3AF]">
                    JPG, PNG, WebP — 5 MB max
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-4">
          <OutlineButton onClick={onClose}>Annuler</OutlineButton>
          <GradientButton onClick={handleSubmit} disabled={!canSubmit}>
            Enregistrer les modifications
          </GradientButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Main page
// ============================================================================
export function ProduitDetailPage() {
  const { selectedId, setPage } = useFabricantNav();
  const { produits, deleteProduct, toggleProductStatus } = useProduits();
  const { lots } = useLots();
  const [editOpen, setEditOpen] = useState(false);

  const product: Product | undefined = produits.find(
    (p) => p.id === selectedId
  );

  if (!product) {
    return (
      <div>
        <OutlineButton onClick={() => setPage("produits")} className="mb-4">
          <ArrowLeft size={16} />
          Retour aux produits
        </OutlineButton>
        <EmptyState
          icon="📦"
          title="Produit introuvable"
          subtitle="Le produit sélectionné n'existe pas ou a été supprimé."
          action={
            <OutlineButton onClick={() => setPage("produits")}>
              Retour aux produits
            </OutlineButton>
          }
        />
      </div>
    );
  }

  const productLots = lots.filter((l) => l.produitId === product.id);

  // The QR code encodes the public scan URL for this product. We use the
  // product's first lot id when available (so scanning opens a real lot
  // passport), otherwise fall back to the product id (which resolves to the
  // friendly "not found" page — never a raw 404).
  const qrLotId = productLots[0]?.id ?? product.id;
  const scanUrl = getScanUrl(qrLotId);

  function handleDownloadQR() {
    downloadQRCode(scanUrl, `qr-${product!.nom.replace(/\s+/g, "-").toLowerCase()}.png`);
    toast.success("QR code téléchargé");
  }

  function handleToggleStatus() {
    toggleProductStatus(product!.id);
    toast.success(
      product!.status === "masque" ? "Produit affiché" : "Produit masqué"
    );
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Supprimer le produit "${product!.nom}" ? Cette action est irréversible.`
      )
    )
      return;
    deleteProduct(product!.id);
    toast.success("Produit supprimé");
    setPage("produits");
  }

  return (
    <div>
      {/* Back button */}
      <div className="mb-4">
        <OutlineButton onClick={() => setPage("produits")}>
          <ArrowLeft size={16} />
          Retour aux produits
        </OutlineButton>
      </div>

      <PageHeader title={product.nom} subtitle={`Marque : ${product.marque}`}>
        <StatusBadge status={product.status} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT — main info (col-span-2) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Large photo */}
          <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F3F4F6]">
            <ProductImage
              src={product.photo}
              alt={product.nom}
              icon={product.categorieIcon}
              className="h-[400px] w-full object-cover"
            />
          </div>

          {/* Informations générales */}
          <SectionCard
            title="Informations générales"
            action={
              <OutlineButton
                className="!px-3 !py-1.5 !text-[12px]"
                onClick={() => setEditOpen(true)}
              >
                <Pencil size={14} />
                Modifier
              </OutlineButton>
            }
          >
            <div className="space-y-0">
              <InfoRow label="Nom du produit">{product.nom}</InfoRow>
              <InfoRow label="Marque">{product.marque}</InfoRow>
              <InfoRow label="Catégorie">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[12px] text-[#374151]">
                  <span>{product.categorieIcon}</span>
                  <span>{product.categorie}</span>
                </span>
              </InfoRow>
              <InfoRow label="Poids / Contenance">{product.poids}</InfoRow>
              <InfoRow label="Description">
                <span className="max-w-md text-[13px] leading-relaxed">
                  {product.description}
                </span>
              </InfoRow>
              <InfoRow label="Date de création">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#6B7280]" />
                  {product.createdAt}
                </span>
              </InfoRow>
              <InfoRow label="Statut">
                <StatusBadge status={product.status} />
              </InfoRow>
            </div>
          </SectionCard>

          {/* Statistiques */}
          <SectionCard title="Statistiques" subtitle="Aperçu de l'activité du produit">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MiniKpi
                icon={<Layers size={18} className="text-[#2563EB]" />}
                iconBg="#EFF6FF"
                label="Lots"
                value={product.lots}
              />
              <MiniKpi
                icon={<BarChart3 size={18} className="text-[#10B981]" />}
                iconBg="#D1FAE5"
                label="Scans totaux"
                value={product.scans}
              />
              <MiniKpi
                icon={<Package size={18} className="text-[#F59E0B]" />}
                iconBg="#FEF3C7"
                label="Scans / mois"
                value={product.scansParMois}
                suffix="/mois"
              />
            </div>
          </SectionCard>

          {/* Lots associés */}
          <SectionCard
            title="Lots associés"
            subtitle={`${productLots.length} lot${productLots.length > 1 ? "s" : ""} pour ce produit`}
            action={
              <OutlineButton
                className="!px-3 !py-1.5 !text-[12px]"
                onClick={() => setPage("lots")}
              >
                <Tag size={14} />
                Voir tous les lots
              </OutlineButton>
            }
            bodyClassName="p-0"
          >
            {productLots.length === 0 ? (
              <div className="px-5 py-10 text-center text-[13px] text-[#6B7280]">
                Aucun lot associé à ce produit pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#F3F4F6] text-left">
                      <th className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                        Numéro
                      </th>
                      <th className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                        Date fabrication
                      </th>
                      <th className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                        Statut
                      </th>
                      <th className="px-4 py-2.5 text-right text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                        Scans
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {productLots.slice(0, 8).map((lot) => (
                      <LotRow key={lot.id} lot={lot} />
                    ))}
                  </tbody>
                </table>
                {productLots.length > 8 && (
                  <div className="border-t border-[#F3F4F6] px-4 py-3 text-center text-[12px] text-[#6B7280]">
                    + {productLots.length - 8} autres lots
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>

        {/* RIGHT — sidebar (col-span-1) */}
        <div className="space-y-6">
          {/* Actions rapides */}
          <SectionCard title="Actions rapides">
            <div className="space-y-2">
              <ActionButton
                icon={<Pencil size={16} />}
                label="Modifier le produit"
                onClick={() => setEditOpen(true)}
              />
              <ActionButton
                icon={<QrCode size={16} />}
                label="Générer QR codes"
                onClick={() => setPage("qr-codes")}
              />
              <ActionButton
                icon={<BarChart3 size={16} />}
                label="Voir les scans"
                onClick={() => setPage("statistiques")}
              />
              <ActionButton
                icon={
                  product.status === "masque" ? <Eye size={16} /> : <EyeOff size={16} />
                }
                label={
                  product.status === "masque" ? "Afficher le produit" : "Masquer le produit"
                }
                onClick={handleToggleStatus}
              />
              <ActionButton
                icon={<Trash2 size={16} />}
                label="Supprimer le produit"
                variant="danger"
                onClick={handleDelete}
              />
            </div>
          </SectionCard>

          {/* QR code — REAL scannable QR code using qrcode.react */}
          <SectionCard title="QR code du produit" subtitle="Scannez pour voir la fiche publique">
            <div className="flex flex-col items-center">
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
                <QRCodeCanvas
                  value={scanUrl}
                  size={180}
                  level="M"
                  marginSize={1}
                  fgColor="#111827"
                  bgColor="#FFFFFF"
                />
              </div>
              <p className="mt-3 break-all text-center text-[11px] text-[#6B7280]">
                {scanUrl}
              </p>
              <p className="mt-1 text-[12px] text-[#6B7280]">
                Code : VS-{product.id.toUpperCase()}-{product.scans}
              </p>
              <GradientButton className="mt-3 w-full" onClick={handleDownloadQR}>
                <Download size={16} />
                Télécharger
              </GradientButton>
            </div>
          </SectionCard>

          {/* Mini info card */}
          <SectionCard title="Résumé">
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Statut</span>
                <StatusBadge status={product.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Lots actifs</span>
                <span className="font-semibold text-[#111827]">
                  {formatNombre(product.lots)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Total scans</span>
                <span className="font-semibold text-[#111827]">
                  {formatNombre(product.scans)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Créé le</span>
                <span className="font-semibold text-[#111827]">
                  {product.createdAt}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editOpen && (
          <EditProductModal
            product={product}
            onClose={() => setEditOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
