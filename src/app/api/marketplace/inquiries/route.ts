import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  createInquiry,
  getFabricantInquiries,
} from "@/lib/marketplace";

export const runtime = "nodejs";

/**
 * GET /api/marketplace/inquiries
 *
 * AUTH required — lists inquiries received by the authenticated fabricant.
 *
 * Query params:
 *   status — "pending" | "responded" | "accepted" | "declined"
 *   page   — 1-based (default 1)
 *   limit  — page size (default 20, max 100)
 *
 * Response: { inquiries, total, page, totalPages }
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const sp = request.nextUrl.searchParams;
    const status = sp.get("status") || undefined;
    const page = parseInt(sp.get("page") || "1", 10) || 1;
    const limit = parseInt(sp.get("limit") || "20", 10) || 20;

    const result = await getFabricantInquiries(session.user.id, {
      status: status || undefined,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/marketplace/inquiries] Error:", error);
    return NextResponse.json(
      { error: "Échec du chargement des demandes de devis" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/marketplace/inquiries
 *
 * PUBLIC (no auth) — B2B lead capture. Distributeurs can send inquiries from
 * the public catalog without an account.
 * Rate-limited per IP (100/min, namespace "marketplace:inquiry").
 *
 * Body:
 *   productId         — required
 *   requesterName     — required
 *   requesterEmail    — required
 *   message           — required
 *   requesterCompany? — string
 *   requesterPhone?   — string
 *   requesterCountry? — string
 *   requesterCity?    — string
 *   quantity?         — number
 *   targetPrice?      — string ("500 FCFA/unité")
 *   deliveryDelay?    — string
 *
 * Returns 201 with the created inquiry.
 */
export async function POST(request: NextRequest) {
  // Rate limit (public — IP-keyed).
  const limited = applyRateLimit(request, {
    ...RATE_LIMITS.DEFAULT,
    key: "",
    namespace: "marketplace:inquiry",
  });
  if (limited) return limited;

  try {
    const body = await request.json();

    // Required-field validation (return 400 with a clear French message).
    if (typeof body.productId !== "string" || !body.productId.trim()) {
      return NextResponse.json(
        { error: "Produit requis" },
        { status: 400 },
      );
    }
    if (typeof body.requesterName !== "string" || !body.requesterName.trim()) {
      return NextResponse.json(
        { error: "Votre nom est requis" },
        { status: 400 },
      );
    }
    if (
      typeof body.requesterEmail !== "string" ||
      !/^\S+@\S+\.\S+$/.test(body.requesterEmail.trim())
    ) {
      return NextResponse.json(
        { error: "Email valide requis" },
        { status: 400 },
      );
    }
    if (typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json(
        { error: "Message requis" },
        { status: 400 },
      );
    }

    const inquiry = await createInquiry({
      productId: body.productId.trim(),
      requesterName: body.requesterName,
      requesterCompany: body.requesterCompany,
      requesterEmail: body.requesterEmail,
      requesterPhone: body.requesterPhone,
      requesterCountry: body.requesterCountry,
      requesterCity: body.requesterCity,
      message: body.message,
      quantity:
        typeof body.quantity === "number" && Number.isFinite(body.quantity)
          ? Math.max(0, Math.floor(body.quantity))
          : null,
      targetPrice: body.targetPrice,
      deliveryDelay: body.deliveryDelay,
    });

    return NextResponse.json({ inquiry }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Produit introuvable") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    console.error("[POST /api/marketplace/inquiries] Error:", error);
    return NextResponse.json(
      { error: "Échec de l'envoi de la demande de devis" },
      { status: 500 },
    );
  }
}
