import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";

/**
 * PATCH  /api/admin/contact-messages/[id] — change le statut d'un message
 *         (NEW → READ → ARCHIVED, retour arrière possible) ; les horodatages
 *         readAt / archivedAt sont tenus automatiquement.
 * DELETE /api/admin/contact-messages/[id] — suppression définitive.
 * SuperAdmin uniquement (403 sinon).
 */

const PatchSchema = z.object({
  status: z.enum(["NEW", "READ", "ARCHIVED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Statut invalide (NEW | READ | ARCHIVED)" }, { status: 400 });
  }

  try {
    const data: Record<string, unknown> = { status: parsed.data.status };
    if (parsed.data.status === "READ") data.readAt = new Date();
    if (parsed.data.status === "ARCHIVED") data.archivedAt = new Date();
    if (parsed.data.status === "NEW") {
      data.readAt = null;
      data.archivedAt = null;
    }

    const updated = await db.contactMessage.update({ where: { id }, data });
    return NextResponse.json({ message: updated });
  } catch (error) {
    console.error("[PATCH /api/admin/contact-messages/:id] Error:", error);
    return NextResponse.json({ error: "Message introuvable ou erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await db.contactMessage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/contact-messages/:id] Error:", error);
    return NextResponse.json({ error: "Message introuvable ou erreur serveur" }, { status: 500 });
  }
}
