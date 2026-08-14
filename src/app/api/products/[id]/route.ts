import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

/**
 * PATCH /api/products/[id]
 * Auth-required (FABRICANT) — updates a product owned by the authenticated
 * user. Only the fields present in the body are updated.
 *
 * Body (all optional):
 *   name        — string
 *   brand       — string
 *   description — string
 *   category    — string (free-text)
 *   categoryId  — string (FK)
 *   imageUrl    — string
 *   weight      — string
 *   isPublic    — boolean
 *   status      — "ACTIVE" | "ARCHIVED"
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
    if (typeof body.categoryId === "string") patch.categoryId = body.categoryId || null;
    if (typeof body.imageUrl === "string") patch.imageUrl = body.imageUrl || null;
    if (typeof body.weight === "string") patch.weight = body.weight || null;
    if (typeof body.isPublic === "boolean") patch.isPublic = body.isPublic;
    if (body.status === "ACTIVE" || body.status === "ARCHIVED") patch.status = body.status;

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
