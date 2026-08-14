import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

/**
 * POST /api/lots
 * Auth-required (FABRICANT) — creates a new lot for the authenticated user.
 *
 * Body:
 *   productId             — string (required, must belong to the fabricant)
 *   lotNumber             — string (optional, falls back to auto reference)
 *   manufactureDate       — ISO date string
 *   expiryDate            — ISO date string
 *   ingredients           — string
 *   weight                — string
 *   manufacturingLocation — string
 *   transformationLocation — string
 *   salesCountries        — string[] (JSON-encoded into the Lot.salesCountries column)
 *   quantity              — number (lot size, default 1)
 */
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body.productId || typeof body.productId !== "string") {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    // Verify the product belongs to the fabricant.
    // NOTE: `id` MUST be in the select — we use `product.id` below when
    // creating the lot. A previous version omitted it, which made
    // `product.id` undefined → `productId: undefined` in db.lot.create →
    // PrismaClientValidationError → HTTP 500 → the frontend's post-create
    // refresh() crashed with "Application error: a client-side exception".
    const product = await db.product.findUnique({
      where: { id: body.productId },
      select: { id: true, fabricantId: true, name: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (product.fabricantId !== token.sub) {
      return NextResponse.json(
        { error: "You can only create lots for your own products" },
        { status: 403 },
      );
    }

    // Generate a unique reference (used as the public scan URL slug if
    // lotNumber is not provided). Format: LOT-<timestamp>-<random>
    const reference = `LOT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const lotNumber = typeof body.lotNumber === "string" && body.lotNumber.trim()
      ? body.lotNumber.trim()
      : reference;

    // Serialize salesCountries as JSON (SQLite doesn't support arrays).
    const salesCountries = Array.isArray(body.salesCountries)
      ? JSON.stringify(body.salesCountries.filter((c: unknown) => typeof c === "string"))
      : null;

    const lot = await db.lot.create({
      data: {
        reference,
        lotNumber,
        productId: product.id,
        fabricantId: token.sub,
        quantity: Math.max(1, parseInt(body.quantity, 10) || 1),
        manufactureDate: body.manufactureDate ? new Date(body.manufactureDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        ingredients: typeof body.ingredients === "string" ? body.ingredients || null : null,
        weight: typeof body.weight === "string" ? body.weight || null : null,
        manufacturingLocation: typeof body.manufacturingLocation === "string" ? body.manufacturingLocation || null : null,
        transformationLocation: typeof body.transformationLocation === "string" ? body.transformationLocation || null : null,
        salesCountries,
        status: "ACTIVE",
      },
    });

    // Initial lot history event — "fabrication"
    db.lotHistory
      .create({
        data: {
          lotId: lot.id,
          type: "fabrication",
          title: "Lot créé",
          description: `Lot ${lotNumber} créé par le fabricant`,
          date: new Date(),
        },
      })
      .catch(() => undefined);

    // Audit log
    db.auditLog
      .create({
        data: {
          userId: token.sub,
          action: "CREATE_LOT",
          entity: "Lot",
          entityId: lot.id,
          metadata: JSON.stringify({ lotNumber, productId: product.id }),
        },
      })
      .catch(() => undefined);

    return NextResponse.json(lot, { status: 201 });
  } catch (error) {
    console.error("[POST /api/lots] Error:", error);
    return NextResponse.json({ error: "Failed to create lot" }, { status: 500 });
  }
}
