import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

/**
 * POST /api/reviews
 *
 * Public endpoint — used by consumers scanning a product QR code to leave
 * a review on the digital passport page (/p/[lotId]).
 *
 * Body:
 *   lotId       string (required)
 *   productId   string (optional — defaults to lot.productId)
 *   rating      number 1..5 (required)
 *   comment     string (optional, max 1000 chars)
 *   authorName  string (optional, max 100 chars)
 *
 * For MVP we auto-approve (`isApproved=true`) and mark as verified
 * (`isVerified=true`) because the review is posted from the scanned
 * product page. Anti-spam is kept basic: IP + User-Agent are logged,
 * comment is capped at 1000 chars, and the rate-limit middleware (if
 * wired at the gateway layer) handles flood protection.
 *
 * Side effects:
 *   - Inserts a Review row
 *   - Recomputes & updates Product.averageRating + Product.totalReviews
 *   - Calls revalidatePath(`/p/[lotId]`) and (`/p/[reference]`) so the
 *     newly-published review appears immediately on the passport page.
 */
const ReviewSchema = z.object({
  lotId: z.string().min(1),
  productId: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  authorName: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { lotId, productId, rating, comment, authorName } = parsed.data;

    // Vérifier que le lot existe
    const lot = await db.lot.findUnique({
      where: { id: lotId },
      select: { id: true, productId: true, fabricantId: true, reference: true },
    });
    if (!lot) {
      return NextResponse.json({ error: "Lot introuvable" }, { status: 404 });
    }

    // Récupérer infos client (IP + User-Agent pour anti-spam)
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? null;
    const ua = request.headers.get("user-agent") ?? null;

    // Créer l'avis — auto-approuvé pour MVP, marqué vérifié car posté
    // depuis la page scannée (le QR code prouve l'achat potentiel).
    const review = await db.review.create({
      data: {
        lotId,
        productId: productId ?? lot.productId,
        fabricantId: lot.fabricantId,
        rating,
        comment: comment?.trim() || null,
        authorName: authorName?.trim() || null,
        isApproved: true, // Auto-approve pour MVP
        isVerified: true, // Marqué vérifié car posté depuis page scannée
        ipAddress: ip,
        userAgent: ua,
        approvedAt: new Date(),
      },
    });

    // Mettre à jour les compteurs du produit (averageRating, totalReviews)
    const allReviews = await db.review.findMany({
      where: { productId: lot.productId, isApproved: true },
      select: { rating: true },
    });
    const totalReviews = allReviews.length;
    const averageRating =
      totalReviews > 0
        ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    await db.product.update({
      where: { id: lot.productId },
      data: {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
      },
    });

    // Revalider la page produit pour mise à jour immédiate
    revalidatePath(`/p/${lotId}`);
    if (lot.reference) {
      revalidatePath(`/p/${lot.reference}`);
    }

    return NextResponse.json({
      success: true,
      review: { id: review.id, rating: review.rating },
      stats: { totalReviews, averageRating: Math.round(averageRating * 10) / 10 },
    });
  } catch (error) {
    console.error("[POST /api/reviews] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la publication de l'avis" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Utilisez POST pour publier un avis" },
    { status: 405 },
  );
}
