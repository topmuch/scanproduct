import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

/**
 * POST /api/qr-codes/generate
 * Auth-required (FABRICANT) — generates QR codes for a lot.
 *
 * Body:
 *   lotId     — string (required)
 *   quantity  — number (default 1, max 100)
 *   options   — { size?, color?, includeLotNumber?, includeProductName?, includeLogo? }
 *
 * Returns:
 *   { success, count, qrCodes, quotaRemaining }
 */
export async function POST(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { lotId, quantity = 1, options = {} } = body;

    if (!lotId) {
      return NextResponse.json({ error: "lotId is required" }, { status: 400 });
    }

    const qty = Math.min(100, Math.max(1, parseInt(quantity, 10) || 1));

    // Verify the lot belongs to the authenticated fabricant
    const lot = await db.lot.findUnique({
      where: { id: lotId },
      include: {
        product: { select: { fabricantId: true, name: true } },
      },
    });

    if (!lot) {
      return NextResponse.json({ error: "Lot not found" }, { status: 404 });
    }

    if (lot.fabricantId !== token.sub) {
      return NextResponse.json(
        { error: "You can only generate QR codes for your own lots" },
        { status: 403 }
      );
    }

    // Generate the QR codes
    const baseUrl = process.env.NEXT_PUBLIC_SCAN_URL || "https://verifscan.roomscan.pro/1";
    const qrCodes = [];

    for (let i = 0; i < qty; i++) {
      // Generate a unique code
      const uniqueCode = `${lot.lotNumber || lot.reference}-${Date.now()}-${i}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;
      const publicUrl = `${baseUrl}/${lot.id}?code=${uniqueCode}`;

      const qrCode = await db.qRCode.create({
        data: {
          code: uniqueCode,
          lotId: lot.id,
          fabricantId: token.sub,
          size: options.size || 300,
          color: options.color || "#000000",
          includeLotNumber: options.includeLotNumber ?? true,
          includeProductName: options.includeProductName ?? true,
          includeLogo: options.includeLogo ?? false,
          status: "ACTIVE",
        },
      });

      qrCodes.push({
        ...qrCode,
        publicUrl,
      });
    }

    // Update the lot's QR code count
    await db.lot.update({
      where: { id: lot.id },
      data: { qrCodeCount: { increment: qty } },
    });

    return NextResponse.json({
      success: true,
      count: qrCodes.length,
      qrCodes,
    });
  } catch (error) {
    console.error("[POST /api/qr-codes/generate] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate QR codes" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/qr-codes/generate
 * Auth-required — returns all QR codes for the authenticated fabricant.
 */
export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sp = request.nextUrl.searchParams;
    const lotId = sp.get("lotId");
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "50", 10)));

    const where: { fabricantId: string; lotId?: string } = { fabricantId: token.sub };
    if (lotId) where.lotId = lotId;

    const [qrCodes, total] = await Promise.all([
      db.qRCode.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          lot: {
            select: {
              id: true,
              reference: true,
              lotNumber: true,
              product: { select: { name: true } },
            },
          },
        },
      }),
      db.qRCode.count({ where }),
    ]);

    return NextResponse.json({
      qrCodes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/qr-codes/generate] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch QR codes" },
      { status: 500 }
    );
  }
}
