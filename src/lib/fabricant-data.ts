// Mock data for the VerifScan Fabricant (Manufacturer) dashboard.
// All data is static and lives client-side — no backend calls.

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
  /** The lot's internal id (e.g. "l1") — used to build the scannable URL `/p/<lotId>`. */
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

// ============================================================================
// MARQUE / ENTREPRISE
// ============================================================================
export const MARQUE = {
  nom: "Sarine Bio",
  plan: "Pro",
  logo: "SB",
  couleurPrimaire: "#2563EB",
  couleurSecondaire: "#10B981",
};

// ============================================================================
// PRODUITS (24)
// ============================================================================
const PRODUIT_PHOTOS = [
  "/products/jus-bissap.png",      // bissap
  "/products/poudre-moringa.png",  // épices
  "/products/savon-noir.png",      // chocolat
  "/products/couscous-mil.png",    // confiture
  "/products/huile-baobab.png",    // pain
  "/products/beurre-karite.png",   // miel
];

export const PRODUITS: Product[] = [
  { id: "p1", nom: "Jus de Bissap Premium", marque: "Sarine Bio", categorie: "Boissons", categorieIcon: "🥤", poids: "500ml", description: "Jus de bissap biologique, sans conservateurs artificiels.", status: "actif", photo: PRODUIT_PHOTOS[0], lots: 12, scans: 2345, scansParMois: 312, createdAt: "2026-01-15" },
  { id: "p2", nom: "Épices Mix Tradition", marque: "Sarine Bio", categorie: "Épices", categorieIcon: "🌶️", poids: "250g", description: "Mélange d'épices locales du Sénégal.", status: "actif", photo: PRODUIT_PHOTOS[1], lots: 8, scans: 1890, scansParMois: 245, createdAt: "2026-01-20" },
  { id: "p3", nom: "Chocolat Local 70%", marque: "Sarine Bio", categorie: "Confiserie", categorieIcon: "🍫", poids: "100g", description: "Chocolat noir 70% cacao, produit équitable.", status: "actif", photo: PRODUIT_PHOTOS[2], lots: 6, scans: 1234, scansParMois: 180, createdAt: "2026-02-01" },
  { id: "p4", nom: "Confiture de Mangue", marque: "Sarine Bio", categorie: "Confitures", categorieIcon: "🥫", poids: "350g", description: "Confiture artisanale de mangue du Casamance.", status: "actif", photo: PRODUIT_PHOTOS[3], lots: 9, scans: 987, scansParMois: 142, createdAt: "2026-02-10" },
  { id: "p5", nom: "Pain Tradition", marque: "Sarine Bio", categorie: "Boulangerie", categorieIcon: "🍞", poids: "400g", description: "Pain de mie complet au levain naturel.", status: "actif", photo: PRODUIT_PHOTOS[4], lots: 11, scans: 756, scansParMois: 98, createdAt: "2026-02-15" },
  { id: "p6", nom: "Miel de Casamance", marque: "Sarine Bio", categorie: "Épicerie", categorieIcon: "🍯", poids: "500g", description: "Miel pur de Casamance, récolte 2026.", status: "actif", photo: PRODUIT_PHOTOS[5], lots: 7, scans: 654, scansParMois: 87, createdAt: "2026-03-01" },
  { id: "p7", nom: "Jus de Bouye (Baobab)", marque: "Sarine Bio", categorie: "Boissons", categorieIcon: "🥤", poids: "500ml", description: "Jus de baobab naturel, riche en vitamines.", status: "actif", photo: PRODUIT_PHOTOS[0], lots: 5, scans: 543, scansParMois: 72, createdAt: "2026-03-05" },
  { id: "p8", nom: "Thé Vert du Sénégal", marque: "Sarine Bio", categorie: "Boissons", categorieIcon: "🍵", poids: "100g", description: "Thé vert biologique cultivé au Sénégal.", status: "actif", photo: PRODUIT_PHOTOS[1], lots: 4, scans: 432, scansParMois: 56, createdAt: "2026-03-10" },
  { id: "p9", nom: "Beurre de Karité", marque: "Sarine Bio", categorie: "Cosmétique", categorieIcon: "🧴", poids: "200g", description: "Beurre de karité pur, non raffiné.", status: "actif", photo: PRODUIT_PHOTOS[5], lots: 6, scans: 398, scansParMois: 51, createdAt: "2026-03-15" },
  { id: "p10", nom: "Café du Sénégal", marque: "Sarine Bio", categorie: "Boissons", categorieIcon: "☕", poids: "250g", description: "Café arabica torréfié, origine Sénégal.", status: "actif", photo: PRODUIT_PHOTOS[1], lots: 3, scans: 345, scansParMois: 44, createdAt: "2026-04-01" },
  { id: "p11", nom: "Sauce Yassa Préparée", marque: "Sarine Bio", categorie: "Sauces", categorieIcon: "🥘", poids: "300g", description: "Sauce yassa traditionnelle prête à l'emploi.", status: "brouillon", photo: PRODUIT_PHOTOS[3], lots: 2, scans: 0, scansParMois: 0, createdAt: "2026-06-10" },
  { id: "p12", nom: "Sauce Mafé Préparée", marque: "Sarine Bio", categorie: "Sauces", categorieIcon: "🥘", poids: "300g", description: "Sauce mafé à l'arachide, recette familiale.", status: "brouillon", photo: PRODUIT_PHOTOS[3], lots: 1, scans: 0, scansParMois: 0, createdAt: "2026-06-15" },
  { id: "p13", nom: "Biscuits au Miel", marque: "Sarine Bio", categorie: "Boulangerie", categorieIcon: "🍪", poids: "200g", description: "Biscuits artisanaux au miel de Casamance.", status: "actif", photo: PRODUIT_PHOTOS[4], lots: 3, scans: 234, scansParMois: 30, createdAt: "2026-04-15" },
  { id: "p14", nom: "Riz Local Parfumé", marque: "Sarine Bio", categorie: "Épicerie", categorieIcon: "🌾", poids: "1kg", description: "Riz local de la vallée du fleuve Sénégal.", status: "actif", photo: PRODUIT_PHOTOS[1], lots: 4, scans: 198, scansParMois: 26, createdAt: "2026-05-01" },
  { id: "p15", nom: "Huile d'Arachide", marque: "Sarine Bio", categorie: "Épicerie", categorieIcon: "🫗", poids: "1L", description: "Huile d'arachide pressée à froid.", status: "actif", photo: PRODUIT_PHOTOS[5], lots: 3, scans: 167, scansParMois: 22, createdAt: "2026-05-10" },
  { id: "p16", nom: "Jus de Gingembre", marque: "Sarine Bio", categorie: "Boissons", categorieIcon: "🥤", poids: "500ml", description: "Jus de gingembre frais, sans sucre ajouté.", status: "masque", photo: PRODUIT_PHOTOS[0], lots: 1, scans: 45, scansParMois: 6, createdAt: "2026-05-20" },
  { id: "p17", nom: "Pâte d'Arachide", marque: "Sarine Bio", categorie: "Épicerie", categorieIcon: "🥜", poids: "400g", description: "Pâte d'arachide 100% naturelle.", status: "actif", photo: PRODUIT_PHOTOS[5], lots: 2, scans: 134, scansParMois: 18, createdAt: "2026-05-25" },
  { id: "p18", nom: "Tisane Detox", marque: "Sarine Bio", categorie: "Boissons", categorieIcon: "🍵", poids: "80g", description: "Tisane detox aux plantes locales.", status: "actif", photo: PRODUIT_PHOTOS[1], lots: 2, scans: 98, scansParMois: 13, createdAt: "2026-06-01" },
  { id: "p19", nom: "Vinaigre de Bissap", marque: "Sarine Bio", categorie: "Condiments", categorieIcon: "🧴", poids: "250ml", description: "Vinaigre artisanal à base de bissap.", status: "brouillon", photo: PRODUIT_PHOTOS[0], lots: 0, scans: 0, scansParMois: 0, createdAt: "2026-07-01" },
  { id: "p20", nom: "Granola Maison", marque: "Sarine Bio", categorie: "Boulangerie", categorieIcon: "🥣", poids: "500g", description: "Granola croustillant aux fruits secs.", status: "actif", photo: PRODUIT_PHOTOS[4], lots: 1, scans: 76, scansParMois: 10, createdAt: "2026-07-05" },
  { id: "p21", nom: "Gâteaux Sablés", marque: "Sarine Bio", categorie: "Boulangerie", categorieIcon: "🍪", poids: "300g", description: "Sablés au beurre de karité.", status: "masque", photo: PRODUIT_PHOTOS[4], lots: 1, scans: 23, scansParMois: 3, createdAt: "2026-07-10" },
  { id: "p22", nom: "Soupe de Poisson Déshydratée", marque: "Sarine Bio", categorie: "Plats", categorieIcon: "🍜", poids: "150g", description: "Soupe de poisson déshydratée, prête en 5 min.", status: "actif", photo: PRODUIT_PHOTOS[3], lots: 2, scans: 54, scansParMois: 7, createdAt: "2026-07-15" },
  { id: "p23", nom: "Café Touba Express", marque: "Sarine Bio", categorie: "Boissons", categorieIcon: "☕", poids: "200g", description: "Café Touba avec sel de Guédiawaye.", status: "brouillon", photo: PRODUIT_PHOTOS[1], lots: 0, scans: 0, scansParMois: 0, createdAt: "2026-07-20" },
  { id: "p24", nom: "Lait de Cajou", marque: "Sarine Bio", categorie: "Boissons", categorieIcon: "🥛", poids: "1L", description: "Lait végétal de cajou, sans additifs.", status: "actif", photo: PRODUIT_PHOTOS[0], lots: 1, scans: 32, scansParMois: 4, createdAt: "2026-07-25" },
];

