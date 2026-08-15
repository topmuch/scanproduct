/**
 * VerifScan — Product Category Schemas (CLIENT-SAFE)
 *
 * Defines the dynamic form schemas for all 10 product categories across 3
 * deployment phases. Each `ProductSchema` declares:
 *   - `fields`          : category-specific fields (always rendered)
 *   - `exportFields?`   : export-only fields (rendered when `isExport=true`)
 *
 * This module is PURE — no DB queries, no server-only imports. It can be
 * imported from client components, server components, API routes, and
 * standalone scripts (seed-categories.ts).
 *
 * The Prisma `Category.schema` / `Category.exportSchema` columns store the
 * JSON-serialized form of `fields` / `exportFields` (SQLite does NOT support
 * Prisma `Json`, so we use `String?` + manual JSON.parse/stringify everywhere).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "checkbox"
  | "boolean"
  | "file";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  /** Regex source string — kept as string so the schema is JSON-serializable. */
  pattern?: string;
  maxLength?: number;
}

export interface FieldConfig {
  /** Field key in `categoryData` / `exportData`. */
  name: string;
  /** French label rendered above the input. */
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  /** Options for `select` / `checkbox` field types. */
  options?: FieldOption[];
  validation?: FieldValidation;
  /** Group label for visual sectioning (e.g. "Production", "Certifications Export"). */
  group?: string;
  /** True if this field only applies when `isExport=true`. */
  exportRequired?: boolean;
  /** Display unit appended to the input (e.g. "kg", "°C", "%"). */
  unit?: string;
  defaultValue?: any;
}

export interface ProductSchema {
  /** Slug, e.g. "fruits-legumes". */
  id: string;
  /** Display name, e.g. "Fruits & Légumes Frais". */
  name: string;
  emoji: string;
  description: string;
  phase: 1 | 2 | 3;
  /** Category-specific fields (always rendered). */
  fields: FieldConfig[];
  /** Export-only fields (added when `isExport=true`). */
  exportFields?: FieldConfig[];
}

// ---------------------------------------------------------------------------
// Shared option sets (used by many categories)
// ---------------------------------------------------------------------------

const ORIGIN_COUNTRY_OPTIONS: FieldOption[] = [
  { value: "senegal", label: "Sénégal" },
  { value: "mali", label: "Mali" },
  { value: "cote-divoire", label: "Côte d'Ivoire" },
  { value: "burkina-faso", label: "Burkina Faso" },
  { value: "ghana", label: "Ghana" },
  { value: "guinee", label: "Guinée" },
];

const INCOTERM_OPTIONS: FieldOption[] = [
  { value: "FOB", label: "FOB — Free On Board" },
  { value: "CIF", label: "CIF — Cost, Insurance & Freight" },
  { value: "EXW", label: "EXW — Ex Works" },
  { value: "CFR", label: "CFR — Cost & Freight" },
];

// ---------------------------------------------------------------------------
// PHASE 1 — Immediate (production-ready)
// ---------------------------------------------------------------------------

const FRUITS_LEGUMES: ProductSchema = {
  id: "fruits-legumes",
  name: "Fruits & Légumes Frais",
  emoji: "🥕",
  description:
    "Fruits et légumes frais récoltés localement — mangues, oignons, tomates, haricots verts, etc. Suivi de la récolte à l'export avec certifications phytosanitaires.",
  phase: 1,
  fields: [
    // Production
    {
      name: "variety",
      label: "Variété",
      type: "text",
      required: true,
      placeholder: "Variété — ex: Mangue Kent",
      group: "Production",
    },
    {
      name: "originCountry",
      label: "Pays d'origine",
      type: "select",
      required: true,
      options: ORIGIN_COUNTRY_OPTIONS,
      group: "Production",
    },
    {
      name: "originRegion",
      label: "Région / Préfecture",
      type: "text",
      placeholder: "ex: Casamance, Sikasso, Korhogo…",
      group: "Production",
    },
    {
      name: "harvestDate",
      label: "Date de récolte",
      type: "date",
      required: true,
      group: "Production",
    },
    {
      name: "harvestMethod",
      label: "Méthode de récolte",
      type: "select",
      options: [
        { value: "manuelle", label: "Manuelle" },
        { value: "mecanisee", label: "Mécanisée" },
        { value: "mixte", label: "Mixte" },
      ],
      group: "Production",
    },
    // Qualité
    {
      name: "caliber",
      label: "Calibre",
      type: "select",
      options: [
        { value: "extra", label: "Extra" },
        { value: "calibre-i", label: "Calibre I" },
        { value: "calibre-ii", label: "Calibre II" },
        { value: "hors-calibre", label: "Hors calibre" },
      ],
      group: "Qualité",
    },
    {
      name: "brixDegree",
      label: "Degré Brix",
      type: "number",
      unit: "°Brix",
      helpText: "Teneur en sucre",
      validation: { min: 0, max: 40 },
      group: "Qualité",
    },
    {
      name: "organic",
      label: "Produit bio certifié",
      type: "boolean",
      group: "Qualité",
    },
    {
      name: "treatmentType",
      label: "Traitement post-récolte",
      type: "checkbox",
      options: [
        { value: "fumigation", label: "Fumigation" },
        { value: "thermique", label: "Traitement thermique" },
        { value: "phytosanitaire", label: "Traitement phytosanitaire" },
        { value: "aucun", label: "Aucun" },
      ],
      group: "Qualité",
    },
    // Conservation
    {
      name: "storageTemperature",
      label: "Température de conservation",
      type: "number",
      unit: "°C",
      validation: { min: -10, max: 30 },
      group: "Conservation",
    },
    {
      name: "shelfLifeDays",
      label: "Durée de conservation",
      type: "number",
      unit: "jours",
      validation: { min: 1, max: 365 },
      group: "Conservation",
    },
    {
      name: "packaging",
      label: "Conditionnement",
      type: "select",
      options: [
        { value: "cagette", label: "Cagette" },
        { value: "palette", label: "Palette" },
        { value: "filet", label: "Filet" },
        { value: "vrac", label: "Vrac" },
        { value: "sous-vide", label: "Sous vide" },
      ],
      group: "Conservation",
    },
    {
      name: "ripenessStage",
      label: "Stade de maturité",
      type: "select",
      options: [
        { value: "vert", label: "Vert" },
        { value: "mature", label: "Mûr" },
        { value: "a-point", label: "À point" },
        { value: "sur-mur", label: "Sur-mûr" },
      ],
      group: "Conservation",
    },
    // Traçabilité
    {
      name: "plotReference",
      label: "Référence parcelle",
      type: "text",
      placeholder: "ex: PARC-2024-007",
      group: "Traçabilité",
    },
    {
      name: "batchIdentifier",
      label: "Identifiant lot récolte",
      type: "text",
      placeholder: "ex: LOT-REC-2024-0142",
      group: "Traçabilité",
    },
  ],
  exportFields: [
    {
      name: "phytosanitaryCertificate",
      label: "Certificat phytosanitaire",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "eurepGapCertificate",
      label: "Certificat GlobalGAP / EurepGAP",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "originCertificate",
      label: "Certificat d'origine",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "destinationCountry",
      label: "Pays de destination",
      type: "text",
      required: true,
      placeholder: "ex: France, Allemagne, USA…",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "incoterm",
      label: "Incoterm",
      type: "select",
      required: true,
      options: INCOTERM_OPTIONS,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "customsCode",
      label: "Code douanier HS",
      type: "text",
      placeholder: "ex: 0804.50.00 (mangues)",
      helpText: "Code du Système Harmonisé de désignation des marchandises",
      exportRequired: true,
      group: "Certifications Export",
    },
  ],
};

