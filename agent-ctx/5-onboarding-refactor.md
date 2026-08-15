# Task ID 5 — Onboarding wizard refactor (Z.ai Code)

**Task:** Refonte onboarding wizard produit — métiers compréhensibles + filtrage intelligent + export opt-in

## Work Log

### Context loaded
- Read `worklog.md` (Task ID 4 — wizard-form-refactor) to understand the prior 6-step wizard built on the abstract VendorType concept (Producteur / Transformateur / Exportateur / Distributeur).
- Read `src/lib/product-schemas.ts` (2301 lines) — understood the ProductSchema shape (`fields` + `exportFields`), the master registry `PRODUCT_SCHEMAS`, the `getActiveCategories` / `getCategoryFields` / `groupFieldsByGroup` helpers, and the shared option sets (`ORIGIN_COUNTRY_OPTIONS`, `INCOTERM_OPTIONS`).
- Read `src/components/fabricant/DynamicProductForm.tsx` (1959 lines) — full picture of the wizard state machine: `vendorType` driving `showExportStep`/`isExport` via `handleVendorTypeSelect`, the `ConfirmDialog` for export toggle-off, the `handleEnableExportFromSummary` shortcut, the auto-advance useEffect, the direction-aware framer-motion step transition, the summary récap with grouped SummarySection/SummaryRow.
- Read `scripts/seed-categories.ts` (the actual seed script — there is no `prisma/seed-categories.ts`; the task instructions had a typo). Confirmed it iterates over `PRODUCT_SCHEMA_LIST` (which is `Object.values(PRODUCT_SCHEMAS)`) and upserts each into the DB with `schema`/`exportSchema` JSON columns. So adding new entries to `PRODUCT_SCHEMAS` is enough — no manual seed edit needed.

### Part A — 3 new schemas in product-schemas.ts (added after MIEL, before master registry)

- `COSMETIQUES` (slug `cosmetiques`, 🧴, phase 1) — 9 fields / 5 export
  - Production: `productType` (select 6), `skinType` (select 4), `ingredients` (textarea), `naturalOrigin` (boolean)
  - Conditionnement: `capacity` (text, unit "ml/g"), `packaging` (select 6)
  - Certifications: `organicLabel`, `halalCertified`, `crueltyFree` (booleans)
  - exportFields: `destinationCountry`, `incoterm`, `customsCode`, `cosmeticsCertificate` (file), `safetyReport` (file)
- `BOISSONS` (slug `boissons`, 🥤, phase 1) — 11 fields / 5 export
  - Production: `beverageType` (select 6), `flavor` (text), `ingredients` (textarea), `sugarContent` (number "g/100ml"), `alcoholDegree` (number "%", helpText "0 si non alcoolisé")
  - Conditionnement: `capacity` (text "ml"), `packaging` (select 5), `shelfLifeDays` (number "jours")
  - Certifications: `organicLabel`, `halalCertified`, `noPreservatives` (booleans)
  - exportFields: `destinationCountry`, `incoterm`, `customsCode`, `healthCertificate` (file), `phytosanitaryCertificate` (file)
- `HYGIENE` (slug `hygiene`, 🧼, phase 1) — 9 fields / 4 export
  - Production: `productType` (select 5), `usage` (select 4), `ingredients` (textarea), `naturalOrigin` (boolean)
  - Conditionnement: `capacity` (text "ml/g"), `packaging` (select 6)
  - Certifications: `organicLabel`, `halalCertified`, `crueltyFree` (booleans)
  - exportFields: `destinationCountry`, `incoterm`, `customsCode`, `healthCertificate` (file)
- Updated `PRODUCT_SCHEMAS` registry: 10 V3 + 3 new = 13 entries. Updated the JSDoc comment to reflect the breakdown. Inserted the 3 new entries under a new "Phase 1 — Onboarding wizard (Task ID 5)" comment block, between the V3 phase 1 entries and phase 2.

### Part B — Step 1 refonte (BusinessType)

