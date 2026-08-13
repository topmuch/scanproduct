"use client";

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
  formatNombre,
  type Lot,
  type Product,
} from "@/lib/fabricant-data";
import { useFabricantNav } from "@/lib/fabricant-store";
import { useProduits, useLots } from "@/lib/fabricant-data-store";
import { ProductImage } from "@/components/fabricant/ProductImage";

// ============================================================================
// Finder square (extracted to top-level to avoid "component during render")
// ============================================================================
function FinderSquare({ x, y, cellSize }: { x: number; y: number; cellSize: number }) {
  return (
    <g>
      <rect
        x={x * cellSize}
        y={y * cellSize}
        width={cellSize * 7}
        height={cellSize * 7}
        fill="#111827"
      />
      <rect
        x={(x + 1) * cellSize}
        y={(y + 1) * cellSize}
        width={cellSize * 5}
        height={cellSize * 5}
        fill="#FFFFFF"
      />
      <rect
        x={(x + 2) * cellSize}
        y={(y + 2) * cellSize}
        width={cellSize * 3}
        height={cellSize * 3}
        fill="#111827"
      />
    </g>
  );
}

// ============================================================================
// Fake QR code (deterministic SVG based on product id)
// ============================================================================
function FakeQRCode({ seed, size = 180 }: { seed: string; size?: number }) {
  const cells = 21;
  const cellSize = size / cells;

  // Deterministic hash from seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const rand = (i: number) => {
    const x = Math.sin(hash + i) * 10000;
    return x - Math.floor(x);
  };

  const isFinder = (r: number, c: number) => {
    // top-left, top-right, bottom-left 7x7 finder squares
    const inBox = (br: number, bc: number) =>
      r >= br && r < br + 7 && c >= bc && c < bc + 7;
    return inBox(0, 0) || inBox(0, cells - 7) || inBox(cells - 7, 0);
  };

  const modules: React.ReactNode[] = [];
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if (isFinder(r, c)) continue;
      if (rand(r * cells + c) > 0.55) {
        modules.push(
          <rect
            key={`${r}-${c}`}
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#111827"
          />
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-lg"
      role="img"
      aria-label="QR code"
    >
      <rect width={size} height={size} fill="#FFFFFF" />
      {modules}
      <FinderSquare x={0} y={0} cellSize={cellSize} />
      <FinderSquare x={cells - 7} y={0} cellSize={cellSize} />
      <FinderSquare x={0} y={cells - 7} cellSize={cellSize} />
    </svg>
  );
}

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
// Main page
// ============================================================================
export function ProduitDetailPage() {
  const { selectedId, setPage } = useFabricantNav();
  const { produits } = useProduits();
  const { lots } = useLots();

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
          <SectionCard title="Informations générales">
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
              />
              <ActionButton
                icon={<QrCode size={16} />}
                label="Générer QR codes"
              />
              <ActionButton
                icon={<BarChart3 size={16} />}
                label="Voir les scans"
              />
              <ActionButton
                icon={
                  product.status === "masque" ? <Eye size={16} /> : <EyeOff size={16} />
                }
                label={
                  product.status === "masque" ? "Afficher le produit" : "Masquer le produit"
                }
              />
              <ActionButton
                icon={<Trash2 size={16} />}
                label="Supprimer le produit"
                variant="danger"
              />
            </div>
          </SectionCard>

          {/* QR code */}
          <SectionCard title="QR code du produit" subtitle="Scannez pour voir la fiche publique">
            <div className="flex flex-col items-center">
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
                <FakeQRCode seed={product.id} size={180} />
              </div>
              <p className="mt-3 text-[12px] text-[#6B7280]">
                Code : VS-{product.id.toUpperCase()}-{product.scans}
              </p>
              <GradientButton className="mt-3 w-full">
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
    </div>
  );
}
