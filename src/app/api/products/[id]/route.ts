import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

/**
 * PATCH /api/products/[id]
 * Auth-required (FABRICANT) — updates a product owned by the authenticated
 * user. Only the fields present in the body are updated.
 *
 * Body (all optional):
 *   name            — string
 *   brand           — string
 *   description     — string
 *   category        — string (free-text, legacy)
 *   categoryId      — string (FK; can be a Category slug OR Category.id —
 *                     resolved the same way as POST /api/products)
 *   imageUrl        — string
 *   weight          — string
 *   isPublic        — boolean
 *   status          — "ACTIVE" | "ARCHIVED"
 *
 * V3 Phase 3 (dynamic categories + export + certifications):
 *   isExport        — boolean
 *   categoryData    — object  (JSON-stringified; null/empty → null)
 *   exportData      — object  (JSON-stringified; null/empty → null)
 *   certifications  — array<{name, issuer, validUntil, fileUrl}>  (JSON-stringified)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Fetch the product and verify ownership in a single query.
    const product = await db.product.findUnique({
      where: { id },
      select: { fabricantId: true, name: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (product.fabricantId !== token.sub) {
      return NextResponse.json(
        { error: "You can only update your own products" },
        { status: 403 },
      );
    }

    // Build the patch — only allow known + present fields.
    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim().length >= 3) patch.name = body.name.trim();
    if (typeof body.brand === "string") patch.brand = body.brand.trim() || null;
    if (typeof body.description === "string") patch.description = body.description || null;
    if (typeof body.category === "string") patch.category = body.category || null;
    if (typeof body.imageUrl === "string") patch.imageUrl = body.imageUrl || null;
    if (typeof body.weight === "string") patch.weight = body.weight || null;
    if (typeof body.isPublic === "boolean") patch.isPublic = body.isPublic;
    if (body.status === "ACTIVE" || body.status === "ARCHIVED") patch.status = body.status;

    // ── V3 Phase 3: resolve categoryId (slug or id) ──────────────────
    // Same logic as POST — see that handler for the rationale.
    if (typeof body.categoryId === "string") {
      const raw = body.categoryId.trim();
      if (!raw) {
        // Explicit empty string → clear the FK + the legacy category name.
        patch.categoryId = null;
        if (!("category" in patch)) patch.category = null;
      } else {
        const bySlug = await db.category.findUnique({ where: { slug: raw } });
        if (bySlug) {
          patch.categoryId = bySlug.id;
          patch.category = bySlug.name;
        } else {
          const byId = await db.category.findUnique({ where: { id: raw } });
          if (byId) {
            patch.categoryId = byId.id;
            patch.category = byId.name;
          }
          // If neither matched, leave the FK untouched (caller's slug may
          // be from a not-yet-seeded category — they can still set the
          // free-text `category` field separately).
        }
      }
    }

    // ── V3 Phase 3: isExport + dynamic data ──────────────────────────
    if (typeof body.isExport === "boolean") {
      patch.isExport = body.isExport;
      // When the product is no longer for export, clear exportData so it
      // doesn't linger as stale JSON in the DB.
      if (!body.isExport) {
        patch.exportData = null;
      }
    }

    if (body.categoryData !== undefined) {
      patch.categoryData =
        body.categoryData && typeof body.categoryData === "object"
          ? JSON.stringify(body.categoryData)
          : null;
    }

    if (body.exportData !== undefined) {
      // Only persist exportData if the product is (or will be) for export.
      const willBeExport = body.isExport === true ||
        (body.isExport === undefined && patch.isExport === undefined) ||
        patch.isExport === true;
      if (willBeExport && body.exportData && typeof body.exportData === "object") {
        patch.exportData = JSON.stringify(body.exportData);
      } else if (body.exportData === null) {
        patch.exportData = null;
      }
    }

    if (body.certifications !== undefined) {
      patch.certifications =
        Array.isArray(body.certifications) && body.certifications.length > 0
          ? JSON.stringify(body.certifications)
          : null;
    }

    const updated = await db.product.update({
      where: { id },
      data: patch,
    });

    // Audit log
    db.auditLog
      .create({
        data: {
          userId: token.sub,
          action: "UPDATE_PRODUCT",
          entity: "Product",
          entityId: id,
          metadata: JSON.stringify({ fields: Object.keys(patch) }),
        },
      })
      .catch(() => undefined);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/products/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

/**
 * DELETE /api/products/[id]
 * Auth-required (FABRICANT) — archives a product owned by the authenticated
 * user. We don't hard-delete because the product may be referenced by scans,
 * reviews and historical lots — instead we mark it ARCHIVED + isPublic=false.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const product = await db.product.findUnique({
      where: { id },
      select: { fabricantId: true, name: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (product.fabricantId !== token.sub) {
      return NextResponse.json(
        { error: "You can only delete your own products" },
        { status: 403 },
      );
    }

    // Soft-delete: archive + hide from public catalog.
    await db.product.update({
      where: { id },
      data: { status: "ARCHIVED", isPublic: false },
    });

    db.auditLog
      .create({
        data: {
          userId: token.sub,
          action: "DELETE_PRODUCT",
          entity: "Product",
          entityId: id,
          metadata: JSON.stringify({ name: product.name }),
        },
      })
      .catch(() => undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/products/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