// ============================================================================
// LOTS (87 — generated programmatically)
// ============================================================================
const LIEUX = ["Dakar, Sénégal", "Thiès, Sénégal", "Saint-Louis, Sénégal", "Kaolack, Sénégal"];
const STATUSES: LotStatus[] = ["actif", "actif", "actif", "actif", "actif", "actif", "actif", "actif", "rappelle", "expire"];

export const LOTS: Lot[] = Array.from({ length: 87 }).map((_, i) => {
  const produit = PRODUITS[i % PRODUITS.length];
  const status = STATUSES[i % STATUSES.length];
  const dateFab = new Date(2026, (i % 7), ((i * 3) % 27) + 1);
  const datePerm = new Date(dateFab);
  datePerm.setDate(datePerm.getDate() + 365);
  const num = `LOT-2026-${String((i % 12) + 1).padStart(2, "0")}-${String(i + 1).padStart(3, "0")}`;
  return {
    id: `l${i + 1}`,
    numero: num,
    produitId: produit.id,
    produitNom: produit.nom,
    produitPhoto: produit.photo,
    dateFabrication: dateFab.toISOString().split("T")[0],
    datePeremption: datePerm.toISOString().split("T")[0],
    status,
    scans: status === "actif" ? Math.floor(Math.random() * 200) + 10 : Math.floor(Math.random() * 50),
    qrCodes: Math.floor(Math.random() * 100) + 20,
    ingredients: "Eau, sucre, bissap, citron, conservateur naturel",
    lieuFabrication: LIEUX[i % LIEUX.length],
  };
});

