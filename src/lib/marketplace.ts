// ============================================================================
// VerifScan — Marketplace B2B service library
// ============================================================================
// Pure server-side module. No React, no API routes.
//
// Responsibilities:
//   - Browse the public B2B catalog of VerifScan fabricant products.
//   - Create B2B inquiries (lead capture — no account required).
//   - List / respond to inquiries received by a fabricant.
//   - Suggest cross-promotion partnerships between fabricants.
//
// All functions are safe to call from API routes (Next.js route handlers) and
// throw on programmer errors (e.g. ownership mismatch). DB errors propagate
// to the caller — the API routes wrap them in try/catch + French error messages.
// ============================================================================

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  categoryId: string | null;
  weight: string | null;
  fabricantId: string;
  fabricantName: string;
  fabricantLogo: string | null;
  fabricantCity: string | null;
  fabricantCountry: string | null;
  totalScans: number;
  averageRating: number;
  isVerified: boolean;
}

export interface CatalogResult {
  products: CatalogProduct[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CatalogParams {
  search?: string;
  categoryId?: string;
  fabricantId?: string;
  country?: string;
  sort?: "popular" | "recent" | "rated";
  page?: number;
  limit?: number;
}

export interface CreateInquiryInput {
  productId: string;
  requesterName: string;
  requesterCompany?: string | null;
  requesterEmail: string;
  requesterPhone?: string | null;
  requesterCountry?: string | null;
  requesterCity?: string | null;
  message: string;
  quantity?: number | null;
  targetPrice?: string | null;
  deliveryDelay?: string | null;
}

export interface InquiryListParams {
  status?: string;
  page?: number;
  limit?: number;
}

export interface MarketplaceMatch {
  fabricantId: string;
  companyName: string;
  logoUrl: string | null;
  city: string | null;
  country: string | null;
  productCount: number;
  sharedCategories: string[];
}

// ---------------------------------------------------------------------------
// 1) Catalog browsing
// ---------------------------------------------------------------------------

/**
 * List public B2B products for the marketplace catalog.
 *
 * Filters:
 *   - search     → case-insensitive LIKE on name / brand / description
 *   - categoryId → exact match on Product.categoryId
 *   - fabricantId→ exact match on Product.fabricantId
 *   - country    → fabricant.country (case-insensitive)
 *
 * Sort:
 *   - popular → totalScans DESC (default)
 *   - recent  → createdAt DESC
 *   - rated   → averageRating DESC
 *
 * Pagination: page (1-based), limit (default 12, max 50).
 */
export async function getMarketplaceCatalog(
  params: CatalogParams = {},
): Promise<CatalogResult> {
  const {
    search,
    categoryId,
    fabricantId,
    country,
    sort = "popular",
    page: pageRaw = 1,
    limit: limitRaw = 12,
  } = params;

  const page = Math.max(1, Math.floor(pageRaw));
  const limit = Math.min(50, Math.max(1, Math.floor(limitRaw)));

  // Build the where clause. Prisma `mode: "insensitive"` is not supported on
  // SQLite, but Prisma still accepts it (it's a no-op there). To stay safe
  // and portable we use `contains` without `mode` on SQLite.
  const where: Record<string, unknown> = {
    isPublic: true,
    status: "ACTIVE",
  };

  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q } },
      { brand: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (fabricantId) where.fabricantId = fabricantId;
  if (country && country.trim()) {
    where.fabricant = { country: { contains: country.trim() } };
  }

  const orderBy: Record<string, "asc" | "desc"> =
    sort === "recent"
      ? { createdAt: "desc" }
      : sort === "rated"
        ? { averageRating: "desc" }
        : { totalScans: "desc" };

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        fabricant: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            city: true,
            country: true,
            isVerified: true,
          },
        },
        categoryRef: { select: { name: true } },
      },
    }),
  ]);

  const products: CatalogProduct[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    description: p.description,
    imageUrl: p.imageUrl,
    category: p.categoryRef?.name ?? p.category ?? null,
    categoryId: p.categoryId,
    weight: p.weight,
    fabricantId: p.fabricantId,
    fabricantName: p.fabricant.companyName ?? p.fabricant.id,
    fabricantLogo: p.fabricant.logoUrl,
    fabricantCity: p.fabricant.city,
    fabricantCountry: p.fabricant.country,
    totalScans: p.totalScans,
    averageRating: p.averageRating,
    isVerified: p.fabricant.isVerified,
  }));

  return {
    products,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

// ---------------------------------------------------------------------------
// 2) Inquiry creation (B2B lead capture — no account required)
// ---------------------------------------------------------------------------

/**
 * Create a new MarketplaceInquiry and notify the fabricant.
 *
 * The product lookup is intentional: it gives us the fabricantId and product
 * name in one query, and validates that the product exists.
 *
 * The notification fan-out is fire-and-forget — it must never block or fail
 * the inquiry creation. A failed notification just means the fabricant will
 * see the inquiry in their dashboard on next visit instead of getting an
 * in-app alert right away.
 */
export async function createInquiry(data: CreateInquiryInput) {
  const product = await db.product.findUnique({
    where: { id: data.productId },
    select: { id: true, name: true, fabricantId: true },
  });
  if (!product) {
    throw new Error("Produit introuvable");
  }

  const inquiry = await db.marketplaceInquiry.create({
    data: {
      productId: product.id,
      fabricantId: product.fabricantId,
      requesterName: data.requesterName.trim(),
      requesterCompany: data.requesterCompany?.trim() || null,
      requesterEmail: data.requesterEmail.trim(),
      requesterPhone: data.requesterPhone?.trim() || null,
      requesterCountry: data.requesterCountry?.trim() || null,
      requesterCity: data.requesterCity?.trim() || null,
      message: data.message.trim(),
      quantity: typeof data.quantity === "number" ? data.quantity : null,
      targetPrice: data.targetPrice?.trim() || null,
      deliveryDelay: data.deliveryDelay?.trim() || null,
    },
  });

  // Fire-and-forget notification. `.catch(() => undefined)` ensures any
  // failure is swallowed — the inquiry itself is already saved.
  createNotification({
    userId: product.fabricantId,
    type: "system",
    title: "Nouvelle demande de devis",
    message: `${data.requesterName} demande un devis pour ${product.name}`,
    severity: "info",
    data: { inquiryId: inquiry.id, productId: product.id },
  }).catch(() => undefined);

  return inquiry;
}

// ---------------------------------------------------------------------------
// 3) Fabricant's received inquiries
// ---------------------------------------------------------------------------

/**
 * List inquiries received by a fabricant, newest first, paginated.
 *
 * The `status` filter accepts any of: "pending" | "responded" | "accepted" |
 * "declined" (anything else is ignored → returns all statuses).
 */
export async function getFabricantInquiries(
  fabricantId: string,
  params: InquiryListParams = {},
) {
  const { status, page: pageRaw = 1, limit: limitRaw = 20 } = params;
  const page = Math.max(1, Math.floor(pageRaw));
  const limit = Math.min(100, Math.max(1, Math.floor(limitRaw)));

  const where: Record<string, unknown> = { fabricantId };
  if (
    status &&
    ["pending", "responded", "accepted", "declined"].includes(status)
  ) {
    where.status = status;
  }

  const [total, inquiries] = await Promise.all([
    db.marketplaceInquiry.count({ where }),
    db.marketplaceInquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            imageUrl: true,
            categoryRef: { select: { name: true } },
            category: true,
          },
        },
      },
    }),
  ]);

  return {
    inquiries,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

// ---------------------------------------------------------------------------
// 4) Single inquiry (with ownership check)
// ---------------------------------------------------------------------------

/**
 * Fetch a single inquiry with product details.
 *
 * Throws "Introuvable" if not found, "Accès refusé" if the caller is not the
 * fabricant who received the inquiry. API routes translate these to 404 / 403.
 */
export async function getInquiryForFabricant(
  fabricantId: string,
  inquiryId: string,
) {
  const inquiry = await db.marketplaceInquiry.findUnique({
    where: { id: inquiryId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
          imageUrl: true,
          weight: true,
          categoryRef: { select: { name: true } },
          category: true,
        },
      },
    },
  });

  if (!inquiry) throw new Error("Introuvable");
  if (inquiry.fabricantId !== fabricantId) throw new Error("Accès refusé");
  return inquiry;
}

