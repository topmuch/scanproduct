import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getMarketplaceCatalog } from "@/lib/marketplace";

export const runtime = "nodejs";

/**
 * GET /api/marketplace/products
 *
 * PUBLIC endpoint (no auth required) — B2B catalog browsing.
 * Rate-limited per IP (100/min, namespace "marketplace:catalog").
 *
 * Query params:
 *   search      — free-text search on name / brand / description
 *   categoryId  — exact Category id
 *   fabricantId — restrict to one fabricant
 *   country     — fabricant country (contains)
 *   sort        — "popular" | "recent" | "rated"  (default: popular)
 *   page        — 1-based page number (default: 1)
 *   limit       — page size (default: 12, max: 50)
 *
 * Response: { products, total, page, totalPages }
 */
export async function GET(request: NextRequest) {
  // Rate limit (public — IP-keyed).
  const limited = applyRateLimit(request, {
    ...RATE_LIMITS.DEFAULT,
    key: "",
    namespace: "marketplace:catalog",
  });
  if (limited) return limited;

  try {
    const sp = request.nextUrl.searchParams;
    const search = sp.get("search") || undefined;
    const categoryId = sp.get("categoryId") || undefined;
    const fabricantId = sp.get("fabricantId") || undefined;
    const country = sp.get("country") || undefined;
    const sortRaw = sp.get("sort");
    const sort =
      sortRaw === "recent" || sortRaw === "rated" ? sortRaw : "popular";
    const page = parseInt(sp.get("page") || "1", 10) || 1;
    const limit = parseInt(sp.get("limit") || "12", 10) || 12;

    const result = await getMarketplaceCatalog({
      search,
      categoryId,
      fabricantId,
      country,
      sort,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/marketplace/products] Error:", error);
    return NextResponse.json(
      { error: "Échec du chargement du catalogue B2B" },
      { status: 500 },
    );
  }
}
