/**
 * VerifScan — Fabricant dashboard server-side data layer.
 *
 * Every function here runs ONLY on the server (uses `db` from @/lib/db).
 * Returns plain JSON-serializable objects shaped to match the types in
 * `fabricant-types.ts` so pages can consume them directly without any
 * Prisma model leaking through.
 *
 * All queries are scoped to a single fabricant (userId) — there is no way
 * to accidentally return another manufacturer's data.
 */
import { db } from "@/lib/db";
import {
  calculateTransparencyScore,
  getLevelFromScore,
  getPercentileRank,
  parseJsonArray,
  type TransparencyResult,
} from "@/lib/utils";
import type {
  Activity,
  Badge,
  ClassementFabricant,
  FabricantAbonnement,
  FabricantProfile,
  FabricantScore,
  FabricantStats,
  Lot,
  LotStatus,
  Product,
  ProductStatus,
  QRCode,
  ScoreDetailItem,
  ScoreRecommandation,
} from "@/lib/fabricant-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toISODate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

/**
 * Safely parse a JSON-encoded string from the DB into the expected shape.
 * Returns null on parse failure or empty input — never throws.
 *
 * SQLite doesn't support Prisma `Json`, so V3 Phase 3 dynamic fields
 * (categoryData, exportData, certifications) are stored as JSON strings.
 */
