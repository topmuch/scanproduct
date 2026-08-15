"use client";

// ============================================================================
// DynamicProductForm — Guided 6-step wizard (Task ID 5 onboarding refactor)
// ============================================================================
// Replaces the previous 4-tab free-form interface with a linear onboarding
// wizard that the user cannot skip through. The wizard orients the user
// based on their business type ("métier") and adapts the form:
//
//   Step 1 — Votre métier (BusinessType onboarding — 6 cards)
//   Step 2 — Catégorie de produit (filtered by BusinessType)
//   Step 3 — Informations générales (name / brand / weight / image / status
//            + export opt-in checkbox)
//   Step 4 — Spécificités produit (dynamic category fields, grouped)
//   Step 5 — Export & Certifications (conditional — only when export opt-in
//            is checked at Step 3)
//   Step 6 — Récapitulatif (summary before submit)
//
// Validation blocks forward navigation. Steps 1 & 2 auto-advance after a
// 400ms delay on selection. Edit mode skips Step 1 and pre-fills everything.
//
// Export is now OPT-IN (Task ID 5): no longer driven by vendor type. A
// single checkbox at Step 3 toggles `showExportStep` + `isExport` together.
// The previous ConfirmDialog, `handleExportToggle` and `handleEnableExportFromSummary`
// helpers have been removed.
//
// Public API unchanged: same `DynamicProductInitialData` type (with optional
// `businessType` added), same `onClose` prop, same POST/PATCH contract. The
// `businessType` field is sent in the body but ignored by the API.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Globe2,
  Image as ImageIcon,
  Info,
  Loader2,
  Pencil,
  Plus,
  ScanLine,
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
import type { ExtractedOffData } from "@/lib/openfoodfacts";
import { useFabricantData } from "./FabricantDataProvider";
import { BarcodeScanner } from "./BarcodeScanner";
import { ImageUploadWithPreview } from "./ImageUploadWithPreview";
import {
  GradientButton,
  OutlineButton,
} from "./ui";

// ============================================================================
// Types — public API (unchanged from V3 Phase 3)
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
  /** Task ID 5 — business type chosen at Step 1 (drives category filtering). */
  businessType?: BusinessType;
  /** Kept for backward-compat with prior callers — superseded by `businessType`. */
  vendorType?: string;
  /** Open Food Facts — EAN-13 barcode + extracted payload (auto-fill). */
  barcode?: string | null;
  offData?: ExtractedOffData | null;
};

type DynamicProductFormProps = {
  initialData?: DynamicProductInitialData;
  onClose: () => void;
};

/**
 * Task ID 5 — six "métier" choices that replace the previous abstract
 * VendorType cards (Producteur / Transformateur / Exportateur / Distributeur).
 * The métier drives the category filter at Step 2 (BUSINESS_TO_CATEGORIES)
 * and is otherwise non-persistent — the API ignores it.
 */
export type BusinessType =
  | "boissons"
  | "cosmetiques"
  | "alimentaire"
  | "agriculture"
  | "peche"
  | "artisanat";

type StepId =
  | "businessType"
  | "category"
  | "general"
  | "specifics"
  | "export"
  | "summary";

type CertificationRow = {
  name: string;
  issuer: string;
  validUntil: string;
  fileUrl: string;
};

type StepMeta = {
  id: StepId;
  label: string;
  shortLabel: string;
};

// ============================================================================
// Style constants — emerald #10B981 is the primary accent for V3 wizard
// elements. Legacy #2563EB blue is kept for input focus rings for
// backward-compat with the rest of the fabricant dashboard.
// ============================================================================

const EMERALD = "#10B981";
const EMERALD_DARK = "#047857";
const EMERALD_SOFT = "#ECFDF5";

const inputClass =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition";

const BUSINESS_TYPES: {
  id: BusinessType;
  emoji: string;
  title: string;
  description: string;
}[] = [
  {
    id: "boissons",
    emoji: "🥤",
    title: "Boissons & Jus",
    description: "Jus, boissons, café, thé, boissons énergisantes",
  },
  {
    id: "cosmetiques",
    emoji: "🧴",
    title: "Cosmétiques & Soins",
    description: "Crèmes, savons, huiles, produits de beauté",
  },
  {
    id: "alimentaire",
    emoji: "🥫",
    title: "Alimentaire transformé",
    description: "Épices, condiments, confitures, épicerie",
  },
  {
    id: "agriculture",
    emoji: "🌿",
    title: "Agriculture & Élevage",
    description: "Fruits, légumes, céréales, viandes, lait",
  },
  {
    id: "peche",
    emoji: "🐟",
    title: "Pêche & Aquaculture",
    description: "Poisson, fruits de mer",
  },
  {
    id: "artisanat",
    emoji: "🧵",
    title: "Artisanat & Autre",
    description: "Textile, artisanat, produits divers",
  },
];

