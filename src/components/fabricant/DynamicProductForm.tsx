"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Globe2,
  Image as ImageIcon,
  Info,
  Loader2,
  Plus,
  Sticker,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  getActiveCategories,
  getCategoryFields,
  getProductSchema,
  groupFieldsByGroup,
  type FieldConfig,
  type ProductSchema,
} from "@/lib/product-schemas";
import type { ProductStatus } from "@/lib/fabricant-types";
import { useFabricantData } from "./FabricantDataProvider";
import { ImageUploadWithPreview } from "./ImageUploadWithPreview";
import {
  GradientButton,
  OutlineButton,
} from "./ui";

// ============================================================================
// Types
// ============================================================================

export type DynamicProductInitialData = {
  id?: string;
  name?: string;
  brand?: string;
  description?: string;
  weight?: string;
  imageUrl?: string;
  categoryId?: string;
  isExport?: boolean;
  categoryData?: Record<string, unknown>;
  exportData?: Record<string, unknown>;
  certifications?: { name: string; issuer?: string; validUntil?: string; fileUrl?: string }[];
  status?: ProductStatus;
};

type DynamicProductFormProps = {
  initialData?: DynamicProductInitialData;
  onClose: () => void;
};

type TabId = "general" | "category" | "export" | "certifications";

type CertificationRow = {
  name: string;
  issuer: string;
  validUntil: string;
  fileUrl: string;
};

// ============================================================================
// Style constants — match the existing fabricant dashboard palette.
// Primary accent: emerald #10B981 (differentiated from the legacy #2563EB
// blue used for input focus rings, which we keep for backward-compat with
// the rest of the dashboard).
// ============================================================================

const EMERALD = "#10B981";
const EMERALD_DARK = "#047857";

const inputClass =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition";

const TABS: { id: TabId; label: string; icon: typeof Tag }[] = [
  { id: "general", label: "Informations générales", icon: Info },
  { id: "category", label: "Spécificités produit", icon: Tag },
  { id: "export", label: "Export", icon: Globe2 },
  { id: "certifications", label: "Certifications", icon: Sticker },
];

