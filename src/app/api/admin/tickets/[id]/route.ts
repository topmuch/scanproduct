import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";

/**
 * GET /api/admin/tickets/[id]
 * SuperAdmin-only — fetches a single ticket (by its human-readable reference).
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
    const ticket = await db.ticket.findUnique({
      where: { reference: id },
      include: {
        user: {
          select: { id: true, name: true, companyName: true, email: true },
        },
      },
    });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }
    return NextResponse.json(ticket);
  } catch (error) {
    console.error("[GET /api/admin/tickets/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — update ticket status / priority / assignment
// ---------------------------------------------------------------------------

const PatchSchema = z.object({
  status: z.enum(["Ouvert", "En cours", "En attente", "Résolu", "Fermé"]).optional(),
  priority: z.enum(["Basse", "Normale", "Haute", "Urgente"]).optional(),
  assignedTo: z.string().max(80).nullable().optional(),
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

  const patch: Record<string, unknown> = {};
  if (data.status) patch.status = data.status;
  if (data.priority) patch.priority = data.priority;
  if (data.assignedTo !== undefined) patch.assignedTo = data.assignedTo;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await db.ticket.update({
      where: { reference: id },
      data: patch,
    });

    await db.auditLog.create({
      data: {
        userId: session.user?.id ?? null,
        action: "UPDATE_TICKET",
        entity: "Ticket",
        entityId: updated.id,
        metadata: JSON.stringify(patch),
      },
    });

    return NextResponse.json({
      id: updated.reference,
      status: updated.status,
      priority: updated.priority,
      assignedTo: updated.assignedTo,
    });
  } catch (error) {
    console.error("[PATCH /api/admin/tickets/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
