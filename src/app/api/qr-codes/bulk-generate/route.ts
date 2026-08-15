import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { renderAndSaveQR, resolveLogoPath } from "@/lib/qr-server";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { canGenerateQr, getFabricantQrUsage } from "@/lib/plan-limits";
import { createNotification } from "@/lib/notifications";

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

  // Rate-limit — 20 QR generations per minute per fabricant (same preset as
  // the single /generate route, since both endpoints create QR codes).
  const limited = applyRateLimit(request, {
    ...RATE_LIMITS.QR_GENERATE,
    namespace: "qr:bulk",
    key: token.sub,
  });
  if (limited) return limited;

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

    // Quota enforcement — refuse if the user would exceed their plan limit.
    // Uses the TOTAL requested quantity across all lots, not per-lot.
    // Returns 402 Payment Required to hint the client should upgrade.
    const quotaCheck = await canGenerateQr(token.sub, totalRequested);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error:
            quotaCheck.reason ||
            "Quota dépassé. Passez à un plan supérieur.",
          quota: {
            used: quotaCheck.remaining === 0 ? "exceeded" : "limited",
            remaining: quotaCheck.remaining,
          },
        },
        { status: 402 }
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

    // Fire-and-forget: if the user just crossed 80% or 100% of their quota,
    // send a notification to their bell. Never blocks the response.
    //
    // Capture `userId` as a const here so TypeScript keeps it narrowed to
    // `string` inside the async `.then()` callback (token.sub would
    // otherwise widen back to `string | undefined`).
    const userId = token.sub;
    getFabricantQrUsage(userId)
      .then((usage) => {
        const alert = usage.percent >= 80;
        if (!alert) return;
        const isExceeded = usage.percent >= 100;
        createNotification({
          userId,
          type: isExceeded ? "quota_exceeded" : "quota_warning",
          title: isExceeded
            ? `Quota QR codes atteint (${usage.used}/${usage.limit})`
            : `Quota QR codes à ${Math.floor(usage.percent)}% (${usage.used}/${usage.limit})`,
          message: isExceeded
            ? `Vous avez atteint la limite de votre plan. Les nouvelles générations seront bloquées jusqu'au prochain cycle ou passage à un plan supérieur.`
            : `Il vous reste ${usage.remaining} QR codes avant d'atteindre la limite de votre plan.`,
          severity: isExceeded ? "critical" : "warning",
          data: {
            used: usage.used,
            limit: usage.limit,
            percent: usage.percent,
            remaining: usage.remaining,
          },
        }).catch(() => undefined);
      })
      .catch(() => undefined);

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