/**
 * Maps a Step 1 métier to the subset of category slugs that are relevant.
 * Drives the Step 2 filter. An empty array ("artisanat") renders a
 * "Bientôt disponible" placeholder instead of an empty card grid.
 *
 * Slugs not yet covered by a ProductSchema (epicerie, agro-alimentaire,
 * textile) are intentionally absent — they will be added in a future task.
 */
const BUSINESS_TO_CATEGORIES: Record<BusinessType, string[]> = {
  boissons: ["boissons", "cafe-cacao", "miel"],
  cosmetiques: ["cosmetiques", "hygiene", "huiles"],
  alimentaire: ["epices", "noix-fruits-secs"],
  agriculture: ["fruits-legumes", "cereales", "viandes", "produits-laitiers"],
  peche: ["produits-mer"],
  artisanat: [],
};

const ALL_STEPS: StepMeta[] = [
  { id: "businessType", label: "Votre métier", shortLabel: "Métier" },
  { id: "category", label: "Catégorie de produit", shortLabel: "Catégorie" },
  { id: "general", label: "Informations générales", shortLabel: "Général" },
  { id: "specifics", label: "Spécificités produit", shortLabel: "Spécificités" },
  { id: "export", label: "Export & Certifications", shortLabel: "Export" },
  { id: "summary", label: "Récapitulatif", shortLabel: "Résumé" },
];

// Framer-motion variants for direction-aware step transitions.
const stepVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};

// ============================================================================
// Field label + error helpers
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
// Supports all 8 documented field types. Reused from V3 Phase 3.
// ============================================================================

