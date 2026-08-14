import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getAdminTickets } from "@/lib/admin-server-data";
import type { Ticket } from "@/lib/admin-server-data";

/**
 * GET /api/admin/tickets
 * SuperAdmin-only — returns all support tickets, hydrated to the legacy
 * Ticket shape (with requester/company/avatar derived from the linked User).
 */
export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const tickets = await getAdminTickets();
    return NextResponse.json({ tickets, total: tickets.length });
  } catch (error) {
    console.error("[GET /api/admin/tickets] Error:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — create a new ticket (used by the CreateTicketModal in SupportPage)
// ---------------------------------------------------------------------------

const CreateTicketSchema = z.object({
  subject: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["Basse", "Normale", "Haute", "Urgente"]).default("Normale"),
  category: z.enum(["Technique", "Facturation", "Compte", "Autre"]).default("Technique"),
  requesterName: z.string().min(2).max(80).optional(),
  requesterCompany: z.string().min(2).max(120).optional(),
  userId: z.string().optional(),
});

function generateReference(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const suffix = String(Date.now()).slice(-4);
  return `TKT-${y}-${m}${d}-${suffix}`;
}

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

  const parsed = CreateTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  try {
    // Ensure reference is unique (collision retry loop)
    let reference = generateReference();
    for (let i = 0; i < 5; i++) {
      const existing = await db.ticket.findUnique({ where: { reference } });
      if (!existing) break;
      reference = generateReference();
    }

    const firstMessage = data.description
      ? [
          {
            from: "client" as const,
            author: data.requesterName ?? "Anonyme",
            content: data.description,
            timestamp: "À l'instant",
          },
        ]
      : [];

    const ticket = await db.ticket.create({
      data: {
        reference,
        subject: data.subject,
        description: data.description ?? null,
        priority: data.priority,
        category: data.category,
        status: "Ouvert",
        userId: data.userId ?? null,
        requesterName: data.requesterName ?? null,
        requesterCompany: data.requesterCompany ?? null,
        assignedTo: "Admin VerifScan",
        tags: JSON.stringify([]),
        messages: JSON.stringify(firstMessage),
        internalNotes: JSON.stringify([]),
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user?.id ?? null,
        action: "CREATE_TICKET",
        entity: "Ticket",
        entityId: ticket.id,
        metadata: JSON.stringify({ reference: ticket.reference }),
      },
    });

    // Hydrate to legacy Ticket shape so the client can directly store it
    const hydrated: Ticket = {
      id: ticket.reference,
      subject: ticket.subject,
      requester: ticket.requesterName ?? "Anonyme",
      company: ticket.requesterCompany ?? "—",
      avatarColor: "#2563EB",
      priority: ticket.priority as Ticket["priority"],
      status: ticket.status as Ticket["status"],
      assignedTo: ticket.assignedTo,
      createdAt: ticket.createdAt.toISOString(),
      lastReply: "À l'instant",
      category: ticket.category as Ticket["category"],
      plan: "Essai",
      tags: [],
      description: ticket.description ?? undefined,
      messages: firstMessage,
      internalNotes: [],
    };

    return NextResponse.json(hydrated, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/tickets] Error:", error);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
