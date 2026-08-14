"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Pause, Play, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, SectionTitle, Card, Badge, Button } from "@/components/admin/ui";
import { useAdminData, useAdminMutations } from "@/components/admin/AdminDataProvider";
import type { AdminCategory } from "@/lib/admin-server-data";

type FormState = {
  name: string;
  emoji: string;
  description: string;
  order: number;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  emoji: "",
  description: "",
  order: 0,
  active: true,
};

export function CategoriesPage() {
  const { categories: initialCategories } = useAdminData();
  const { setCategories: setCategoriesCtx } = useAdminMutations();
  const [categories, setCategories] = useState<AdminCategory[]>(initialCategories);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<{ name?: string; emoji?: string }>({});

  const activeCount = categories.filter((c) => c.active).length;

  function syncState(next: AdminCategory[]) {
    setCategories(next);
    setCategoriesCtx(next);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(cat: AdminCategory) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      emoji: cat.emoji,
      description: cat.description,
      order: cat.order,
      active: cat.active,
    });
    setErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setErrors({});
  }

  function validate(): boolean {
    const next: { name?: string; emoji?: string } = {};
    const name = form.name.trim();
    if (!name) next.name = "Le nom est obligatoire.";
    else if (name.length < 3) next.name = "Le nom doit contenir au moins 3 caractères.";
    else if (name.length > 50) next.name = "Le nom ne doit pas dépasser 50 caractères.";
    if (!form.emoji.trim()) next.emoji = "L'emoji est obligatoire.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const palette = ["#3B82F6", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6", "#EAB308", "#84CC16", "#EC4899", "#6B7280"];
    if (editingId) {
      // PATCH existing category
      try {
        const res = await fetch(`/api/admin/categories/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            emoji: form.emoji.trim(),
            description: form.description.trim(),
            order: form.order,
            isActive: form.active,
          }),
        });
        if (!res.ok) throw new Error("Échec de l'enregistrement");
        const updated = (await res.json()) as AdminCategory;
        syncState(categories.map((c) => (c.id === editingId ? { ...c, ...updated, color: c.color } : c)));
        toast.success("Catégorie enregistrée");
      } catch (e) {
        toast.error((e as Error).message);
      }
    } else {
      // POST new category
      try {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            emoji: form.emoji.trim(),
            description: form.description.trim(),
            order: form.order,
            isActive: form.active,
          }),
        });
        if (!res.ok) throw new Error("Échec de la création");
        const created = (await res.json()) as AdminCategory;
        const newCat: AdminCategory = {
          ...created,
          color: palette[categories.length % palette.length],
        };
        syncState([...categories, newCat]);
        toast.success("Catégorie enregistrée");
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
    closeModal();
  }

  async function handleToggle(cat: AdminCategory) {
    const nextActive = !cat.active;
    // Optimistic update
    syncState(categories.map((c) => (c.id === cat.id ? { ...c, active: nextActive } : c)));
    try {
      await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      toast.success(nextActive ? "Catégorie activée" : "Catégorie désactivée");
    } catch {
      toast.error("Échec de la mise à jour");
      // revert
      syncState(categories);
    }
  }

  async function handleDelete(cat: AdminCategory) {
    if (cat.products > 0) return;
    // Optimistic
    syncState(categories.filter((c) => c.id !== cat.id));
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Échec de la suppression");
      toast.success("Catégorie supprimée");
    } catch (e) {
      toast.error((e as Error).message);
      syncState(categories); // revert
    }
  }

  return (
    <PageContainer>
      <SectionTitle
        title="Gestion des Catégories"
        subtitle={`${activeCount} catégories actives`}
        action={
          <Button variant="primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvelle catégorie
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {categories
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onEdit={() => openEdit(cat)}
              onToggle={() => handleToggle(cat)}
              onDelete={() => handleDelete(cat)}
            />
          ))}
      </div>

      {modalOpen && (
        <CategoryModal
          editing={editingId !== null}
          form={form}
          errors={errors}
          onChange={setForm}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </PageContainer>
  );
}

function CategoryCard({
  category,
  onEdit,
  onToggle,
  onDelete,
}: {
  category: AdminCategory;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="group relative cursor-pointer p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2563EB]/40 hover:shadow-lg hover:shadow-[#2563EB]/5">
      <div onClick={onEdit} className="flex flex-col items-center text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-[40px] leading-none"
          style={{ backgroundColor: `${category.color}1A` }}
        >
          <span className="text-[40px] leading-none">{category.emoji}</span>
        </div>
        <h3 className="mt-4 text-[18px] font-semibold text-[#111827]">{category.name}</h3>
        <p className="mt-1 text-[14px] text-[#6B7280]">{category.products} produits</p>
        <div className="mt-3">
          {category.active ? (
            <Badge color="green">✅ Active</Badge>
          ) : (
            <Badge color="gray">⏸️ Inactive</Badge>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 border-t border-[#F3F4F6] pt-4">
        <IconAction label="Modifier" onClick={onEdit} tone="default">
          <Pencil className="h-4 w-4" />
        </IconAction>
        <IconAction label={category.active ? "Désactiver" : "Activer"} onClick={onToggle} tone="default">
          {category.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </IconAction>
        <IconAction
          label="Supprimer"
          onClick={onDelete}
          tone="danger"
          disabled={category.products > 0}
          title={category.products > 0 ? "Impossible de supprimer : des produits sont associés" : "Supprimer"}
        >
          <Trash2 className="h-4 w-4" />
        </IconAction>
      </div>
    </Card>
  );
}

function IconAction({
  children,
  onClick,
  label,
  tone = "default",
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  tone?: "default" | "danger";
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      className={[
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
        "border-[#E5E7EB] bg-white",
        disabled
          ? "cursor-not-allowed text-[#D1D5DB]"
          : tone === "danger"
            ? "text-[#EF4444] hover:border-[#EF4444] hover:bg-[#FEF2F2]"
            : "text-[#6B7280] hover:border-[#2563EB] hover:bg-[#EFF6FF] hover:text-[#2563EB]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function CategoryModal({
  editing,
  form,
  errors,
  onChange,
  onClose,
  onSave,
}: {
  editing: boolean;
  form: FormState;
  errors: { name?: string; emoji?: string };
  onChange: (next: FormState) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const hasErrors = !!errors.name || !!errors.emoji || !form.name.trim() || !form.emoji.trim();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-[500px] max-w-[90vw] overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F3F4F6] px-6 py-4">
          <h3 className="font-display text-[18px] font-bold text-[#111827]">
            {editing ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* Nom */}
          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-[#374151]">
              Nom <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex : Boissons, Épices..."
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            />
            {errors.name && <p className="mt-1 text-[13px] text-[#EF4444]">{errors.name}</p>}
          </div>

          {/* Emoji */}
          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-[#374151]">
              Icône / Emoji <span className="text-[#EF4444]">*</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#F9FAFB] text-[40px] leading-none">
                {form.emoji || "?"}
              </div>
              <input
                type="text"
                value={form.emoji}
                onChange={(e) => set("emoji", e.target.value)}
                placeholder="🥤"
                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
              />
            </div>
            {errors.emoji && <p className="mt-1 text-[13px] text-[#EF4444]">{errors.emoji}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-[#374151]">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value.slice(0, 200))}
              placeholder="Description courte..."
              rows={3}
              className="w-full resize-y rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            />
            <p className="mt-1 text-right text-[12px] text-[#9CA3AF]">{form.description.length}/200</p>
          </div>

          {/* Ordre */}
          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-[#374151]">Ordre d&apos;affichage</label>
            <input
              type="number"
              min={0}
              value={form.order}
              onChange={(e) => set("order", Number(e.target.value))}
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            />
            <p className="mt-1 text-[12px] text-[#9CA3AF]">
              Les catégories sont triées par ordre croissant dans l&apos;app.
            </p>
          </div>

          {/* Statut */}
          <div>
            <label className="mb-1.5 block text-[14px] font-medium text-[#374151]">Statut</label>
            <div className="inline-flex rounded-lg border border-[#E5E7EB] p-1">
              <button
                type="button"
                onClick={() => set("active", true)}
                className={[
                  "rounded-md px-4 py-1.5 text-[13px] font-semibold transition-colors",
                  form.active ? "bg-[#2563EB] text-white shadow-sm" : "text-[#6B7280] hover:text-[#111827]",
                ].join(" ")}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => set("active", false)}
                className={[
                  "rounded-md px-4 py-1.5 text-[13px] font-semibold transition-colors",
                  !form.active ? "bg-[#6B7280] text-white shadow-sm" : "text-[#6B7280] hover:text-[#111827]",
                ].join(" ")}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={onSave} disabled={hasErrors}>
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
