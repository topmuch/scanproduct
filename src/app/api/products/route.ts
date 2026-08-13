import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAllProducts, type CatalogFilters } from "@/lib/public-data";
import { getToken } from "next-auth/jwt";

/**
 * GET /api/products
 * Public endpoint — returns paginated, filterable catalog of public products.
 *
 * Query params:
 *   category  — category slug (e.g. "cosmetiques")
 *   search    — search string (name, brand, description)
 *   sort      — "recent" | "popular" | "transparency" | "name" | "rating"
 *   page      — page number (default 1)
 *   limit     — items per page (default 12, max 50)
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const category = sp.get("category") || undefined;
  const search = sp.get("search") || undefined;
  const sort = (sp.get("sort") as CatalogFilters["sort"]) || "recent";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(sp.get("limit") || "12", 10)));

  try {
    const result = await getAllProducts({ category, search, sort, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/products] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Auth-required — creates a new product for the authenticated FABRICANT.
 */
export async function POST(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Basic validation
    if (!body.name || typeof body.name !== "string" || body.name.length < 3) {
      return NextResponse.json(
        { error: "Name is required (min 3 characters)" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: token.sub },
    });

    if (!user || user.role !== "FABRICANT") {
      return NextResponse.json(
        { error: "Only fabricants can create products" },
        { status: 403 }
      );
    }

    const product = await db.product.create({
      data: {
        name: body.name,
        brand: body.brand || user.companyName || null,
        description: body.description || null,
        category: body.category || null,
        categoryId: body.categoryId || null,
        imageUrl: body.imageUrl || null,
        weight: body.weight || null,
        fabricantId: user.id,
        isPublic: body.isPublic ?? true,
        isFeatured: false,
        status: "ACTIVE",
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products] Error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