const CAFE_CACAO: ProductSchema = {
  id: "cafe-cacao",
  name: "Café & Cacao",
  emoji: "☕",
  description:
    "Grains de café et cacao issus de coopératives ouest-africaines — suivi du verger à la torréfaction, avec certifications ICO et Fairtrade pour l'export.",
  phase: 1,
  fields: [
    // Production
    {
      name: "variety",
      label: "Variété",
      type: "text",
      required: true,
      placeholder: "Variété — ex: Robusta, Arabica, Forastero",
      group: "Production",
    },
    {
      name: "originCountry",
      label: "Pays d'origine",
      type: "select",
      required: true,
      options: ORIGIN_COUNTRY_OPTIONS,
      group: "Production",
    },
    {
      name: "originRegion",
      label: "Région / Préfecture",
      type: "text",
      placeholder: "ex: Niéméné, Man, Bafoulabé…",
      group: "Production",
    },
    {
      name: "altitudeMeters",
      label: "Altitude de culture",
      type: "number",
      unit: "m",
      validation: { min: 0, max: 3000 },
      group: "Production",
    },
    {
      name: "harvestDate",
      label: "Date de récolte",
      type: "date",
      required: true,
      group: "Production",
    },
    {
      name: "harvestMethod",
      label: "Méthode de récolte",
      type: "select",
      options: [
        { value: "manuel", label: "Manuel" },
        { value: "mecanise", label: "Mécanisé" },
        { value: "selectif", label: "Sélectif" },
      ],
      group: "Production",
    },
    // Traitement
    {
      name: "processingMethod",
      label: "Méthode de traitement",
      type: "select",
      required: true,
      options: [
        { value: "voie-seche", label: "Voie sèche" },
        { value: "lave", label: "Lavé" },
        { value: "semi-lave", label: "Semi-lavé" },
        { value: "honey", label: "Honey" },
      ],
      group: "Traitement",
    },
    {
      name: "dryingMethod",
      label: "Méthode de séchage",
      type: "select",
      options: [
        { value: "soleil-naturel", label: "Soleil naturel" },
        { value: "soleil-artificiel", label: "Soleil artificiel" },
        { value: "mecanique", label: "Mécanique" },
      ],
      group: "Traitement",
    },
    {
      name: "roastLevel",
      label: "Niveau de torréfaction",
      type: "select",
      options: [
        { value: "vert", label: "Vert" },
        { value: "light-roast", label: "Light roast" },
        { value: "medium-roast", label: "Medium roast" },
        { value: "dark-roast", label: "Dark roast" },
      ],
      group: "Traitement",
    },
    {
      name: "roastingDate",
      label: "Date de torréfaction",
      type: "date",
      group: "Traitement",
    },
    // Qualité
    {
      name: "grade",
      label: "Grade / Qualité",
      type: "text",
      placeholder: "Grade/Qualité — ex: Grade 1, AA",
      group: "Qualité",
    },
    {
      name: "defectCount",
      label: "Nombre de défauts",
      type: "number",
      unit: "défauts/300g",
      validation: { min: 0, max: 100 },
      group: "Qualité",
    },
    {
      name: "moistureContent",
      label: "Taux d'humidité",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 30 },
      group: "Qualité",
    },
    {
      name: "organic",
      label: "Produit bio certifié",
      type: "boolean",
      group: "Qualité",
    },
    // Conditionnement
    {
      name: "packaging",
      label: "Conditionnement",
      type: "select",
      options: [
        { value: "sac-jute", label: "Sac jute" },
        { value: "sac-vacuum", label: "Sac vacuum" },
        { value: "sac-kraft", label: "Sac kraft" },
        { value: "fut", label: "Fût" },
      ],
      group: "Conditionnement",
    },
    {
      name: "weight",
      label: "Poids unitaire",
      type: "text",
      placeholder: "ex: 60 kg, 500 g",
      group: "Conditionnement",
    },
    {
      name: "shelfLifeMonths",
      label: "Durée de conservation",
      type: "number",
      unit: "mois",
      validation: { min: 1, max: 36 },
      group: "Conditionnement",
    },
  ],
  exportFields: [
    {
      name: "icoCertificate",
      label: "Certificat ICO",
      type: "file",
      required: true,
      exportRequired: true,
      helpText: "Organisation Internationale du Café — quota d'exportation",
      group: "Certifications Export",
    },
    {
      name: "phytosanitaryCertificate",
      label: "Certificat phytosanitaire",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "fairtradeCertificate",
      label: "Certificat Fairtrade",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "organicCertificate",
      label: "Certificat bio EU / USDA",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "destinationCountry",
      label: "Pays de destination",
      type: "text",
      required: true,
      placeholder: "ex: France, Allemagne, USA…",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "incoterm",
      label: "Incoterm",
      type: "select",
      required: true,
      options: INCOTERM_OPTIONS,
      exportRequired: true,
      group: "Certifications Export",
    },
  ],
};

const EPICES: ProductSchema = {
  id: "epices",
  name: "Épices",
  emoji: "🌶️",
  description:
    "Épices entières et moulues — poivre de Penja, gingembre, curcuma, piment, etc. Suivi du séchage à la mouture, avec certifications HACCP et ISO 22000.",
  phase: 1,
  fields: [
    // Production
    {
      name: "variety",
      label: "Variété",
      type: "text",
      required: true,
      placeholder: "Variété — ex: Poivre noir Penja",
      group: "Production",
    },
    {
      name: "originCountry",
      label: "Pays d'origine",
      type: "select",
      required: true,
      options: ORIGIN_COUNTRY_OPTIONS,
      group: "Production",
    },
    {
      name: "originRegion",
      label: "Région / Préfecture",
      type: "text",
      placeholder: "ex: Penja, Loubomo…",
      group: "Production",
    },
    {
      name: "harvestDate",
      label: "Date de récolte",
      type: "date",
      required: true,
      group: "Production",
    },
    {
      name: "dryingMethod",
      label: "Méthode de séchage",
      type: "select",
      required: true,
      options: [
        { value: "soleil", label: "Soleil" },
        { value: "sechoir-solaire", label: "Séchoir solaire" },
        { value: "sechoir-mecanique", label: "Séchoir mécanique" },
      ],
      group: "Production",
    },
    // Transformation
    {
      name: "processingType",
      label: "Type de transformation",
      type: "select",
      required: true,
      options: [
        { value: "entier", label: "Entier" },
        { value: "moulu", label: "Moulu" },
        { value: "concasse", label: "Concassé" },
        { value: "melange", label: "Mélange" },
      ],
      group: "Transformation",
    },
    {
      name: "grindingDate",
      label: "Date de mouture",
      type: "date",
      group: "Transformation",
    },
    {
      name: "meshSize",
      label: "Granulométrie / Maillage",
      type: "text",
      placeholder: "ex: 40 mesh, 60 mesh…",
      group: "Transformation",
    },
    // Qualité
    {
      name: "pungencyLevel",
      label: "Niveau de piquant (Scoville)",
      type: "select",
      options: [
        { value: "doux", label: "Doux" },
        { value: "moyen", label: "Moyen" },
        { value: "fort", label: "Fort" },
        { value: "tres-fort", label: "Très fort" },
      ],
      group: "Qualité",
    },
    {
      name: "moistureContent",
      label: "Taux d'humidité",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 20 },
      group: "Qualité",
    },
    {
      name: "volatileOilContent",
      label: "Taux d'huiles essentielles",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 20 },
      group: "Qualité",
    },
    {
      name: "organic",
      label: "Produit bio certifié",
      type: "boolean",
      group: "Qualité",
    },
    {
      name: "additives",
      label: "Contient additifs / antiagglomérants",
      type: "boolean",
      group: "Qualité",
    },
    // Conditionnement
    {
      name: "packaging",
      label: "Conditionnement",
      type: "select",
      options: [
        { value: "sac-kraft", label: "Sac kraft" },
        { value: "boite-metal", label: "Boîte métal" },
        { value: "sac-vacuum", label: "Sac vacuum" },
        { value: "pot-verre", label: "Pot verre" },
      ],
      group: "Conditionnement",
    },
    {
      name: "weight",
      label: "Poids unitaire",
      type: "text",
      placeholder: "ex: 100 g, 500 g, 1 kg",
      group: "Conditionnement",
    },
    {
      name: "shelfLifeMonths",
      label: "Durée de conservation",
      type: "number",
      unit: "mois",
      validation: { min: 1, max: 60 },
      group: "Conditionnement",
    },
  ],
  exportFields: [
    {
      name: "phytosanitaryCertificate",
      label: "Certificat phytosanitaire",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "iso22000Certificate",
      label: "Certificat ISO 22000",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "haccpCertificate",
      label: "Certificat HACCP",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "organicCertificate",
      label: "Certificat bio",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "destinationCountry",
      label: "Pays de destination",
      type: "text",
      required: true,
      placeholder: "ex: France, Allemagne, USA…",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "incoterm",
      label: "Incoterm",
      type: "select",
      required: true,
      options: INCOTERM_OPTIONS,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "customsCode",
      label: "Code douanier HS",
      type: "text",
      placeholder: "ex: 0904.11.00 (poivre)",
      exportRequired: true,
      group: "Certifications Export",
    },
  ],
};

