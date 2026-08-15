# Task 4 — wizard-form-refactor (Z.ai Code)

## Task
Refactor `src/components/fabricant/DynamicProductForm.tsx` from a 4-tab free-form interface into a guided 6-step wizard with vendor-type onboarding.

## Work Log
- Read prior context: worklog (V3 Phase 1/2/3), existing DynamicProductForm.tsx (1206 lines, 4 tabs), product-schemas.ts helpers, ProduitsPage.tsx wrapper, ImageUploadWithPreview, ui.tsx (GradientButton/OutlineButton), fabricant-types.ts (ProductStatus).
- Designed the 6-step wizard flow:
  1. Type de commerce (4 vendor-type cards: Producteur local / Transformateur / Exportateur / Distributeur)
  2. Catégorie de produit (10 category cards, reused CategoryCard)
  3. Informations générales (name/brand/weight/description/image/status, reused ImageUploadWithPreview + StatusRadio)
  4. Spécificités produit (dynamic category fields grouped by `group`, reused DynamicField)
  5. Export & Certifications (conditional — only in visibleSteps when showExportStep=true; toggle + export fields + certifications merged)
  6. Récapitulatif (summary with vendor-type badge, general info, grouped category fields as key-value grid, export info + cert count, "Modifier" links that jump back to the relevant step)
- Reused existing sub-components unchanged: DynamicField (all 8 field types), CategoryCard, StatusRadio, ImageUploadWithPreview.
- New sub-components: VendorTypeCard (Step 1 selection card), Stepper (horizontal progress indicator with completed/active/upcoming states + mobile compact bar), ConfirmDialog (for Exportateur toggle-off confirmation), SummarySection + SummaryRow + formatFieldValue (for the récapitulatif step).
- Wizard state: `vendorType`, `currentStep` (index into visibleSteps), `direction` (1/-1 for slide animation), `showExportStep` (derived from vendorType in create mode, always true in edit mode), `isExport` (defaults from vendorType), `confirmExportOff`.
- visibleSteps computed via useMemo from isEdit + showExportStep (skips vendorType in edit mode, skips export when showExportStep is false).
- Per-step validation via validateStep(stepId): vendorType set, categoryId set, name ≥3 chars, required category fields, required export fields + certifications (only when isExport=true).
- Auto-advance: useEffect with 400ms setTimeout, fires when vendorType (Step 1) or categoryId (Step 2) is set. Targets next step by id (goToStepById) to avoid stale currentStep closure. Shows emerald "Continuer →" hint pill on selection.
- Direction-aware slide animation: framer-motion AnimatePresence mode="wait" with custom={direction}, stepVariants enter/center/exit using x: ±48 + opacity.
- Edit mode: skips Step 1 (vendorType), starts at Step 2 (category) if no categoryId or Step 3 (general) if categoryId already set. Pre-fills all fields from initialData. showExportStep defaults to true so the export step is always accessible.
- Export toggle confirm: when vendorType==="exportateur" and user turns toggle off, ConfirmDialog appears ("Vous êtes exportateur — êtes-vous sûr..."). Confirm clears exportData + sets isExport=false; Cancel keeps isExport=true.
- Summary "Activer l'export" button: for vendor types where showExportStep is false (Producteur/Distributeur), the summary's export section shows a button that flips showExportStep=true + isExport=true and jumps to the export step (computes the new index synchronously since the export step is inserted before summary).
- Submit (handleSubmit): runs validateStep across ALL visible steps, jumps to first errored step if any, then POST /api/products or PATCH /api/products/{id} with the same payload contract as before (name/brand/weight/description/imageUrl/isPublic/status/categoryId/isExport/categoryData/exportData/certifications) plus vendorType (sent but ignored by API). Calls refresh() + onClose() on success.
- Status mapping preserved: actif → isPublic:true + status:"ACTIVE"; brouillon → isPublic:false + status:"ARCHIVED"; masque → isPublic:false + status:"ACTIVE".
- Kept DynamicProductInitialData type signature unchanged (ProduitsPage wrapper depends on it). Kept onClose prop. Kept useFabricantData().refresh().
- Mobile-first responsive: cards 1-col on mobile, 2-3 cols on sm/lg. Stepper collapses to "Étape X sur Y" + progress bar on mobile. Modal max-w-[880px], max-h-[92vh] with scroll on body. Footer wraps on small screens.
- ESC key closes modal (disabled when ConfirmDialog is open).

## Verification
- `bun run lint` (full project) → 0 errors, 0 warnings. (Initial run had 1 warning for an unused eslint-disable directive on the auto-advance useEffect; fixed by switching from `goToStep(currentStep + 1)` to `goToStepById("category"/"general")` which removes the currentStep dependency, making the exhaustive-deps rule satisfied without a disable directive.)
- `bunx tsc --noEmit` filtered to DynamicProductForm → 0 errors. (Pre-existing errors in unrelated files: examples/, scripts/, skills/, admin pages, ProduitDetailPage.tsx, LoyaltyWidget.tsx, auth.ts, fabricant-server-data.ts — all untouched.)
- Dev server (port 3000): "✓ Compiled in 587ms" and "✓ Compiled in 631ms" — no compile errors after changes.
- `curl -s -o /dev/null -w "%{http_code}" -L http://localhost:3000/dashboard` → 200 (dashboard loads, ProduitsPage which wraps DynamicProductForm compiles cleanly).
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → 200.

## Stage Summary
- 1 file modified: `src/components/fabricant/DynamicProductForm.tsx` (rewritten from 1206 → 1959 lines; the increase is from 6 fully-rendered step bodies + new Stepper/ConfirmDialog/VendorTypeCard/SummarySection/SummaryRow helpers + formatFieldValue).
- Public API unchanged: same `DynamicProductInitialData` type, same `DynamicProductForm` named export, same `{initialData?, onClose}` props, same POST/PATCH contract. The `vendorType` field is sent in the body but ignored by the API.
- 6-step guided wizard replaces the 4-tab interface: vendor onboarding → category → general info → specifics → export&certs (conditional) → summary. Users can no longer skip required category fields or certifications.
- Per-step validation blocks forward navigation with inline errors + toast. Auto-advance on Steps 1 & 2 (400ms delay). Direction-aware framer-motion slide transitions. Mobile-first responsive stepper.
- Edit mode skips Step 1, pre-fills all fields, always shows the export step (accessible for editing).
- ESLint + TypeScript clean. Dev server compiles without errors. Dashboard returns 200.
