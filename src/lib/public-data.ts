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
  // Try by id first, then by reference, then by lotNumber
  let lot = await db.lot.findUnique({ where: { id: lotId } });
  if (!lot) {
    lot = await db.lot.findUnique({ where: { reference: lotId } });
  }
  if (!lot) {
    lot = await db.product
      // @ts-expect-error lotNumber is optional
      ? null
      : null;
    lot = await db.lot.findFirst({ where: { lotNumber: lotId } });
  }

  if (!lot) return null;

  const [product, fabricant, historyEvents, lotCerts, fabricantCerts, reviews, qrCodes] =
    await Promise.all([
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

  if (!product || !fabricant) return null;

  // Calculate transparency score
  const transparency: TransparencyResult = calculateTransparencyScore({
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

  // Count total scans
  const scanCount = await db.scan.count({ where: { lotId: lot.id } });

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

export type CatalogFilters = {
  category?: string; // category slug
  search?: string;
  sort?: "recent" | "popular" | "transparency" | "name" | "rating";
  page?: number;
  limit?: number;
};

export async function getAllProducts(filters: CatalogFilters = {}) {
  const {
    category,
    search,
    sort = "recent",
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
  } = {
    isPublic: true,
    status: "ACTIVE",
  };

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