// ---------------------------------------------------------------------------
// PHASE 2 — 3-6 months
// ---------------------------------------------------------------------------

const PRODUITS_MER: ProductSchema = {
  id: "produits-mer",
  name: "Produits de la mer",
  emoji: "🐟",
  description:
    "Poissons, crustacés et fruits de mer — frais, congelés, fumés ou séchés. Suivi de la capture (zone FAO, méthode) au conditionnement, avec certificat sanitaire et certificat de capture UE pour l'export.",
  phase: 2,
  fields: [
    // Production
    {
      name: "variety",
      label: "Espèce",
      type: "text",
      required: true,
      placeholder: "ex: Thiof, Mérou, Crevette rose, Capitaine",
      group: "Production",
    },
    {
      name: "originCountry",
      label: "Pays d'origine",
      type: "select",
      required: true,
      options: ORIGIN_COUNTRY_OPTIONS,
      group: "Production",
    },
    {
      name: "originRegion",
      label: "Port / Région de débarquement",
      type: "text",
      placeholder: "ex: Saint-Louis, Joal-Fadiouth, Abidjan…",
      group: "Production",
    },
    {
      name: "catchDate",
      label: "Date de capture",
      type: "date",
      required: true,
      group: "Production",
    },
    {
      name: "catchMethod",
      label: "Méthode de capture",
      type: "select",
      options: [
        { value: "peche-artisanale", label: "Pêche artisanale" },
        { value: "peche-industrielle", label: "Pêche industrielle" },
        { value: "peche-mer", label: "Pêche en mer" },
        { value: "peche-continentale", label: "Pêche continentale" },
        { value: "aquaculture", label: "Aquaculture" },
      ],
      group: "Production",
    },
    {
      name: "catchZone",
      label: "Zone de capture FAO",
      type: "text",
      placeholder: "ex: 34.3.1 (Atlantique Centre-Est)",
      helpText: "Code de la zone de pêche FAO",
      group: "Production",
    },
    // Traitement
    {
      name: "processingType",
      label: "Type de traitement",
      type: "select",
      required: true,
      options: [
        { value: "frais", label: "Frais" },
        { value: "congele", label: "Congelé" },
        { value: "fume", label: "Fumé" },
        { value: "seche", label: "Séché" },
        { value: "sale", label: "Salé" },
      ],
      group: "Traitement",
    },
    {
      name: "preservationMethod",
      label: "Méthode de conservation",
      type: "select",
      options: [
        { value: "glace", label: "Glace" },
        { value: "congelation", label: "Congélation" },
        { value: "sous-vide", label: "Sous vide" },
        { value: "salage-sechage", label: "Salage / Séchage" },
      ],
      group: "Traitement",
    },
    {
      name: "freezingDate",
      label: "Date de congélation",
      type: "date",
      group: "Traitement",
    },
    // Qualité
    {
      name: "freshnessGrade",
      label: "Classe de fraîcheur",
      type: "select",
      options: [
        { value: "extra", label: "Extra" },
        { value: "a", label: "A" },
        { value: "extra-a", label: "Extra A" },
        { value: "b", label: "B" },
      ],
      group: "Qualité",
    },
    {
      name: "moistureContent",
      label: "Taux d'humidité",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 90 },
      helpText: "Spécifique aux produits séchés",
      group: "Qualité",
    },
    {
      name: "organic",
      label: "Élevage bio / éco-responsable",
      type: "boolean",
      group: "Qualité",
    },
    // Conditionnement
    {
      name: "packaging",
      label: "Conditionnement",
      type: "select",
      options: [
        { value: "cagette", label: "Cagette isotherme" },
        { value: "sous-vide", label: "Sous vide" },
        { value: "congele", label: "Sachet congelé" },
        { value: "boite", label: "Boîte" },
      ],
      group: "Conditionnement",
    },
    {
      name: "weight",
      label: "Poids unitaire",
      type: "text",
      placeholder: "ex: 1 kg, 500 g",
      group: "Conditionnement",
    },
    {
      name: "storageTemperature",
      label: "Température de conservation",
      type: "number",
      unit: "°C",
      validation: { min: -30, max: 10 },
      group: "Conditionnement",
    },
  ],
  exportFields: [
    {
      name: "healthCertificate",
      label: "Certificat sanitaire",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "catchCertificate",
      label: "Certificat de capture UE",
      type: "file",
      required: true,
      exportRequired: true,
      helpText: "Obligatoire pour export vers l'Union Européenne",
      group: "Certifications Export",
    },
    {
      name: "originCertificate",
      label: "Certificat d'origine",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "destinationCountry",
      label: "Pays de destination",
      type: "text",
      required: true,
      placeholder: "ex: France, Espagne, Japon…",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "incoterm",
      label: "Incoterm",
      type: "select",
      required: true,
      options: INCOTERM_OPTIONS,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "customsCode",
      label: "Code douanier HS",
      type: "text",
      placeholder: "ex: 0303.84.00 (filets congelés)",
      exportRequired: true,
      group: "Certifications Export",
    },
  ],
};