// ============================================================================
// Field label helper
// ============================================================================

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[13px] font-medium text-[#374151]"
    >
      {children}
      {required && <span className="ml-0.5 text-[#EF4444]">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-[#EF4444]">
      <X size={12} /> {message}
    </p>
  );
}

// ============================================================================
// DynamicField — renders a single FieldConfig input.
// Supports all 8 documented field types.
// ============================================================================

function DynamicField({
  field,
  value,
  onChange,
  error,
  fieldId,
}: {
  field: FieldConfig;
  // Stored value: string | number | boolean | File | null
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  fieldId: string;
}) {
  const label = (
    <FieldLabel htmlFor={fieldId} required={field.required}>
      {field.label}
      {field.unit ? (
        <span className="ml-1 text-[11px] font-normal text-[#9CA3AF]">
          ({field.unit})
        </span>
      ) : null}
    </FieldLabel>
  );

  const help = field.helpText ? (
    <p className="mb-1 text-[11px] text-[#9CA3AF]">{field.helpText}</p>
  ) : null;

  const errorMsg = <FieldError message={error} />;

  switch (field.type) {
    case "textarea":
      return (
        <div>
          {label}
          {help}
          <textarea
            id={fieldId}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            maxLength={field.validation?.maxLength}
            className={`${inputClass} resize-none`}
          />
          {errorMsg}
        </div>
      );

    case "number": {
      const min = field.validation?.min;
      const max = field.validation?.max;
      return (
        <div>
          {label}
          {help}
          <input
            id={fieldId}
            type="number"
            value={(value as number | string) ?? ""}
            onChange={(e) =>
              onChange(
                e.target.value === ""
                  ? ""
                  : Number(e.target.value),
              )
            }
            placeholder={field.placeholder}
            min={min}
            max={max}
            step={field.unit === "°C" || field.unit === "%" ? "0.1" : "1"}
            className={inputClass}
          />
          {errorMsg}
        </div>
      );
    }

    case "date":
      return (
        <div>
          {label}
          {help}
          <input
            id={fieldId}
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
          {errorMsg}
        </div>
      );

    case "select":
      return (
        <div>
          {label}
          {help}
          <div className="relative">
            <select
              id={fieldId}
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputClass} appearance-none pr-9`}
            >
              <option value="">
                {field.placeholder ?? "— Sélectionner —"}
              </option>
              {(field.options ?? []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
            />
          </div>
          {errorMsg}
        </div>
      );

    case "checkbox":
      // Multi-value checkbox group (stored as string[]).
      return (
        <div>
          {label}
          {help}
          <div className="space-y-1.5">
            {(field.options ?? []).map((opt) => {
              const arr = Array.isArray(value) ? (value as string[]) : [];
              const checked = arr.includes(String(opt.value));
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] text-[#374151] hover:bg-[#F9FAFB]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...arr, String(opt.value)]
                        : arr.filter((v) => v !== String(opt.value));
                      onChange(next);
                    }}
                    className="h-4 w-4 rounded border-[#D1D5DB] text-[#10B981] focus:ring-[#10B981]"
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
          {errorMsg}
        </div>
      );

    case "boolean":
      return (
        <div>
          {label}
          {help}
          <button
            type="button"
            onClick={() => onChange(!value)}
            className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
            style={{ backgroundColor: value ? EMERALD : "#D1D5DB" }}
            aria-pressed={Boolean(value)}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                value ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          {errorMsg}
        </div>
      );

    case "file":
      // TODO(iteration 2): wire to /api/upload once we have a docs upload
      // endpoint. For now, accept the File object in state only — actual
      // persistence happens later.
      return (
        <div>
          {label}
          {help}
          <input
            id={fieldId}
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onChange(f);
            }}
            className="block w-full text-[12px] text-[#6B7280] file:mr-3 file:rounded-md file:border-0 file:bg-[#F3F4F6] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-[#374151] hover:file:bg-[#E5E7EB]"
          />
          {value instanceof File ? (
            <p className="mt-1.5 flex items-center gap-1 text-[12px] text-[#10B981]">
              <Check size={12} /> {value.name}
            </p>
          ) : typeof value === "string" && value ? (
            <p className="mt-1.5 flex items-center gap-1 text-[12px] text-[#6B7280]">
              <ImageIcon size={12} /> Document existant
            </p>
          ) : null}
          {errorMsg}
        </div>
      );

    case "text":
    default:
      return (
        <div>
          {label}
          {help}
          <input
            id={fieldId}
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.validation?.maxLength}
            className={inputClass}
          />
          {errorMsg}
        </div>
      );
  }
}

// ============================================================================
// Category card
// ============================================================================

function CategoryCard({
  schema,
  selected,
  onSelect,
}: {
  schema: ProductSchema;
  selected: boolean;
  onSelect: () => void;
}) {
  const isPreview = schema.phase > 1;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-all ${
        selected
          ? "border-[#10B981] bg-[#ECFDF5] shadow-sm"
          : "border-[#E5E7EB] bg-white hover:border-[#10B981]/40 hover:bg-[#F9FAFB]"
      }`}
    >
      <div className="flex w-full items-start justify-between">
        <span className="text-[28px] leading-none">{schema.emoji}</span>
        {isPreview ? (
          <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#92400E]">
            Phase {schema.phase}
          </span>
        ) : selected ? (
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: EMERALD }}
          >
            <Check size={12} />
          </span>
        ) : null}
      </div>
      <h4 className="mt-1 text-[14px] font-semibold text-[#111827]">
        {schema.name}
      </h4>
      {schema.description ? (
        <p className="line-clamp-2 text-[12px] text-[#6B7280]">
          {schema.description}
        </p>
      ) : null}
    </button>
  );
}