- Added exported type `BusinessType = "boissons" | "cosmetiques" | "alimentaire" | "agriculture" | "peche" | "artisanat"`.
- Replaced `VENDOR_TYPES` constant (4 entries) with `BUSINESS_TYPES` (6 entries) with the exact emoji/title/description text from the task spec.
- Renamed sub-component `VendorTypeCard` → `BusinessTypeCard` (same structure, just renamed prop `vt` → `bt`).
- StepId `"vendorType"` → `"businessType"`. Updated `ALL_STEPS[0]` label from "Type de commerce" to "Votre métier" (shortLabel "Métier").
- `DynamicProductInitialData` type extended with optional `businessType?: BusinessType` (kept `vendorType?: string` for retro-compat).
- State `vendorType` → `businessType` (initialized from `initialData?.businessType`).
- `validateStep("businessType")` now checks `businessType` is set (was `vendorType`).
- Auto-advance useEffect updated to target `currentStepId === "businessType" && businessType`.
- Submit payload sends `businessType: businessType ?? undefined` instead of `vendorType`.
- ESC key handler no longer depends on `confirmExportOff` (state removed).

### Part C — Filtrage intelligent métier → catégories

- Added `BUSINESS_TO_CATEGORIES: Record<BusinessType, string[]>` constant exactly per spec:
  - `boissons`: ["boissons", "cafe-cacao", "miel"]
  - `cosmetiques`: ["cosmetiques", "hygiene", "huiles"]
  - `alimentaire`: ["epices", "noix-fruits-secs"]
  - `agriculture`: ["fruits-legumes", "cereales", "viandes", "produits-laitiers"]
  - `peche`: ["produits-mer"]
  - `artisanat`: []
- Step 2 (`case "category"`) now computes `allowedSlugs = businessType ? BUSINESS_TO_CATEGORIES[businessType] : null` and filters `activeCategories` accordingly. In edit mode (no businessType), shows all categories.
- When `businessType === "artisanat"` and the filtered list is empty, renders a "Bientôt disponible" amber info box with the exact message from the spec ("Les catégories pour l'artisanat seront bientôt disponibles. En attendant, choisissez « Alimentaire transformé » ou contactez-nous.").
- Subtitle of Step 2 adapts: shows "Catégories proposées pour « {métier} »…" when a businessType is set.

### Part D — Export opt-in (no more vendor-type-driven export)

