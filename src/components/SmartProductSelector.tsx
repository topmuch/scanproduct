"use client";

// ============================================================================
// SmartProductSelector — Assistant intelligent d'auto-complétion produit
// ============================================================================
// Composant COMMUN aux deux versions de la plateforme :
//   - Version CLASSIQUE (fabricant formel) — DynamicProductForm
//   - Version ARTISAN (petit fabricant)    — /activer-pack/[masterCode]
//
// Fonctionnement :
//   1. L'utilisateur choisit une catégorie (Cosmétique / Agroalimentaire)
//   2. Il tape quelques lettres → suggestions de produits types
//   3. Un clic remplit automatiquement : désignation, conseils,
//      précautions, conservation, ingrédients, durée de conservation
//      (+ auto-calcul de la date de péremption par le parent)
//   4. Toutes les valeurs restent MODIFIABLES après sélection
// ============================================================================

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock,
  FlaskConical,
  Lightbulb,
  MapPin,
  Sparkles,
  X,
} from "lucide-react";
import {
  AGROALIMENTAIRE_TEMPLATES,
  PRODUCT_TEMPLATES,
  templateShelfLifeLabel,
  type ProductTemplate,
  type ProductTemplateCategory,
} from "@/lib/product-templates";

export type { ProductTemplate, ProductTemplateCategory };

interface Props {
  /** Appelé quand l'utilisateur choisit (ou change) un produit type. */
  onTemplateSelect: (template: ProductTemplate) => void;
  /** Template actuellement sélectionné (contrôlé par le parent). */
  selectedTemplate?: ProductTemplate | null;
  /** Appelé quand l'utilisateur retire la sélection (bouton ✕). */
  onClear?: () => void;
  /** Catégorie initiale (par défaut : cosmétique). */
  initialCategory?: ProductTemplateCategory;
  /** Texte compact pour les formulaires mobiles artisans. */
  compact?: boolean;
}

export function SmartProductSelector({
  onTemplateSelect,
  selectedTemplate,
  onClear,
  initialCategory = "cosmetique",
  compact = false,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<ProductTemplateCategory>(initialCategory);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);

  const allTemplates =
    category === "cosmetique" ? PRODUCT_TEMPLATES : AGROALIMENTAIRE_TEMPLATES;

  // Recherche tolérante : match sur le nom, mais aussi sur les mots-clés
  // des ingrédients typiques (ex. « karité » propose le beurre de karité).
  const filteredTemplates = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allTemplates;
    return allTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.typicalIngredients.some((i) => i.toLowerCase().includes(q)),
    );
  }, [allTemplates, searchTerm]);

  const handleSelect = (template: ProductTemplate) => {
    onTemplateSelect(template);
    setSearchTerm(template.name);
    setShowSuggestions(false);
    setShowAllDetails(false);
  };

  const handleClear = () => {
    setSearchTerm("");
    setShowAllDetails(false);
    onClear?.();
  };

  return (
    <div className="space-y-4">
      {/* ── Catégorie ─────────────────────────────────────────────────── */}
      {!selectedTemplate && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📂 Catégorie de produit
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setCategory("cosmetique");
                setSearchTerm("");
                setShowSuggestions(true);
              }}
              className={`py-3 rounded-xl font-semibold transition-all ${
                category === "cosmetique"
                  ? "bg-amber-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🧴 Cosmétique
            </button>
            <button
              type="button"
              onClick={() => {
                setCategory("agroalimentaire");
                setSearchTerm("");
                setShowSuggestions(true);
              }}
              className={`py-3 rounded-xl font-semibold transition-all ${
                category === "agroalimentaire"
                  ? "bg-green-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              🥭 Agroalimentaire
            </button>
          </div>
        </div>
      )}

      {/* ── Recherche + suggestions ───────────────────────────────────── */}
      {!selectedTemplate && (
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🔍 Type de produit
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Ex : crème de corps, savon, jus de fruits…"
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 outline-none transition-colors"
          />

          {showSuggestions && filteredTemplates.length > 0 && (
            <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(template)}
                  className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{template.name}</div>
                      <div className="text-xs text-gray-600">
                        Conservation : {templateShelfLifeLabel(template)}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {showSuggestions && searchTerm.trim() && filteredTemplates.length === 0 && (
            <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-xl">
              Aucun produit type ne correspond à « {searchTerm} ». Continuez à
              la main — vous pourrez tout saisir vous-même ci-dessous.
            </div>
          )}
        </div>
      )}

      {/* ── Template sélectionné ──────────────────────────────────────── */}
      {selectedTemplate && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-200">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{selectedTemplate.icon}</span>
              <div>
                <h3 className={`font-bold text-gray-900 ${compact ? "text-base" : "text-xl"}`}>
                  ✅ {selectedTemplate.name}
                </h3>
                <p className="text-sm text-amber-700 font-semibold inline-flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-3.5 w-3.5" />
                  Conservation : {templateShelfLifeLabel(selectedTemplate)}
                </p>
              </div>
            </div>
            {onClear && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Retirer ce produit type"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Conseils d'utilisation */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Conseils d&apos;utilisation
            </h4>
            <ul className="space-y-1">
              {selectedTemplate.usageTips.slice(0, showAllDetails ? undefined : 3).map((tip, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Précautions */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Précautions
            </h4>
            <ul className="space-y-1">
              {selectedTemplate.precautions.slice(0, showAllDetails ? undefined : 3).map((prec, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>{prec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Conditions de stockage */}
          <div className="bg-white rounded-xl p-4 border border-amber-100 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-blue-500" />
              Conservation
            </h4>
            <p className="text-sm text-gray-700">{selectedTemplate.storageConditions}</p>
          </div>

          {/* Ingrédients suggérés */}
          <div className={showAllDetails ? "" : "mb-1"}>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
              <FlaskConical className="h-4 w-4 text-green-600" />
              Ingrédients suggérés
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedTemplate.typicalIngredients.map((ingredient, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-white border border-amber-200 rounded-full text-xs font-medium text-amber-800"
                >
                  {ingredient}
                </span>
              ))}
            </div>
            {selectedTemplate.allergens && selectedTemplate.allergens.length > 0 && (
              <p className="mt-2 text-xs text-red-600 font-medium">
                ⚠️ Allergènes courants : {selectedTemplate.allergens.join(", ")}
              </p>
            )}
          </div>

          {/* Tous les champs restent modifiables — simple rappel UX */}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700">
            <Check className="h-3.5 w-3.5" />
            Toutes ces informations sont modifiables dans le formulaire.
          </p>
        </div>
      )}

      {/* ── Encart promotionnel (avant sélection) ─────────────────────── */}
      {!selectedTemplate && !compact && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          Sélectionnez un type de produit : les conseils, précautions et la
          durée de conservation se remplissent automatiquement.
        </p>
      )}
    </div>
  );
}
