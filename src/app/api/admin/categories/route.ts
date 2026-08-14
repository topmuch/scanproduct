import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getAdminCategories } from "@/lib/admin-server-data";

/**
 * GET /api/admin/categories
 * SuperAdmin-only — returns all categories (active + inactive) with their
 * product counts.
 */
export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const categories = await getAdminCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("[GET /api/admin/categories] Error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — create a new category
// ---------------------------------------------------------------------------

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const CreateSchema = z.object({
  name: z.string().min(2).max(60),
  emoji: z.string().min(1).max(10),
  description: z.string().max(255).optional().default(""),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  try {
    const slug = slugify(data.name);
    const category = await db.category.create({
      data: {
        name: data.name,
        slug,
        emoji: data.emoji,
        description: data.description || null,
        order: data.order,
        isActive: data.isActive,
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user?.id ?? null,
        action: "CREATE_CATEGORY",
        entity: "Category",
        entityId: category.id,
        metadata: JSON.stringify({ name: category.name }),
      },
    });

    return NextResponse.json(
      {
        id: category.id,
        emoji: category.emoji ?? "📦",
        name: category.name,
        description: category.description ?? "",
        products: 0,
        order: category.order,
        active: category.isActive,
        color: "#3B82F6",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/categories] Error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
