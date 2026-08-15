import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { renderAndSaveQR, resolveLogoPath } from "@/lib/qr-server";

/**
 * POST /api/qr-codes/bulk-generate
 *
 * Generates QR codes for MULTIPLE lots in a single call, renders each
 * QR as a PNG server-side (with optional logo + brand color + lot
 * number), saves the PNG to UPLOAD_DIR, and persists the image URL
 * in `QRCode.imageUrl`.
 *
 * ── Body ────────────────────────────────────────────────────────
 *   lotIds    — string[] (required, 1-20 lots)
 *   perLot    — number   (QR codes per lot, default 1, max 500)
 *   options   — {
 *     size?, color?, includeLogo?, includeLotNumber?, includeProductName?,
 *     logoOverride? (optional absolute logo path)
 *   }
 *
 * ── Returns ─────────────────────────────────────────────────────
 *   { success, totalGenerated, results: [{ lotId, lotNumber, productName, count, qrCodes: [{ id, imageUrl, publicUrl }] }] }
 *
 * ── Limits ──────────────────────────────────────────────────────
 *   - Max 20 lots per call
 *   - Max 500 QR codes per lot
 *   - Total max 2000 QR codes per call
 */
export async function POST(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { lotIds, perLot = 1, options = {} } = body;

    // ── Validation ──────────────────────────────────────────────
    if (!Array.isArray(lotIds) || lotIds.length === 0) {
      return NextResponse.json(
        { error: "lotIds (string[]) est requis" },
        { status: 400 }
      );
    }
    if (lotIds.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 lots par appel" },
        { status: 400 }
      );
    }

    const qtyPerLot = Math.min(500, Math.max(1, parseInt(perLot, 10) || 1));
    const totalMax = 2000;
    const totalRequested = lotIds.length * qtyPerLot;
    if (totalRequested > totalMax) {
      return NextResponse.json(
        { error: `Maximum ${totalMax} QR codes par appel (demandé: ${totalRequested})` },
        { status: 400 }
      );
    }

    // ── Fetch all lots + fabricant logo in one query ────────────
    const lots = await db.lot.findMany({
      where: {
        id: { in: lotIds },
        fabricantId: token.sub, // ownership guard
      },
      include: {
        product: { select: { name: true } },
      },
    });

    if (lots.length === 0) {
      return NextResponse.json(
        { error: "Aucun lot valide trouvé (vérifiez que ces lots vous appartiennent)" },
        { status: 404 }
      );
    }

    // Fetch the fabricant's logo URL once.
    const fabricant = await db.user.findUnique({
      where: { id: token.sub },
      select: { logoUrl: true, brandColor: true },
    });

    const logoPath = options.logoOverride
      ? options.logoOverride
      : options.includeLogo !== false
        ? resolveLogoPath(fabricant?.logoUrl)
        : null;

    const qrColor = options.color || fabricant?.brandColor || "#000000";

    // ── Generate + render + persist ────────────────────────────
    const results: Array<{
      lotId: string;
      lotNumber: string | null;
      productName: string;
      count: number;
      qrCodes: Array<{ id: string; imageUrl: string; publicUrl: string }>;
    }> = [];

    let totalGenerated = 0;

    for (const lot of lots) {
      const lotQrCodes: Array<{ id: string; imageUrl: string; publicUrl: string }> = [];

      for (let i = 0; i < qtyPerLot; i++) {
        const uniqueCode = `${lot.lotNumber || lot.reference}-${Date.now()}-${i}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`;

        // Render the PNG server-side and save to disk.
        const rendered = await renderAndSaveQR(lot.id, uniqueCode, {
          size: options.size || 512,
          color: qrColor,
          logoPath: logoPath || undefined,
          lotNumber: options.includeLotNumber !== false ? lot.lotNumber : null,
          productName:
            options.includeProductName !== false ? lot.product?.name : null,
          errorCorrectionLevel: logoPath ? "H" : "M",
        });

        // Persist the QR code row WITH the image URL.
        const qrCode = await db.qRCode.create({
          data: {
            code: uniqueCode,
            lotId: lot.id,
            fabricantId: token.sub,
            imageUrl: rendered.publicUrl,
            size: options.size || 512,
            color: qrColor,
            includeLotNumber: options.includeLotNumber ?? true,
            includeProductName: options.includeProductName ?? true,
            includeLogo: !!logoPath,
            status: "ACTIVE",
          },
        });

        lotQrCodes.push({
          id: qrCode.id,
          imageUrl: rendered.publicUrl,
          publicUrl: `${process.env.NEXT_PUBLIC_SCAN_URL?.replace(/\/$/, "") || "https://verifscan.sn"}/p/${lot.id}?code=${uniqueCode}`,
        });
        totalGenerated++;
      }

      // Increment the lot's QR count.
      await db.lot.update({
        where: { id: lot.id },
        data: { qrCodeCount: { increment: qtyPerLot } },
      });

      results.push({
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        productName: lot.product?.name || "Produit",
        count: lotQrCodes.length,
        qrCodes: lotQrCodes,
      });
    }

    return NextResponse.json({
      success: true,
      totalGenerated,
      lotsProcessed: lots.length,
      results,
    });
  } catch (error) {
    console.error("[POST /api/qr-codes/bulk-generate] Error:", error);
    return NextResponse.json(
      { error: "Échec de la génération en masse des QR codes" },
      { status: 500 }
    );
  }
}
