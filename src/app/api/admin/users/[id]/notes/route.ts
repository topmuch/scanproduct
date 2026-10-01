import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/admin/users/[id]/notes — ajoute une note interne SuperAdmin sur
// un fabricant. Stockage : AuditLog (action "NOTE_ADDED", entity "User",
// entityId, metadata JSON { content, author }) — zéro migration DB, ce qui
// fonctionne sur les vieilles bases de prod. L'affichage lit ces mêmes
// lignes (voir getAdminUserDetail dans lib/admin-server-data.ts).
// ---------------------------------------------------------------------------

const BodySchema = z.object({
  content: z.string().trim().min(1, "La note est vide.").max(2000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Note invalide." },
      { status: 400 },
    );
  }

  try {
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const author = session.user?.name || "SuperAdmin";
    const log = await db.auditLog.create({
      data: {
        userId: id,
        action: "NOTE_ADDED",
        entity: "User",
        entityId: id,
        metadata: JSON.stringify({ content: parsed.data.content, author }),
      },
    });

    return NextResponse.json({
      ok: true,
      note: {
        id: log.id,
        date: log.createdAt.toISOString(),
        author,
        content: parsed.data.content,
      },
    });
  } catch (error) {
    console.error("[POST /api/admin/users/[id]/notes] Error:", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer la note." },
      { status: 500 },
    );
  }
}
