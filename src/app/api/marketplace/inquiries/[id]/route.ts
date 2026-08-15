import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getInquiryForFabricant,
  respondToInquiry,
} from "@/lib/marketplace";

export const runtime = "nodejs";

/**
 * GET /api/marketplace/inquiries/[id]
 *
 * AUTH required. Returns the inquiry with product details.
 * 404 if not found, 403 if the caller is not the receiving fabricant.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const inquiry = await getInquiryForFabricant(session.user.id, id);
    return NextResponse.json({ inquiry });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Introuvable") {
      return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    }
    if (msg === "Accès refusé") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    console.error("[GET /api/marketplace/inquiries/[id]] Error:", error);
    return NextResponse.json(
      { error: "Échec du chargement de la demande" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/marketplace/inquiries/[id]
 *
 * AUTH required. Updates the inquiry's response + status.
 *
 * Body:
 *   response — required (non-empty string)
 *   status   — "responded" | "accepted" | "declined"
 *
 * 404 if not found, 403 if not the receiving fabricant, 400 on invalid input.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    if (typeof body.response !== "string" || !body.response.trim()) {
      return NextResponse.json(
        { error: "Réponse requise" },
        { status: 400 },
      );
    }
    const newStatus = body.status;
    if (
      newStatus !== "responded" &&
      newStatus !== "accepted" &&
      newStatus !== "declined"
    ) {
      return NextResponse.json(
        { error: "Statut invalide" },
        { status: 400 },
      );
    }

    const updated = await respondToInquiry(
      session.user.id,
      id,
      body.response,
      newStatus,
    );

    return NextResponse.json({ inquiry: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Introuvable") {
      return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    }
    if (msg === "Accès refusé") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    console.error("[PATCH /api/marketplace/inquiries/[id]] Error:", error);
    return NextResponse.json(
      { error: "Échec de l'enregistrement de la réponse" },
      { status: 500 },
    );
  }
}