// ============================================================================
// Status radio (actif / brouillon / masque) — mirrors the existing
// ProductModal's StatusRadio but uses emerald for the "actif" selected state.
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
  const selectedClass =
    value === "actif"
      ? "border-[#10B981] bg-[#ECFDF5] text-[#047857]"
      : value === "brouillon"
        ? "border-[#6B7280] bg-[#F3F4F6] text-[#374151]"
        : "border-[#EF4444] bg-[#FEE2E2] text-[#991B1B]";
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${
        selected ? selectedClass : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
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
// Main component
// ============================================================================

export function DynamicProductForm({
  initialData,
  onClose,
}: DynamicProductFormProps) {
  const { data, refresh } = useFabricantData();
  const isEdit = Boolean(initialData?.id);

  // ── Active categories (from product-schemas lib) ──────────────────
  const activeCategories = useMemo(() => getActiveCategories(), []);

  // ── General fields ────────────────────────────────────────────────
  const [name, setName] = useState(initialData?.name ?? "");
  const [brand, setBrand] = useState(
    initialData?.brand ?? data.profile.companyName,
  );
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [weight, setWeight] = useState(initialData?.weight ?? "");
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? "");
  const [status, setStatus] = useState<ProductStatus>(
    initialData?.status ?? "actif",
  );

  // ── Dynamic category fields ──────────────────────────────────────
  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId ?? "");
  const [isExport, setIsExport] = useState<boolean>(initialData?.isExport ?? false);
  const [categoryData, setCategoryData] = useState<Record<string, unknown>>(
    initialData?.categoryData ?? {},
  );
  const [exportData, setExportData] = useState<Record<string, unknown>>(
    initialData?.exportData ?? {},
  );

  // ── Certifications ───────────────────────────────────────────────
  const [certifications, setCertifications] = useState<CertificationRow[]>(
    initialData?.certifications && initialData.certifications.length > 0
      ? initialData.certifications.map((c) => ({
          name: c.name ?? "",
          issuer: c.issuer ?? "",
          validUntil: c.validUntil ?? "",
          fileUrl: c.fileUrl ?? "",
        }))
      : [{ name: "", issuer: "", validUntil: "", fileUrl: "" }],
  );

  // ── Tab state ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [submitting, setSubmitting] = useState(false);

  // ── Validation errors ────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectedSchema = useMemo(
    () => (categoryId ? getProductSchema(categoryId) : undefined),
    [categoryId],
  );

  // Build the field lists (memoized) so we can render grouped sections.
  // Note: ProductSchema.id is the slug (e.g. "fruits-legumes").
  const categoryFields = useMemo(
    () => (selectedSchema ? getCategoryFields(selectedSchema.id, false) : []),
    [selectedSchema],
  );
  const exportFields = useMemo(
    () => (selectedSchema ? getCategoryFields(selectedSchema.id, true) : []),
    [selectedSchema],
  );

  // Non-export fields grouped by `group` (e.g. "Production", "Qualité").
  const groupedCategoryFields = useMemo(
    () => groupFieldsByGroup(categoryFields),
    [categoryFields],
  );

  // Export fields — only those whose `group` includes "Export" OR with
  // `exportRequired === true`. These are rendered only when isExport is on.
  const filteredExportFields = useMemo(() => {
    return exportFields.filter(
      (f) =>
        (f.group && f.group.toLowerCase().includes("export")) ||
        f.exportRequired === true,
    );
  }, [exportFields]);
  const groupedExportFields = useMemo(
    () => groupFieldsByGroup(filteredExportFields),
    [filteredExportFields],
  );

  // ── Helpers for categoryData / exportData mutations ──────────────
  function setField(
    target: "categoryData" | "exportData",
    name: string,
    value: unknown,
  ) {
    if (target === "categoryData") {
      setCategoryData((prev) => ({ ...prev, [name]: value }));
    } else {
      setExportData((prev) => ({ ...prev, [name]: value }));
    }
  }

  // ── Validation ───────────────────────────────────────────────────
  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Le nom du produit est requis.";
    else if (name.trim().length < 3) errs.name = "Le nom doit faire au moins 3 caractères.";

    // Required category fields
    for (const f of categoryFields) {
      if (!f.required) continue;
      const v = categoryData[f.name];
      if (v === undefined || v === null || v === "" ||
          (Array.isArray(v) && v.length === 0)) {
        errs[`cat_${f.name}`] = `${f.label} est requis.`;
      }
    }

    // Required export fields (only when isExport is on)
    if (isExport) {
      for (const f of filteredExportFields) {
        if (!f.required && !f.exportRequired) continue;
        const v = exportData[f.name];
        if (v === undefined || v === null || v === "" ||
            (Array.isArray(v) && v.length === 0)) {
          errs[`exp_${f.name}`] = `${f.label} est requis.`;
        }
      }
    }

    // Certifications: every row that has a name must have all required bits
    // (we allow trailing empty rows for UX).
    certifications.forEach((c, idx) => {
      if (!c.name.trim() && idx === certifications.length - 1) return;
      if (!c.name.trim()) errs[`cert_${idx}`] = "Le nom de la certification est requis.";
    });

    return errs;
  }

  // ── Submit ───────────────────────────────────────────────────────
  async function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Scroll to the first error.
      const firstKey = Object.keys(errs)[0];
      const ref = errorRefs.current[firstKey];
      if (ref) {
        ref.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        // No ref registered (e.g. name field) — switch to the right tab.
        if (firstKey === "name") setActiveTab("general");
        else if (firstKey.startsWith("cat_")) setActiveTab("category");
        else if (firstKey.startsWith("exp_")) setActiveTab("export");
        else if (firstKey.startsWith("cert_")) setActiveTab("certifications");
      }
      toast.error("Veuillez corriger les champs en rouge.");
      return;
    }

    setSubmitting(true);

    // Strip out empty trailing certification row.
    const cleanCerts = certifications.filter((c) => c.name.trim());

    // Strip File objects from categoryData/exportData — they can't be
    // JSON-serialized in a fetch body. Persisted as `null` for now; actual
    // upload is iteration 2.
    const stripFiles = (obj: Record<string, unknown>) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v instanceof File) {
          // TODO(iteration 2): upload the File to /api/upload and replace
          // the value with the returned URL.
          out[k] = null;
        } else {
          out[k] = v;
        }
      }
      return out;
    };

    const payload = {
      name: name.trim(),
      brand: brand.trim() || data.profile.companyName,
      weight: weight.trim(),
      description: description.trim(),
      imageUrl,
      // status mapping: actif/brouillon/masque → isPublic + status
      isPublic: status !== "masque",
      status: status === "brouillon" ? "ARCHIVED" : "ACTIVE",
      // V3 Phase 3
      categoryId: categoryId || undefined,
      isExport,
      categoryData: stripFiles(categoryData),
      exportData: isExport ? stripFiles(exportData) : null,
      certifications: cleanCerts.length > 0 ? cleanCerts : null,
    };

    try {
      const url = isEdit && initialData?.id
        ? `/api/products/${initialData.id}`
        : "/api/products";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec de la requête");
      }
      toast.success(
        isEdit
          ? "Produit mis à jour avec succès"
          : "Produit créé avec succès",
      );
      refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  // ESC key closes the modal.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── Render ───────────────────────────────────────────────────────
  const visibleTabs = TABS.filter((t) => {
    if (t.id === "export") return Boolean(categoryId);
    return true;
  });

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
        className="flex max-h-[92vh] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F3F4F6] px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: EMERALD }}
            >
              <Tag size={18} />
            </div>
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

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-[#F3F4F6] bg-[#F9FAFB] px-3 py-2">
          {visibleTabs.map((tab) => {
            const TabIcon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-white text-[#047857] shadow-sm"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
                style={active ? { color: EMERALD_DARK } : undefined}
              >
                <TabIcon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">
                  {tab.id === "general" ? "Général" :
                    tab.id === "category" ? "Catégorie" :
                      tab.id === "export" ? "Export" : "Certs"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            {activeTab === "general" && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                {/* Name + brand */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div ref={(el) => { errorRefs.current.name = el; }}>
                    <FieldLabel htmlFor="dpf-name" required>Nom du produit</FieldLabel>
                    <input
                      id="dpf-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex : Jus de Bissap Premium"
                      className={inputClass}
                    />
                    <FieldError message={errors.name} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="dpf-brand">Marque</FieldLabel>
                    <input
                      id="dpf-brand"
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Sarine Bio"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Weight + status */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="dpf-weight">Poids / Contenance</FieldLabel>
                    <input
                      id="dpf-weight"
                      type="text"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="500ml"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-[13px] font-medium text-[#374151]">
                      Statut du produit
                    </p>
                    <div className="flex gap-2">
                      <StatusRadio value="actif" current={status} onChange={setStatus} label="Actif" color="#10B981" />
                      <StatusRadio value="brouillon" current={status} onChange={setStatus} label="Brouillon" color="#6B7280" />
                      <StatusRadio value="masque" current={status} onChange={setStatus} label="Masqué" color="#EF4444" />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <FieldLabel>Description</FieldLabel>
                    <span className="text-[12px] text-[#9CA3AF]">
                      {description.length}/500
                    </span>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                    placeholder="Décrivez votre produit en quelques lignes..."
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {/* Image upload */}
                <div>
                  <ImageUploadWithPreview
                    value={imageUrl}
                    onChange={setImageUrl}
                    label="Photo du produit"
                    hint="JPG, PNG, WebP ou GIF — 5 MB max — 800×800 px recommandé"
                    height={180}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === "category" && (
              <motion.div
                key="category"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                <div>
                  <h3 className="mb-1 text-[14px] font-semibold text-[#111827]">
                    Choisissez une catégorie
                  </h3>
                  <p className="text-[12px] text-[#6B7280]">
                    Chaque catégorie débloque des champs spécifiques (variété, origine, conservation, etc.).
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {activeCategories.map((c) => (
                    <CategoryCard
                      key={c.id}
                      schema={c}
                      selected={categoryId === c.id}
                      onSelect={() => {
                        setCategoryId(c.id);
                        // Reset dynamic data when category changes so old
                        // values don't leak into the new schema.
                        setCategoryData({});
                        setExportData({});
                        if (c.phase > 1) {
                          toast.info(
                            `Catégorie « ${c.name} » en phase ${c.phase} — disponible prochainement.`,
                          );
                        }
                      }}
                    />
                  ))}
                </div>

                {selectedSchema && selectedSchema.phase > 1 ? (
                  <div className="flex items-start gap-2 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-[13px] text-[#92400E]">
                    <Info size={16} className="mt-0.5 shrink-0" />
                    <span>
                      Cette catégorie sera disponible prochainement (phase {selectedSchema.phase}).
                      Vous pouvez pré-remplir les champs dès maintenant — ils seront enregistrés.
                    </span>
                  </div>
                ) : null}

                {/* Category-specific fields, grouped by `group` */}
                {selectedSchema && Object.keys(groupedCategoryFields).length > 0 && (
                  <div className="space-y-5">
                    {Object.entries(groupedCategoryFields).map(([group, fields]) => (
                      <section
                        key={group}
                        className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4"
                      >
                        <h4 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-[#374151]">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: EMERALD }}
                          />
                          {group}
                        </h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {fields.map((f) => (
                            <div
                              key={f.name}
                              ref={(el) => { errorRefs.current[`cat_${f.name}`] = el; }}
                              className={f.type === "textarea" ? "md:col-span-2" : ""}
                            >
                              <DynamicField
                                field={f}
                                value={categoryData[f.name] ?? f.defaultValue ?? ""}
                                onChange={(v) => setField("categoryData", f.name, v)}
                                error={errors[`cat_${f.name}`]}
                                fieldId={`cat_${f.name}`}
                              />
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}

                {/* If category is selected but has no fields defined yet */}
                {selectedSchema && Object.keys(groupedCategoryFields).length === 0 && (
                  <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center text-[13px] text-[#6B7280]">
                    Aucun champ spécifique défini pour cette catégorie pour l'instant.
                  </div>
                )}

                {!selectedSchema && (
                  <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center text-[13px] text-[#6B7280]">
                    Sélectionnez une catégorie ci-dessus pour révéler les champs spécifiques au produit.
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "export" && (
              <motion.div
                key="export"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-[#E5E7EB] bg-white p-4 transition-colors hover:bg-[#F9FAFB]">
                  <input
                    type="checkbox"
                    checked={isExport}
                    onChange={(e) => {
                      setIsExport(e.target.checked);
                      if (!e.target.checked) setExportData({});
                    }}
                    className="mt-0.5 h-5 w-5 rounded border-[#D1D5DB] text-[#10B981] focus:ring-[#10B981]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Globe2 size={16} className="text-[#10B981]" />
                      <span className="text-[14px] font-semibold text-[#111827]">
                        Produit destiné à l'exportation
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-[#6B7280]">
                      Active cette option pour renseigner les informations réglementaires requises
                      pour l'export (pays de destination, conformité sanitaire, certifications spécifiques).
                    </p>
                  </div>
                </label>

                {isExport && filteredExportFields.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center text-[13px] text-[#6B7280]">
                    Aucun champ d'export défini pour cette catégorie. Vous pouvez quand même
                    activer l'export pour signaler votre intention — des champs seront ajoutés prochainement.
                  </div>
                )}

                {isExport && Object.keys(groupedExportFields).length > 0 && (
                  <div className="space-y-5">
                    {Object.entries(groupedExportFields).map(([group, fields]) => (
                      <section
                        key={group}
                        className="rounded-xl border border-[#E5E7EB] bg-[#FFFBEB]/40 p-4"
                      >
                        <h4 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-[#92400E]">
                          <Globe2 size={14} />
                          {group}
                        </h4>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {fields.map((f) => (
                            <div
                              key={f.name}
                              ref={(el) => { errorRefs.current[`exp_${f.name}`] = el; }}
                              className={f.type === "textarea" ? "md:col-span-2" : ""}
                            >
                              <DynamicField
                                field={f}
                                value={exportData[f.name] ?? f.defaultValue ?? ""}
                                onChange={(v) => setField("exportData", f.name, v)}
                                error={errors[`exp_${f.name}`]}
                                fieldId={`exp_${f.name}`}
                              />
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "certifications" && (
              <motion.div
                key="certifications"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-semibold text-[#111827]">
                      Certifications du produit
                    </h3>
                    <p className="mt-0.5 text-[12px] text-[#6B7280]">
                      Bio, Halal, ISO 22000, HACCP, etc. — ces infos renforcent la confiance des consommateurs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCertifications((prev) => [
                        ...prev,
                        { name: "", issuer: "", validUntil: "", fileUrl: "" },
                      ])
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-[13px] font-medium text-[#374151] transition-colors hover:bg-[#F9FAFB]"
                  >
                    <Plus size={14} /> Ajouter
                  </button>
                </div>

                <div className="space-y-3">
                  {certifications.map((c, idx) => (
                    <div
                      key={idx}
                      ref={(el) => { errorRefs.current[`cert_${idx}`] = el; }}
                      className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[12px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                          Certification #{idx + 1}
                        </span>
                        {certifications.length > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setCertifications((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#EF4444] transition-colors hover:bg-[#FEE2E2]"
                            aria-label="Supprimer cette certification"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <FieldLabel required>Nom</FieldLabel>
                          <input
                            type="text"
                            value={c.name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCertifications((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, name: v } : row,
                                ),
                              );
                            }}
                            placeholder="Ex : Bio, Halal, ISO 22000"
                            className={inputClass}
                          />
                          <FieldError message={errors[`cert_${idx}`]} />
                        </div>
                        <div>
                          <FieldLabel>Organisme émetteur</FieldLabel>
                          <input
                            type="text"
                            value={c.issuer}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCertifications((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, issuer: v } : row,
                                ),
                              );
                            }}
                            placeholder="Ex : Ecocert, Bureau Veritas"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <FieldLabel>Valable jusqu'au</FieldLabel>
                          <input
                            type="date"
                            value={c.validUntil}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCertifications((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, validUntil: v } : row,
                                ),
                              );
                            }}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <FieldLabel>URL du document</FieldLabel>
                          <input
                            type="url"
                            value={c.fileUrl}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCertifications((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, fileUrl: v } : row,
                                ),
                              );
                            }}
                            placeholder="https://…"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-4">
          <OutlineButton onClick={onClose}>Annuler</OutlineButton>
          <GradientButton onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Enregistrement…
              </>
            ) : isEdit ? (
              <>
                <Check size={16} />
                Enregistrer les modifications
              </>
            ) : (
              <>
                <Plus size={16} />
                Créer le produit
              </>
            )}
          </GradientButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
