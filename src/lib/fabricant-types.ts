/**
 * VerifScan — Fabricant dashboard types & UI constants.
 *
 * This module contains ONLY types and pure UI constants (no DB queries, no
 * server-only code) so it can be safely imported by both server and client
 * components. Real data is fetched server-side by `fabricant-server-data.ts`
 * and exposed to pages via `FabricantDataProvider`.
 */

// ---------------------------------------------------------------------------
// Core entity types (kept shape-compatible with the former mock arrays so
// pages don't need to change their render logic).
// ---------------------------------------------------------------------------

export type ProductStatus = "actif" | "brouillon" | "masque";

export type Product = {
  id: string;
  nom: string;
  marque: string;
  categorie: string;
  categorieIcon: string;
  poids: string;
  description: string;
  status: ProductStatus;
  photo: string;
  lots: number;
  scans: number;
  scansParMois: number;
  createdAt: string;
  // V3 Phase 3 — dynamic category fields
  categoryId?: string | null;
  isExport?: boolean;
  categoryData?: Record<string, unknown> | null;
  exportData?: Record<string, unknown> | null;
  certifications?: Array<{
    name: string;
    issuer?: string;
    validUntil?: string;
    fileUrl?: string;
  }> | null;
  // Open Food Facts integration — EAN-13 barcode + raw OFF payload
  barcode?: string | null;
  offData?: Record<string, unknown> | null;
  offLastSync?: string | null;
};

export type LotStatus = "actif" | "rappelle" | "expire";

export type Lot = {
  id: string;
  numero: string;
  produitId: string;
  produitNom: string;
  produitPhoto: string;
  /** Category emoji of the parent product — used as placeholder when photo is empty. */
  produitIcon?: string;
  dateFabrication: string;
  datePeremption: string;
  status: LotStatus;
  scans: number;
  qrCodes: number;
  ingredients: string;
  lieuFabrication: string;
};

export type QRCode = {
  id: string;
  code: string;
  /** The lot's internal id — used to build the scannable URL `/p/<lotId>`. */
  lotId: string;
  lotNumero: string;
  produitNom: string;
  dateGeneration: string;
  scans: number;
  status: "actif" | "desactive";
};

export type Badge = {
  id: string;
  icon: string;
  nom: string;
  description: string;
  debloque: boolean;
  date?: string;
  progression?: number;
};

export type Activity = {
  id: string;
  icon: string;
  text: string;
  time: string;
  color: string;
};

export type Payment = {
  id: string;
  date: string;
  montant: number;
  status: "reussi" | "echoue" | "en_attente" | "rembourse";
  methode: string;
  reference: string;
};

// ---------------------------------------------------------------------------
// Profile / stats / score / abonnement aggregates (built server-side)
// ---------------------------------------------------------------------------

export type FabricantProfile = {
  id: string;
  nom: string;
  companyName: string;
  logo: string; // initials (e.g. "SB") used in avatar circles
  logoUrl: string | null;
  plan: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  description: string | null;
  sector: string | null;
  yearFounded: number | null;
  taxId: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  brandColor: string;
  isVerified: boolean;
  createdAt: string;
};

export type FabricantKpis = {
  produits: { total: number; actifs: number; brouillons: number; tendance: string };
  lots: { total: number; actifs: number; rappelles: number; tendance: string };
  qrCodes: { total: number; quota: number; tendance: string };
  scans: { total: number; moyenneJour: number; tendance: string };
};

export type ScanByDay = { jour: string; scans: number; precedent: number };
export type ScanByHour = { heure: string; scans: number };
export type ScanByWeekday = { jour: string; scans: number };
export type RepartitionProduit = { nom: string; scans: number; couleur: string };
export type TopVille = { ville: string; region: string; scans: number; pourcentage: number; tendance: "up" | "down" | "stable" };

export type FabricantStats = {
  totalProducts: number;
  totalLots: number;
  totalQRCodes: number;
  totalScans: number;
  scansByDay: ScanByDay[];
  scansSemaine: ScanByWeekday[];
  scansHeure: ScanByHour[];
  repartitionProduits: RepartitionProduit[];
  topVilles: TopVille[];
  typeAppareil: { nom: string; valeur: number; couleur: string }[];
  topProducts: { id: string; nom: string; scans: number; photo: string; categorieIcon?: string }[];
  recentActivity: Activity[];
  kpis: FabricantKpis;
  moyenneJour: number;
};

