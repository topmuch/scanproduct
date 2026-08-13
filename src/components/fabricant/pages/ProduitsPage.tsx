"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Tag,
  MoreVertical,
  Trash2,
  Copy,
  Camera,
  X,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  CountUpNumber,
  EmptyState,
  GradientButton,
  OutlineButton,
  PageHeader,
  PillFilter,
  StatusBadge,
} from "../ui";
import {
  CATEGORIES,
  MARQUE,
  PRODUITS,
  formatNombre,
  type Product,
  type ProductStatus,
} from "@/lib/fabricant-data";
import { useFabricantNav } from "@/lib/fabricant-store";

// ============================================================================
// Types
// ============================================================================
type StatusFilter = "tous" | ProductStatus;
type SortFilter = "recent" | "ancien" | "a-z" | "z-a" | "plus-scane";

// ============================================================================
// Product card
// ============================================================================
function ProductCard({
  product,
  onVoir,
  onModifier,
  onLots,
}: {
  product: Product;
  onVoir: () => void;
  onModifier: () => void;
  onLots: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group overflow-hidden rounded-xl border border-[#E5E7EB] bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative h-[200px] w-full overflow-hidden bg-[#F3F4F6]">
        { }
        <img
          src={product.photo}
          alt={product.nom}
          className="h-full w-full object-cover"
        />
        <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 backdrop-blur-sm">
          <StatusBadge status={product.status} />
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-[18px] font-semibold leading-tight text-[#111827]">
          {product.nom}
        </h3>
        <p className="mt-1 text-[13px] text-[#6B7280]">
          Marque : {product.marque}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[13px] text-[#374151]">
            <span>{product.categorieIcon}</span>
            <span>{product.categorie}</span>
          </span>
          <span className="text-[13px] text-[#6B7280]">{product.poids}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-[#6B7280]">
          <span className="inline-flex items-center gap-1">
            🏷️ {formatNombre(product.lots)} lots
          </span>
          <span className="inline-flex items-center gap-1">
            📱 {formatNombre(product.scans)} scans
          </span>
          <span className="inline-flex items-center gap-1">
            📊 {formatNombre(product.scansParMois)}/mois
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-[#F3F4F6] px-4 py-3">
        <button
          type="button"
          onClick={onVoir}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
        >
          <Eye size={14} />
          Voir
        </button>
        <button
          type="button"
          onClick={onModifier}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
        >
          <Pencil size={14} />
          Modifier
        </button>
        <button
          type="button"
          onClick={onLots}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
        >
          <Tag size={14} />
          Lots
        </button>

        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] transition-colors hover:bg-[#F9FAFB]"
            aria-label="Plus d'actions"
          >
            <MoreVertical size={14} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg"
                >
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#374151] hover:bg-[#F9FAFB]"
                  >
                    <Copy size={14} className="text-[#6B7280]" />
                    Dupliquer
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#374151] hover:bg-[#F9FAFB]"
                  >
                    {product.status === "masque" ? "Afficher" : "Masquer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#EF4444] hover:bg-[#FEE2E2]"
                  >
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}

// ============================================================================
// Switch (toggle)
// ============================================================================
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
      style={{ backgroundColor: checked ? "#10B981" : "#D1D5DB" }}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ============================================================================
// Radio button (status)
// ============================================================================
function StatusRadio({
  value,
  current,
  onChange,
  label,
  color,
}: {
  value: ProductStatus;
  current: ProductStatus;
  onChange: (v: ProductStatus) => void;
  label: string;
  color: string;
}) {
  const selected = value === current;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${
        selected
          ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
          : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
      }`}
    >
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </button>
  );
}

// ============================================================================
// Field label + input helpers
// ============================================================================
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
      {children}
      {required && <span className="ml-0.5 text-[#EF4444]">*</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition";

// ============================================================================
// Product modal (create / edit)
// ============================================================================
function ProductModal({
  product,
  onClose,
}: {
  product?: Product;
  onClose: () => void;
}) {
  const isEdit = !!product;
  const [nom, setNom] = useState(product?.nom ?? "");
  const [marque, setMarque] = useState(product?.marque ?? MARQUE.nom);
  const [categorie, setCategorie] = useState(product?.categorie ?? CATEGORIES[0].nom);
  const [poids, setPoids] = useState(product?.poids ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [visible, setVisible] = useState(true);
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "actif");

  const cat = CATEGORIES.find((c) => c.nom === categorie);
  const catIcon = cat?.icon ?? "📦";

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
        className="max-h-[92vh] w-full max-w-[800px] overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F3F4F6] px-6 py-4">
          <div>
            <h2 className="font-display text-[18px] font-bold text-[#111827]">
              {isEdit ? "Modifier le produit" : "Nouveau produit"}
            </h2>
            <p className="mt-0.5 text-[13px] text-[#6B7280]">
              {isEdit
                ? "Mettez à jour les informations de votre produit."
                : "Renseignez les informations de votre nouveau produit."}
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
          {/* Left form — col-span-3 */}
          <div className="space-y-6 lg:col-span-3">
            {/* Informations générales */}
            <section>
              <h3 className="mb-3 text-[14px] font-semibold text-[#111827]">
                Informations générales
              </h3>
              <div className="space-y-3">
                <div>
                  <FieldLabel required>Nom du produit</FieldLabel>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Ex : Jus de Bissap Premium"
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel required>Marque</FieldLabel>
                  <input
                    type="text"
                    value={marque}
                    onChange={(e) => setMarque(e.target.value)}
                    placeholder="Sarine Bio"
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
                  <div className="mb-1.5 flex items-center justify-between">
                    <FieldLabel>Description</FieldLabel>
                    <span className="text-[12px] text-[#9CA3AF]">
                      {description.length}/500
                    </span>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value.slice(0, 500))
                    }
                    placeholder="Décrivez votre produit en quelques lignes..."
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            </section>

            {/* Visuels */}
            <section>
              <h3 className="mb-3 text-[14px] font-semibold text-[#111827]">
                Visuels
              </h3>
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-4 py-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[28px] shadow-sm">
                  📷
                </div>
                <p className="text-[14px] font-medium text-[#374151]">
                  Glissez-déposez votre photo ici
                </p>
                <p className="mt-1 text-[13px] text-[#6B7280]">
                  ou cliquez pour parcourir
                </p>
                <p className="mt-3 text-[11px] text-[#9CA3AF]">
                  JPG, PNG, WebP (max 5MB)
                </p>
              </div>
            </section>

            {/* Visibilité */}
            <section>
              <h3 className="mb-3 text-[14px] font-semibold text-[#111827]">
                Visibilité
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-medium text-[#374151]">
                      Afficher dans le répertoire public
                    </p>
                    <p className="text-[12px] text-[#9CA3AF]">
                      Votre produit sera visible par les consommateurs
                    </p>
                  </div>
                  <Toggle checked={visible} onChange={setVisible} />
                </div>
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-[#374151]">
                    Statut du produit
                  </p>
                  <div className="flex gap-2">
                    <StatusRadio
                      value="actif"
                      current={status}
                      onChange={setStatus}
                      label="Actif"
                      color="#10B981"
                    />
                    <StatusRadio
                      value="brouillon"
                      current={status}
                      onChange={setStatus}
                      label="Brouillon"
                      color="#6B7280"
                    />
                    <StatusRadio
                      value="masque"
                      current={status}
                      onChange={setStatus}
                      label="Masqué"
                      color="#EF4444"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right preview — col-span-2 */}
          <div className="lg:col-span-2">
            <p className="mb-2 text-[14px] font-semibold text-[#111827]">
              Aperçu
            </p>
            <div className="rounded-xl bg-[#F9FAFB] p-4">
              <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
                <div className="flex h-32 items-center justify-center bg-[#F3F4F6] text-[40px] text-[#9CA3AF]">
                  📷
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px]">{catIcon}</span>
                    <h4 className="truncate text-[15px] font-semibold text-[#111827]">
                      {nom || "Nom du produit"}
                    </h4>
                  </div>
                  <p className="mt-0.5 text-[12px] text-[#6B7280]">
                    {marque || "Marque"} · {poids || "—"}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] text-[#374151]">
                    {catIcon} {categorie}
                  </span>
                  <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-[#6B7280]">
                    {description ||
                      "La description de votre produit apparaîtra ici pour aider les consommateurs à mieux comprendre votre offre."}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#D1FAE5] px-2 py-0.5 text-[11px] font-semibold text-[#065F46]">
                    <Check size={12} /> Produit authentique
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[#9CA3AF]">
                Ceci est un aperçu. Le rendu final peut varier.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-4">
          <OutlineButton onClick={onClose}>Annuler</OutlineButton>
          <OutlineButton onClick={onClose}>
            {isEdit ? "Enregistrer en brouillon" : "Enregistrer en brouillon"}
          </OutlineButton>
          <GradientButton onClick={onClose}>
            {isEdit ? "Enregistrer les modifications" : "Créer le produit"}
          </GradientButton>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Main page
// ============================================================================
export function ProduitsPage() {
  const { openDetail, setPage } = useFabricantNav();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("toutes");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("tous");
  const [sortFilter, setSortFilter] = useState<SortFilter>("recent");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(
    undefined
  );

  const filtered = useMemo(() => {
    let list = PRODUITS.filter((p) => {
      const matchSearch =
        !search ||
        p.nom.toLowerCase().includes(search.toLowerCase()) ||
        p.marque.toLowerCase().includes(search.toLowerCase()) ||
        p.categorie.toLowerCase().includes(search.toLowerCase());
      const matchCat =
        categoryFilter === "toutes" || p.categorie === categoryFilter;
      const matchStatus =
        statusFilter === "tous" || p.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });

    list = [...list].sort((a, b) => {
      switch (sortFilter) {
        case "recent":
          return b.createdAt.localeCompare(a.createdAt);
        case "ancien":
          return a.createdAt.localeCompare(b.createdAt);
        case "a-z":
          return a.nom.localeCompare(b.nom);
        case "z-a":
          return b.nom.localeCompare(a.nom);
        case "plus-scane":
          return b.scans - a.scans;
        default:
          return 0;
      }
    });

    return list;
  }, [search, categoryFilter, statusFilter, sortFilter]);

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("toutes");
    setStatusFilter("tous");
    setSortFilter("recent");
  };

  const openCreate = () => {
    setEditingProduct(undefined);
    setModalOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(undefined);
  };

  return (
    <div>
      <PageHeader title="Mes Produits" subtitle="24 produits créés">
        <GradientButton onClick={openCreate}>
          <Plus size={16} />
          Nouveau produit
        </GradientButton>
      </PageHeader>

      {/* Filters bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] py-2 pl-9 pr-3 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition"
          />
        </div>

        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none rounded-lg border border-[#E5E7EB] bg-white py-2 pl-3 pr-9 text-[14px] text-[#374151] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition"
          >
            <option value="toutes">Toutes les catégories</option>
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

        <PillFilter<StatusFilter>
          options={[
            { value: "tous", label: "Tous" },
            { value: "actif", label: "Actifs" },
            { value: "brouillon", label: "Brouillons" },
            { value: "masque", label: "Masqués" },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />

        <div className="relative">
          <select
            value={sortFilter}
            onChange={(e) => setSortFilter(e.target.value as SortFilter)}
            className="appearance-none rounded-lg border border-[#E5E7EB] bg-white py-2 pl-3 pr-9 text-[14px] text-[#374151] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition"
          >
            <option value="recent">Récent</option>
            <option value="ancien">Ancien</option>
            <option value="a-z">A-Z</option>
            <option value="z-a">Z-A</option>
            <option value="plus-scane">Plus scanné</option>
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
          />
        </div>
      </div>

      {/* Result count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-[#6B7280]">
          {filtered.length} produit{filtered.length > 1 ? "s" : ""} affiché
          {filtered.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Aucun produit trouvé"
          subtitle="Modifiez vos filtres pour voir vos produits."
          action={
            <OutlineButton onClick={resetFilters}>Réinitialiser</OutlineButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onVoir={() => openDetail("produit-detail", p.id)}
              onModifier={() => openEdit(p)}
              onLots={() => setPage("lots")}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ProductModal product={editingProduct} onClose={closeModal} />
        )}
      </AnimatePresence>
    </div>
  );
}
