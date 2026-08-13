// Mock data for the VerifScan SuperAdmin panel.
// Centralized so all pages share consistent figures.

export type Plan = "Starter" | "Pro" | "Enterprise" | "Essai";
export type UserStatus = "Actif" | "Inactif" | "Suspendu";

export type Maker = {
  id: string;
  company: string;
  logoColor: string;
  contactName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  address: string;
  plan: Plan;
  status: UserStatus;
  products: number;
  scans: number;
  scans30d: number[];
  registeredAt: string; // ISO date
  lastLogin: string;
  mrr: number;
  nextBilling: string;
  paymentMethod: string;
  quotaProducts: string;
  quotaQrUsed: number;
  quotaQrTotal: number;
  productsList: { name: string; category: string; lots: number; scans: number; status: string }[];
  notes: { date: string; author: string; content: string }[];
  activity: { date: string; label: string }[];
};

const months = ["Sep", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû"];

export const SIGNUPS_DATA = months.map((m, i) => ({
  month: m,
  value: Math.round(12 + i * 2.4 + Math.sin(i) * 4 + (i > 8 ? 6 : 0)),
}));

export const REVENUE_DATA = months.map((m, i) => ({
  month: m,
  value: Math.round((2_400_000 + i * 210_000 + Math.cos(i) * 90_000) / 1000) * 1000,
}));

export const SCANS_DAILY = Array.from({ length: 30 }, (_, i) => ({
  day: `J${i + 1}`,
  value: Math.round(3800 + Math.sin(i / 2) * 900 + (i % 7 === 0 ? 600 : 0) + i * 30),
}));

export const SCANS_BY_HOUR = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h}h`,
  value: Math.round(
    h < 6 ? 120 + h * 30 : h < 12 ? 1800 + h * 120 : h < 18 ? 3200 - (h - 12) * 80 : 1600 - (h - 18) * 110
  ),
}));

export const SCANS_BY_WEEKDAY = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d, i) => ({
  day: d,
  value: Math.round(5200 + [800, 600, 400, 700, 1100, 1500, 300][i]),
}));

export const PLAN_DISTRIBUTION = [
  { name: "Starter", value: 65, color: "#60A5FA" },
  { name: "Pro", value: 180, color: "#2563EB" },
  { name: "Enterprise", value: 3, color: "#F59E0B" },
  { name: "Essai", value: 13, color: "#A7F3D0" },
];

export const TOP_MAKERS = [
  { name: "Jus de Bissap Sénégal", scans: 145_320, products: 24 },
  { name: "Térange Foods", scans: 98_750, products: 31 },
  { name: "Sarine Bio", scans: 87_420, products: 18 },
  { name: "Bissap Premium", scans: 76_980, products: 12 },
  { name: "BioAfrica Cosmetics", scans: 65_110, products: 9 },
  { name: "Dakar Foods", scans: 54_870, products: 27 },
  { name: "Sénégal Agro", scans: 43_220, products: 15 },
  { name: "Épices Bio", scans: 38_640, products: 22 },
  { name: "Confitures Plus", scans: 31_580, products: 14 },
  { name: "Jus Naturel", scans: 27_410, products: 8 },
];

export const TOP_CITIES = [
  { city: "Dakar", scans: 456_789, pct: 36 },
  { city: "Thiès", scans: 123_456, pct: 10 },
  { city: "Saint-Louis", scans: 89_012, pct: 7 },
  { city: "Mbour", scans: 76_340, pct: 6 },
  { city: "Touba", scans: 68_920, pct: 5 },
  { city: "Kaolack", scans: 54_780, pct: 4 },
  { city: "Ziguinchor", scans: 43_210, pct: 3 },
  { city: "Diourbel", scans: 32_870, pct: 3 },
  { city: "Rufisque", scans: 28_540, pct: 2 },
  { city: "Tambacounda", scans: 21_360, pct: 2 },
];

export const MAKERS: Maker[] = [
  {
    id: "M-001",
    company: "Jus de Bissap Sénégal",
    logoColor: "#DC2626",
    contactName: "Marième Diop",
    email: "marieme@bissapsenegal.sn",
    phone: "+221 77 123 45 67",
    whatsapp: "+221 77 123 45 67",
    address: "Rue 10, Médina, Dakar",
    plan: "Pro",
    status: "Actif",
    products: 24,
    scans: 145_320,
    scans30d: Array.from({ length: 30 }, (_, i) => Math.round(3800 + Math.sin(i / 2) * 700 + i * 40)),
    registeredAt: "2025-03-12",
    lastLogin: "2026-08-13T08:24:00",
    mrr: 25_000,
    nextBilling: "2026-08-15",
    paymentMethod: "Wave",
    quotaProducts: "12 / ∞",
    quotaQrUsed: 2340,
    quotaQrTotal: 5000,
    productsList: [
      { name: "Bissap Premium 1L", category: "Boissons", lots: 12, scans: 8_420, status: "Actif" },
      { name: "Bissap Bio 50cl", category: "Boissons", lots: 8, scans: 5_210, status: "Actif" },
      { name: "Bissap Gingembre", category: "Boissons", lots: 6, scans: 3_980, status: "Actif" },
      { name: "Bissap Ananas", category: "Boissons", lots: 4, scans: 2_140, status: "Rupture" },
      { name: "Bissap Menthe", category: "Boissons", lots: 5, scans: 1_870, status: "Actif" },
    ],
    notes: [
      { date: "2026-08-10", author: "Admin VS", content: "Cliente très satisfaite. Envisage passage Enterprise en 2027." },
      { date: "2026-07-22", author: "Admin VS", content: "Demande de formation QR codes effectuée." },
    ],
    activity: [
      { date: "Il y a 2h", label: "Lot #2026-04821 créé" },
      { date: "Hier", label: "Profil mis à jour" },
      { date: "Il y a 3j", label: "Paiement reçu — 25 000 FCFA" },
      { date: "Il y a 5j", label: "Nouveau produit ajouté : Bissap Ananas" },
    ],
  },
  {
    id: "M-002",
    company: "Térange Foods",
    logoColor: "#10B981",
    contactName: "Ibrahima Ndiaye",
    email: "i.ndiaye@terange.sn",
    phone: "+221 76 987 65 43",
    whatsapp: "+221 76 987 65 43",
    address: "Zone Industrielle, Dakar",
    plan: "Enterprise",
    status: "Actif",
    products: 31,
    scans: 98_750,
    scans30d: Array.from({ length: 30 }, (_, i) => Math.round(2900 + Math.cos(i / 3) * 500 + i * 25)),
    registeredAt: "2024-11-08",
    lastLogin: "2026-08-13T06:11:00",
    mrr: 75_000,
    nextBilling: "2026-09-08",
    paymentMethod: "Virement",
    quotaProducts: "31 / ∞",
    quotaQrUsed: 4120,
    quotaQrTotal: 99999,
    productsList: [
      { name: "Couscous Premium 1kg", category: "Céréales", lots: 18, scans: 12_400, status: "Actif" },
      { name: "Farine de mil", category: "Céréales", lots: 14, scans: 8_930, status: "Actif" },
      { name: "Semoule fine", category: "Céréales", lots: 9, scans: 5_210, status: "Actif" },
    ],
    notes: [{ date: "2026-08-01", author: "Admin VS", content: "Export CEDEAO en cours, 4 pays couverts." }],
    activity: [
      { date: "Il y a 1h", label: "Export de 12 lots vers Bamako" },
      { date: "Hier", label: "Paiement reçu — 75 000 FCFA" },
    ],
  },
  {
    id: "M-003",
    company: "Sarine Bio",
    logoColor: "#8B5CF6",
    contactName: "Fatou Sarr",
    email: "fatou@sarinebio.sn",
    phone: "+221 70 222 33 44",
    address: "Mbour, Sénégal",
    plan: "Pro",
    status: "Actif",
    products: 18,
    scans: 87_420,
    scans30d: Array.from({ length: 30 }, (_, i) => Math.round(2600 + Math.sin(i) * 400)),
    registeredAt: "2025-06-20",
    lastLogin: "2026-08-12T19:40:00",
    mrr: 25_000,
    nextBilling: "2026-08-20",
    paymentMethod: "Orange Money",
    quotaProducts: "18 / ∞",
    quotaQrUsed: 1890,
    quotaQrTotal: 5000,
    productsList: [
      { name: "Miel pur 500g", category: "Autres", lots: 8, scans: 6_120, status: "Actif" },
      { name: "Beurre de karité", category: "Cosmétiques", lots: 6, scans: 4_870, status: "Actif" },
    ],
    notes: [],
    activity: [{ date: "Il y a 4h", label: "Nouveau lot créé : Miel pur" }],
  },
  {
    id: "M-004",
    company: "Bissap Premium",
    logoColor: "#F59E0B",
    contactName: "Aïssatou Fall",
    email: "contact@bissappremium.sn",
    phone: "+221 78 555 66 77",
    address: "Pikine, Dakar",
    plan: "Starter",
    status: "Actif",
    products: 12,
    scans: 76_980,
    scans30d: Array.from({ length: 30 }, (_, i) => Math.round(2100 + Math.cos(i / 2) * 300)),
    registeredAt: "2026-01-15",
    lastLogin: "2026-08-13T07:02:00",
    mrr: 10_000,
    nextBilling: "2026-08-15",
    paymentMethod: "Wave",
    quotaProducts: "12 / ∞",
    quotaQrUsed: 760,
    quotaQrTotal: 500,
    productsList: [{ name: "Bissap Premium Classic", category: "Boissons", lots: 5, scans: 3_200, status: "Actif" }],
    notes: [{ date: "2026-08-05", author: "Admin VS", content: "Quota QR dépassé, relance pour upgrade Pro envoyée." }],
    activity: [{ date: "Il y a 6h", label: "Quota QR codes dépassé" }],
  },
  {
    id: "M-005",
    company: "BioAfrica Cosmetics",
    logoColor: "#EC4899",
    contactName: "Awa Sow",
    email: "awa@bioafrica.sn",
    phone: "+221 77 444 55 66",
    address: "Almadies, Dakar",
    plan: "Pro",
    status: "Actif",
    products: 9,
    scans: 65_110,
    scans30d: Array.from({ length: 30 }, (_, i) => Math.round(1800 + Math.sin(i / 4) * 250)),
    registeredAt: "2025-09-01",
    lastLogin: "2026-08-13T05:30:00",
    mrr: 25_000,
    nextBilling: "2026-09-01",
    paymentMethod: "CB",
    quotaProducts: "9 / ∞",
    quotaQrUsed: 1340,
    quotaQrTotal: 5000,
    productsList: [{ name: "Savon naturel bio", category: "Cosmétiques", lots: 4, scans: 2_100, status: "Actif" }],
    notes: [],
    activity: [{ date: "Hier", label: "Profil mis à jour" }],
  },
  {
    id: "M-006",
    company: "Dakar Foods",
    logoColor: "#06B6D4",
    contactName: "Cheikh Mbacké",
    email: "cheikh@dakarfoods.sn",
    phone: "+221 76 111 22 33",
    address: "Liberté 6, Dakar",
    plan: "Pro",
    status: "Suspendu",
    products: 27,
    scans: 54_870,
    scans30d: Array.from({ length: 30 }, (_, i) => Math.round(1600 + Math.sin(i) * 200)),
    registeredAt: "2025-04-18",
    lastLogin: "2026-07-30T14:20:00",
    mrr: 0,
    nextBilling: "—",
    paymentMethod: "Orange Money",
    quotaProducts: "27 / ∞",
    quotaQrUsed: 2100,
    quotaQrTotal: 5000,
    productsList: [{ name: "Sauce yassa", category: "Conserves", lots: 7, scans: 1_900, status: "Suspendu" }],
    notes: [{ date: "2026-08-01", author: "Admin VS", content: "Suspendu pour défaut de paiement (7 jours)." }],
    activity: [{ date: "Il y a 12j", label: "Compte suspendu" }],
  },
  {
    id: "M-007",
    company: "Sénégal Agro",
    logoColor: "#22C55E",
    contactName: "Ousmane Diallo",
    email: "o.diallo@senegalagro.sn",
    phone: "+221 70 333 44 55",
    address: "Thiès, Sénégal",
    plan: "Pro",
    status: "Actif",
    products: 15,
    scans: 43_220,
    scans30d: Array.from({ length: 30 }, (_, i) => Math.round(1400 + Math.cos(i / 3) * 180)),
    registeredAt: "2025-07-22",
    lastLogin: "2026-08-12T22:15:00",
    mrr: 25_000,
    nextBilling: "2026-08-22",
    paymentMethod: "Wave",
    quotaProducts: "15 / ∞",
    quotaQrUsed: 980,
    quotaQrTotal: 5000,
    productsList: [],
    notes: [],
    activity: [{ date: "Il y a 2j", label: "Paiement reçu" }],
  },
  {
    id: "M-008",
    company: "Épices Bio",
    logoColor: "#EF4444",
    contactName: "Ndèye Touré",
    email: "ndeeye@epicesbio.sn",
    phone: "+221 78 999 00 11",
    address: "Saint-Louis, Sénégal",
    plan: "Starter",
    status: "Actif",
    products: 22,
    scans: 38_640,
    scans30d: Array.from({ length: 30 }, (_, i) => Math.round(1200 + Math.sin(i / 2) * 150)),
    registeredAt: "2026-02-10",
    lastLogin: "2026-08-13T09:45:00",
    mrr: 10_000,
    nextBilling: "2026-08-10",
    paymentMethod: "Orange Money",
    quotaProducts: "22 / ∞",
    quotaQrUsed: 480,
    quotaQrTotal: 500,
    productsList: [],
    notes: [],
    activity: [{ date: "Il y a 1j", label: "Nouveau produit ajouté" }],
  },
  {
    id: "M-009",
    company: "Confitures Plus",
    logoColor: "#3B82F6",
    contactName: "Mamadou Sow",
    email: "mamadou@confituresplus.sn",
    phone: "+221 77 666 77 88",
    address: "Rufisque, Dakar",
    plan: "Essai",
    status: "Inactif",
    products: 14,
    scans: 31_580,
    scans30d: Array.from({ length: 30 }, (_, i) => Math.round(900 + Math.sin(i) * 100)),
    registeredAt: "2026-08-01",
    lastLogin: "2026-08-10T11:00:00",
    mrr: 0,
    nextBilling: "Essai",
    paymentMethod: "—",
    quotaProducts: "14 / ∞",
    quotaQrUsed: 210,
    quotaQrTotal: 500,
    productsList: [],
    notes: [],
    activity: [{ date: "Il y a 3j", label: "Essai commencé" }],
  },
  {
    id: "M-010",
    company: "Jus Naturel",
    logoColor: "#84CC16",
    contactName: "Pape Diouf",
    email: "pape@jusnaturel.sn",
    phone: "+221 76 222 33 44",
    address: "Kaolack, Sénégal",
    plan: "Starter",
    status: "Actif",
    products: 8,
    scans: 27_410,
    scans30d: Array.from({ length: 30 }, (_, i) => Math.round(800 + Math.cos(i / 2) * 90)),
    registeredAt: "2026-03-30",
    lastLogin: "2026-08-11T16:30:00",
    mrr: 10_000,
    nextBilling: "2026-08-30",
    paymentMethod: "Wave",
    quotaProducts: "8 / ∞",
    quotaQrUsed: 320,
    quotaQrTotal: 500,
    productsList: [],
    notes: [{ date: "2026-07-15", author: "Admin VS", content: "Lot rappelé suite à défaut d'étiquetage." }],
    activity: [{ date: "Il y a 2h", label: "Lot signalé comme rappelé" }],
  },
  // Lighter entries to reach 258 total (we display 12 in the table; rest are virtual)
];

/** Generate enough makers to claim "258 fabricants" in the UI. */
export const ALL_MAKERS_COUNT = 258;
export const MAKERS_TABLE = [
  ...MAKERS,
  ...Array.from({ length: 12 - MAKERS.length }, (_, i) => {
    const names = ["Sahel Cosmetics", "Téranga Café", "Niayes Bio", "Cabo Fresh", "Kayar Pêche", "Saint-Louis Riz", "Podor Céréales", "Tambacounda Fruits"];
    const n = names[i % names.length];
    const plans: Plan[] = ["Starter", "Pro", "Essai", "Starter", "Pro"];
    const statuses: UserStatus[] = ["Actif", "Actif", "Inactif", "Actif", "Suspendu"];
    const idx = MAKERS.length + i;
    return {
      id: `M-${String(idx + 1).padStart(3, "0")}`,
      company: n,
      logoColor: ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"][i % 5],
      contactName: `Contact ${n}`,
      email: `contact@${n.toLowerCase().replace(/\s/g, "")}.sn`,
      phone: "+221 77 000 00 00",
      whatsapp: "+221 77 000 00 00",
      address: "Dakar, Sénégal",
      plan: plans[i % plans.length],
      status: statuses[i % statuses.length],
      products: Math.round(5 + Math.random() * 40),
      scans: Math.round(5000 + Math.random() * 60000),
      scans30d: Array.from({ length: 30 }, () => Math.round(500 + Math.random() * 3000)),
      registeredAt: "2026-05-10",
      lastLogin: "2026-08-12T10:00:00",
      mrr: plans[i % plans.length] === "Pro" ? 25000 : plans[i % plans.length] === "Starter" ? 10000 : 0,
      nextBilling: "2026-08-20",
      paymentMethod: ["Wave", "Orange Money", "CB"][i % 3],
      quotaProducts: "10 / ∞",
      quotaQrUsed: Math.round(Math.random() * 5000),
      quotaQrTotal: 5000,
      productsList: [],
      notes: [],
      activity: [],
    } as Maker;
  }),
];

export type Category = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  products: number;
  order: number;
  active: boolean;
  color: string;
};

export const CATEGORIES: Category[] = [
  { id: "C1", emoji: "🥤", name: "Boissons", description: "Jus, boissons gazeuses, eaux", products: 78, order: 1, active: true, color: "#3B82F6" },
  { id: "C2", emoji: "🍞", name: "Boulangerie", description: "Pains, viennoiseries, pâtisseries", products: 34, order: 2, active: true, color: "#F59E0B" },
  { id: "C3", emoji: "🌶️", name: "Épices", description: "Épices, condiments, mélanges", products: 56, order: 3, active: true, color: "#EF4444" },
  { id: "C4", emoji: "🥫", name: "Conserves", description: "Conserves, sauces, plats préparés", products: 23, order: 4, active: true, color: "#10B981" },
  { id: "C5", emoji: "🍫", name: "Confiseries", description: "Bonbons, chocolats, sucreries", products: 41, order: 5, active: true, color: "#8B5CF6" },
  { id: "C6", emoji: "🌾", name: "Céréales", description: "Riz, mil, maïs, céréales", products: 18, order: 6, active: true, color: "#EAB308" },
  { id: "C7", emoji: "🥜", name: "Fruits secs", description: "Noix, arachides, fruits séchés", products: 29, order: 7, active: true, color: "#84CC16" },
  { id: "C8", emoji: "🧴", name: "Cosmétiques", description: "Soins, huiles, savons naturels", products: 12, order: 8, active: true, color: "#EC4899" },
  { id: "C9", emoji: "📦", name: "Autres", description: "Produits divers non classés", products: 7, order: 9, active: false, color: "#6B7280" },
];

export type Ticket = {
  id: string;
  subject: string;
  requester: string;
  company: string;
  avatarColor: string;
  priority: "Basse" | "Normale" | "Haute" | "Urgente";
  status: "Ouvert" | "En cours" | "En attente" | "Résolu";
  assignedTo: string | null;
  createdAt: string;
  lastReply: string;
  category: "Technique" | "Facturation" | "Compte" | "Autre";
  plan: Plan;
  tags: string[];
  messages: { from: "client" | "admin"; author: string; content: string; timestamp: string }[];
  internalNotes: { date: string; author: string; content: string }[];
};

export const TICKETS: Ticket[] = [
  {
    id: "TKT-2026-0145",
    subject: "Problème avec la génération de QR codes",
    requester: "Marième Diop",
    company: "Jus de Bissap Sénégal",
    avatarColor: "#DC2626",
    priority: "Haute",
    status: "En cours",
    assignedTo: "Admin VS",
    createdAt: "2026-08-12T14:00:00",
    lastReply: "Il y a 2h",
    category: "Technique",
    plan: "Pro",
    tags: ["technique", "qr-code"],
    messages: [
      { from: "client", author: "Marième Diop", content: "Bonjour, depuis ce matin je n'arrive plus à générer de QR codes pour mes nouveaux lots. J'ai le message « Quota dépassé » alors que mon abonnement Pro devrait me donner 5 000 codes/mois.", timestamp: "Il y a 3h" },
      { from: "admin", author: "Admin VerifScan", content: "Bonjour Marième, merci pour votre message. Je vérifie votre compte immédiatement. Pouvez-vous me confirmer le nombre de QR codes générés ce mois-ci ?", timestamp: "Il y a 2h" },
      { from: "client", author: "Marième Diop", content: "J'en compte 2 340 dans mon tableau de bord, donc je suis largement sous le quota de 5 000.", timestamp: "Il y a 2h" },
    ],
    internalNotes: [{ date: "Il y a 1h", author: "Admin VS", content: "Semble être un bug du compteur après migration. Escaladé à l'équipe technique." }],
  },
  {
    id: "TKT-2026-0144",
    subject: "Facturation en double sur juillet",
    requester: "Ibrahima Ndiaye",
    company: "Térange Foods",
    avatarColor: "#10B981",
    priority: "Urgente",
    status: "Ouvert",
    assignedTo: null,
    createdAt: "2026-08-12T09:30:00",
    lastReply: "Il y a 5h",
    category: "Facturation",
    plan: "Enterprise",
    tags: ["facturation", "remboursement"],
    messages: [
      { from: "client", author: "Ibrahima Ndiaye", content: "J'ai été débité deux fois en juillet pour mon abonnement Enterprise. Merci de procéder au remboursement.", timestamp: "Il y a 5h" },
    ],
    internalNotes: [],
  },
  {
    id: "TKT-2026-0143",
    subject: "Demande de changement de plan",
    requester: "Aïssatou Fall",
    company: "Bissap Premium",
    avatarColor: "#F59E0B",
    priority: "Normale",
    status: "Ouvert",
    assignedTo: null,
    createdAt: "2026-08-11T16:20:00",
    lastReply: "Hier",
    category: "Compte",
    plan: "Starter",
    tags: ["upgrade"],
    messages: [
      { from: "client", author: "Aïssatou Fall", content: "Bonjour, je souhaite passer du plan Starter au plan Pro. Comment procéder ?", timestamp: "Hier" },
    ],
    internalNotes: [],
  },
  {
    id: "TKT-2026-0142",
    subject: "Erreur 500 sur page produit publique",
    requester: "Fatou Sarr",
    company: "Sarine Bio",
    avatarColor: "#8B5CF6",
    priority: "Haute",
    status: "En cours",
    assignedTo: "Admin VS",
    createdAt: "2026-08-11T11:00:00",
    lastReply: "Il y a 1j",
    category: "Technique",
    plan: "Pro",
    tags: ["technique", "bug"],
    messages: [
      { from: "client", author: "Fatou Sarr", content: "La page publique de mon produit « Miel pur » affiche une erreur 500 depuis hier.", timestamp: "Il y a 1j" },
      { from: "admin", author: "Admin VerifScan", content: "Merci, nous investiguons. Le problème vient d'un slug dupliqué.", timestamp: "Il y a 20h" },
    ],
    internalNotes: [],
  },
  {
    id: "TKT-2026-0141",
    subject: "Comment ajouter un utilisateur ?",
    requester: "Awa Sow",
    company: "BioAfrica Cosmetics",
    avatarColor: "#EC4899",
    priority: "Basse",
    status: "Résolu",
    assignedTo: "Admin VS",
    createdAt: "2026-08-10T13:00:00",
    lastReply: "Il y a 2j",
    category: "Compte",
    plan: "Pro",
    tags: ["question"],
    messages: [
      { from: "client", author: "Awa Sow", content: "Bonjour, comment ajouter un second utilisateur à mon compte ?", timestamp: "Il y a 3j" },
      { from: "admin", author: "Admin VerifScan", content: "Rendez-vous dans Paramètres > Utilisateurs > Inviter.", timestamp: "Il y a 2j" },
      { from: "client", author: "Awa Sow", content: "Parfait, merci beaucoup !", timestamp: "Il y a 2j" },
    ],
    internalNotes: [],
  },
  {
    id: "TKT-2026-0140",
    subject: "Demande de remboursement lot défectueux",
    requester: "Pape Diouf",
    company: "Jus Naturel",
    avatarColor: "#84CC16",
    priority: "Normale",
    status: "En attente",
    assignedTo: "Admin VS",
    createdAt: "2026-08-09T08:15:00",
    lastReply: "Il y a 3j",
    category: "Autre",
    plan: "Starter",
    tags: ["remboursement", "lot"],
    messages: [
      { from: "client", author: "Pape Diouf", content: "J'ai un lot de 200 bouteilles défectueuses, comment gérer le rappel ?", timestamp: "Il y a 3j" },
    ],
    internalNotes: [],
  },
  {
    id: "TKT-2026-0139",
    subject: "API publique - documentation",
    requester: "Cheikh Mbacké",
    company: "Dakar Foods",
    avatarColor: "#06B6D4",
    priority: "Basse",
    status: "Résolu",
    assignedTo: "Admin VS",
    createdAt: "2026-08-07T10:00:00",
    lastReply: "Il y a 6j",
    category: "Technique",
    plan: "Pro",
    tags: ["api", "documentation"],
    messages: [
      { from: "client", author: "Cheikh Mbacké", content: "Où trouver la doc de l'API publique ?", timestamp: "Il y a 6j" },
      { from: "admin", author: "Admin VerifScan", content: "Voici le lien : https://docs.verifscan.sn", timestamp: "Il y a 6j" },
    ],
    internalNotes: [],
  },
  {
    id: "TKT-2026-0138",
    subject: "Souci de connexion au compte",
    requester: "Ndèye Touré",
    company: "Épices Bio",
    avatarColor: "#EF4444",
    priority: "Normale",
    status: "Ouvert",
    assignedTo: null,
    createdAt: "2026-08-13T07:45:00",
    lastReply: "Il y a 1h",
    category: "Compte",
    plan: "Starter",
    tags: ["login"],
    messages: [
      { from: "client", author: "Ndèye Touré", content: "Impossible de me connecter depuis ce matin.", timestamp: "Il y a 1h" },
    ],
    internalNotes: [],
  },
];

export type ActivityLog = {
  id: string;
  timestamp: string;
  type: "Inscription" | "Paiement" | "Support" | "Alerte" | "Système";
  description: string;
  user: string;
};

export const ACTIVITY_LOGS: ActivityLog[] = [
  { id: "A1", timestamp: "Il y a 5 min", type: "Inscription", description: "Nouveau fabricant inscrit", user: "Jus Sénégal SA" },
  { id: "A2", timestamp: "Il y a 12 min", type: "Paiement", description: "Paiement reçu — 25 000 FCFA", user: "Épices Bio" },
  { id: "A3", timestamp: "Il y a 28 min", type: "Support", description: "Ticket support créé", user: "Confitures Plus" },
  { id: "A4", timestamp: "Il y a 45 min", type: "Paiement", description: "Paiement reçu — 10 000 FCFA", user: "Jus Naturel" },
  { id: "A5", timestamp: "Il y a 1h", type: "Alerte", description: "Lot signalé comme rappelé", user: "Jus Naturel" },
  { id: "A6", timestamp: "Il y a 1h", type: "Inscription", description: "Nouveau fabricant inscrit", user: "Sahel Cosmetics" },
  { id: "A7", timestamp: "Il y a 2h", type: "Support", description: "Ticket #TKT-2026-0145 mis à jour", user: "Jus de Bissap Sénégal" },
  { id: "A8", timestamp: "Il y a 2h", type: "Système", description: "Sauvegarde automatique réussie", user: "Système" },
  { id: "A9", timestamp: "Il y a 3h", type: "Paiement", description: "Paiement échoué", user: "Dakar Foods" },
  { id: "A10", timestamp: "Il y a 4h", type: "Inscription", description: "Nouveau fabricant inscrit", user: "Cabo Fresh" },
];

export const GLOBAL_KPI = {
  totalMakers: 258,
  activeMakers: 245,
  inactiveMakers: 13,
  totalProducts: 1_247,
  totalLots: 8_934,
  totalQrCodes: 45_678,
  totalScans: 1_245_892,
  scansThisWeek: 12_458,
  scansAvgPerDay: 4_830,
  mrr: 4_850_000,
  arr: 58_200_000,
  retentionRate: 94,
  churnRate: 6,
  openTickets: 12,
  urgentTickets: 5,
  normalTickets: 7,
};

export const RETENTION_DATA = months.map((m, i) => ({
  month: m,
  value: Math.round(88 + i * 0.5 + Math.sin(i) * 1.5),
}));

export const CHURN_DATA = months.map((m, i) => ({
  month: m,
  value: Math.round((8 - i * 0.18 + Math.cos(i) * 0.6) * 10) / 10,
}));

export const PERF_DATA = {
  latency: Array.from({ length: 30 }, (_, i) => ({ day: `J${i + 1}`, value: Math.round(220 + Math.sin(i / 3) * 30 + (i % 7 === 0 ? 40 : 0)) })),
  errorRate: Array.from({ length: 30 }, (_, i) => ({ day: `J${i + 1}`, value: Math.round((0.08 + Math.sin(i) * 0.05) * 100) / 100 })),
  uptime: Array.from({ length: 30 }, (_, i) => ({ day: `J${i + 1}`, value: 99.9 + (i % 12 === 0 ? -0.2 : 0) })),
};

export const PLANS_CONFIG = {
  Starter: {
    badge: "Entrée de gamme",
    monthly: 10000,
    yearly: 100000,
    limits: { products: 5, qrCodes: 500, users: 1, stats: "Basiques" },
    features: { createProducts: true, qrGeneration: true, publicPage: true, advancedStats: false, marketplace: false, api: false },
  },
  Pro: {
    badge: "⭐ Le plus populaire",
    monthly: 25000,
    yearly: 210000,
    limits: { products: -1, qrCodes: 5000, users: 5, stats: "Avancées" },
    features: { createProducts: true, qrGeneration: true, publicPage: true, advancedStats: true, marketplace: true, api: true },
  },
  Enterprise: {
    badge: "Grand compte",
    monthly: 75000,
    yearly: 630000,
    limits: { products: -1, qrCodes: -1, users: -1, stats: "BI" },
    features: { createProducts: true, qrGeneration: true, publicPage: true, advancedStats: true, marketplace: true, api: true },
  },
};

export function formatFCFA(n: number): string {
  return n.toLocaleString("fr-FR");
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}