const NOIX_FRUITS_SECS: ProductSchema = {
  id: "noix-fruits-secs",
  name: "Noix & Fruits secs",
  emoji: "🥜",
  description:
    "Noix de cajou, arachides, noix de karité, mangues séchées, etc. Suivi de la récolte au décorticage avec contrôle des aflatoxines pour l'export.",
  phase: 2,
  fields: [
    // Production
    {
      name: "variety",
      label: "Variété",
      type: "text",
      required: true,
      placeholder: "ex: Noix de cajou, Arachide 55-437, Karité",
      group: "Production",
    },
    {
      name: "originCountry",
      label: "Pays d'origine",
      type: "select",
      required: true,
      options: ORIGIN_COUNTRY_OPTIONS,
      group: "Production",
    },
    {
      name: "originRegion",
      label: "Région / Préfecture",
      type: "text",
      placeholder: "ex: Kolda, Ségou, Bondoukou…",
      group: "Production",
    },
    {
      name: "harvestDate",
      label: "Date de récolte",
      type: "date",
      required: true,
      group: "Production",
    },
    {
      name: "harvestMethod",
      label: "Méthode de récolte",
      type: "select",
      options: [
        { value: "manuel", label: "Manuel" },
        { value: "mecanise", label: "Mécanisé" },
        { value: "mixte", label: "Mixte" },
      ],
      group: "Production",
    },
    // Traitement
    {
      name: "processingType",
      label: "Type de préparation",
      type: "select",
      required: true,
      options: [
        { value: "entier", label: "Entier" },
        { value: "moitie", label: "Moitié" },
        { value: "ecale", label: "Écalé" },
        { value: "non-ecale", label: "Non écalé" },
      ],
      group: "Traitement",
    },
    {
      name: "dryingMethod",
      label: "Méthode de séchage",
      type: "select",
      options: [
        { value: "soleil", label: "Soleil naturel" },
        { value: "sechoir-solaire", label: "Séchoir solaire" },
        { value: "mecanique", label: "Mécanique" },
      ],
      group: "Traitement",
    },
    {
      name: "shellingDate",
      label: "Date de décorticage",
      type: "date",
      group: "Traitement",
    },
    {
      name: "roastingDate",
      label: "Date de torréfaction",
      type: "date",
      group: "Traitement",
    },
    // Qualité
    {
      name: "grade",
      label: "Grade / Qualité",
      type: "text",
      placeholder: "ex: W240, W320 (cajou), Grade 1",
      group: "Qualité",
    },
    {
      name: "defectCount",
      label: "Nombre de défauts",
      type: "number",
      unit: "défauts/100g",
      validation: { min: 0, max: 100 },
      group: "Qualité",
    },
    {
      name: "moistureContent",
      label: "Taux d'humidité",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 15 },
      group: "Qualité",
    },
    {
      name: "aflatoxinLevel",
      label: "Taux d'aflatoxines",
      type: "number",
      unit: "ppb",
      validation: { min: 0, max: 50 },
      helpText: "Seuil UE : ≤ 4 ppb (B1) / ≤ 10 ppb (total)",
      group: "Qualité",
    },
    {
      name: "brokenRatio",
      label: "Ratio brisures",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 100 },
      group: "Qualité",
    },
    {
      name: "organic",
      label: "Produit bio certifié",
      type: "boolean",
      group: "Qualité",
    },
    // Conditionnement
    {
      name: "packaging",
      label: "Conditionnement",
      type: "select",
      options: [
        { value: "sac-jute", label: "Sac jute" },
        { value: "sac-vacuum", label: "Sac vacuum" },
        { value: "sac-kraft", label: "Sac kraft" },
        { value: "boite", label: "Boîte" },
      ],
      group: "Conditionnement",
    },
    {
      name: "weight",
      label: "Poids unitaire",
      type: "text",
      placeholder: "ex: 50 kg, 22.68 kg (50 lbs)",
      group: "Conditionnement",
    },
    {
      name: "shelfLifeMonths",
      label: "Durée de conservation",
      type: "number",
      unit: "mois",
      validation: { min: 1, max: 24 },
      group: "Conditionnement",
    },
  ],
  exportFields: [
    {
      name: "phytosanitaryCertificate",
      label: "Certificat phytosanitaire",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "healthCertificate",
      label: "Certificat sanitaire",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "aflatoxinCertificate",
      label: "Certificat d'analyse aflatoxines",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "organicCertificate",
      label: "Certificat bio",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "destinationCountry",
      label: "Pays de destination",
      type: "text",
      required: true,
      placeholder: "ex: France, USA, Pays-Bas…",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "incoterm",
      label: "Incoterm",
      type: "select",
      required: true,
      options: INCOTERM_OPTIONS,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "customsCode",
      label: "Code douanier HS",
      type: "text",
      placeholder: "ex: 0801.31.00 (cajou)",
      exportRequired: true,
      group: "Certifications Export",
    },
  ],
};

const HUILES: ProductSchema = {
  id: "huiles",
  name: "Huiles",
  emoji: "🫒",
  description:
    "Huiles végétales — palme, karité, arachide, sésame. Suivi de l'extraction (froide, à chaud, solvant) au conditionnement, avec contrôle d'acidité et de péroxide.",
  phase: 2,
  fields: [
    // Production
    {
      name: "variety",
      label: "Variété",
      type: "text",
      required: true,
      placeholder: "ex: Palmier à huile, Karité, Arachide, Sésame",
      group: "Production",
    },
    {
      name: "originCountry",
      label: "Pays d'origine",
      type: "select",
      required: true,
      options: ORIGIN_COUNTRY_OPTIONS,
      group: "Production",
    },
    {
      name: "originRegion",
      label: "Région / Préfecture",
      type: "text",
      placeholder: "ex: Ziguinchor, Ségou, Bondoukou…",
      group: "Production",
    },
    {
      name: "harvestDate",
      label: "Date de récolte",
      type: "date",
      required: true,
      group: "Production",
    },
    {
      name: "extractionMethod",
      label: "Méthode d'extraction",
      type: "select",
      required: true,
      options: [
        { value: "pression-froid", label: "Pression à froid" },
        { value: "pression-chaud", label: "Pression à chaud" },
        { value: "solvant", label: "Solvant" },
        { value: "manuel", label: "Manuel / traditionnel" },
      ],
      group: "Production",
    },
    // Traitement
    {
      name: "refiningLevel",
      label: "Niveau de raffinage",
      type: "select",
      options: [
        { value: "brut", label: "Brut" },
        { value: "raffine", label: "Raffiné" },
        { value: "non-raffine", label: "Non raffiné" },
      ],
      group: "Traitement",
    },
    {
      name: "processingDate",
      label: "Date de traitement",
      type: "date",
      group: "Traitement",
    },
    {
      name: "additives",
      label: "Contient additifs / antioxydants",
      type: "boolean",
      group: "Traitement",
    },
    // Qualité
    {
      name: "acidityLevel",
      label: "Taux d'acidité",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 30 },
      helpText: "Acidité oléique libre",
      group: "Qualité",
    },
    {
      name: "peroxideValue",
      label: "Indice de peroxyde",
      type: "number",
      unit: "meq/kg",
      validation: { min: 0, max: 100 },
      helpText: "Mesure de l'oxydation",
      group: "Qualité",
    },
    {
      name: "moistureContent",
      label: "Taux d'humidité",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 5 },
      group: "Qualité",
    },
    {
      name: "grade",
      label: "Grade / Qualité",
      type: "text",
      placeholder: "ex: Extra vierge, Vierge, Grade A",
      group: "Qualité",
    },
    {
      name: "organic",
      label: "Produit bio certifié",
      type: "boolean",
      group: "Qualité",
    },
    // Conditionnement
    {
      name: "packaging",
      label: "Conditionnement",
      type: "select",
      options: [
        { value: "bidon", label: "Bidon" },
        { value: "bouteille-verre", label: "Bouteille verre" },
        { value: "fut", label: "Fût" },
        { value: "sac", label: "Sac (huile solide)" },
      ],
      group: "Conditionnement",
    },
    {
      name: "volume",
      label: "Volume unitaire",
      type: "text",
      placeholder: "ex: 1 L, 5 L, 25 L, 200 L",
      group: "Conditionnement",
    },
    {
      name: "shelfLifeMonths",
      label: "Durée de conservation",
      type: "number",
      unit: "mois",
      validation: { min: 1, max: 36 },
      group: "Conditionnement",
    },
  ],
  exportFields: [
    {
      name: "healthCertificate",
      label: "Certificat sanitaire",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "phytosanitaryCertificate",
      label: "Certificat phytosanitaire",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "originCertificate",
      label: "Certificat d'origine",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "organicCertificate",
      label: "Certificat bio EU / USDA",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "destinationCountry",
      label: "Pays de destination",
      type: "text",
      required: true,
      placeholder: "ex: France, Allemagne, USA…",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "incoterm",
      label: "Incoterm",
      type: "select",
      required: true,
      options: INCOTERM_OPTIONS,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "customsCode",
      label: "Code douanier HS",
      type: "text",
      placeholder: "ex: 1511.10.00 (huile de palme)",
      exportRequired: true,
      group: "Certifications Export",
    },
  ],
};

// ---------------------------------------------------------------------------
// PHASE 3 — 6-12 months
// ---------------------------------------------------------------------------