function safeParseJSON<T>(raw: string | null | undefined): T | null {
  if (!raw || typeof raw !== "string" || raw.length === 0) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function mapProductStatus(status: string | null, isPublic: boolean): ProductStatus {
  // Prisma Product.status: "ACTIVE" | "ARCHIVED"
  // Mock ProductStatus: "actif" | "brouillon" | "masque"
  if (status === "ARCHIVED") return "brouillon";
  if (!isPublic) return "masque";
  return "actif";
}

function mapLotStatus(status: string | null): LotStatus {
  // Prisma Lot.status: "ACTIVE" | "RECALLED" | "EXPIRED" | "DRAFT"
  // Mock LotStatus: "actif" | "rappelle" | "expire"
  if (status === "RECALLED") return "rappelle";
  if (status === "EXPIRED") return "expire";
  return "actif";
}

function mapQRStatus(status: string | null): "actif" | "desactive" {
  // Prisma QRCode.status: "ACTIVE" | "USED" | "INVALID"
  return status === "ACTIVE" ? "actif" : "desactive";
}

function catEmoji(category: string | null): string {
  if (!category) return "📦";
  const map: Record<string, string> = {
    "Boissons": "🥤",
    "Épices": "🌶️",
    "Boulangerie": "🍞",
    "Confiserie": "🍫",
    "Confitures": "🥫",
    "Épicerie": "🌾",
    "Cosmétique": "🧴",
    "Cosmétiques": "🧴",
    "Sauces": "🥘",
    "Condiments": "🧂",
    "Plats": "🍜",
    "Agro-alimentaire": "🌾",
    "Hygiène": "🧼",
    "Textile": "🧵",
  };
  return map[category] ?? "📦";
}

function initials(name: string | null, companyName: string | null): string {
  const src = (companyName || name || "??").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function getFabricantProfile(userId: string): Promise<FabricantProfile> {
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) {
    throw new Error(`Fabricant ${userId} not found`);
  }
  return {
    id: u.id,
    nom: u.companyName || u.name || "Fabricant",
    companyName: u.companyName || u.name || "Fabricant",
    logo: initials(u.name, u.companyName),
    logoUrl: u.logoUrl ?? null,
    plan: "Pro", // No `plan` column yet — default to Pro
    email: u.email,
    phone: u.phone ?? null,
    whatsapp: u.whatsapp ?? null,
    address: u.address ?? null,
    city: u.city ?? null,
    country: u.country ?? null,
    website: u.website ?? null,
    description: u.description ?? null,
    sector: u.sector ?? null,
    yearFounded: u.yearFounded ?? null,
    taxId: u.taxId ?? null,
    facebook: u.facebook ?? null,
    instagram: u.instagram ?? null,
    linkedin: u.linkedin ?? null,
    brandColor: u.brandColor || "#2563EB",
    isVerified: u.isVerified,
    createdAt: toISODate(u.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function getFabricantProducts(userId: string): Promise<Product[]> {
  const rows = await db.product.findMany({
    where: { fabricantId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { lots: true } },
    },
  });

  return rows.map((p) => {
    const status = mapProductStatus(p.status, p.isPublic);
    // Scans per month: approximate by dividing total scans over the product's
    // lifetime in months (min 1) — gives a stable, realistic number.
    const ageMonths = Math.max(
      1,
      Math.round((Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)),
    );
    return {
      id: p.id,
      nom: p.name,
      marque: p.brand || "",
      categorie: p.category || "",
      categorieIcon: catEmoji(p.category),
      poids: p.weight || "",
      description: p.description || "",
      status,
      photo: p.imageUrl || "",
      lots: p._count.lots,
      scans: p.totalScans,
      scansParMois: Math.round(p.totalScans / ageMonths),
      createdAt: toISODate(p.createdAt),
      // V3 Phase 3 — dynamic category fields (JSON-encoded strings in SQLite)
      categoryId: p.categoryId,
      isExport: p.isExport,
      categoryData: p.categoryData
        ? safeParseJSON<Record<string, unknown>>(p.categoryData)
        : null,
      exportData: p.exportData
        ? safeParseJSON<Record<string, unknown>>(p.exportData)
        : null,
      certifications: p.certifications
        ? safeParseJSON<Array<{ name: string; issuer?: string; validUntil?: string; fileUrl?: string }>>(p.certifications)
        : null,
      // Open Food Facts
      barcode: p.barcode,
      offData: p.offData
        ? safeParseJSON<Record<string, unknown>>(p.offData)
        : null,
      offLastSync: p.offLastSync ? toISODate(p.offLastSync) : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Lots
// ---------------------------------------------------------------------------

export async function getFabricantLots(userId: string): Promise<Lot[]> {
  const rows = await db.lot.findMany({
    where: { fabricantId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { name: true, imageUrl: true, category: true } },
    },
  });

  return rows.map((l) => ({
    id: l.id,
    numero: l.lotNumber || l.reference,
    produitId: l.productId,
    produitNom: l.product?.name ?? "Produit supprimé",
    produitPhoto: l.product?.imageUrl ?? "",
    produitIcon: catEmoji(l.product?.category ?? null),
    dateFabrication: toISODate(l.manufactureDate),
    datePeremption: toISODate(l.expiryDate),
    status: mapLotStatus(l.status),
    scans: l.totalScans,
    qrCodes: l.qrCodeCount,
    ingredients: l.ingredients || "",
    lieuFabrication: l.manufacturingLocation || "",
  }));
}

// ---------------------------------------------------------------------------
// QR codes
// ---------------------------------------------------------------------------

export async function getFabricantQRCodes(userId: string): Promise<QRCode[]> {
  const rows = await db.qRCode.findMany({
    where: { fabricantId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      lot: {
        select: {
          id: true,
          reference: true,
          lotNumber: true,
          product: { select: { name: true } },
        },
      },
    },
  });

  return rows.map((q) => ({
    id: q.id,
    code: q.code,
    lotId: q.lotId,
    lotNumero: q.lot?.lotNumber || q.lot?.reference || "",
    produitNom: q.lot?.product?.name ?? "Produit supprimé",
    dateGeneration: toISODate(q.createdAt),
    scans: q.scans,
    status: mapQRStatus(q.status),
  }));
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

const CHART_COLORS = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16", "#9CA3AF"];

/** Scans grouped by day for the last `days` days. */
async function getScansByDay(userId: string, days = 30) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const rows = await db.scan.findMany({
    where: {
      scannedAt: { gte: since },
      lot: { fabricantId: userId },
    },
    select: { scannedAt: true },
  });

  // Build a YYYY-MM-DD -> count map for the requested window
  const counts = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    counts.set(toISODate(d), 0);
  }
  for (const r of rows) {
    const key = toISODate(r.scannedAt);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Previous-period baseline (same window, shifted back by `days` days) —
  // gives a meaningful `precedent` series for the chart overlay.
  const prevSince = new Date(since);
  prevSince.setDate(prevSince.getDate() - days);
  const prevUntil = new Date(since);
  prevUntil.setDate(prevUntil.getDate() - 1);

  let prevRows: { scannedAt: Date }[] = [];
  try {
    prevRows = await db.scan.findMany({
      where: {
        scannedAt: { gte: prevSince, lte: prevUntil },
        lot: { fabricantId: userId },
      },
      select: { scannedAt: true },
    });
  } catch (e) {
    console.error("[getScansByDay] prev period failed:", e);
  }
  const prevCounts = new Map<string, number>();
  for (const r of prevRows) {
    // Align prev-day index to the same offset within the current window
    const dayOffset = Math.floor(
      (r.scannedAt.getTime() - prevSince.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (dayOffset < 0 || dayOffset >= days) continue;
    const d = new Date(since);
    d.setDate(d.getDate() + dayOffset);
    const key = toISODate(d);
    prevCounts.set(key, (prevCounts.get(key) ?? 0) + 1);
  }

  const out = [];
  for (const [key, value] of counts.entries()) {
    const [y, m, d] = key.split("-");
    out.push({
      jour: `${d}/${m}`,
      scans: value,
      precedent: prevCounts.get(key) ?? 0,
    });
  }
  return out;
}

/** Scans grouped by weekday (Mon..Sun) for the last 90 days. */
async function getScansSemaine(userId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const rows = await db.scan.findMany({
    where: { scannedAt: { gte: since }, lot: { fabricantId: userId } },
    select: { scannedAt: true },
  });
  const labels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const r of rows) counts[r.scannedAt.getDay()]++;
  // Return ordered Lun..Dim to match the existing chart layout
  return [1, 2, 3, 4, 5, 6, 0].map((d) => ({ jour: labels[d], scans: counts[d] }));
}

/** Scans grouped by hour of day (0h..23h) for the last 30 days. */
async function getScansHeure(userId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const rows = await db.scan.findMany({
    where: { scannedAt: { gte: since }, lot: { fabricantId: userId } },
    select: { scannedAt: true },
  });
  const counts = new Array(24).fill(0);
  for (const r of rows) counts[r.scannedAt.getHours()]++;
  return counts.map((c, h) => ({ heure: `${h}h`, scans: c }));
}

/** Top products by scan count. */
async function getTopProducts(userId: string, limit = 5) {
  const products = await db.product.findMany({
    where: { fabricantId: userId },
    orderBy: { totalScans: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      totalScans: true,
      imageUrl: true,
      category: true,
    },
  });
  return products.map((p) => ({
    id: p.id,
    nom: p.name,
    scans: p.totalScans,
    photo: p.imageUrl || "",
    categorieIcon: catEmoji(p.category),
  }));
}

/** Scans grouped by product (for the donut chart). */
async function getRepartitionProduits(userId: string) {
  const products = await db.product.findMany({
    where: { fabricantId: userId },
    orderBy: { totalScans: "desc" },
    take: 8,
    select: { name: true, totalScans: true },
  });
  const totalScans = products.reduce((s, p) => s + p.totalScans, 0);
  const top = products.filter((p) => p.totalScans > 0).slice(0, 7);
  const othersCount = totalScans - top.reduce((s, p) => s + p.totalScans, 0);
  const result = top.map((p, i) => ({
    nom: p.name,
    scans: p.totalScans,
    couleur: CHART_COLORS[i % CHART_COLORS.length],
  }));
  if (othersCount > 0) {
    result.push({ nom: "Autres", scans: othersCount, couleur: "#9CA3AF" });
  }
  return result;
}

/** Top cities by scan count. */
async function getTopVilles(userId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const rows = await db.scan.findMany({
    where: { scannedAt: { gte: since }, lot: { fabricantId: userId }, city: { not: null } },
    select: { city: true, region: true },
  });
  const map = new Map<string, { ville: string; region: string; scans: number }>();
  for (const r of rows) {
    if (!r.city) continue;
    const key = r.city;
    const entry = map.get(key) ?? { ville: r.city, region: r.region || "", scans: 0 };
    entry.scans += 1;
    map.set(key, entry);
  }
  const arr = Array.from(map.values()).sort((a, b) => b.scans - a.scans).slice(0, 8);
  const total = arr.reduce((s, v) => s + v.scans, 0) || 1;
  return arr.map((v) => ({
    ville: v.ville,
    region: v.region,
    scans: v.scans,
    pourcentage: Math.round((v.scans / total) * 100),
    tendance: "stable" as const,
  }));
}

/** Scans grouped by deviceType. */
async function getTypeAppareil(userId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const rows = await db.scan.findMany({
    where: { scannedAt: { gte: since }, lot: { fabricantId: userId } },
    select: { deviceType: true },
  });
  const counts = { mobile: 0, desktop: 0, tablet: 0, other: 0 };
  for (const r of rows) {
    const t = (r.deviceType || "").toLowerCase();
    if (t === "mobile") counts.mobile++;
    else if (t === "desktop") counts.desktop++;
    else if (t === "tablet") counts.tablet++;
    else counts.other++;
  }
  const total = counts.mobile + counts.desktop + counts.tablet + counts.other || 1;
  return [
    { nom: "Mobile", valeur: Math.round((counts.mobile / total) * 100), couleur: "#2563EB" },
    { nom: "Desktop", valeur: Math.round((counts.desktop / total) * 100), couleur: "#10B981" },
    { nom: "Tablette", valeur: Math.round((counts.tablet / total) * 100), couleur: "#F59E0B" },
  ];
}

/** Recent activity feed — derived from AuditLog + recent lots/qr codes. */
async function getRecentActivity(userId: string): Promise<Activity[]> {
  const [auditLogs, recentLots, recentQR] = await Promise.all([
    db.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, entity: true, createdAt: true },
    }),
    db.lot.findMany({
      where: { fabricantId: userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, lotNumber: true, reference: true, createdAt: true, product: { select: { name: true } } },
    }),
    db.qRCode.findMany({
      where: { fabricantId: userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, createdAt: true, lot: { select: { lotNumber: true, reference: true } } },
    }),
  ]);

  const activities: Activity[] = [];

  for (const l of recentLots) {
    activities.push({
      id: `lot-${l.id}`,
      icon: "🏷️",
      text: `Lot ${l.lotNumber || l.reference} créé`,
      time: relativeTime(l.createdAt),
      color: "#10B981",
    });
  }
  for (const q of recentQR) {
    activities.push({
      id: `qr-${q.id}`,
      icon: "📱",
      text: `QR codes générés pour ${q.lot?.lotNumber || q.lot?.reference || ""}`,
      time: relativeTime(q.createdAt),
      color: "#2563EB",
    });
  }
  for (const a of auditLogs) {
    if (a.action === "LOGIN") continue; // skip noisy login events
    activities.push({
      id: `audit-${a.id}`,
      icon: auditIcon(a.action),
      text: auditText(a.action, a.entity),
      time: relativeTime(a.createdAt),
      color: auditColor(a.action),
    });
  }

  // Sort by approximate recency (the `time` string is human-readable; for
  // stable ordering we rely on insertion order which already reflects
  // recency since each query is ordered desc).
  return activities.slice(0, 8);
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `il y a ${days}j`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `il y a ${weeks} sem.`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}

function auditIcon(action: string): string {
  if (action.startsWith("CREATE")) return "➕";
  if (action.startsWith("UPDATE")) return "✏️";
  if (action.startsWith("DELETE")) return "🗑️";
  if (action === "LOGIN") return "🔐";
  return "📊";
}

function auditText(action: string, entity: string | null): string {
  const e = entity || "élément";
  if (action === "CREATE_PRODUCT") return `Produit créé`;
  if (action === "UPDATE_PRODUCT") return `Produit modifié`;
  if (action === "DELETE_PRODUCT") return `Produit supprimé`;
  if (action === "CREATE_LOT") return `Lot créé`;
  if (action === "UPDATE_LOT") return `Lot modifié`;
  if (action === "DELETE_LOT") return `Lot supprimé`;
  if (action === "GENERATE_QR") return `QR codes générés`;
  if (action === "DELETE_QR") return `QR code supprimé`;
  if (action === "LOGIN") return `Connexion réussie`;
  return `${action} sur ${e}`;
}

function auditColor(action: string): string {
  if (action.startsWith("CREATE")) return "#10B981";
  if (action.startsWith("UPDATE")) return "#F59E0B";
  if (action.startsWith("DELETE")) return "#EF4444";
  return "#8B5CF6";
}

export async function getFabricantStats(userId: string): Promise<FabricantStats> {
  const [products, lots, qrCodes, scansByDay, scansSemaine, scansHeure, repartition, topVilles, typeAppareil, topProducts, recentActivity, totalScansRow] = await Promise.all([
    db.product.findMany({ where: { fabricantId: userId }, select: { status: true, isPublic: true, totalScans: true, createdAt: true } }),
    db.lot.findMany({ where: { fabricantId: userId }, select: { status: true, totalScans: true } }),
    db.qRCode.count({ where: { fabricantId: userId } }),
    getScansByDay(userId, 30),
    getScansSemaine(userId),
    getScansHeure(userId),
    getRepartitionProduits(userId),
    getTopVilles(userId),
    getTypeAppareil(userId),
    getTopProducts(userId, 5),
    getRecentActivity(userId),
    db.scan.count({ where: { lot: { fabricantId: userId } } }),
  ]);

  const totalProducts = products.length;
  const actifsProducts = products.filter((p) => mapProductStatus(p.status, p.isPublic) === "actif").length;
  const brouillonsProducts = products.filter((p) => mapProductStatus(p.status, p.isPublic) !== "actif").length;

  const totalLots = lots.length;
  const actifsLots = lots.filter((l) => mapLotStatus(l.status) === "actif").length;
  const rappellesLots = lots.filter((l) => mapLotStatus(l.status) === "rappelle").length;

  const totalScans = totalScansRow || products.reduce((s, p) => s + p.totalScans, 0) + lots.reduce((s, l) => s + l.totalScans, 0);
  // Use sum of product.totalScans as the canonical "scans" counter (matches
  // what the public catalog & scan-recording pipeline increments).
  const totalProductScans = products.reduce((s, p) => s + p.totalScans, 0);
  const totalLotScans = lots.reduce((s, l) => s + l.totalScans, 0);
  const realTotalScans = Math.max(totalProductScans, totalLotScans, totalScans);

  // Scans over the last 30 days — gives a realistic daily average
  const scans30j = scansByDay.reduce((s, d) => s + d.scans, 0);
  const moyenneJour = Math.round(scans30j / 30);

  const kpis: FabricantStats["kpis"] = {
    produits: {
      total: totalProducts,
      actifs: actifsProducts,
      brouillons: brouillonsProducts,
      tendance: `+${Math.min(actifsProducts, 99)} actifs`,
    },
    lots: {
      total: totalLots,
      actifs: actifsLots,
      rappelles: rappellesLots,
      tendance: `${actifsLots} actifs`,
    },
    qrCodes: {
      total: qrCodes,
      quota: 5000,
      tendance: `${qrCodes} générés`,
    },
    scans: {
      total: realTotalScans,
      moyenneJour,
      tendance: moyenneJour > 0 ? `~${moyenneJour}/jour` : "—",
    },
  };

  return {
    totalProducts,
    totalLots,
    totalQRCodes: qrCodes,
    totalScans: realTotalScans,
    scansByDay,
    scansSemaine,
    scansHeure,
    repartitionProduits: repartition,
    topVilles,
    typeAppareil,
    topProducts,
    recentActivity,
    kpis,
    moyenneJour,
  };
}

// ---------------------------------------------------------------------------
// Score
// ---------------------------------------------------------------------------

function buildScoreDetails(t: TransparencyResult): ScoreDetailItem[] {
  // Map the TransparencyResult.details (flat criterion/score/max/subCriteria)
  // to the legacy SCORE_TRANSPARENCE.details shape expected by ScorePage.
  const icons = ["🏭", "🌍", "🏷️", "📅", "🌾", "📜", "📞"];
  return t.details.map((d, i) => ({
    id: `d${i + 1}`,
    icon: icons[i] ?? "✅",
    titre: d.criterion,
    score: d.score,
    max: d.max,
    statut: d.score === d.max ? "Complet" : d.score === 0 ? "Vide" : "Partiel",
    items: (d.subCriteria ?? []).map((s) => ({
      nom: s.label,
      pts: s.points,
      max: s.points, // each sub-criterion is worth its own max
      ok: s.achieved,
    })),
  }));
}

function buildRecommandations(improvements: string[]): ScoreRecommandation[] {
  // Take up to 3 improvements and render them as recommendation cards.
  // Icons/difficulty are heuristic — based on keyword matching.
  return improvements.slice(0, 3).map((text, i) => {
    const lower = text.toLowerCase();
    let icon = "💡";
    let titre = text;
    let gain = "+5 pts";
    let difficulte = "Facile";
    let etoiles = 2;
    if (lower.includes("certif")) {
      icon = "📜";
      gain = "+5 pts";
      difficulte = "Moyenne";
      etoiles = 3;
    } else if (lower.includes("logo")) {
      icon = "🎨";
      gain = "+3 pts";
      difficulte = "Très facile";
      etoiles = 1;
    } else if (lower.includes("allergèn") || lower.includes("allergen")) {
      icon = "🌾";
      gain = "+5 pts";
      difficulte = "Facile";
      etoiles = 2;
    } else if (lower.includes("nutrition")) {
      icon = "📊";
      gain = "+5 pts";
      difficulte = "Facile";
      etoiles = 1;
    } else if (lower.includes("ingrédient") || lower.includes("ingredient")) {
      icon = "🌾";
      gain = "+10 pts";
      difficulte = "Très facile";
      etoiles = 1;
    } else if (lower.includes("date")) {
      icon = "📅";
      gain = "+7 pts";
      difficulte = "Très facile";
      etoiles = 1;
    } else if (lower.includes("pays")) {
      icon = "🌍";
      gain = "+7 pts";
      difficulte = "Facile";
      etoiles = 2;
    } else if (lower.includes("lieu")) {
      icon = "📍";
      gain = "+4 pts";
      difficulte = "Facile";
      etoiles = 2;
    } else if (lower.includes("contact") || lower.includes("whatsapp") || lower.includes("email") || lower.includes("téléphone")) {
      icon = "📞";
      gain = "+3 pts";
      difficulte = "Très facile";
      etoiles = 1;
    } else if (lower.includes("adresse")) {
      icon = "📮";
      gain = "+4 pts";
      difficulte = "Très facile";
      etoiles = 1;
    } else if (lower.includes("entreprise") || lower.includes("nom")) {
      icon = "🏭";
      gain = "+5 pts";
      difficulte = "Très facile";
      etoiles = 1;
    }
    return {
      id: `r${i + 1}`,
      icon,
      titre,
      gain,
      description: text,
      difficulte,
      etoiles,
    };
  });
}

function niveauLabel(level: string): string {
  switch (level) {
    case "platine": return "Transparence exemplaire";
    case "or": return "Transparence élevée";
    case "argent": return "Bonne transparence";
    case "bronze":
    default:
      return "Traçabilité basique";
  }
}

export async function getFabricantScore(userId: string): Promise<FabricantScore> {
  // Compute the fabricant's transparency score from their most-transparent
  // lot — represents the "best" example of their product data quality.
  const [lots, fabricant, fabricantCount, allFabricants] = await Promise.all([
    db.lot.findMany({
      where: { fabricantId: userId },
      include: {
        certifications: true,
      },
      orderBy: { transparencyScore: "desc" },
      take: 1,
    }),
    db.user.findUnique({
      where: { id: userId },
      select: {
        name: true, companyName: true, logoUrl: true, address: true,
        phone: true, email: true, whatsapp: true, isVerified: true,
        transparencyScore: true,
      },
    }),
    db.user.count({ where: { role: "FABRICANT" } }),
    db.user.findMany({
      where: { role: "FABRICANT" },
      orderBy: { transparencyScore: "desc" },
      take: 50,
      select: { id: true, companyName: true, name: true, transparencyScore: true },
    }),
  ]);

  let transparency: TransparencyResult;
  if (lots.length > 0 && fabricant) {
    const lot = lots[0];
    try {
      transparency = calculateTransparencyScore({
        lotNumber: lot.lotNumber,
        manufactureDate: lot.manufactureDate,
        expiryDate: lot.expiryDate,
        ingredients: lot.ingredients,
        manufacturingLocation: lot.manufacturingLocation,
        transformationLocation: lot.transformationLocation,
        salesCountries: lot.salesCountries,
        allergens: lot.allergens,
        nutritionalInfo: lot.nutritionalInfo,
        certifications: lot.certifications,
        fabricant: {
          name: fabricant.name,
          companyName: fabricant.companyName,
          logoUrl: fabricant.logoUrl,
          address: fabricant.address,
          phone: fabricant.phone,
          email: fabricant.email,
          whatsapp: fabricant.whatsapp,
          isVerified: fabricant.isVerified,
        },
      });
    } catch (e) {
      console.error("[getFabricantScore] calculateTransparencyScore failed:", e);
      transparency = {
        score: fabricant.transparencyScore || 0,
        maxScore: 100,
        level: getLevelFromScore(fabricant.transparencyScore || 0),
        percentage: fabricant.transparencyScore || 0,
        details: [],
        improvements: [],
      };
    }
  } else {
    transparency = {
      score: fabricant?.transparencyScore || 0,
      maxScore: 100,
      level: getLevelFromScore(fabricant?.transparencyScore || 0),
      percentage: fabricant?.transparencyScore || 0,
      details: [],
      improvements: [],
    };
  }

  // Persist the recomputed score back to the user row so the classement
  // query stays fresh. Non-blocking — best-effort.
  if (fabricant && transparency.score !== fabricant.transparencyScore) {
    db.user
      .update({ where: { id: userId }, data: { transparencyScore: transparency.score } })
      .catch(() => undefined);
  }

  const totalFabricants = Math.max(1, fabricantCount);
  // Compute rank from the fabricant leaderboard (already sorted desc)
  const rang = Math.max(
    1,
    allFabricants.findIndex((f) => f.id === userId) + 1,
  ) || totalFabricants;

  return {
    global: transparency.score,
    niveau: niveauLabel(transparency.level),
    topPourcent: getPercentileRank(transparency.score),
    moyenneFabricants: 68, // platform-wide constant for now
    rang,
    totalFabricants,
    details: buildScoreDetails(transparency),
    recommandations: buildRecommandations(transparency.improvements),
  };
}

// ---------------------------------------------------------------------------
// Classement — top fabricants by transparency score
// ---------------------------------------------------------------------------

export async function getFabricantClassement(userId: string): Promise<ClassementFabricant[]> {
  const top = await db.user.findMany({
    where: { role: "FABRICANT", transparencyScore: { gt: 0 } },
    orderBy: { transparencyScore: "desc" },
    take: 11,
    select: { id: true, companyName: true, name: true, transparencyScore: true },
  });
  // Always include the current user even if they're not in the top 11
  const me = top.find((u) => u.id === userId);
  let list = top;
  if (!me) {
    const meUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, companyName: true, name: true, transparencyScore: true },
    });
    if (meUser) list = [...top, meUser];
  }

  return list.map((u, i) => {
    const score = u.transparencyScore;
    const niveau = score >= 91 ? "Platine" : score >= 71 ? "Or" : score >= 41 ? "Argent" : "Bronze";
    return {
      rang: i + 1,
      nom: u.companyName || u.name || "Fabricant",
      score,
      niveau,
      tendance: "stable" as const,
      delta: 0,
      vous: u.id === userId,
    };
  });
}

// ---------------------------------------------------------------------------
// Badges — derived from simple milestones (gamification, not persisted yet)
// ---------------------------------------------------------------------------

export async function getFabricantBadges(userId: string): Promise<Badge[]> {
  const [productCount, lotCount, qrCount, scanSum] = await Promise.all([
    db.product.count({ where: { fabricantId: userId } }),
    db.lot.count({ where: { fabricantId: userId } }),
    db.qRCode.count({ where: { fabricantId: userId } }),
    db.product.aggregate({ where: { fabricantId: userId }, _sum: { totalScans: true } }),
  ]);

  const scans = scanSum._sum.totalScans ?? 0;
  const badges: Badge[] = [
    {
      id: "b1", icon: "🥇", nom: "Premier produit",
      description: "Créer votre premier produit",
      debloque: productCount >= 1,
      date: productCount >= 1 ? "Badge débloqué" : undefined,
    },
    {
      id: "b2", icon: "🏆", nom: "100 scans",
      description: "Atteindre 100 scans totaux",
      debloque: scans >= 100,
      progression: scans >= 100 ? undefined : Math.min(100, Math.round((scans / 100) * 100)),
    },
    {
      id: "b3", icon: "🚀", nom: "Early adopter",
      description: "Parmi les 100 premiers inscrits",
      debloque: false, // unknown without global rank — default to locked
      progression: 50,
    },
    {
      id: "b4", icon: "⭐", nom: "Top fabricant",
      description: "Être dans le top 10 des fabricants",
      debloque: false,
      progression: 40,
    },
    {
      id: "b5", icon: "🎯", nom: "Traçabilité parfaite",
      description: "Créer 10 lots sans erreur",
      debloque: lotCount >= 10,
      progression: lotCount >= 10 ? undefined : Math.min(100, Math.round((lotCount / 10) * 100)),
    },
    {
      id: "b6", icon: "💎", nom: "Score parfait",
      description: "Atteindre un score de transparence de 100/100",
      debloque: false,
      progression: 80,
    },
    {
      id: "b7", icon: "🔥", nom: "10 QR codes",
      description: "Générer 10 QR codes",
      debloque: qrCount >= 10,
      progression: qrCount >= 10 ? undefined : Math.min(100, Math.round((qrCount / 10) * 100)),
    },
    {
      id: "b8", icon: "🌍", nom: "Export international",
      description: "Vendre dans 3 pays différents",
      debloque: false,
      progression: 33,
    },
  ];
  return badges;
}

// ---------------------------------------------------------------------------
// Abonnement — synthesized from real usage + plan defaults
// ---------------------------------------------------------------------------

export async function getFabricantAbonnement(userId: string): Promise<FabricantAbonnement> {
  const [productCount, qrCount] = await Promise.all([
    db.product.count({ where: { fabricantId: userId } }),
    db.qRCode.count({ where: { fabricantId: userId } }),
  ]);

  const plan = "Pro";
  const quotaTotal = 5000;
  const now = new Date();
  const dateDebut = new Date(now);
  dateDebut.setDate(dateDebut.getDate() - 30);
  const prochaineFacturation = new Date(now);
  prochaineFacturation.setDate(prochaineFacturation.getDate() + 30);

  return {
    plan,
    prix: 25000,
    prixAnnuel: 252000,
    status: "Actif",
    dateDebut: dateDebut.toLocaleDateString("fr-FR"),
    prochaineFacturation: prochaineFacturation.toLocaleDateString("fr-FR"),
    methodePaiement: "Orange Money",
    numeroPaiement: "—",
    quota: {
      produits: { utilise: productCount, limite: Number.MAX_SAFE_INTEGER, label: "Illimité" },
      qrCodes: {
        utilise: qrCount,
        limite: quotaTotal,
        label: `${Math.min(100, Math.round((qrCount / quotaTotal) * 100))}% du quota utilisé`,
      },
      statistiques: { utilise: Number.MAX_SAFE_INTEGER, limite: Number.MAX_SAFE_INTEGER, label: "Illimité" },
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
}

// ---------------------------------------------------------------------------
// Convenience: fetch everything in parallel (used by /dashboard)
// ---------------------------------------------------------------------------

export async function getFabricantData(userId: string) {
  const [profile, products, lots, qrCodes, stats, score, abonnement, classement, badges] = await Promise.all([
    getFabricantProfile(userId),
    getFabricantProducts(userId),
    getFabricantLots(userId),
    getFabricantQRCodes(userId),
    getFabricantStats(userId),
    getFabricantScore(userId),
    getFabricantAbonnement(userId),
    getFabricantClassement(userId),
    getFabricantBadges(userId),
  ]);

  return { profile, products, lots, qrCodes, stats, score, abonnement, classement, badges };
}

// Re-export the parseJsonArray helper for callers that need it
export { parseJsonArray };