function DynamicField({
  field,
  value,
  onChange,
  error,
  fieldId,
}: {
  field: FieldConfig;
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
      // Accepts the File object in state only — actual persistence happens
      // via /api/upload in iteration 2 (see stripFiles() below).
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
// Category card — reused from V3 Phase 3
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
// Business type card — Step 1 selection card (Task ID 5)
// ============================================================================

function BusinessTypeCard({
  bt,
  selected,
  onSelect,
}: {
  bt: (typeof BUSINESS_TYPES)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex flex-col items-start gap-2 rounded-xl border-2 p-5 text-left transition-all ${
        selected
          ? "border-[#10B981] bg-[#ECFDF5] shadow-sm"
          : "border-[#E5E7EB] bg-white hover:border-[#10B981]/40 hover:bg-[#F9FAFB]"
      }`}
    >
      <div className="flex w-full items-start justify-between">
        <span className="text-[32px] leading-none">{bt.emoji}</span>
        {selected ? (
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: EMERALD }}
          >
            <Check size={14} />
          </span>
        ) : null}
      </div>
      <h4 className="mt-1 text-[15px] font-semibold text-[#111827]">
        {bt.title}
      </h4>
      <p className="text-[12px] leading-snug text-[#6B7280]">
        {bt.description}
      </p>
    </button>
  );
}

// ============================================================================
// Status radio (actif / brouillon / masque) — reused from V3 Phase 3
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
// Stepper — horizontal progress indicator at the top of the modal
// ============================================================================

function Stepper({
  steps,
  currentIdx,
}: {
  steps: StepMeta[];
  currentIdx: number;
}) {
  return (
    <div className="border-b border-[#F3F4F6] bg-[#F9FAFB] px-4 py-3 sm:px-6">
      {/* Desktop stepper — full horizontal with labels */}
      <div className="hidden items-start sm:flex">
        {steps.map((step, idx) => {
          const completed = idx < currentIdx;
          const active = idx === currentIdx;
          return (
            <div key={step.id} className="flex flex-1 items-start last:flex-none">
              <div className="flex w-20 flex-col items-center gap-1.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold transition-all"
                  style={{
                    backgroundColor: active
                      ? EMERALD
                      : completed
                        ? EMERALD_SOFT
                        : "#F3F4F6",
                    color: active
                      ? "white"
                      : completed
                        ? EMERALD_DARK
                        : "#9CA3AF",
                    border: active
                      ? "none"
                      : `2px solid ${completed ? EMERALD : "#E5E7EB"}`,
                  }}
                >
                  {completed ? <Check size={14} /> : idx + 1}
                </div>
                <span
                  className="text-center text-[11px] font-medium leading-tight"
                  style={{
                    color: active
                      ? EMERALD_DARK
                      : completed
                        ? "#374151"
                        : "#9CA3AF",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {step.shortLabel}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className="mt-4 h-0.5 flex-1 rounded-full transition-colors"
                  style={{
                    backgroundColor: idx < currentIdx ? EMERALD : "#E5E7EB",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile stepper — compact "Étape X sur Y" + progress bar */}
      <div className="sm:hidden">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[#047857]">
            Étape {currentIdx + 1} sur {steps.length}
          </span>
          <span className="truncate pl-2 text-[12px] text-[#6B7280]">
            {steps[currentIdx]?.label}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${((currentIdx + 1) / steps.length) * 100}%`,
              backgroundColor: EMERALD,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Summary value formatter — renders a FieldConfig value as a display string
// ============================================================================

function formatFieldValue(field: FieldConfig, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "boolean") return value ? "Oui" : "Non";
  if (field.type === "checkbox") {
    if (!Array.isArray(value) || value.length === 0) return "—";
    const labels = (value as string[]).map((v) => {
      const opt = field.options?.find((o) => o.value === String(v));
      return opt?.label ?? String(v);
    });
    return labels.join(", ");
  }
  if (field.type === "select") {
    const opt = field.options?.find((o) => o.value === String(value));
    return opt?.label ?? String(value);
  }
  if (field.type === "file") {
    if (value instanceof File) return value.name;
    if (typeof value === "string" && value) return "Document joint";
    return "—";
  }
  if (field.type === "number") {
    return field.unit ? `${value} ${field.unit}` : String(value);
  }
  return String(value);
}

// ============================================================================
// Main component — guided 6-step wizard
// ============================================================================

export function DynamicProductForm({
  initialData,
  onClose,
}: DynamicProductFormProps) {
  const { data, refresh } = useFabricantData();
  const isEdit = Boolean(initialData?.id);

  // ── Active categories (from product-schemas lib) ──────────────────
  const activeCategories = useMemo(() => getActiveCategories(), []);

  // ── Business type (Step 1) — not persisted, only drives the wizard UX
  // (category filter at Step 2). Sent to the API but ignored. ─────────
  const [businessType, setBusinessType] = useState<BusinessType | undefined>(
    initialData?.businessType ?? undefined,
  );

  // ── General fields (Step 3) ───────────────────────────────────────
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

  // ── Open Food Facts (barcode + extracted data) ────────────────────
  // `barcode` is a free-text EAN-13 field the fabricant can fill by hand
  // or via the BarcodeScanner modal. `offData` holds the normalized OFF
  // payload so we can show a preview + persist it for the scan page.
  const [barcode, setBarcode] = useState<string>(initialData?.barcode ?? "");
  const [offData, setOffData] = useState<ExtractedOffData | null>(
    initialData?.offData ?? null,
  );
  const [showScanner, setShowScanner] = useState(false);

  // ── Dynamic category fields (Step 4) ──────────────────────────────
  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId ?? "");
  const [isExport, setIsExport] = useState<boolean>(initialData?.isExport ?? false);
  const [categoryData, setCategoryData] = useState<Record<string, unknown>>(
    initialData?.categoryData ?? {},
  );
  const [exportData, setExportData] = useState<Record<string, unknown>>(
    initialData?.exportData ?? {},
  );

  // ── Certifications (Step 5) ───────────────────────────────────────
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

  // ── Wizard state ──────────────────────────────────────────────────
  // Task ID 5 — export is OPT-IN: in create mode, the export step is
  // hidden until the user checks the "Je vends à l'international" box at
  // Step 3. In edit mode, the export step is shown only if the product
  // was previously flagged as `isExport`.
  const [showExportStep, setShowExportStep] = useState<boolean>(
    isEdit ? Boolean(initialData?.isExport) : false,
  );

  // Compute visible steps based on isEdit + showExportStep.
  const visibleSteps = useMemo<StepMeta[]>(() => {
    const out: StepMeta[] = [];
    for (const s of ALL_STEPS) {
      if (s.id === "businessType" && isEdit) continue;
      if (s.id === "export" && !showExportStep) continue;
      out.push(s);
    }
    return out;
  }, [isEdit, showExportStep]);

  // Starting step: in edit mode, skip businessType (Step 1). If categoryId
  // is already set, start at Step 3 (general); otherwise Step 2 (category).
  const startStepIdx = useMemo(() => {
    if (isEdit) {
      return initialData?.categoryId ? 1 : 0;
    }
    return 0;
  }, [isEdit, initialData?.categoryId]);

  const [currentStep, setCurrentStep] = useState(startStepIdx);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const bodyRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived schema data ───────────────────────────────────────────
  const selectedSchema = useMemo(
    () => (categoryId ? getProductSchema(categoryId) : undefined),
    [categoryId],
  );

  const categoryFields = useMemo(
    () => (selectedSchema ? getCategoryFields(selectedSchema.id, false) : []),
    [selectedSchema],
  );
  const exportFields = useMemo(
    () => (selectedSchema ? getCategoryFields(selectedSchema.id, true) : []),
    [selectedSchema],
  );

  const groupedCategoryFields = useMemo(
    () => groupFieldsByGroup(categoryFields),
    [categoryFields],
  );

  const filteredExportFields = useMemo(
    () =>
      exportFields.filter(
        (f) =>
          (f.group && f.group.toLowerCase().includes("export")) ||
          f.exportRequired === true,
      ),
    [exportFields],
  );
  const groupedExportFields = useMemo(
    () => groupFieldsByGroup(filteredExportFields),
    [filteredExportFields],
  );

  const currentStepId: StepId = visibleSteps[currentStep]?.id ?? "businessType";
  const isLastStep = currentStepId === "summary";

  // ── Field mutation helper ─────────────────────────────────────────
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

  // ── Step validation — per-step checks ─────────────────────────────
  function validateStep(stepId: StepId): Record<string, string> {
    const errs: Record<string, string> = {};
    if (stepId === "businessType") {
      if (!businessType) errs.businessType = "Veuillez sélectionner votre métier.";
    }
    if (stepId === "category") {
      if (!categoryId) errs.categoryId = "Veuillez sélectionner une catégorie.";
    }
    if (stepId === "general") {
      if (!name.trim()) errs.name = "Le nom du produit est requis.";
      else if (name.trim().length < 3) errs.name = "Le nom doit faire au moins 3 caractères.";
    }
    if (stepId === "specifics") {
      for (const f of categoryFields) {
        if (!f.required) continue;
        const v = categoryData[f.name];
        if (
          v === undefined ||
          v === null ||
          v === "" ||
          (Array.isArray(v) && v.length === 0)
        ) {
          errs[`cat_${f.name}`] = `${f.label} est requis.`;
        }
      }
    }
    if (stepId === "export" && isExport) {
      for (const f of filteredExportFields) {
        if (!f.required && !f.exportRequired) continue;
        const v = exportData[f.name];
        if (
          v === undefined ||
          v === null ||
          v === "" ||
          (Array.isArray(v) && v.length === 0)
        ) {
          errs[`exp_${f.name}`] = `${f.label} est requis.`;
        }
      }
      certifications.forEach((c, idx) => {
        // Allow trailing empty row for UX.
        if (!c.name.trim() && idx === certifications.length - 1) return;
        if (!c.name.trim()) errs[`cert_${idx}`] = "Le nom de la certification est requis.";
      });
    }
    return errs;
  }

  // ── Navigation ────────────────────────────────────────────────────
  function goToStep(targetIdx: number) {
    const clamped = Math.max(0, Math.min(visibleSteps.length - 1, targetIdx));
    setDirection(clamped > currentStep ? 1 : -1);
    setCurrentStep(clamped);
  }

  function goToStepById(id: StepId) {
    const idx = visibleSteps.findIndex((s) => s.id === id);
    if (idx !== -1) goToStep(idx);
  }

  function next() {
    const errs = validateStep(currentStepId);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to first error.
      const firstKey = Object.keys(errs)[0];
      const ref = errorRefs.current[firstKey];
      if (ref) {
        ref.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }
      toast.error("Veuillez remplir les champs obligatoires.");
      return;
    }
    setErrors({});
    if (currentStep < visibleSteps.length - 1) {
      goToStep(currentStep + 1);
    }
  }

  function prev() {
    setErrors({});
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }

  // ── Auto-advance on Step 1 (businessType) and Step 2 (category) ──
  // Selecting a card auto-advances after a 400ms delay (with the manual
  // "Continuer" button still available for keyboard users). We target the
  // next step by id (not currentStep+1) so the closure doesn't depend on
  // currentStep — only on the selection state that triggers the advance.
  useEffect(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (currentStepId === "businessType" && businessType) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        setErrors({});
        goToStepById("category");
      }, 400);
    } else if (currentStepId === "category" && categoryId) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        setErrors({});
        goToStepById("general");
      }, 400);
    }
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [businessType, categoryId, currentStepId]);

  // ── Scroll body to top on step change ─────────────────────────────
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  // ── Category selection — resets dynamic data when category changes ─
  function handleCategorySelect(schema: ProductSchema) {
    if (categoryId !== schema.id) {
      setCategoryId(schema.id);
      setCategoryData({});
      setExportData({});
    }
    if (schema.phase > 1) {
      toast.info(
        `Catégorie « ${schema.name} » en phase ${schema.phase} — disponible prochainement.`,
      );
    }
  }

  // ── Export opt-in toggle (Step 3 checkbox) ────────────────────────
  // Task ID 5 — export is now driven by a single checkbox at Step 3.
  // No more vendor-type-driven logic, no confirm dialog. Toggling off
  // clears any export data the user might have started filling.
  function handleExportOptIn(checked: boolean) {
    setShowExportStep(checked);
    setIsExport(checked);
    if (!checked) setExportData({});
  }

  // ── Open Food Facts — barcode scanned / looked up ─────────────────
  // Auto-fills the general fields (name/brand/weight) + any matching
  // category-specific fields (ingredients, sugar, allergens…). Existing
  // values are preserved so a re-scan doesn't clobber manual edits.
  function handleBarcodeScanned(
    scannedBarcode: string,
    productData: ExtractedOffData | null,
  ) {
    setBarcode(scannedBarcode);
    setShowScanner(false);
    if (productData) {
      if (productData.name) setName(productData.name);
      if (productData.brand) setBrand(productData.brand);
      if (productData.weight) setWeight(productData.weight);
      setOffData(productData);
      // Map OFF data into the category's dynamic fields (ingredients, sugar…).
      if (categoryFields.length > 0) {
        setCategoryData((prev) =>
          mapOffToCategoryData(productData, categoryFields, prev),
        );
      }
      toast.success(
        "Produit trouvé sur Open Food Facts — champs auto-remplis.",
      );
    } else {
      setOffData(null);
      toast.info(
        "Produit introuvable sur Open Food Facts — remplissez les champs manuellement.",
      );
    }
  }

  // ── Submit ───────────────────────────────────────────────────────
  async function handleSubmit() {
    // Final validation across all visible steps.
    const allErrs: Record<string, string> = {};
    for (const step of visibleSteps) {
      Object.assign(allErrs, validateStep(step.id));
    }
    if (Object.keys(allErrs).length > 0) {
      setErrors(allErrs);
      // Jump to the first step that has an error.
      const firstErrKey = Object.keys(allErrs)[0];
      const prefix = firstErrKey.startsWith("cat_")
        ? "specifics"
        : firstErrKey.startsWith("exp_") || firstErrKey.startsWith("cert_")
          ? "export"
          : firstErrKey === "name"
            ? "general"
            : firstErrKey === "categoryId"
              ? "category"
              : firstErrKey === "businessType"
                ? "businessType"
                : "";
      if (prefix) goToStepById(prefix as StepId);
      toast.error("Veuillez remplir les champs obligatoires.");
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
          out[k] = null;
        } else {
          out[k] = v;
        }
      }
      return out;
    };

    const payload: Record<string, unknown> = {
      name: name.trim(),
      brand: brand.trim() || data.profile.companyName,
      weight: weight.trim(),
      description: description.trim(),
      imageUrl,
      // Status mapping: actif/brouillon/masque → isPublic + status
      isPublic: status !== "masque",
      status: status === "brouillon" ? "ARCHIVED" : "ACTIVE",
      // V3 Phase 3
      categoryId: categoryId || undefined,
      isExport,
      categoryData: stripFiles(categoryData),
      exportData: isExport ? stripFiles(exportData) : null,
      certifications: cleanCerts.length > 0 ? cleanCerts : null,
      // Task ID 5 — businessType replaces vendorType. Sent but ignored by
      // the API (kept for future analytics / personalization).
      businessType: businessType ?? undefined,
      // Open Food Facts — barcode + extracted payload
      barcode: barcode.trim() || undefined,
      offData: offData ?? undefined,
    };

    try {
      const url =
        isEdit && initialData?.id
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

  // ── Clean certifications for summary display ──────────────────────
  const cleanCerts = useMemo(
    () => certifications.filter((c) => c.name.trim()),
    [certifications],
  );

  // ── Render step content by id ─────────────────────────────────────
  function renderStep(stepId: StepId) {
    switch (stepId) {
      // ── Step 1: Business type (métier) ────────────────────────
      case "businessType":
        return (
          <div className="space-y-5">
            <div>
              <h3 className="text-[16px] font-semibold text-[#111827]">
                Quel est votre métier&nbsp;?
              </h3>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                Sélectionnez l’activité qui correspond le mieux à votre produit.
                Le formulaire affichera uniquement les catégories pertinentes.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {BUSINESS_TYPES.map((bt) => (
                <BusinessTypeCard
                  key={bt.id}
                  bt={bt}
                  selected={businessType === bt.id}
                  onSelect={() => setBusinessType(bt.id)}
                />
              ))}
            </div>

            {businessType && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#047857]"
              >
                <Check size={14} />
                Sélectionné&nbsp;: {BUSINESS_TYPES.find((v) => v.id === businessType)?.title}
                <span className="ml-auto text-[#10B981]">Continuer →</span>
              </motion.div>
            )}

            {errors.businessType && (
              <div ref={(el) => { errorRefs.current.businessType = el; }}>
                <FieldError message={errors.businessType} />
              </div>
            )}
          </div>
        );

      // ── Step 2: Category (filtered by businessType) ──────────
      case "category": {
        // In create mode, filter categories by the chosen business type.
        // In edit mode (or if no businessType was chosen), show all — the
        // user can always change the category when editing.
        const allowedSlugs = businessType
          ? BUSINESS_TO_CATEGORIES[businessType]
          : null;
        const filteredCategories = allowedSlugs
          ? activeCategories.filter((c) => allowedSlugs.includes(c.id))
          : activeCategories;
        const isArtisanatEmpty =
          businessType === "artisanat" && filteredCategories.length === 0;

        return (
          <div className="space-y-5">
            <div>
              <h3 className="text-[16px] font-semibold text-[#111827]">
                Choisissez une catégorie
              </h3>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                {businessType
                  ? `Catégories proposées pour « ${BUSINESS_TYPES.find((v) => v.id === businessType)?.title} ». Chaque catégorie débloque des champs spécifiques.`
                  : "Chaque catégorie débloque des champs spécifiques (variété, origine, conservation, etc.)."}
              </p>
            </div>

            {isArtisanatEmpty ? (
              <div className="flex items-start gap-2 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] px-4 py-4 text-[13px] text-[#92400E]">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>
                  Les catégories pour l'artisanat seront bientôt disponibles. En
                  attendant, choisissez « Alimentaire transformé » ou
                  contactez-nous.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCategories.map((c) => (
                  <CategoryCard
                    key={c.id}
                    schema={c}
                    selected={categoryId === c.id}
                    onSelect={() => handleCategorySelect(c)}
                  />
                ))}
              </div>
            )}

            {categoryId && !isArtisanatEmpty && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#047857]"
              >
                <Check size={14} />
                {selectedSchema?.emoji} {selectedSchema?.name}
                <span className="ml-auto text-[#10B981]">Continuer →</span>
              </motion.div>
            )}

            {selectedSchema && selectedSchema.phase > 1 ? (
              <div className="flex items-start gap-2 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-[13px] text-[#92400E]">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>
                  Cette catégorie sera disponible prochainement (phase{" "}
                  {selectedSchema.phase}). Vous pouvez pré-remplir les champs
                  dès maintenant — ils seront enregistrés.
                </span>
              </div>
            ) : null}

            {errors.categoryId && (
              <div ref={(el) => { errorRefs.current.categoryId = el; }}>
                <FieldError message={errors.categoryId} />
              </div>
            )}
          </div>
        );
      }

      // ── Step 3: General info ─────────────────────────────────────
      case "general":
        return (
          <div className="space-y-5">
            {/* Open Food Facts — barcode lookup (auto-fill) */}
            <div className="rounded-xl border border-[#E5E7EB] bg-gradient-to-br from-[#F0FDF4] to-[#ECFDF5] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: "#10B981" }}
                  >
                    <ScanLine size={18} />
                  </span>
                  <div>
                    <h4 className="text-[13px] font-semibold text-[#111827]">
                      Code-barres (Open Food Facts)
                    </h4>
                    <p className="text-[12px] text-[#6B7280]">
                      Scannez ou saisissez le code-barres pour auto-remplir le produit.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: "#10B981" }}
                >
                  <ScanLine size={14} /> Scanner
                </button>
              </div>
              <div className="mt-3">
                <input
                  type="text"
                  inputMode="numeric"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Ex : 3017620422003"
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 font-mono text-[13px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20"
                />
              </div>
              {offData && (
                <div className="mt-3 rounded-lg border border-[#10B981]/30 bg-white p-3">
                  <div className="flex items-center gap-1.5 text-[#047857]">
                    <CheckCircle2 size={15} />
                    <span className="text-[12px] font-semibold">
                      Produit trouvé sur Open Food Facts
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-[12px] text-[#374151]">
                    {offData.name && (
                      <p><span className="font-medium">Nom :</span> {offData.name}</p>
                    )}
                    {offData.brand && (
                      <p><span className="font-medium">Marque :</span> {offData.brand}</p>
                    )}
                    {offData.nutriscore && (
                      <p>
                        <span className="font-medium">Nutri-Score :</span>{" "}
                        <span className="uppercase font-bold">{offData.nutriscore}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

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

            {/* Export opt-in checkbox (Task ID 5) */}
            <label className="flex items-start gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3 cursor-pointer hover:bg-[#F3F4F6]">
              <input
                type="checkbox"
                checked={showExportStep}
                onChange={(e) => handleExportOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#D1D5DB] text-[#10B981] focus:ring-[#10B981]"
              />
              <div>
                <span className="text-[13px] font-semibold text-[#111827]">
                  Je vends à l'international (export)
                </span>
                <p className="text-[12px] text-[#6B7280]">
                  Cochez cette case si vous exportez vos produits à l'étranger.
                  Des champs supplémentaires (certificats phytosanitaires,
                  incoterm, code douanier) seront demandés.
                </p>
              </div>
            </label>
          </div>
        );

      // ── Step 4: Category-specific fields ────────────────────────
      case "specifics":
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-[24px]">{selectedSchema?.emoji}</span>
              <div>
                <h3 className="text-[15px] font-semibold text-[#111827]">
                  Spécificités — {selectedSchema?.name}
                </h3>
                <p className="text-[12px] text-[#6B7280]">
                  Renseignez les détails propres à cette catégorie. Les champs
                  marqués d'un <span className="text-[#EF4444]">*</span> sont
                  obligatoires.
                </p>
              </div>
            </div>

            {Object.keys(groupedCategoryFields).length > 0 && (
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

            {Object.keys(groupedCategoryFields).length === 0 && (
              <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center text-[13px] text-[#6B7280]">
                Aucun champ spécifique défini pour cette catégorie pour l'instant.
              </div>
            )}
          </div>
        );

      // ── Step 5: Export & Certifications ─────────────────────────
      // (Task ID 5) This step is only shown when the export opt-in
      // checkbox at Step 3 is checked. The previous toggle at the top of
      // this step has been removed — `isExport` is always `true` here.
      case "export":
        return (
          <div className="space-y-5">
            {/* Export info banner (opt-in reminder) */}
            <div className="flex items-start gap-3 rounded-xl border-2 border-[#10B981]/30 bg-[#ECFDF5] p-4">
              <Globe2 size={18} className="mt-0.5 shrink-0 text-[#10B981]" />
              <div className="flex-1">
                <span className="text-[14px] font-semibold text-[#111827]">
                  Export international activé
                </span>
                <p className="mt-1 text-[12px] text-[#6B7280]">
                  Renseignez les informations réglementaires requises pour
                  l'export (pays de destination, conformité sanitaire,
                  certifications spécifiques). Pour désactiver l'export,
                  retournez à l'étape « Informations générales » et décochez
                  la case « Je vends à l'international ».
                </p>
              </div>
            </div>

            {/* Export fields */}
            {filteredExportFields.length === 0 && (
              <div className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center text-[13px] text-[#6B7280]">
                Aucun champ d'export défini pour cette catégorie. Des champs
                seront ajoutés prochainement.
              </div>
            )}

            {Object.keys(groupedExportFields).length > 0 && (
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

            {/* Certifications */}
            <section className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sticker size={16} className="text-[#10B981]" />
                  <h4 className="text-[13px] font-semibold uppercase tracking-wide text-[#374151]">
                    Certifications
                  </h4>
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
              <p className="mb-3 text-[12px] text-[#6B7280]">
                Bio, Halal, ISO 22000, HACCP, GlobalGAP, etc. — ces
                informations renforcent la confiance des acheteurs.
              </p>

              <div className="space-y-3">
                {certifications.map((c, idx) => (
                  <div
                    key={idx}
                    ref={(el) => { errorRefs.current[`cert_${idx}`] = el; }}
                    className="rounded-xl border border-[#E5E7EB] bg-white p-4"
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
            </section>
          </div>
        );

      // ── Step 6: Summary ─────────────────────────────────────────
      case "summary":
        return (
          <div className="space-y-5">
            <div>
              <h3 className="text-[16px] font-semibold text-[#111827]">
                Récapitulatif
              </h3>
              <p className="mt-1 text-[13px] text-[#6B7280]">
                Vérifiez les informations avant de{" "}
                {isEdit ? "enregistrer" : "créer"} le produit. Cliquez sur{" "}
                « Modifier » pour revenir à une étape.
              </p>
            </div>

            {/* Business type + category badge */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
              {businessType ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-3 py-1 text-[12px] font-semibold text-[#047857]">
                  {BUSINESS_TYPES.find((v) => v.id === businessType)?.emoji}{" "}
                  {BUSINESS_TYPES.find((v) => v.id === businessType)?.title}
                </span>
              ) : null}
              {selectedSchema ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[#374151] border border-[#E5E7EB]">
                  {selectedSchema.emoji} {selectedSchema.name}
                </span>
              ) : null}
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[#374151] border border-[#E5E7EB]">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      status === "actif"
                        ? "#10B981"
                        : status === "brouillon"
                          ? "#6B7280"
                          : "#EF4444",
                  }}
                />
                {status === "actif" ? "Actif" : status === "brouillon" ? "Brouillon" : "Masqué"}
              </span>
            </div>

            {/* General info section */}
            <SummarySection
              title="Informations générales"
              onEdit={() => goToStepById("general")}
            >
              <SummaryRow label="Nom" value={name || "—"} />
              <SummaryRow label="Marque" value={brand || "—"} />
              <SummaryRow label="Poids / Contenance" value={weight || "—"} />
              {description ? (
                <SummaryRow label="Description" value={description} fullWidth />
              ) : null}
            </SummarySection>

            {/* Category-specific fields */}
            <SummarySection
              title={`Spécificités — ${selectedSchema?.name ?? "Catégorie"}`}
              onEdit={() => goToStepById("specifics")}
            >
              {Object.keys(groupedCategoryFields).length === 0 ? (
                <p className="text-[13px] text-[#9CA3AF]">
                  Aucun champ spécifique renseigné.
                </p>
              ) : (
                Object.entries(groupedCategoryFields).map(([group, fields]) => (
                  <div key={group} className="mb-3 last:mb-0">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                      {group}
                    </p>
                    <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                      {fields.map((f) => {
                        const val = formatFieldValue(f, categoryData[f.name]);
                        if (val === "—") return null;
                        return (
                          <SummaryRow
                            key={f.name}
                            label={f.label}
                            value={val}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </SummarySection>

            {/* Export info section */}
            <SummarySection
              title="Export & Certifications"
              onEdit={isExport ? () => goToStepById("export") : () => goToStepById("general")}
            >
              {isExport ? (
                <>
                  <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                    {filteredExportFields.map((f) => {
                      const val = formatFieldValue(f, exportData[f.name]);
                      if (val === "—") return null;
                      return (
                        <SummaryRow
                          key={f.name}
                          label={f.label}
                          value={val}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#ECFDF5] px-3 py-2 text-[12px] font-medium text-[#047857]">
                    <Sticker size={14} />
                    {cleanCerts.length} certification
                    {cleanCerts.length > 1 ? "s" : ""}
                    {cleanCerts.length > 0
                      ? ` : ${cleanCerts.map((c) => c.name).join(", ")}`
                      : ""}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-[#6B7280]">
                    Export non activé pour ce produit.
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#9CA3AF]">
                    <Globe2 size={14} /> Cochez la case export à l'étape « Informations générales »
                  </span>
                </div>
              )}
            </SummarySection>
          </div>
        );

      default:
        return null;
    }
  }

  // ── Render ───────────────────────────────────────────────────────
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
        className="relative flex max-h-[92vh] w-full max-w-[880px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F3F4F6] px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: EMERALD }}
            >
              <Tag size={18} />
            </div>
            <div>
              <h2 className="font-display text-[17px] font-bold text-[#111827] sm:text-[18px]">
                {isEdit ? "Modifier le produit" : "Nouveau produit"}
              </h2>
              <p className="mt-0.5 text-[12px] text-[#6B7280] sm:text-[13px]">
                {isEdit
                  ? "Mettez à jour les informations de votre produit."
                  : "Assistant de création — étape par étape."}
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

        {/* Stepper */}
        <Stepper steps={visibleSteps} currentIdx={currentStep} />

        {/* Body (scrollable) */}
        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStepId}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {renderStep(currentStepId)}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F3F4F6] bg-[#F9FAFB] px-4 py-4 sm:px-6">
          {currentStep === 0 ? (
            <OutlineButton onClick={onClose}>Annuler</OutlineButton>
          ) : (
            <OutlineButton onClick={prev}>
              <span className="mr-0.5">←</span> Retour
            </OutlineButton>
          )}
          {isLastStep ? (
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
                  <Check size={16} />
                  Créer le produit
                </>
              )}
            </GradientButton>
          ) : (
            <GradientButton onClick={next}>
              Continuer <span className="ml-0.5">→</span>
            </GradientButton>
          )}
        </div>

        {/* Open Food Facts — barcode scanner modal */}
        {showScanner && (
          <BarcodeScanner
            onBarcodeScanned={handleBarcodeScanned}
            onClose={() => setShowScanner(false)}
          />
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// Open Food Facts → categoryData mapping
// ============================================================================
// Matches OFF-derived values to the category's dynamic fields by name. Only
// free-text / number fields are filled — selects & booleans are skipped
// because a raw OFF string won't match the option values. Existing non-empty
// values are preserved so a re-scan never clobbers manual edits.
function mapOffToCategoryData(
  off: ExtractedOffData,
  fields: FieldConfig[],
  current: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...current };
  for (const f of fields) {
    if (f.type !== "text" && f.type !== "textarea" && f.type !== "number") continue;
    const cur = next[f.name];
    if (cur !== undefined && cur !== "" && cur !== null) continue;
    const val = offToFieldValue(f.name, off);
    if (val !== undefined && val !== null && val !== "") next[f.name] = val;
  }
  return next;
}

function offToFieldValue(fieldName: string, off: ExtractedOffData): unknown {
  const n = fieldName.toLowerCase();
  if (n === "ingredients" || n === "ingredient_list" || n === "composition")
    return off.ingredients ?? "";
  if (n === "allergenes" || n === "allergens") return off.allergens.join(", ");
  if (n === "nutriscore" || n === "nutritiongrade") return off.nutriscore ?? "";
  if (n === "sugarcontent" || n === "sucre" || n === "sugars")
    return off.nutriments?.sugars ?? "";
  if (n === "calories" || n === "energy" || n === "energie")
    return off.nutriments?.calories ?? "";
  if (n === "proteines" || n === "proteins" || n === "protein")
    return off.nutriments?.proteins ?? "";
  if (n === "glucides" || n === "carbs" || n === "carbohydrates")
    return off.nutriments?.carbs ?? "";
  if (n === "lipides" || n === "fat") return off.nutriments?.fat ?? "";
  if (n === "sel" || n === "salt") return off.nutriments?.salt ?? "";
  if (n === "fibre" || n === "fiber") return off.nutriments?.fiber ?? "";
  return undefined;
}

// ============================================================================
// Summary helpers — small presentational sub-components for the résumé step
// ============================================================================

function SummarySection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-[#111827]">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#10B981] transition-colors hover:text-[#047857]"
        >
          <Pencil size={12} /> Modifier
        </button>
      </div>
      {children}
    </section>
  );
}

function SummaryRow({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[13px] text-[#111827]">{value}</dd>
    </div>
  );
}