const VIANDES: ProductSchema = {
  id: "viandes",
  name: "Viandes",
  emoji: "🥩",
  description:
    "Viandes fraîches et transformées — bœuf zébu, mouton, chèvre, volaille. Suivi de l'abattage (halal/casher) au conditionnement, avec certificat sanitaire et halal pour l'export.",
  phase: 3,
  fields: [
    // Production
    {
      name: "variety",
      label: "Espèce / Variété",
      type: "text",
      required: true,
      placeholder: "ex: Bœuf zébu, Mouton, Poulet, Chèvre",
      group: "Production",
    },
    {
      name: "originCountry",
      label: "Pays d'origine",
      type: "select",
      required: true,
      options: ORIGIN_COUNTRY_OPTIONS,
      group: "Production",
    },
    {
      name: "originRegion",
      label: "Région / Préfecture",
      type: "text",
      placeholder: "ex: Saint-Louis, Sikasso, Bondoukou…",
      group: "Production",
    },
    {
      name: "slaughterDate",
      label: "Date d'abattage",
      type: "date",
      required: true,
      group: "Production",
    },
    {
      name: "slaughterMethod",
      label: "Méthode d'abattage",
      type: "select",
      options: [
        { value: "halal", label: "Halal" },
        { value: "casher", label: "Casher" },
        { value: "conventionnel", label: "Conventionnel" },
      ],
      group: "Production",
    },
    {
      name: "animalFeed",
      label: "Alimentation animale",
      type: "select",
      options: [
        { value: "paturage", label: "Pâturage" },
        { value: "elevage-intensif", label: "Élevage intensif" },
        { value: "elevage-bio", label: "Élevage bio" },
        { value: "mixte", label: "Mixte" },
      ],
      group: "Production",
    },
    // Traitement
    {
      name: "cutType",
      label: "Type de découpe",
      type: "select",
      options: [
        { value: "entier", label: "Entier" },
        { value: "morceau", label: "Morceau" },
        { value: "hache", label: "Haché" },
        { value: "saucisse", label: "Saucisse" },
      ],
      group: "Traitement",
    },
    {
      name: "processingType",
      label: "Type de traitement",
      type: "select",
      options: [
        { value: "frais", label: "Frais" },
        { value: "congele", label: "Congelé" },
        { value: "fume", label: "Fumé" },
        { value: "seche", label: "Séché" },
      ],
      group: "Traitement",
    },
    {
      name: "processingDate",
      label: "Date de traitement",
      type: "date",
      group: "Traitement",
    },
    // Qualité
    {
      name: "grade",
      label: "Grade / Qualité",
      type: "text",
      placeholder: "ex: Grade A, Choice, Prime",
      group: "Qualité",
    },
    {
      name: "fatContent",
      label: "Taux de matière grasse",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 50 },
      group: "Qualité",
    },
    {
      name: "organic",
      label: "Élevage bio certifié",
      type: "boolean",
      group: "Qualité",
    },
    {
      name: "halalCertified",
      label: "Certifié Halal",
      type: "boolean",
      group: "Qualité",
    },
    // Conditionnement
    {
      name: "packaging",
      label: "Conditionnement",
      type: "select",
      options: [
        { value: "sous-vide", label: "Sous vide" },
        { value: "cagette", label: "Cagette isotherme" },
        { value: "congele", label: "Sachet congelé" },
      ],
      group: "Conditionnement",
    },
    {
      name: "weight",
      label: "Poids unitaire",
      type: "text",
      placeholder: "ex: 1 kg, 500 g, 5 kg",
      group: "Conditionnement",
    },
    {
      name: "storageTemperature",
      label: "Température de conservation",
      type: "number",
      unit: "°C",
      validation: { min: -25, max: 7 },
      group: "Conditionnement",
    },
    {
      name: "shelfLifeDays",
      label: "Durée de conservation",
      type: "number",
      unit: "jours",
      validation: { min: 1, max: 180 },
      group: "Conditionnement",
    },
  ],
  exportFields: [
    {
      name: "healthCertificate",
      label: "Certificat sanitaire",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "halalCertificate",
      label: "Certificat Halal",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "originCertificate",
      label: "Certificat d'origine",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "veterinaryCertificate",
      label: "Certificat vétérinaire",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "destinationCountry",
      label: "Pays de destination",
      type: "text",
      required: true,
      placeholder: "ex: Arabie Saoudite, France, Émirats…",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "incoterm",
      label: "Incoterm",
      type: "select",
      required: true,
      options: INCOTERM_OPTIONS,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "customsCode",
      label: "Code douanier HS",
      type: "text",
      placeholder: "ex: 0202.30.00 (viandes congelées)",
      exportRequired: true,
      group: "Certifications Export",
    },
  ],
};

const CEREALES: ProductSchema = {
  id: "cereales",
  name: "Céréales",
  emoji: "🌾",
  description:
    "Riz, mil, sorgho, fonio, maïs — céréales locales et traditionnelles. Suivi de la récolte au polissage, avec contrôle d'humidité et de brisures.",
  phase: 3,
  fields: [
    // Production
    {
      name: "variety",
      label: "Variété",
      type: "text",
      required: true,
      placeholder: "ex: Riz SAHEL 108, Mil Souna 3, Fonio, Sorgho F2-20",
      group: "Production",
    },
    {
      name: "originCountry",
      label: "Pays d'origine",
      type: "select",
      required: true,
      options: ORIGIN_COUNTRY_OPTIONS,
      group: "Production",
    },
    {
      name: "originRegion",
      label: "Région / Préfecture",
      type: "text",
      placeholder: "ex: Vallée du fleuve, Sikasso, Bouaké…",
      group: "Production",
    },
    {
      name: "harvestDate",
      label: "Date de récolte",
      type: "date",
      required: true,
      group: "Production",
    },
    {
      name: "harvestMethod",
      label: "Méthode de récolte",
      type: "select",
      options: [
        { value: "manuel", label: "Manuel" },
        { value: "mecanise", label: "Mécanisé" },
        { value: "mixte", label: "Mixte" },
      ],
      group: "Production",
    },
    // Traitement
    {
      name: "processingType",
      label: "Type de traitement",
      type: "select",
      required: true,
      options: [
        { value: "paddy", label: "Paddy" },
        { value: "etame", label: "Étamé" },
        { value: "parboiled", label: "Parboiled" },
        { value: "poli", label: "Poli" },
      ],
      group: "Traitement",
    },
    {
      name: "millingDate",
      label: "Date d'usinage / décorticage",
      type: "date",
      group: "Traitement",
    },
    {
      name: "polishingLevel",
      label: "Niveau de polissage",
      type: "select",
      options: [
        { value: "complet", label: "Complet" },
        { value: "demi-complet", label: "Demi-complet" },
        { value: "blanc", label: "Blanc" },
      ],
      group: "Traitement",
    },
    // Qualité
    {
      name: "grade",
      label: "Grade / Qualité",
      type: "text",
      placeholder: "ex: Grade 1, 5% brisures, 10% brisures",
      group: "Qualité",
    },
    {
      name: "defectCount",
      label: "Nombre de défauts",
      type: "number",
      unit: "défauts/100g",
      validation: { min: 0, max: 50 },
      group: "Qualité",
    },
    {
      name: "moistureContent",
      label: "Taux d'humidité",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 25 },
      group: "Qualité",
    },
    {
      name: "brokenRatio",
      label: "Ratio brisures",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 100 },
      group: "Qualité",
    },
    {
      name: "organic",
      label: "Produit bio certifié",
      type: "boolean",
      group: "Qualité",
    },
    // Conditionnement
    {
      name: "packaging",
      label: "Conditionnement",
      type: "select",
      options: [
        { value: "sac-jute", label: "Sac jute" },
        { value: "sac-kraft", label: "Sac kraft" },
        { value: "sac-vacuum", label: "Sac vacuum" },
        { value: "sac-polypropylene", label: "Sac polypropylène" },
      ],
      group: "Conditionnement",
    },
    {
      name: "weight",
      label: "Poids unitaire",
      type: "text",
      placeholder: "ex: 25 kg, 50 kg, 100 kg",
      group: "Conditionnement",
    },
    {
      name: "shelfLifeMonths",
      label: "Durée de conservation",
      type: "number",
      unit: "mois",
      validation: { min: 1, max: 24 },
      group: "Conditionnement",
    },
  ],
  exportFields: [
    {
      name: "phytosanitaryCertificate",
      label: "Certificat phytosanitaire",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "healthCertificate",
      label: "Certificat sanitaire",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "originCertificate",
      label: "Certificat d'origine",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "organicCertificate",
      label: "Certificat bio",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "destinationCountry",
      label: "Pays de destination",
      type: "text",
      required: true,
      placeholder: "ex: France, Italie, Japon…",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "incoterm",
      label: "Incoterm",
      type: "select",
      required: true,
      options: INCOTERM_OPTIONS,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "customsCode",
      label: "Code douanier HS",
      type: "text",
      placeholder: "ex: 1006.30.00 (riz semi-blanchi)",
      exportRequired: true,
      group: "Certifications Export",
    },
  ],
};