- **Removed** `handleVendorTypeSelect` (no more export logic on métier selection — just `setBusinessType(id)` inline).
- **Removed** `handleExportToggle` (was the Step 5 toggle handler with ConfirmDialog logic).
- **Removed** `handleEnableExportFromSummary` (was the "Activer l'export" button shortcut in the summary).
- **Removed** `ConfirmDialog` component entirely (no longer used).
- **Removed** `confirmExportOff` state.
- **Removed** `AlertTriangle` import (was only used by ConfirmDialog).
- **Removed** the `<AnimatePresence>{confirmExportOff && <ConfirmDialog …/>}</AnimatePresence>` overlay block at the bottom of the modal.
- **Removed** the Step 5 export toggle `<label>` at the top.
- `showExportStep` initial state is now `isEdit ? Boolean(initialData?.isExport) : false` — i.e. create mode starts with export OFF, edit mode reflects the product's existing `isExport` flag (Task ID 5 spec: "showExportStep vient de initialData.isExport").
- `isExport` initial state unchanged: `initialData?.isExport ?? false`.
- New `handleExportOptIn(checked: boolean)` helper sets `showExportStep`, `isExport`, and clears `exportData` when unchecked.
- **Step 3 (general)** now ends with a checkbox labeled "Je vends à l'international (export)" using the exact Tailwind classes from the spec (`mt-0.5 h-4 w-4 rounded border-[#D1D5DB] text-[#10B981] focus:ring-[#10B981]`).
- **Step 5 (export)** now starts with an emerald info banner "Export international activé" that reminds the user where to disable it (return to Step 3). The export fields + certifications sections render unconditionally (they're only reached when `isExport === true`).
- **Step 6 (summary)** Export section: when `isExport` is false, replaces the previous "Activer l'export" button with a static hint "Cochez la case export à l'étape « Informations généraises »". The "Modifier" link routes to `general` when export is OFF, `export` when ON.

### Part E — Seed

- No edit needed to `scripts/seed-categories.ts` — it iterates `PRODUCT_SCHEMA_LIST` which auto-includes the 3 new schemas.
- Ran `bunx tsx scripts/seed-categories.ts` → "✅ Seed complete — 0 created, 13 updated, 13 total VerifScan categories." Breakdown confirms the 3 new phase-1 categories with correct field counts (cosmetiques 9/5, boissons 11/5, hygiene 9/4).

## Verification

- `bun run lint` (full project) → **0 errors, 0 warnings**.
- `bunx tsc --noEmit` filtered to `DynamicProductForm|product-schemas` → **0 errors** (no output).
- Dev server (port 3000): compiled cleanly, no errors in `dev.log`. `curl -L http://localhost:3000/dashboard` → **200** (redirects through `/login?callbackUrl=%2Fdashboard` because of auth gate, then renders 200). `curl http://localhost:3000/` → **200**.
- `getActiveCategories()` now returns **13** categories (10 V3 + 3 new) — confirmed by the seed script's "13 total VerifScan categories" output and the phase breakdown.

## Files modified

- `src/lib/product-schemas.ts` — 2300 → 2739 lines (+439 lines: 3 new schemas + updated registry block).
- `src/components/fabricant/DynamicProductForm.tsx` — 1959 → 1931 lines (net −28: removed ConfirmDialog ~60 lines + 3 handler functions ~40 lines + Step 5 toggle ~25 lines + summary export button ~7 lines; added BusinessTypeCard ~40 lines + BUSINESS_TYPES/BUSINESS_TO_CATEGORIES ~60 lines + Step 2 filter logic ~25 lines + Step 3 export checkbox ~20 lines + Step 5 info banner ~15 lines).
- `scripts/seed-categories.ts` — unchanged (auto-picks up new schemas via `PRODUCT_SCHEMA_LIST`).
- DB: re-seeded successfully (13 categories with `schema`/`exportSchema` JSON columns up to date).

## Public API compatibility

- `DynamicProductInitialData` type: added optional `businessType?: BusinessType`; kept `vendorType?: string` for retro-compat. All other fields unchanged.
- `DynamicProductForm` named export unchanged. `{ initialData?, onClose }` props unchanged.
- POST/PATCH payload contract unchanged: `name / brand / weight / description / imageUrl / isPublic / status / categoryId / isExport / categoryData / exportData / certifications`. `businessType` is sent in addition (API ignores it — same behavior as the previous `vendorType`).
- Reusable sub-components preserved: `DynamicField`, `CategoryCard`, `StatusRadio`, `ImageUploadWithPreview`, `Stepper`, `SummarySection`, `SummaryRow`, `formatFieldValue` — all unchanged. Only `VendorTypeCard` was renamed to `BusinessTypeCard` (it was Step-1-specific, not reused elsewhere).

## Stage Summary

- Wizard now orients on a **métier** (6 cards: Boissons, Cosmétiques, Alimentaire, Agriculture, Pêche, Artisanat) instead of an abstract vendor type — a juice seller or cosmetics maker immediately recognizes their activity.
- Step 2 filters categories to the relevant subset (e.g. choosing "Cosmétiques & Soins" shows Cosmétiques / Hygiène / Huiles only). Artisanat shows a "Bientôt disponible" placeholder.
- Export is **opt-in** via a single checkbox at Step 3 — no more forced export step for "Transformateur" or confirmation dialog when an "Exportateur" tries to turn it off.
- 3 new product schemas (Cosmétiques, Boissons, Hygiène) bring the wizard catalog from 10 → 13 categories. The 3 remaining legacy slugs (Agro-alimentaire, Épicerie, Textile) are intentionally absent — they have no ProductSchema and will be added in a future task.
- ESLint + TypeScript clean. Dev server compiles without errors. Dashboard returns 200.