/**
 * Respond to an inquiry. Verifies ownership (throws on mismatch).
 *
 * `newStatus` must be one of "responded" | "accepted" | "declined".
 * Sets `response` + `respondedAt` (only on first response).
 */
export async function respondToInquiry(
  fabricantId: string,
  inquiryId: string,
  response: string,
  newStatus: "responded" | "accepted" | "declined",
) {
  const existing = await db.marketplaceInquiry.findUnique({
    where: { id: inquiryId },
    select: { id: true, fabricantId: true, respondedAt: true },
  });
  if (!existing) throw new Error("Introuvable");
  if (existing.fabricantId !== fabricantId) throw new Error("Accès refusé");

  return db.marketplaceInquiry.update({
    where: { id: inquiryId },
    data: {
      response: response.trim(),
      status: newStatus,
      respondedAt: existing.respondedAt ?? new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// 5) Suggested partnerships
// ---------------------------------------------------------------------------

/**
 * Suggest up to 5 other FABRICANT users for cross-promotion partnerships.
 *
 * Heuristic (kept intentionally simple — this is a v1 discovery feature):
 *   1. Look up the caller's own products to compute their main category.
 *   2. Find other FABRICANT users who have at least one ACTIVE public product.
 *   3. Group by fabricant, count products, collect their category names.
 *   4. Sort by product count (desc), exclude the caller, take top 5.
 *   5. `sharedCategories` = categories the partner shares with the caller
 *      (different-main-category is encouraged by the sort order, but we
 *      still surface the shared ones so the UI can show common ground).
 */
export async function getMarketplaceMatches(
  fabricantId: string,
): Promise<MarketplaceMatch[]> {
  // 1) Caller's own categories
  const ownProducts = await db.product.findMany({
    where: { fabricantId },
    select: { categoryRef: { select: { name: true } }, category: true },
  });
  const ownCategories = new Set<string>();
  for (const p of ownProducts) {
    const name = p.categoryRef?.name ?? p.category;
    if (name) ownCategories.add(name);
  }

  // 2) Other fabricants + their products
  const otherFabricantIds = await db.user.findMany({
    where: {
      role: "FABRICANT",
      id: { not: fabricantId },
      status: "ACTIVE",
      products: { some: { isPublic: true, status: "ACTIVE" } },
    },
    select: {
      id: true,
      companyName: true,
      logoUrl: true,
      city: true,
      country: true,
      products: {
        where: { isPublic: true, status: "ACTIVE" },
        select: { categoryRef: { select: { name: true } }, category: true },
      },
    },
  });

  // 3) Group + score
  const matches: MarketplaceMatch[] = otherFabricantIds.map((u) => {
    const partnerCategories = new Set<string>();
    for (const p of u.products) {
      const name = p.categoryRef?.name ?? p.category;
      if (name) partnerCategories.add(name);
    }
    const shared = [...partnerCategories].filter((c) => ownCategories.has(c));
    return {
      fabricantId: u.id,
      companyName: u.companyName ?? "Fabricant",
      logoUrl: u.logoUrl,
      city: u.city,
      country: u.country,
      productCount: u.products.length,
      sharedCategories: shared,
    };
  });

  // 4) Sort by product count desc, then by most shared categories (so we
  //    surface both "biggest catalog" and "most related"). Take top 5.
  matches.sort((a, b) => {
    if (b.productCount !== a.productCount) return b.productCount - a.productCount;
    return b.sharedCategories.length - a.sharedCategories.length;
  });
  return matches.slice(0, 5);
}