const PRODUITS_LAITIERS: ProductSchema = {
  id: "produits-laitiers",
  name: "Produits laitiers",
  emoji: "🧀",
  description:
    "Lait, fromages, yaourts et beurre — issus de vache, chèvre, brebis ou bufflonne. Suivi de la traite à la pasteurisation, avec contrôle d'acidité et de protéines.",
  phase: 3,
  fields: [
    // Production
    {
      name: "variety",
      label: "Type de produit",
      type: "text",
      required: true,
      placeholder: "ex: Lait cru, Fromage frais, Yaourt, Beurre",
      group: "Production",
    },
    {
      name: "originCountry",
      label: "Pays d'origine",
      type: "select",
      required: true,
      options: ORIGIN_COUNTRY_OPTIONS,
      group: "Production",
    },
    {
      name: "originRegion",
      label: "Région / Préfecture",
      type: "text",
      placeholder: "ex: Richard-Toll, Kolda, Sikasso…",
      group: "Production",
    },
    {
      name: "milkingDate",
      label: "Date de traite",
      type: "date",
      required: true,
      group: "Production",
    },
    {
      name: "animalSource",
      label: "Animal source",
      type: "select",
      options: [
        { value: "vache", label: "Vache" },
        { value: "chevre", label: "Chèvre" },
        { value: "brebis", label: "Brebis" },
        { value: "bufflonne", label: "Bufflonne" },
      ],
      group: "Production",
    },
    // Traitement
    {
      name: "pasteurizationType",
      label: "Type de pasteurisation",
      type: "select",
      required: true,
      options: [
        { value: "brut", label: "Brut (cru)" },
        { value: "pasteurise", label: "Pasteurisé" },
        { value: "uht", label: "UHT" },
        { value: "sterilise", label: "Stérilisé" },
      ],
      group: "Traitement",
    },
    {
      name: "processingDate",
      label: "Date de transformation",
      type: "date",
      group: "Traitement",
    },
    {
      name: "fermentationType",
      label: "Type de fermentation",
      type: "select",
      options: [
        { value: "aucune", label: "Aucune" },
        { value: "lactique", label: "Lactique" },
        { value: "mixte", label: "Mixte" },
      ],
      group: "Traitement",
    },
    // Qualité
    {
      name: "fatContent",
      label: "Taux de matière grasse",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 80 },
      group: "Qualité",
    },
    {
      name: "proteinContent",
      label: "Taux de protéines",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 50 },
      group: "Qualité",
    },
    {
      name: "lacticAcid",
      label: "Acidité (degré Dornic)",
      type: "number",
      unit: "°D",
      validation: { min: 0, max: 200 },
      group: "Qualité",
    },
    {
      name: "organic",
      label: "Produit bio certifié",
      type: "boolean",
      group: "Qualité",
    },
    {
      name: "lactoseFree",
      label: "Sans lactose",
      type: "boolean",
      group: "Qualité",
    },
    // Conditionnement
    {
      name: "packaging",
      label: "Conditionnement",
      type: "select",
      options: [
        { value: "bouteille", label: "Bouteille" },
        { value: "sachet", label: "Sachet" },
        { value: "pot", label: "Pot" },
        { value: "fut", label: "Fût" },
      ],
      group: "Conditionnement",
    },
    {
      name: "weight",
      label: "Poids / Volume unitaire",
      type: "text",
      placeholder: "ex: 1 L, 500 g, 250 mL",
      group: "Conditionnement",
    },
    {
      name: "storageTemperature",
      label: "Température de conservation",
      type: "number",
      unit: "°C",
      validation: { min: 0, max: 10 },
      group: "Conditionnement",
    },
    {
      name: "shelfLifeDays",
      label: "Durée de conservation",
      type: "number",
      unit: "jours",
      validation: { min: 1, max: 365 },
      group: "Conditionnement",
    },
  ],
  exportFields: [
    {
      name: "healthCertificate",
      label: "Certificat sanitaire",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "originCertificate",
      label: "Certificat d'origine",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "pasteurizationCertificate",
      label: "Certificat de pasteurisation",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "organicCertificate",
      label: "Certificat bio EU / USDA",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "destinationCountry",
      label: "Pays de destination",
      type: "text",
      required: true,
      placeholder: "ex: France, Allemagne, USA…",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "incoterm",
      label: "Incoterm",
      type: "select",
      required: true,
      options: INCOTERM_OPTIONS,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "customsCode",
      label: "Code douanier HS",
      type: "text",
      placeholder: "ex: 0401.20.00 (lait concentré)",
      exportRequired: true,
      group: "Certifications Export",
    },
  ],
};

const MIEL: ProductSchema = {
  id: "miel",
  name: "Miel",
  emoji: "🍯",
  description:
    "Miels de fleurs, d'acacia, de forêt — issus d'apiculture moderne ou traditionnelle. Suivi de la ruche à l'extraction, avec contrôle du HMF et du taux d'humidité.",
  phase: 3,
  fields: [
    // Production
    {
      name: "variety",
      label: "Variété / Origine florale",
      type: "text",
      required: true,
      placeholder: "ex: Miel de fleurs, Miel d'acacia, Miel de forêt",
      group: "Production",
    },
    {
      name: "originCountry",
      label: "Pays d'origine",
      type: "select",
      required: true,
      options: ORIGIN_COUNTRY_OPTIONS,
      group: "Production",
    },
    {
      name: "originRegion",
      label: "Région / Préfecture",
      type: "text",
      placeholder: "ex: Casamance, Fouta-Djalon, Bafing…",
      group: "Production",
    },
    {
      name: "harvestDate",
      label: "Date de récolte",
      type: "date",
      required: true,
      group: "Production",
    },
    {
      name: "hiveType",
      label: "Type de ruche",
      type: "select",
      options: [
        { value: "moderne", label: "Ruche moderne (Dadant, Langstroth)" },
        { value: "traditionnelle", label: "Ruche traditionnelle" },
        { value: "baroque", label: "Baroque (Top-bar)" },
      ],
      group: "Production",
    },
    // Traitement
    {
      name: "extractionMethod",
      label: "Méthode d'extraction",
      type: "select",
      required: true,
      options: [
        { value: "centrifugation", label: "Centrifugation" },
        { value: "egouttage", label: "Égouttage" },
        { value: "pression-froid", label: "Pression à froid" },
      ],
      group: "Traitement",
    },
    {
      name: "extractionDate",
      label: "Date d'extraction",
      type: "date",
      group: "Traitement",
    },
    {
      name: "filtrationLevel",
      label: "Niveau de filtration",
      type: "select",
      options: [
        { value: "brut", label: "Brut (non filtré)" },
        { value: "filtre", label: "Filtré" },
        { value: "surchauffe", label: "Surchauffé" },
      ],
      group: "Traitement",
    },
    // Qualité
    {
      name: "moistureContent",
      label: "Taux d'humidité",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 25 },
      helpText: "Seuil international : ≤ 18% (≤ 20% tropical)",
      group: "Qualité",
    },
    {
      name: "hmfLevel",
      label: "Taux de HMF",
      type: "number",
      unit: "mg/kg",
      validation: { min: 0, max: 100 },
      helpText: "Hydroxymethylfurfural — fraîcheur du miel",
      group: "Qualité",
    },
    {
      name: "diastaseNumber",
      label: "Indice diastasique",
      type: "number",
      validation: { min: 0, max: 50 },
      helpText: "Activité enzymatique (seuil EU : ≥ 8)",
      group: "Qualité",
    },
    {
      name: "crystallizationState",
      label: "État de cristallisation",
      type: "select",
      options: [
        { value: "liquide", label: "Liquide" },
        { value: "cristallise", label: "Cristallisé" },
        { value: "onctueux", label: "Onctueux" },
      ],
      group: "Qualité",
    },
    {
      name: "organic",
      label: "Miel bio certifié",
      type: "boolean",
      group: "Qualité",
    },
    // Conditionnement
    {
      name: "packaging",
      label: "Conditionnement",
      type: "select",
      options: [
        { value: "pot-verre", label: "Pot verre" },
        { value: "fut", label: "Fût" },
        { value: "bidonnier", label: "Bidonnier" },
      ],
      group: "Conditionnement",
    },
    {
      name: "weight",
      label: "Poids unitaire",
      type: "text",
      placeholder: "ex: 500 g, 1 kg, 5 kg",
      group: "Conditionnement",
    },
    {
      name: "shelfLifeMonths",
      label: "Durée de conservation",
      type: "number",
      unit: "mois",
      validation: { min: 1, max: 60 },
      group: "Conditionnement",
    },
  ],
  exportFields: [
    {
      name: "healthCertificate",
      label: "Certificat sanitaire",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "originCertificate",
      label: "Certificat d'origine",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "organicCertificate",
      label: "Certificat bio EU / USDA",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "honeyAnalysisCertificate",
      label: "Certificat d'analyse pollinique",
      type: "file",
      exportRequired: true,
      helpText: "Analyse pollinique et physico-chimique",
      group: "Certifications Export",
    },
    {
      name: "destinationCountry",
      label: "Pays de destination",
      type: "text",
      required: true,
      placeholder: "ex: France, Allemagne, USA…",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "incoterm",
      label: "Incoterm",
      type: "select",
      required: true,
      options: INCOTERM_OPTIONS,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "customsCode",
      label: "Code douanier HS",
      type: "text",
      placeholder: "ex: 0409.00.00 (miel naturel)",
      exportRequired: true,
      group: "Certifications Export",
    },
  ],
};

