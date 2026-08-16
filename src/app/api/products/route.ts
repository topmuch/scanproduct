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
 *
 * Body fields:
 *   name            string  (required, min 3 chars)
 *   brand           string?
 *   description     string?
 *   category        string? (legacy free-text — kept for backward compat)
 *   categoryId      string? (Category slug OR Category.id; if a slug, the
 *                            Category row is looked up so we can persist
 *                            the FK + the human-readable `category` name)
 *   imageUrl        string?
 *   weight          string?
 *   isPublic        boolean? (default true)
 *   status          "ACTIVE" | "ARCHIVED"?  (default "ACTIVE")
 *
 * V3 Phase 3 (dynamic categories + export + certifications):
 *   isExport        boolean?      (default false)
 *   categoryData    object?       (JSON-stringified before persisting to
 *                                  Product.categoryData — keyed by field name)
 *   exportData      object|null?  (JSON-stringified; null when isExport=false)
 *   certifications  array<{name, issuer, validUntil, fileUrl}>|null?
 *                                  (JSON-stringified)
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

    // ── Resolve categoryId ───────────────────────────────────────────
    // The caller may pass either a Category.id (cuid) or a Category.slug
    // (e.g. "fruits-legumes"). If a slug, look up the Category row so we
    // can persist both the FK (categoryId) and the human-readable name
    // (legacy `category` column, used by the existing dashboard UI).
    let resolvedCategoryId: string | null = null;
    let resolvedCategoryName: string | null = body.category || null;

    if (typeof body.categoryId === "string" && body.categoryId.trim()) {
      const raw = body.categoryId.trim();
      // Slugs contain letters/digits/hyphens only; cuid ids are 24+ chars
      // and start with "c" + alphanumeric. We attempt a slug lookup first
      // (cheap), falling back to an id lookup. If neither matches, we
      // still keep the legacy `category` string but don't set the FK
      // (avoids a Prisma FK violation on a stale id).
      const bySlug = await db.category.findUnique({ where: { slug: raw } });
      if (bySlug) {
        resolvedCategoryId = bySlug.id;
        resolvedCategoryName = bySlug.name;
      } else {
        const byId = await db.category.findUnique({ where: { id: raw } });
        if (byId) {
          resolvedCategoryId = byId.id;
          resolvedCategoryName = byId.name;
        }
      }
    }

    // ── Normalize V3 Phase 3 dynamic fields ──────────────────────────
    // SQLite doesn't support the Prisma `Json` type, so all structured
    // data is stored as JSON-encoded strings. Empty objects/arrays are
    // stored as null to keep the column sparse.
    const isExport = Boolean(body.isExport);
    const categoryData =
      body.categoryData && typeof body.categoryData === "object"
        ? JSON.stringify(body.categoryData)
        : null;
    const exportData =
      isExport && body.exportData && typeof body.exportData === "object"
        ? JSON.stringify(body.exportData)
        : null;
    const certifications =
      Array.isArray(body.certifications) && body.certifications.length > 0
        ? JSON.stringify(body.certifications)
        : null;

    // ── Open Food Facts: barcode + raw payload ──────────────────────
    // `barcode` is normalized to digits only. `offData` is the extracted OFF
    // object (or the raw payload) — stored as a JSON string for later
    // display on the public scan page (Nutri-Score, ingredients, etc.).
    const barcode =
      typeof body.barcode === "string" && body.barcode.trim()
        ? body.barcode.replace(/[\s-]/g, "")
        : null;
    const offData =
      body.offData && typeof body.offData === "object"
        ? JSON.stringify(body.offData)
        : null;
    const offLastSync = offData ? new Date() : null;

    // ── Pre-flight: barcode uniqueness check ────────────────────────
    // The `barcode` column has a @unique constraint (schema.prisma). Without
    // this pre-check, a duplicate barcode triggers a Prisma P2002 deep inside
    // `db.product.create`, which the generic catch block below would surface
    // as an opaque "Failed to create product" 500 — leaving the fabricant
    // with no idea why their product (often scanned from Open Food Facts)
    // won't save. We check up-front and return a 409 Conflict identifying
    // the conflicting product, so the UI can offer "Edit the existing
    // product" instead of silently failing.
    //
    // DEFENSIVE: if the `barcode` column doesn't exist yet in the DB
    // (Prisma P2021 "table does not exist" or P2022 "column does not
    // exist" — happens when the prod DB hasn't been migrated), the
    // findUnique throws. We catch it, log it, and skip the pre-flight
    // check. The create below will then throw the same P2022, which the
    // outer catch surfaces as a 500 with the Prisma code — at least
    // visible to ops instead of crashing the pre-flight silently.
    if (barcode) {
      try {
        const existing = await db.product.findUnique({
          where: { barcode },
          select: {
            id: true,
            name: true,
            brand: true,
            fabricantId: true,
          },
        });
        if (existing) {
          const isOwn = existing.fabricantId === user.id;
          return NextResponse.json(
            {
              error: isOwn
                ? `Ce code-barres (${barcode}) est déjà utilisé par votre produit « ${existing.name} ». Modifiez ce produit existant plutôt qu'en créer un nouveau.`
                : `Ce code-barres (${barcode}) est déjà utilisé par un autre produit (« ${existing.name} »${existing.brand ? ` — ${existing.brand}` : ""}). Chaque code-barres doit être unique sur la plateforme.`,
              code: "BARCODE_ALREADY_EXISTS",
              conflictProductId: existing.id,
              conflictProductName: existing.name,
              own: isOwn,
            },
            { status: 409 },
          );
        }
      } catch (preFlightError) {
        // P2021 = table missing, P2022 = column missing. The DB schema
        // hasn't been migrated — log and skip the check. The create will
        // fail with a clear P2022 in the outer catch.
        const preCode = (preFlightError as { code?: string })?.code;
        console.warn(
          `[POST /api/products] Pre-flight barcode check skipped (schema issue: ${preCode}). DB migration may be pending.`,
        );
      }
    }

    let product;
    try {
      product = await db.product.create({
        data: {
          name: body.name,
          brand: body.brand || user.companyName || null,
          description: body.description || null,
          category: resolvedCategoryName,
          categoryId: resolvedCategoryId,
          imageUrl: body.imageUrl || null,
          weight: body.weight || null,
          fabricantId: user.id,
          isPublic: body.isPublic ?? true,
          isFeatured: false,
          status: body.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
          // V3 Phase 3
          isExport,
          categoryData,
          exportData,
          certifications,
          // Open Food Facts
          barcode,
          offData,
          offLastSync,
        },
      });
    } catch (createError) {
      // Race-condition safety net: another request may have inserted the
      // same barcode between our pre-flight check and the create. Detect
      // Prisma's P2002 (unique constraint violation) and return the same
      // 409 the pre-flight would have returned.
      const code = (createError as { code?: string })?.code;
      if (code === "P2002") {
        return NextResponse.json(
          {
            error: `Ce code-barres (${barcode}) vient d'être enregistré par une autre requête. Veuillez réessayer ou utiliser un autre code-barres.`,
            code: "BARCODE_ALREADY_EXISTS",
          },
          { status: 409 },
        );
      }
      // Re-throw any other error so the outer catch handles it.
      throw createError;
    }

    // Audit log — record product creation
    db.auditLog
      .create({
        data: {
          userId: user.id,
          action: "CREATE_PRODUCT",
          entity: "Product",
          entityId: product.id,
          metadata: JSON.stringify({
            name: product.name,
            isExport,
            categoryId: resolvedCategoryId,
          }),
        },
      })
      .catch(() => undefined);

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products] Error:", error);
    // Surface the Prisma error code when available so the client (and the
    // developer reading dev.log) can act on it. Without this, every failure
    // looks identical ("Failed to create product") and diagnosis requires
    // reading server logs.
    const prismaCode = (error as { code?: string })?.code;
    // P2021 (table missing) / P2022 (column missing) = the prod DB hasn't
    // been migrated. Return a clear, actionable message so the fabricant
    // understands it's an infrastructure issue, not their fault. The
    // administrator needs to run `prisma db push` on the prod DB.
    if (prismaCode === "P2021" || prismaCode === "P2022") {
      return NextResponse.json(
        {
          error: "La base de données n'est pas à jour. L'administrateur doit exécuter la migration (prisma db push).",
          code: "SCHEMA_OUT_OF_DATE",
          prismaCode,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to create product",
        code: prismaCode || "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
