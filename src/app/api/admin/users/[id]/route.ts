import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getAdminUserDetail } from "@/lib/admin-server-data";

/**
 * GET /api/admin/users/[id]
 * SuperAdmin-only — returns the full detail of a single fabricant.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const user = await getAdminUserDetail(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("[GET /api/admin/users/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — update user (suspend, verify, change role, change status)
// ---------------------------------------------------------------------------

const PatchSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING"]).optional(),
  role: z.enum(["FABRICANT", "SUPERADMIN"]).optional(),
  isVerified: z.boolean().optional(),
  plan: z.enum(["Starter", "Pro", "Enterprise", "Essai"]).optional(), // not stored on User; ignored for now
  name: z.string().min(2).max(80).optional(),
  companyName: z.string().min(2).max(120).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(255).optional(),
});

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

  // Build the DB patch (skip `plan` — not stored on User)
  const patch: Record<string, unknown> = {};
  if (data.status) patch.status = data.status;
  if (data.role) patch.role = data.role;
  if (data.isVerified !== undefined) {
    patch.isVerified = data.isVerified;
    patch.verifiedAt = data.isVerified ? new Date() : null;
  }
  if (data.name) patch.name = data.name;
  if (data.companyName) patch.companyName = data.companyName;
  if (data.phone !== undefined) patch.phone = data.phone || null;
  if (data.address !== undefined) patch.address = data.address || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await db.user.update({
      where: { id },
      data: patch,
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        role: true,
        status: true,
        isVerified: true,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user?.id ?? null,
        action: data.status === "SUSPENDED" ? "SUSPEND_USER" : "UPDATE_USER",
        entity: "User",
        entityId: id,
        metadata: JSON.stringify(patch),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/admin/users/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — soft delete via SUSPENDED status (we never hard-delete fabricants
// because of foreign-key integrity: scans, lots, products reference them)
// ---------------------------------------------------------------------------

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
    const updated = await db.user.update({
      where: { id },
      data: { status: "SUSPENDED" },
    });

    await db.auditLog.create({
      data: {
        userId: session.user?.id ?? null,
        action: "SUSPEND_USER",
        entity: "User",
        entityId: id,
        metadata: JSON.stringify({ softDelete: true }),
      },
    });

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (error) {
    console.error("[DELETE /api/admin/users/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
