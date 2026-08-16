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
  ChevronDown,
} from "lucide-react";
import {
  EmptyState,
  GradientButton,
  OutlineButton,
  PageHeader,
  PillFilter,
  StatusBadge,
} from "../ui";
import {
  CATEGORIES,
  formatNombre,
  type Product,
  type ProductStatus,
} from "@/lib/fabricant-types";
import { useFabricantNav } from "@/lib/fabricant-store";
import { useFabricantData } from "../FabricantDataProvider";
import { ProductImage } from "@/components/fabricant/ProductImage";
import { DynamicProductForm } from "../DynamicProductForm";
import { toast } from "sonner";

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
  onDuplicate,
  onToggleStatus,
  onDelete,
}: {
  product: Product;
  onVoir: () => void;
  onModifier: () => void;
  onLots: () => void;
  onDuplicate: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group overflow-hidden rounded-xl border border-[#E5E7EB] bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative h-[200px] w-full overflow-hidden bg-[#F3F4F6]">
        <ProductImage
          src={product.photo}
          alt={product.nom}
          icon={product.categorieIcon}
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
                    onClick={() => {
                      setMenuOpen(false);
                      onDuplicate();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#374151] hover:bg-[#F9FAFB]"
                  >
                    <Copy size={14} className="text-[#6B7280]" />
                    Dupliquer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleStatus();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#374151] hover:bg-[#F9FAFB]"
                  >
                    {product.status === "masque" ? "Afficher" : "Masquer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
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
// Product modal (create / edit)
// ============================================================================
// Replaced the legacy inline form with the new DynamicProductForm (V3 Phase 3):
// 4 tabs (general / category / export / certifications) backed by the dynamic
// FieldConfig schemas in src/lib/product-schemas.ts. The form internally
// manages its own modal shell (backdrop + motion.div + header + tabs + body
// + footer) and calls onClose() when the user cancels or submits successfully.
// It also calls refresh() from useFabricantData so the parent list updates.
function ProductModal({
  product,
  onClose,
  onEditExisting,
}: {
  product?: Product;
  onClose: () => void;
  onEditExisting?: (productId: string) => void;
}) {
  // Translate the Product shape into DynamicProductForm's initialData.
  // V3 Phase 3: categoryId, isExport, categoryData, exportData, and
  // certifications are now round-tripped via mapProduct() in
  // fabricant-server-data.ts (JSON-encoded strings parsed back to objects).
  const initialData = product
    ? {
        id: product.id,
        name: product.nom,
        brand: product.marque,
        description: product.description,
        weight: product.poids,
        imageUrl: product.photo,
        status: product.status,
        categoryId: product.categoryId ?? undefined,
        isExport: product.isExport ?? false,
        categoryData: product.categoryData ?? undefined,
        exportData: product.exportData ?? undefined,
        certifications: product.certifications ?? undefined,
        // Open Food Facts — round-trip the barcode + raw OFF payload so the
        // edit form pre-fills them. Without this, the fabricant would see an
        // empty barcode field when editing a product they previously scanned.
        barcode: product.barcode ?? undefined,
        offData: product.offData ?? undefined,
      }
    : undefined;

  return (
    <DynamicProductForm
      initialData={initialData}
      onClose={onClose}
      onEditExisting={onEditExisting}
    />
  );
}

// ============================================================================
// Main page
// ============================================================================
export function ProduitsPage() {
  const { openDetail, setPage } = useFabricantNav();
  const { data, refresh } = useFabricantData();
  const produits = data.products;

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("toutes");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("tous");
  const [sortFilter, setSortFilter] = useState<SortFilter>("recent");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(
    undefined
  );

  async function handleDelete(id: string, nom: string) {
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec de la suppression");
      }
      toast.success(`Produit « ${nom} » supprimé`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inattendue");
    }
  }

  async function handleDuplicate(p: Product) {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${p.nom} (copie)`,
          brand: p.marque,
          category: p.categorie,
          weight: p.poids,
          description: p.description,
          imageUrl: p.photo,
          isPublic: p.status !== "masque",
          status: p.status === "brouillon" ? "ARCHIVED" : "ACTIVE",
        }),
      });
      if (!res.ok) throw new Error("Échec de la duplication");
      toast.success(`« ${p.nom} » dupliqué`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inattendue");
    }
  }

  async function handleToggleStatus(p: Product) {
    const newStatus = p.status === "masque" ? "actif" : "masque";
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublic: newStatus !== "masque",
          // newStatus is "actif" | "masque" — both map to ACTIVE; only the
          // isPublic flag toggles. (Brouillon status is set elsewhere via
          // the create/edit modal.)
          status: "ACTIVE",
        }),
      });
      if (!res.ok) throw new Error("Échec de la mise à jour");
      toast.success(newStatus === "masque" ? "Produit masqué" : "Produit affiché");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inattendue");
    }
  }

  const filtered = useMemo(() => {
    let list = produits.filter((p) => {
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
  }, [produits, search, categoryFilter, statusFilter, sortFilter]);

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

  // ── "Edit existing product" shortcut (barcode conflict) ───────────
  // When the DynamicProductForm detects a barcode conflict on a product
  // that belongs to the current fabricant (HTTP 409 with own=true), it
  // calls this handler with the conflicting product's id. We look it up
  // in the local cache and open the edit modal so the user can fix the
  // existing product instead of re-typing everything. If the product
  // isn't in the cache yet (e.g. created by another tab/session), we
  // trigger a refresh and inform the user.
  const handleEditExisting = (productId: string) => {
    const found = data.products.find((p) => p.id === productId);
    if (found) {
      openEdit(found);
    } else {
      toast.info("Produit conflictuel introuvable dans la liste locale. Rafraîchissement…", {
        duration: 6000,
      });
      refresh();
    }
  };

  return (
    <div>
      <PageHeader title="Mes Produits" subtitle={`${produits.length} produits créés`}>
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
              onDuplicate={() => handleDuplicate(p)}
              onToggleStatus={() => handleToggleStatus(p)}
              onDelete={() => {
                if (
                  window.confirm(
                    `Supprimer le produit "${p.nom}" ? Cette action est irréversible.`
                  )
                ) {
                  handleDelete(p.id, p.nom);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ProductModal
            // Force a fresh mount whenever the target product changes
            // (create vs edit, or switching between products). Without this
            // key, React reuses the same DynamicProductForm instance and its
            // useState hooks (name, barcode, categoryData, …) keep their old
            // values instead of re-initializing from `initialData`.
            key={editingProduct?.id ?? "new"}
            product={editingProduct}
            onClose={closeModal}
            onEditExisting={handleEditExisting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