export type ScoreDetailItem = {
  id: string;
  icon: string;
  titre: string;
  score: number;
  max: number;
  statut: "Complet" | "Partiel" | "Vide";
  items: { nom: string; pts: number; max: number; ok: boolean }[];
};

export type ScoreRecommandation = {
  id: string;
  icon: string;
  titre: string;
  gain: string;
  description: string;
  difficulte: string;
  etoiles: number;
};

export type FabricantScore = {
  global: number;
  niveau: string;
  topPourcent: number;
  moyenneFabricants: number;
  rang: number;
  totalFabricants: number;
  details: ScoreDetailItem[];
  recommandations: ScoreRecommandation[];
};

export type ClassementFabricant = {
  rang: number;
  nom: string;
  score: number;
  niveau: string;
  tendance: "up" | "down" | "stable";
  delta: number;
  vous: boolean;
};

export type FabricantAbonnement = {
  plan: string;
  prix: number;
  prixAnnuel: number;
  status: string;
  dateDebut: string;
  prochaineFacturation: string;
  methodePaiement: string;
  numeroPaiement: string;
  quota: {
    produits: { utilise: number; limite: number; label: string };
    qrCodes: { utilise: number; limite: number; label: string };
    statistiques: { utilise: number; limite: number; label: string };
  };
  avantages: string[];
};

export type FabricantData = {
  profile: FabricantProfile;
  products: Product[];
  lots: Lot[];
  qrCodes: QRCode[];
  stats: FabricantStats;
  score: FabricantScore;
  abonnement: FabricantAbonnement;
  classement: ClassementFabricant[];
  badges: Badge[];
};

// ---------------------------------------------------------------------------
// UI constants (used by form dropdowns / selects / pricing tables)
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  { id: "c1", nom: "Boissons", icon: "🥤" },
  { id: "c2", nom: "Épices", icon: "🌶️" },
  { id: "c3", nom: "Boulangerie", icon: "🍞" },
  { id: "c4", nom: "Confiserie", icon: "🍫" },
  { id: "c5", nom: "Confitures", icon: "🥫" },
  { id: "c6", nom: "Épicerie", icon: "🌾" },
  { id: "c7", nom: "Cosmétique", icon: "🧴" },
  { id: "c8", nom: "Sauces", icon: "🥘" },
  { id: "c9", nom: "Condiments", icon: "🧂" },
  { id: "c10", nom: "Plats", icon: "🍜" },
];

export const PAYS_CEDEAO = [
  "Sénégal", "Mali", "Côte d'Ivoire", "Gambie", "Mauritanie",
  "Burkina Faso", "Niger", "Guinée", "Guinée-Bissau", "Bénin",
  "Togo", "Sierra Leone", "Liberia", "Cap-Vert", "Ghana",
];

export const PLANS = [
  { id: "starter", nom: "Starter", prixMensuel: 10000, prixAnnuel: 100000, produits: "5", qrCodes: "500/mois", statistiques: "Basiques", support: "Email", fonctionnalites: [] as string[], actuel: false },
  { id: "pro", nom: "Pro", prixMensuel: 25000, prixAnnuel: 252000, produits: "Illimités", qrCodes: "5 000/mois", statistiques: "Avancées", support: "Prioritaire", fonctionnalites: [] as string[], actuel: true },
  { id: "business", nom: "Business", prixMensuel: 75000, prixAnnuel: 756000, produits: "Illimités", qrCodes: "Illimités", statistiques: "API + Custom", support: "Dédié 24/7", fonctionnalites: ["Marketplace B2B", "API access", "White label", "SSO"], actuel: false },
];

export const QR_PACKS = [
  { id: "pk1", quantite: 500, prix: 5000, prixUnitaire: 10, economie: 0, badge: null as string | null },
  { id: "pk2", quantite: 1000, prix: 9000, prixUnitaire: 9, economie: 10, badge: "Économisez 10%" },
  { id: "pk3", quantite: 5000, prix: 40000, prixUnitaire: 8, economie: 20, badge: "Économisez 20%" },
];

// ---------------------------------------------------------------------------
// Format helpers (pure functions — safe for client)
// ---------------------------------------------------------------------------

export function formatFCFA(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

export function formatNombre(n: number | null | undefined): string {
  // Guard against undefined/null/NaN — Intl.NumberFormat.format() throws a
  // RangeError on these values, which would crash the entire React tree
  // ("Application error: a client-side exception has occurred"). Falling
  // back to "0" keeps the UI rendering even when a upstream prop is missing.
  if (n === null || n === undefined || Number.isNaN(n)) return "0";
  return new Intl.NumberFormat("fr-FR").format(n);
}