// ---------------------------------------------------------------------------
// PHASE 1 (continued) — Onboarding wizard categories (Task ID 5)
// ---------------------------------------------------------------------------
// Three additional schemas covering the "missing" categories that were
// previously seeded as legacy rows (Cosmétiques / Boissons / Hygiène) but
// had no `fields`/`exportFields` of their own. They unlock the new
// business-type onboarding flow (see DynamicProductForm Step 1).

const COSMETIQUES: ProductSchema = {
  id: "cosmetiques",
  name: "Cosmétiques & Soins",
  emoji: "🧴",
  description:
    "Crèmes, huiles, savons, laits, sérums et baumes — cosmétiques naturels ou transformés. Suivi de la formulation au conditionnement, avec certifications bio, halal et cruelty-free.",
  phase: 1,
  fields: [
    // Production
    {
      name: "productType",
      label: "Type de produit",
      type: "select",
      required: true,
      options: [
        { value: "creme", label: "Crème" },
        { value: "huile", label: "Huile" },
        { value: "savon", label: "Savon" },
        { value: "lait", label: "Lait" },
        { value: "serum", label: "Sérum" },
        { value: "baume", label: "Baume" },
      ],
      group: "Production",
    },
    {
      name: "skinType",
      label: "Type de peau ciblé",
      type: "select",
      options: [
        { value: "tous-types", label: "Tous types" },
        { value: "peau-seche", label: "Peau sèche" },
        { value: "peau-grasse", label: "Peau grasse" },
        { value: "peau-sensible", label: "Peau sensible" },
      ],
      group: "Production",
    },
    {
      name: "ingredients",
      label: "Ingrédients / Composition",
      type: "textarea",
      placeholder: "Listez les ingrédients principaux — ex: huile de baobab, beurre de karité, vitamine E…",
      group: "Production",
    },
    {
      name: "naturalOrigin",
      label: "100% naturel",
      type: "boolean",
      group: "Production",
    },
    // Conditionnement
    {
      name: "capacity",
      label: "Capacité / Contenance",
      type: "text",
      required: true,
      placeholder: "ex: 250 ml, 50 g, 100 ml…",
      unit: "ml/g",
      group: "Conditionnement",
    },
    {
      name: "packaging",
      label: "Conditionnement",
      type: "select",
      options: [
        { value: "tube", label: "Tube" },
        { value: "flacon-pompe", label: "Flacon pompe" },
        { value: "pot", label: "Pot" },
        { value: "flacon-vaporisateur", label: "Flacon vaporisateur" },
        { value: "bouteille", label: "Bouteille" },
        { value: "boite", label: "Boîte" },
      ],
      group: "Conditionnement",
    },
    // Certifications
    {
      name: "organicLabel",
      label: "Bio certifié",
      type: "boolean",
      group: "Certifications",
    },
    {
      name: "halalCertified",
      label: "Halal",
      type: "boolean",
      group: "Certifications",
    },
    {
      name: "crueltyFree",
      label: "Cruelty-free / Non testé sur animaux",
      type: "boolean",
      group: "Certifications",
    },
  ],
  exportFields: [
    {
      name: "destinationCountry",
      label: "Pays de destination",
      type: "text",
      required: true,
      placeholder: "ex: France, Allemagne, USA…",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "incoterm",
      label: "Incoterm",
      type: "select",
      required: true,
      options: INCOTERM_OPTIONS,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "customsCode",
      label: "Code douanier HS",
      type: "text",
      placeholder: "ex: 3304.99.00 (cosmétiques)",
      helpText: "Code du Système Harmonisé de désignation des marchandises",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "cosmeticsCertificate",
      label: "Certificat de conformité cosmétique (CPNP / FDA)",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "safetyReport",
      label: "Rapport de sécurité (CPSR)",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
  ],
};

const BOISSONS: ProductSchema = {
  id: "boissons",
  name: "Boissons & Jus",
  emoji: "🥤",
  description:
    "Jus, sodas, boissons énergisantes, thé, café et boissons lactées — suivi de la formulation à la mise en bouteille, avec certifications bio, halal et sans conservateurs.",
  phase: 1,
  fields: [
    // Production
    {
      name: "beverageType",
      label: "Type de boisson",
      type: "select",
      required: true,
      options: [
        { value: "jus", label: "Jus" },
        { value: "soda", label: "Soda" },
        { value: "boisson-energisante", label: "Boisson énergisante" },
        { value: "the", label: "Thé" },
        { value: "cafe", label: "Café" },
        { value: "boisson-lactee", label: "Boisson lactée" },
      ],
      group: "Production",
    },
    {
      name: "flavor",
      label: "Parfum / Arôme",
      type: "text",
      placeholder: "ex: Bissap, Baobab, Ananas, Gingembre…",
      group: "Production",
    },
    {
      name: "ingredients",
      label: "Ingrédients",
      type: "textarea",
      placeholder: "Listez les ingrédients — ex: jus de bissap, sucre de canne, acide citrique…",
      group: "Production",
    },
    {
      name: "sugarContent",
      label: "Teneur en sucre",
      type: "number",
      unit: "g/100ml",
      validation: { min: 0, max: 100 },
      group: "Production",
    },
    {
      name: "alcoholDegree",
      label: "Degré d'alcool",
      type: "number",
      unit: "%",
      validation: { min: 0, max: 100 },
      helpText: "0 si non alcoolisé",
      group: "Production",
    },
    // Conditionnement
    {
      name: "capacity",
      label: "Capacité / Contenance",
      type: "text",
      required: true,
      placeholder: "ex: 250 ml, 500 ml, 1 L…",
      unit: "ml",
      group: "Conditionnement",
    },
    {
      name: "packaging",
      label: "Conditionnement",
      type: "select",
      options: [
        { value: "bouteille-pet", label: "Bouteille PET" },
        { value: "bouteille-verre", label: "Bouteille verre" },
        { value: "canette", label: "Canette" },
        { value: "brique", label: "Brique (Tetra Pak)" },
        { value: "fut", label: "Fût" },
      ],
      group: "Conditionnement",
    },
    {
      name: "shelfLifeDays",
      label: "Durée de conservation",
      type: "number",
      unit: "jours",
      validation: { min: 1, max: 730 },
      group: "Conditionnement",
    },
    // Certifications
    {
      name: "organicLabel",
      label: "Bio certifié",
      type: "boolean",
      group: "Certifications",
    },
    {
      name: "halalCertified",
      label: "Halal",
      type: "boolean",
      group: "Certifications",
    },
    {
      name: "noPreservatives",
      label: "Sans conservateurs",
      type: "boolean",
      group: "Certifications",
    },
  ],
  exportFields: [
    {
      name: "destinationCountry",
      label: "Pays de destination",
      type: "text",
      required: true,
      placeholder: "ex: France, Allemagne, USA…",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "incoterm",
      label: "Incoterm",
      type: "select",
      required: true,
      options: INCOTERM_OPTIONS,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "customsCode",
      label: "Code douanier HS",
      type: "text",
      placeholder: "ex: 2202.99.00 (boissons non alcoolisées)",
      helpText: "Code du Système Harmonisé de désignation des marchandises",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "healthCertificate",
      label: "Certificat sanitaire",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "phytosanitaryCertificate",
      label: "Certificat phytosanitaire",
      type: "file",
      exportRequired: true,
      group: "Certifications Export",
    },
  ],
};

const HYGIENE: ProductSchema = {
  id: "hygiene",
  name: "Hygiène",
  emoji: "🧼",
  description:
    "Savons, shampoings, gels douche, dentifrices et déodorants — produits d'hygiène au quotidien. Suivi de la formulation au conditionnement, avec certifications bio, halal et cruelty-free.",
  phase: 1,
  fields: [
    // Production
    {
      name: "productType",
      label: "Type de produit",
      type: "select",
      required: true,
      options: [
        { value: "savon", label: "Savon" },
        { value: "shampoing", label: "Shampoing" },
        { value: "gel-douche", label: "Gel douche" },
        { value: "dentifrice", label: "Dentifrice" },
        { value: "deodorant", label: "Déodorant" },
      ],
      group: "Production",
    },
    {
      name: "usage",
      label: "Usage / Zone d'application",
      type: "select",
      options: [
        { value: "corps", label: "Corps" },
        { value: "cheveux", label: "Cheveux" },
        { value: "visage", label: "Visage" },
        { value: "dents", label: "Dents" },
      ],
      group: "Production",
    },
    {
      name: "ingredients",
      label: "Ingrédients / Composition",
      type: "textarea",
      placeholder: "Listez les ingrédients principaux — ex: glycérine, huile de coco, sulfate…",
      group: "Production",
    },
    {
      name: "naturalOrigin",
      label: "100% naturel",
      type: "boolean",
      group: "Production",
    },
    // Conditionnement
    {
      name: "capacity",
      label: "Capacité / Contenance",
      type: "text",
      required: true,
      placeholder: "ex: 200 ml, 100 g, 50 ml…",
      unit: "ml/g",
      group: "Conditionnement",
    },
    {
      name: "packaging",
      label: "Conditionnement",
      type: "select",
      options: [
        { value: "tube", label: "Tube" },
        { value: "flacon", label: "Flacon" },
        { value: "pompe", label: "Pompe" },
        { value: "barre", label: "Barre" },
        { value: "boite", label: "Boîte" },
        { value: "sachet", label: "Sachet" },
      ],
      group: "Conditionnement",
    },
    // Certifications
    {
      name: "organicLabel",
      label: "Bio certifié",
      type: "boolean",
      group: "Certifications",
    },
    {
      name: "halalCertified",
      label: "Halal",
      type: "boolean",
      group: "Certifications",
    },
    {
      name: "crueltyFree",
      label: "Cruelty-free / Non testé sur animaux",
      type: "boolean",
      group: "Certifications",
    },
  ],
  exportFields: [
    {
      name: "destinationCountry",
      label: "Pays de destination",
      type: "text",
      required: true,
      placeholder: "ex: France, Allemagne, USA…",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "incoterm",
      label: "Incoterm",
      type: "select",
      required: true,
      options: INCOTERM_OPTIONS,
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "customsCode",
      label: "Code douanier HS",
      type: "text",
      placeholder: "ex: 3401.11.00 (savons)",
      helpText: "Code du Système Harmonisé de désignation des marchandises",
      exportRequired: true,
      group: "Certifications Export",
    },
    {
      name: "healthCertificate",
      label: "Certificat sanitaire",
      type: "file",
      required: true,
      exportRequired: true,
      group: "Certifications Export",
    },
  ],
};

// ---------------------------------------------------------------------------
// Master registry
// ---------------------------------------------------------------------------

/**
 * All product category schemas keyed by their slug. Order matters — it is
 * preserved by the seed script for the `order` column on the Category table.
 *
 * Breakdown:
 *   - 10 V3 categories (Phase 1 / 2 / 3)
 *   - 3 onboarding-wizard categories (Task ID 5 — Phase 1): cosmetiques,
 *     boissons, hygiene
 */
export const PRODUCT_SCHEMAS: Record<string, ProductSchema> = {
  // Phase 1 — V3
  "fruits-legumes": FRUITS_LEGUMES,
  "cafe-cacao": CAFE_CACAO,
  epices: EPICES,
  // Phase 1 — Onboarding wizard (Task ID 5)
  cosmetiques: COSMETIQUES,
  boissons: BOISSONS,
  hygiene: HYGIENE,
  // Phase 2
  "produits-mer": PRODUITS_MER,
  "noix-fruits-secs": NOIX_FRUITS_SECS,
  huiles: HUILES,
  // Phase 3
  viandes: VIANDES,
  cereales: CEREALES,
  "produits-laitiers": PRODUITS_LAITIERS,
  miel: MIEL,
};

/**
 * Ordered list of every schema — used by the seed script and admin UIs.
 */
export const PRODUCT_SCHEMA_LIST: ProductSchema[] = Object.values(PRODUCT_SCHEMAS);

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Returns active categories (phase 1 always active; phase 2/3 also returned
 * but flagged via their `phase` field — the caller can decide whether to
 * display them as "à venir").
 */
export function getActiveCategories(): ProductSchema[] {
  return PRODUCT_SCHEMA_LIST;
}

/**
 * Returns the merged field list — category fields + export fields when
 * `isExport` is true. Returns an empty array when the slug is unknown.
 */
export function getCategoryFields(
  categorySlug: string,
  isExport: boolean
): FieldConfig[] {
  const schema = PRODUCT_SCHEMAS[categorySlug];
  if (!schema) return [];
  if (isExport && schema.exportFields && schema.exportFields.length > 0) {
    return [...schema.fields, ...schema.exportFields];
  }
  return schema.fields;
}

/**
 * Returns a single schema by slug.
 */
export function getProductSchema(slug: string): ProductSchema | undefined {
  return PRODUCT_SCHEMAS[slug];
}

/**
 * Groups fields by their `group` property for UI sectioning. Fields without a
 * `group` are placed under the "Général" bucket (in insertion order).
 */
export function groupFieldsByGroup(
  fields: FieldConfig[]
): Record<string, FieldConfig[]> {
  const out: Record<string, FieldConfig[]> = {};
  for (const f of fields) {
    const g = f.group ?? "Général";
    if (!out[g]) out[g] = [];
    out[g].push(f);
  }
  return out;
}
