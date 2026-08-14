/**
 * VerifScan — Public data layer
 *
 * Server-side functions that fetch lots and products for the public pages
 * (Product Digital Passport + Catalog).
 */
import { db } from "@/lib/db";
import { calculateTransparencyScore, type TransparencyResult } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LotWithDetails = NonNullable<Awaited<ReturnType<typeof getLotWithDetails>>>;

export type ProductWithRelations = NonNullable<Awaited<ReturnType<typeof getAllProducts>>>["products"][number];

// ---------------------------------------------------------------------------
// Lot detail (Digital Passport)
// ---------------------------------------------------------------------------

export async function getLotWithDetails(lotId: string) {
  // Try by id first, then by reference, then by lotNumber.
  // Each lookup is wrapped in try/catch so a single Prisma error doesn't
  // crash the whole page — we just fall through to the next strategy.
  let lot: Awaited<ReturnType<typeof db.lot.findUnique>> = null;
  try {
    lot = await db.lot.findUnique({ where: { id: lotId } });
  } catch (e) {
    console.error("[getLotWithDetails] findUnique by id failed:", e);
  }
  if (!lot) {
    try {
      lot = await db.lot.findUnique({ where: { reference: lotId } });
    } catch (e) {
      console.error("[getLotWithDetails] findUnique by reference failed:", e);
    }
  }
  if (!lot) {
    try {
      lot = await db.lot.findFirst({ where: { lotNumber: lotId } });
    } catch (e) {
      console.error("[getLotWithDetails] findFirst by lotNumber failed:", e);
    }
  }

  if (!lot) return null;

  // Fetch all related data in parallel. Use Promise.allSettled so that if one
  // query fails (e.g. a transient Prisma error), we still get the rest and
  // can render a partial page instead of crashing with a server exception.
  const settled = await Promise.allSettled([
    db.product.findUnique({ where: { id: lot.productId } }),
    db.user.findUnique({ where: { id: lot.fabricantId } }),
    db.lotHistory.findMany({
      where: { lotId: lot.id },
      orderBy: { date: "asc" },
    }),
    db.lotCertification.findMany({ where: { lotId: lot.id } }),
    db.certification.findMany({
      where: { fabricantId: lot.fabricantId, isActive: true },
    }),
    db.review.findMany({
      where: { lotId: lot.id, isApproved: true },
      orderBy: { createdAt: "desc" },
    }),
    db.qRCode.findMany({
      where: { lotId: lot.id, status: "ACTIVE" },
      take: 1,
    }),
  ]);

  // Helper to extract value or null from a settled promise
  const val = <T,>(r: PromiseSettledResult<T>): T | null =>
    r.status === "fulfilled" ? r.value : null;

  const product = val(settled[0]);
  const fabricant = val(settled[1]);
  const historyEvents = val(settled[2]) ?? [];
  const lotCerts = val(settled[3]) ?? [];
  const fabricantCerts = val(settled[4]) ?? [];
  const reviews = val(settled[5]) ?? [];
  const qrCodes = val(settled[6]) ?? [];

  // Log any rejected promises so we can debug, but don't crash the page.
  settled.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[getLotWithDetails] query ${i} rejected:`, r.reason);
    }
  });

  if (!product || !fabricant) return null;

  // Calculate transparency score (wrapped in try/catch — should never throw
  // but if it does we don't want to crash the whole page).
  let transparency: TransparencyResult;
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
      certifications: lotCerts,
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
    console.error("[getLotWithDetails] calculateTransparencyScore failed:", e);
    transparency = {
      score: 0,
      maxScore: 100,
      level: "bronze",
      percentage: 0,
      details: [],
      improvements: [],
    };
  }

  // Count total scans (non-blocking — default to 0 on error)
  let scanCount = 0;
  try {
    scanCount = await db.scan.count({ where: { lotId: lot.id } });
  } catch (e) {
    console.error("[getLotWithDetails] scan count failed:", e);
  }

  return {
    ...lot,
    product,
    fabricant,
    historyEvents,
    lotCerts,
    fabricantCerts,
    reviews,
    qrCode: qrCodes[0] ?? null,
    scanCount,
    transparency,
  };
}

// ---------------------------------------------------------------------------
// Catalog (all public products)
// ---------------------------------------------------------------------------

export type TransparencyLevel = "bronze" | "argent" | "or" | "platine";

export const TRANSPARENCY_RANGES: Record<TransparencyLevel, { min: number; max: number }> = {
  bronze: { min: 0, max: 40 },
  argent: { min: 41, max: 70 },
  or: { min: 71, max: 90 },
  platine: { min: 91, max: 100 },
};

export type CatalogFilters = {
  category?: string; // category slug
  search?: string;
  sort?: "recent" | "popular" | "transparency" | "name" | "rating";
  transparency?: TransparencyLevel | null; // min transparency level
  page?: number;
  limit?: number;
};

export async function getAllProducts(filters: CatalogFilters = {}) {
  const {
    category,
    search,
    sort = "recent",
    transparency = null,
    page = 1,
    limit = 12,
  } = filters;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: {
    isPublic: boolean;
    status: string;
    categoryId?: string;
    OR?: Array<Record<string, unknown>>;
    transparencyScore?: { gte?: number; lte?: number };
  } = {
    isPublic: true,
    status: "ACTIVE",
  };

  // Transparency level filter: show products with score >= level min.
  // (e.g. "or" → score >= 71). We use gte so higher-tier products also appear.
  if (transparency && TRANSPARENCY_RANGES[transparency]) {
    where.transparencyScore = { gte: TRANSPARENCY_RANGES[transparency].min };
  }

  // Resolve category slug to id
  if (category && category !== "all") {
    const cat = await db.category.findUnique({ where: { slug: category } });
    if (cat) {
      where.categoryId = cat.id;
    }
  }

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q } },
      { brand: { contains: q } },
      { description: { contains: q } },
    ];
  }

  // Build orderBy
  const orderBy: Record<string, "asc" | "desc"> = {};
  switch (sort) {
    case "popular":
      orderBy.totalScans = "desc";
      break;
    case "transparency":
      orderBy.transparencyScore = "desc";
      break;
    case "name":
      orderBy.name = "asc";
      break;
    case "rating":
      orderBy.averageRating = "desc";
      break;
    case "recent":
    default:
      orderBy.createdAt = "desc";
      break;
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        categoryRef: true,
        lots: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    db.product.count({ where }),
  ]);

  // Fetch fabricant for each product (can't use nested include easily with relation name)
  const fabricantIds = [...new Set(products.map((p) => p.fabricantId))];
  const fabricants = await db.user.findMany({
    where: { id: { in: fabricantIds } },
    select: {
      id: true,
      name: true,
      companyName: true,
      logoUrl: true,
      city: true,
      country: true,
      isVerified: true,
    },
  });
  const fabricantMap = new Map(fabricants.map((f) => [f.id, f]));

  // Enrich products
  const enriched = products.map((p) => {
    const fabricant = fabricantMap.get(p.fabricantId);
    const latestLot = p.lots[0] ?? null;
    return {
      ...p,
      fabricant,
      latestLot,
    };
  });

  return {
    products: enriched,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getActiveCategories() {
  return db.category.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });
}

/**
 * Categories with product count — for the visual category filter cards.
 */
export async function getCategoriesWithCounts() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: {
          products: {
            where: { isPublic: true, status: "ACTIVE" },
          },
        },
      },
    },
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    emoji: c.emoji ?? null,
    icon: c.icon ?? null,
    productCount: c._count.products,
  }));
}

/**
 * Catalog stats — total public products + total verified manufacturers.
 */
export async function getCatalogStats() {
  const [totalProducts, manufacturers] = await Promise.all([
    db.product.count({ where: { isPublic: true, status: "ACTIVE" } }),
    db.user.count({ where: { role: "FABRICANT", status: "ACTIVE" } }),
  ]);
  return { totalProducts, totalManufacturers: manufacturers };
}

// ---------------------------------------------------------------------------
// Similar products (same category, different id)
// ---------------------------------------------------------------------------

export async function getSimilarProducts(categoryId: string | null, currentProductId: string, limit = 4) {
  if (!categoryId) return [];
  const products = await db.product.findMany({
    where: {
      categoryId,
      isPublic: true,
      status: "ACTIVE",
      id: { not: currentProductId },
    },
    orderBy: { transparencyScore: "desc" },
    take: limit,
    include: {
      lots: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const fabricantIds = [...new Set(products.map((p) => p.fabricantId))];
  const fabricants = await db.user.findMany({
    where: { id: { in: fabricantIds } },
    select: {
      id: true,
      companyName: true,
      logoUrl: true,
    },
  });
  const fabricantMap = new Map(fabricants.map((f) => [f.id, f]));

  return products.map((p) => ({
    ...p,
    fabricant: fabricantMap.get(p.fabricantId),
    latestLot: p.lots[0] ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Bot/crawler detection — used to avoid inflating scan counters when a
// search-engine crawler or uptime monitor hits a lot passport URL.
// ---------------------------------------------------------------------------

const BOT_USER_AGENT_RE =
  /(bot|crawl|spider|slurp|baidu|bingbot|yandex|facebookexternalhit|twitterbot|linkedinbot|semrush|ahrefs|rogerbot|applebot|petalbot|duckduckbot|headless|lighthouse|wget|curl|python-requests|node-fetch|uptime|pingdom|googlestructureddata|google-hoteladsverifier|imagesift|archive\.org_bot|ia_archiver|seokicks|siteauditbot|dataparksearch|fast-webcrawler|convera|seekbot|gnam|postrank|netseer|nutch)/i;

/**
 * Returns true if the given User-Agent string looks like a bot/crawler.
 * Conservative: false positives only skip scan recording (no user-facing
 * impact). False negatives let a few bots through (acceptable).
 */
export function isBotUserAgent(userAgent: string): boolean {
  return BOT_USER_AGENT_RE.test(userAgent);
}

// ---------------------------------------------------------------------------
// Record a scan (called when a user opens /p/[lotId])
// ---------------------------------------------------------------------------

export async function recordScan(
  lotId: string,
  data: {
    country?: string;
    city?: string;
    deviceType?: string;
    os?: string;
    browser?: string;
    userAgent?: string;
    ipAddress?: string;
    qrCodeId?: string;
  } = {}
) {
  try {
    await Promise.all([
      db.scan.create({
        data: {
          lotId,
          ...data,
        },
      }),
      db.lot.update({
        where: { id: lotId },
        data: {
          totalScans: { increment: 1 },
          lastScannedAt: new Date(),
        },
      }),
      db.product.updateMany({
        where: {
          id: (await db.lot.findUnique({ where: { id: lotId }, select: { productId: true } }))
            ?.productId,
        },
        data: { totalScans: { increment: 1 } },
      }),
    ]);
  } catch (e) {
    // Don't fail the page load if scan recording fails
    console.error("Failed to record scan:", e);
  }
}
