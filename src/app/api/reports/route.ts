import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

/**
 * POST /api/reports
 *
 * Public endpoint — used by consumers scanning a product QR code to report
 * an issue with a product (expired on shelf, damaged packaging, suspected
 * counterfeit, quality issue...).
 *
 * Body:
 *   lotId         string (required)
 *   productName   string (required, for context in the ticket subject)
 *   fabricantId   string (required, to notify the right fabricant)
 *   lotReference  string (optional, for the ticket subject)
 *   reason        string (required, one of REPORT_REASONS)
 *   description   string (optional, max 1000 chars)
 *   contactEmail  string (optional, max 200 chars)
 *
 * Implementation: creates a Ticket with category="Signalement" and
 * priority based on the reason (expired_on_shelf → "Haute", others → "Normale").
 * Also creates a Notification for the fabricant so they can act on it.
 *
 * Returns the ticket reference (e.g. "SGN-2026-0042") so the consumer can
 * track it if they want to follow up.
 */
const ReportSchema = z.object({
  lotId: z.string().min(1),
  productName: z.string().min(1).max(200),
  fabricantId: z.string().min(1),
  lotReference: z.string().max(100).optional(),
  reason: z.enum([
    "expired_on_shelf",
    "damaged_packaging",
    "suspicious_counterfeit",
    "quality_issue",
    "other",
  ]),
  description: z.string().max(1000).optional(),
  contactEmail: z.string().email().max(200).optional(),
});

const REASON_LABELS: Record<string, string> = {
  expired_on_shelf: "Produit périmé en rayon",
  damaged_packaging: "Emballage endommagé",
  suspicious_counterfeit: "Suspicion de contrefaçon",
  quality_issue: "Problème de qualité",
  other: "Autre",
};

function generateTicketReference(prefix: string): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000 + 1000); // 4 digits
  return `${prefix}-${year}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      lotId,
      productName,
      fabricantId,
      lotReference,
      reason,
      description,
      contactEmail,
    } = parsed.data;

    // Verify the lot exists (and belongs to the claimed fabricant)
    const lot = await db.lot.findUnique({
      where: { id: lotId },
      select: {
        id: true,
        reference: true,
        fabricantId: true,
        productId: true,
        expiryDate: true,
      },
    });
    if (!lot) {
      return NextResponse.json({ error: "Lot introuvable" }, { status: 404 });
    }

    // Capture client info (for anti-spam / audit)
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? null;
    const ua = request.headers.get("user-agent") ?? null;

    // Generate a unique reference (SGN = SiGnalemeNt)
    const reference = generateTicketReference("SGN");

    // Priority: expired on shelf + counterfeit are "Haute", others "Normale"
    const priority = reason === "expired_on_shelf" || reason === "suspicious_counterfeit"
      ? "Haute"
      : "Normale";

    // Build a human-readable subject + description
    const reasonLabel = REASON_LABELS[reason] || reason;
    const subject = `Signalement: ${reasonLabel} — ${productName}`;
    const fullDescription = [
      `Produit: ${productName}`,
      lotReference ? `Lot: ${lotReference}` : `Lot ID: ${lotId}`,
      lot.expiryDate ? `Date de péremption: ${new Date(lot.expiryDate).toLocaleDateString("fr-FR")}` : null,
      `Motif: ${reasonLabel}`,
      description ? `\nDétails du consommateur:\n${description}` : null,
      contactEmail ? `\nContact: ${contactEmail}` : null,
    ].filter(Boolean).join("\n");

    // Create a Ticket with category="Signalement"
    const ticket = await db.ticket.create({
      data: {
        reference,
        subject,
        description: fullDescription,
        status: "Ouvert",
        priority,
        category: "Signalement",
        requesterName: contactEmail || "Consommateur anonyme",
        tags: JSON.stringify([reason, "consumer_report"]),
        messages: JSON.stringify([
          {
            from: "client",
            author: contactEmail || "Consommateur",
            content: description || "(aucun détail fourni)",
            timestamp: new Date().toISOString(),
          },
        ]),
        // Store metadata for internal tracking
        internalNotes: JSON.stringify({
          lotId,
          productId: lot.productId,
          fabricantId,
          ipAddress: ip,
          userAgent: ua,
          reason,
        }),
      },
    });

    // Notify the fabricant (best-effort, don't fail the request if it errors)
    try {
      await db.notification.create({
        data: {
          userId: fabricantId,
          type: "ticket_update",
          title: `Signalement: ${reasonLabel}`,
          message: `Un consommateur a signalé un problème sur « ${productName} »${lotReference ? ` (lot ${lotReference})` : ""}. Référence: ${reference}`,
          data: JSON.stringify({
            ticketId: ticket.id,
            lotId,
            reason,
            reference,
          }),
          channels: JSON.stringify(["in_app"]),
          severity: priority === "Haute" ? "critical" : "warning",
        },
      });
    } catch (notifErr) {
      // Notification is best-effort — log but don't fail the report
      console.error("[POST /api/reports] Notification failed:", notifErr);
    }

    // Revalidate the scan page so any state change is reflected
    revalidatePath(`/p/${lotId}`);
    if (lot.reference) {
      revalidatePath(`/p/${lot.reference}`);
    }

    return NextResponse.json({
      success: true,
      reference: ticket.reference,
      ticketId: ticket.id,
    });
  } catch (error) {
    console.error("[POST /api/reports] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du signalement" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Utilisez POST pour envoyer un signalement" },
    { status: 405 },
  );
}
