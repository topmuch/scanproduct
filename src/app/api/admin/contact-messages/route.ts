import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";

/**
 * GET /api/admin/contact-messages — SuperAdmin uniquement.
 *
 * Liste les messages du formulaire de contact public, du plus récent au
 * plus ancien. Filtres : ?status=NEW|READ|ARCHIVED, ?q= (nom/email/message),
 * ?limit= (défaut 200), ?count=1 (réponse légère { newCount } pour le badge
 * de la barre latérale).
 */
export async function GET(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);

    // Mode « badge » : compteur des non lus uniquement (payload minimal).
    if (searchParams.get("count") === "1") {
      const newCount = await db.contactMessage.count({ where: { status: "NEW" } });
      return NextResponse.json({ newCount });
    }

    const status = searchParams.get("status");
    const q = searchParams.get("q")?.trim();
    const limitRaw = Number(searchParams.get("limit"));
    const limit = limitRaw > 0 && limitRaw <= 500 ? Math.floor(limitRaw) : 200;

    const where: Record<string, unknown> = {};
    if (status === "NEW" || status === "READ" || status === "ARCHIVED") {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { message: { contains: q } },
      ];
    }

    const [messages, newCount] = await Promise.all([
      db.contactMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.contactMessage.count({ where: { status: "NEW" } }),
    ]);

    return NextResponse.json({ messages, total: messages.length, newCount });
  } catch (error) {
    console.error("[GET /api/admin/contact-messages] Error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