// ============================================================================
// QR CODES (sample — 24 shown)
// ============================================================================
export const QR_CODES: QRCode[] = Array.from({ length: 24 }).map((_, i) => {
  const lot = LOTS[i];
  const produit = PRODUITS[i % PRODUITS.length];
  return {
    id: `q${i + 1}`,
    code: `QR-${String(i + 1).padStart(5, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    lotId: lot.id,
    lotNumero: lot.numero,
    produitNom: produit.nom,
    dateGeneration: new Date(2026, 6, ((i % 25) + 1)).toISOString().split("T")[0],
    scans: Math.floor(Math.random() * 80) + 5,
    status: i % 9 === 0 ? "desactive" : "actif",
  };
});

// ============================================================================
// KPIs ACCUEIL
// ============================================================================
export const KPIS = {
  produits: { total: 24, actifs: 18, brouillons: 6, tendance: "+3 ce mois" },
  lots: { total: 87, actifs: 82, rappelles: 5, tendance: "+15 ce mois" },
  qrCodes: { total: 1250, quota: 5000, tendance: "+180 ce mois" },
  scans: { total: 12458, moyenneJour: 45, tendance: "+12% cette semaine" },
};

// ============================================================================
// SCANS — évolution 30 jours (pour graphique ligne)
// ============================================================================
export const SCANS_30J = Array.from({ length: 30 }).map((_, i) => {
  const day = i + 1;
  const base = 380 + Math.sin(i / 3) * 80 + Math.random() * 60;
  return {
    jour: `${String(day).padStart(2, "0")}/07`,
    scans: Math.round(base),
    precedent: Math.round(base * 0.88 + (Math.random() - 0.5) * 40),
  };
});

// Scans par jour de la semaine
export const SCANS_SEMAINE = [
  { jour: "Lun", scans: 412 },
  { jour: "Mar", scans: 389 },
  { jour: "Mer", scans: 445 },
  { jour: "Jeu", scans: 467 },
  { jour: "Ven", scans: 523 },
  { jour: "Sam", scans: 612 },
  { jour: "Dim", scans: 298 },
];

// Scans par heure
export const SCANS_HEURE = Array.from({ length: 24 }).map((_, h) => {
  let base = 50;
  if (h >= 10 && h <= 14) base = 280;
  else if (h >= 15 && h <= 19) base = 200;
  else if (h >= 7 && h <= 9) base = 120;
  else if (h >= 20 && h <= 22) base = 90;
  else base = 25;
  return { heure: `${h}h`, scans: Math.round(base + Math.random() * 40) };
});

// ============================================================================
// ACTIVITÉS RÉCENTES
// ============================================================================
export const ACTIVITES: Activity[] = [
  { id: "a1", icon: "🏷️", text: "Lot #2026-07-A créé", time: "il y a 2h", color: "#10B981" },
  { id: "a2", icon: "📱", text: "45 scans aujourd'hui", time: "il y a 3h", color: "#2563EB" },
  { id: "a3", icon: "📦", text: "Produit \"Jus de Bissap\" modifié", time: "hier", color: "#F59E0B" },
  { id: "a4", icon: "📊", text: "Rapport hebdomadaire reçu", time: "il y a 2j", color: "#8B5CF6" },
  { id: "a5", icon: "💳", text: "Paiement reçu - 25 000 FCFA", time: "il y a 5j", color: "#10B981" },
];

// ============================================================================
// TOP PRODUITS SCANNÉS
// ============================================================================
export const TOP_PRODUITS = [
  { id: "p1", nom: "Jus de Bissap Premium", scans: 2345, photo: PRODUIT_PHOTOS[0] },
  { id: "p2", nom: "Épices Mix Tradition", scans: 1890, photo: PRODUIT_PHOTOS[1] },
  { id: "p3", nom: "Chocolat Local 70%", scans: 1234, photo: PRODUIT_PHOTOS[2] },
  { id: "p4", nom: "Confiture de Mangue", scans: 987, photo: PRODUIT_PHOTOS[3] },
  { id: "p5", nom: "Pain Tradition", scans: 756, photo: PRODUIT_PHOTOS[4] },
];

// ============================================================================
// SCORE DE TRANSPARENCE
// ============================================================================
export const SCORE_TRANSPARENCE = {
  global: 95,
  niveau: "Transparence exemplaire",
  topPourcent: 15,
  moyenneFabricants: 68,
  rang: 12,
  totalFabricants: 258,
  details: [
    { id: "d1", icon: "🏭", titre: "Identité du fabricant", score: 15, max: 15, statut: "Complet", items: [{ nom: "Nom entreprise", pts: 5, max: 5, ok: true }, { nom: "Logo", pts: 3, max: 3, ok: true }, { nom: "Adresse", pts: 4, max: 4, ok: true }, { nom: "Contacts", pts: 3, max: 3, ok: true }] },
    { id: "d2", icon: "🌍", titre: "Origine connue", score: 15, max: 15, statut: "Complet", items: [{ nom: "Pays", pts: 7, max: 7, ok: true }, { nom: "Région", pts: 4, max: 4, ok: true }, { nom: "Lieu de fabrication", pts: 4, max: 4, ok: true }] },
    { id: "d3", icon: "🏷️", titre: "Numéro de lot", score: 10, max: 10, statut: "Complet", items: [] },
    { id: "d4", icon: "📅", titre: "Dates complètes", score: 15, max: 15, statut: "Complet", items: [] },
    { id: "d5", icon: "🌾", titre: "Composition détaillée", score: 20, max: 20, statut: "Complet", items: [] },
    { id: "d6", icon: "📜", titre: "Certifications", score: 10, max: 15, statut: "Partiel", items: [{ nom: "Bio (Ecocert)", pts: 5, max: 5, ok: true }, { nom: "ISO 22000", pts: 0, max: 5, ok: false }, { nom: "Halal", pts: 0, max: 5, ok: false }] },
    { id: "d7", icon: "📞", titre: "Contact accessible", score: 10, max: 10, statut: "Complet", items: [] },
  ],
  recommandations: [
    { id: "r1", icon: "📜", titre: "Ajouter la certification ISO 22000", gain: "+5 pts", description: "Obtenez la certification ISO 22000 pour la sécurité alimentaire", difficulte: "Moyenne", etoiles: 3 },
    { id: "r2", icon: "🛡️", titre: "Ajouter la certification Halal", gain: "+5 pts", description: "Certifiez vos produits Halal pour toucher plus de marchés", difficulte: "Facile", etoiles: 2 },
    { id: "r3", icon: "📊", titre: "Ajouter un tableau nutritionnel", gain: "+5 pts", description: "Détaillez les informations nutritionnelles de vos produits", difficulte: "Très facile", etoiles: 1 },
  ],
};

export const CLASSEMENT_FABRICANTS = [
  { rang: 1, nom: "Sarine Bio", score: 98, niveau: "Platine", tendance: "up", delta: 2, vous: false },
  { rang: 2, nom: "Térange Foods", score: 95, niveau: "Platine", tendance: "stable", delta: 0, vous: false },
  { rang: 3, nom: "Bissap Premium", score: 92, niveau: "Platine", tendance: "up", delta: 5, vous: false },
  { rang: 4, nom: "Terroir du Sénégal", score: 90, niveau: "Or", tendance: "down", delta: 1, vous: false },
  { rang: 5, nom: "Casamance Bio", score: 88, niveau: "Or", tendance: "up", delta: 1, vous: false },
  { rang: 6, nom: "Dakar Foods", score: 86, niveau: "Or", tendance: "stable", delta: 0, vous: false },
  { rang: 7, nom: "Sahel Agro", score: 84, niveau: "Or", tendance: "up", delta: 3, vous: false },
  { rang: 8, nom: "Saint-Louis Délices", score: 82, niveau: "Argent", tendance: "down", delta: 2, vous: false },
  { rang: 9, nom: "Thiès Gourmet", score: 80, niveau: "Argent", tendance: "stable", delta: 0, vous: false },
  { rang: 10, nom: "Baol Bio", score: 78, niveau: "Argent", tendance: "up", delta: 1, vous: false },
  { rang: 12, nom: "Sarine Bio (Vous)", score: 95, niveau: "Platine", tendance: "up", delta: 3, vous: true },
];

// ============================================================================
// BADGES (Gamification)
// ============================================================================
export const BADGES: Badge[] = [
  { id: "b1", icon: "🥇", nom: "Premier produit", description: "Créer votre premier produit", debloque: true, date: "15 janvier 2026" },
  { id: "b2", icon: "🏆", nom: "100 scans", description: "Atteindre 100 scans totaux", debloque: true, date: "20 février 2026" },
  { id: "b3", icon: "🚀", nom: "Early adopter", description: "Parmi les 100 premiers inscrits", debloque: true, date: "10 janvier 2026" },
  { id: "b4", icon: "⭐", nom: "Top fabricant", description: "Être dans le top 10 des fabricants", debloque: false, progression: 75 },
  { id: "b5", icon: "🎯", nom: "Traçabilité parfaite", description: "Créer 10 lots sans erreur", debloque: false, progression: 82 },
  { id: "b6", icon: "💎", nom: "Score parfait", description: "Atteindre un score de transparence de 100/100", debloque: false, progression: 95 },
  { id: "b7", icon: "🔥", nom: "Série de 7 jours", description: "Se connecter 7 jours d'affilée", debloque: true, date: "5 juillet 2026" },
  { id: "b8", icon: "🌍", nom: "Export international", description: "Vendre dans 3 pays différents", debloque: false, progression: 66 },
];

// ============================================================================
// ABONNEMENT
// ============================================================================
export const ABONNEMENT = {
  plan: "Pro",
  prix: 25000,
  prixAnnuel: 252000,
  status: "Actif",
  dateDebut: "15 janvier 2026",
  prochaineFacturation: "15 août 2026",
  methodePaiement: "Orange Money",
  numeroPaiement: "77 123 45 67",
  quota: {
    produits: { utilise: 24, limite: Infinity, label: "Illimité" },
    qrCodes: { utilise: 1250, limite: 5000, label: "25% du quota utilisé" },
    statistiques: { utilise: Infinity, limite: Infinity, label: "Illimité" },
  },
  avantages: [
    "Produits illimités",
    "5 000 QR codes/mois",
    "Statistiques avancées",
    "QR codes personnalisés",
    "Export données",
    "Support prioritaire",
  ],
};

export const PAIEMENTS: Payment[] = [
  { id: "pa1", date: "15/07/2026", montant: 25000, status: "reussi", methode: "Orange Money", reference: "OM-2026-07-001234" },
  { id: "pa2", date: "15/06/2026", montant: 25000, status: "reussi", methode: "Orange Money", reference: "OM-2026-06-009876" },
  { id: "pa3", date: "15/05/2026", montant: 25000, status: "reussi", methode: "Orange Money", reference: "OM-2026-05-005432" },
  { id: "pa4", date: "15/04/2026", montant: 25000, status: "reussi", methode: "Wave", reference: "WV-2026-04-002345" },
  { id: "pa5", date: "15/03/2026", montant: 25000, status: "reussi", methode: "Wave", reference: "WV-2026-03-001122" },
  { id: "pa6", date: "15/02/2026", montant: 25000, status: "reussi", methode: "Carte bancaire", reference: "CB-2026-02-004455" },
  { id: "pa7", date: "15/01/2026", montant: 25000, status: "reussi", methode: "Carte bancaire", reference: "CB-2026-01-007788" },
  { id: "pa8", date: "15/12/2025", montant: 10000, status: "reussi", methode: "Orange Money", reference: "OM-2025-12-003344" },
  { id: "pa9", date: "10/12/2025", montant: 10000, status: "echoue", methode: "Orange Money", reference: "OM-2025-12-001100" },
  { id: "pa10", date: "15/11/2025", montant: 10000, status: "reussi", methode: "Wave", reference: "WV-2025-11-005566" },
];

export const PLANS = [
  { id: "starter", nom: "Starter", prixMensuel: 10000, prixAnnuel: 100000, produits: "5", qrCodes: "500/mois", statistiques: "Basiques", support: "Email", fonctionnalites: [], actuel: false },
  { id: "pro", nom: "Pro", prixMensuel: 25000, prixAnnuel: 252000, produits: "Illimités", qrCodes: "5 000/mois", statistiques: "Avancées", support: "Prioritaire", fonctionnalites: [], actuel: true },
  { id: "business", nom: "Business", prixMensuel: 75000, prixAnnuel: 756000, produits: "Illimités", qrCodes: "Illimités", statistiques: "API + Custom", support: "Dédié 24/7", fonctionnalites: ["Marketplace B2B", "API access", "White label", "SSO"], actuel: false },
];

export const QR_PACKS = [
  { id: "pk1", quantite: 500, prix: 5000, prixUnitaire: 10, economie: 0, badge: null },
  { id: "pk2", quantite: 1000, prix: 9000, prixUnitaire: 9, economie: 10, badge: "Économisez 10%" },
  { id: "pk3", quantite: 5000, prix: 40000, prixUnitaire: 8, economie: 20, badge: "Économisez 20%" },
];

// ============================================================================
// STATISTIQUES — données graphiques
// ============================================================================
export const STATS_KPIS = [
  { id: "k1", label: "Total scans", valeur: 12458, tendance: "+12%", positif: true, suffixe: "" },
  { id: "k2", label: "Scans aujourd'hui", valeur: 156, tendance: "+8%", positif: true, suffixe: "" },
  { id: "k3", label: "Moyenne/jour", valeur: 415, tendance: "+5%", positif: true, suffixe: "" },
  { id: "k4", label: "Produits scannés", valeur: 18, tendance: "75%", positif: true, suffixe: "/24" },
  { id: "k5", label: "Taux de rétention", valeur: 68, tendance: "+3%", positif: true, suffixe: "%" },
  { id: "k6", label: "Temps moyen", valeur: 45, tendance: "+10%", positif: true, suffixe: "s" },
];

// Répartition par produit (donut)
export const REPARTITION_PRODUITS = [
  { nom: "Jus de Bissap", scans: 2345, couleur: "#2563EB" },
  { nom: "Épices Mix", scans: 1890, couleur: "#10B981" },
  { nom: "Chocolat Local", scans: 1234, couleur: "#F59E0B" },
  { nom: "Confiture Mangue", scans: 987, couleur: "#8B5CF6" },
  { nom: "Pain Tradition", scans: 756, couleur: "#EC4899" },
  { nom: "Miel Casamance", scans: 654, couleur: "#06B6D4" },
  { nom: "Jus de Bouye", scans: 543, couleur: "#84CC16" },
  { nom: "Autres", scans: 4149, couleur: "#9CA3AF" },
];

// Top villes
export const TOP_VILLES = [
  { ville: "Dakar", region: "Dakar", scans: 7475, pourcentage: 60, tendance: "up" },
  { ville: "Thiès", region: "Thiès", scans: 1869, pourcentage: 15, tendance: "up" },
  { ville: "Saint-Louis", region: "Saint-Louis", scans: 1121, pourcentage: 9, tendance: "stable" },
  { ville: "Touba", region: "Diourbel", scans: 748, pourcentage: 6, tendance: "up" },
  { ville: "Kaolack", region: "Kaolack", scans: 499, pourcentage: 4, tendance: "down" },
  { ville: "Ziguinchor", region: "Ziguinchor", scans: 374, pourcentage: 3, tendance: "up" },
  { ville: "Rufisque", region: "Dakar", scans: 249, pourcentage: 2, tendance: "stable" },
  { ville: "Mbour", region: "Thiès", scans: 124, pourcentage: 1, tendance: "up" },
];

// Durée de consultation (histogramme)
export const DUREE_CONSULTATION = [
  { duree: "0-10s", nombre: 4260 },
  { duree: "10-30s", nombre: 3488 },
  { duree: "30-60s", nombre: 2242 },
  { duree: "1-2min", nombre: 1495 },
  { duree: "2min+", nombre: 973 },
];

// Type d'appareil
export const TYPE_APPAREIL = [
  { nom: "Mobile", valeur: 85, couleur: "#2563EB" },
  { nom: "Desktop", valeur: 10, couleur: "#10B981" },
  { nom: "Tablette", valeur: 5, couleur: "#F59E0B" },
];

// Actions sur page produit
export const ACTIONS_PRODUIT = [
  { action: "Consultation des ingrédients", nombre: 5612, pourcentage: 45 },
  { action: "Vérification des dates", nombre: 4361, pourcentage: 35 },
  { action: "Clic sur \"Contacter le fabricant\"", nombre: 1869, pourcentage: 15 },
  { action: "Partage sur réseaux sociaux", nombre: 623, pourcentage: 5 },
];

// ============================================================================
// NOTIFICATIONS (header)
// ============================================================================
export const NOTIFICATIONS = [
  { id: "n1", icon: "📱", titre: "Pic de scans détecté", texte: "45 scans dans la dernière heure sur Jus de Bissap", time: "il y a 5 min", lu: false, color: "#2563EB" },
  { id: "n2", icon: "⚠️", titre: "Lot proche de l'expiration", texte: "Le lot LOT-2026-07-045 expire dans 5 jours", time: "il y a 1h", lu: false, color: "#F59E0B" },
  { id: "n3", icon: "💳", titre: "Facturation à venir", texte: "Votre prochaine facture de 25 000 FCFA le 15 août", time: "il y a 3h", lu: false, color: "#8B5CF6" },
  { id: "n4", icon: "🏆", titre: "Nouveau badge débloqué !", texte: "Série de 7 jours — félicitations", time: "hier", lu: true, color: "#10B981" },
];

// ============================================================================
// SESSIONS ACTIVES (paramètres > sécurité)
// ============================================================================
export const SESSIONS = [
  { id: "s1", appareil: "Chrome sur Windows", localisation: "Dakar, Sénégal", ip: "192.168.1.1", derniereActivite: "Il y a 5 min", actuelle: true },
  { id: "s2", appareil: "Safari sur iPhone", localisation: "Dakar, Sénégal", ip: "10.0.0.5", derniereActivite: "Il y a 2h", actuelle: false },
  { id: "s3", appareil: "Firefox sur Mac", localisation: "Thiès, Sénégal", ip: "41.82.45.12", derniereActivite: "il y a 3j", actuelle: false },
];

export const JOURNAL_CONNEXION = [
  { id: "j1", date: "26/07/2026 14:32", appareil: "Chrome Windows", localisation: "Dakar", ip: "192.168.1.1", status: "reussi" },
  { id: "j2", date: "26/07/2026 10:15", appareil: "Safari iPhone", localisation: "Dakar", ip: "10.0.0.5", status: "reussi" },
  { id: "j3", date: "25/07/2026 22:45", appareil: "Inconnu", localisation: "Paris", ip: "203.0.113.45", status: "echoue" },
  { id: "j4", date: "25/07/2026 09:20", appareil: "Chrome Windows", localisation: "Dakar", ip: "192.168.1.1", status: "reussi" },
  { id: "j5", date: "24/07/2026 18:05", appareil: "Safari iPhone", localisation: "Dakar", ip: "10.0.0.5", status: "reussi" },
];

// ============================================================================
// CATÉGORIES (pour filtres)
// ============================================================================
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

// PAYS CEDEAO (pour multi-step lot)
export const PAYS_CEDEAO = [
  "Sénégal", "Mali", "Côte d'Ivoire", "Gambie", "Mauritanie",
  "Burkina Faso", "Niger", "Guinée", "Guinée-Bissau", "Bénin",
  "Togo", "Sierra Leone", "Liberia", "Cap-Vert", "Ghana",
];

// Format monétaire FCFA
export function formatFCFA(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

export function formatNombre(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}
