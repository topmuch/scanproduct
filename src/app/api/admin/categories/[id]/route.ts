import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const PatchSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  emoji: z.string().min(1).max(10).optional(),
  description: z.string().max(255).optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

/**
 * PATCH /api/admin/categories/[id]
 * SuperAdmin-only — updates one or more fields on a category.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const patch: Record<string, unknown> = {};
  if (data.name) {
    patch.name = data.name;
    patch.slug = slugify(data.name);
  }
  if (data.emoji) patch.emoji = data.emoji;
  if (data.description !== undefined) patch.description = data.description || null;
  if (data.order !== undefined) patch.order = data.order;
  if (data.isActive !== undefined) patch.isActive = data.isActive;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await db.category.update({
      where: { id },
      data: patch,
    });

    await db.auditLog.create({
      data: {
        userId: session.user?.id ?? null,
        action: "UPDATE_CATEGORY",
        entity: "Category",
        entityId: id,
        metadata: JSON.stringify(patch),
      },
    });

    return NextResponse.json({
      id: updated.id,
      emoji: updated.emoji ?? "📦",
      name: updated.name,
      description: updated.description ?? "",
      order: updated.order,
      active: updated.isActive,
    });
  } catch (error) {
    console.error("[PATCH /api/admin/categories/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/categories/[id]
 * SuperAdmin-only — deletes a category only if it has no products.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Refuse deletion if the category still has products linked to it.
    const productCount = await db.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${productCount} product(s) are still linked` },
        { status: 409 }
      );
    }

    await db.category.delete({ where: { id } });

    await db.auditLog.create({
      data: {
        userId: session.user?.id ?? null,
        action: "DELETE_CATEGORY",
        entity: "Category",
        entityId: id,
      },
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("[DELETE /api/admin/categories/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
