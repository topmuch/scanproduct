import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { canGenerateQr, getFabricantQrUsage } from "@/lib/plan-limits";
import { createNotification } from "@/lib/notifications";

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

  // Rate-limit — 20 QR generations per minute per fabricant.
  // Applied BEFORE any DB work; key = userId (auth already verified above).
  const limited = applyRateLimit(request, {
    ...RATE_LIMITS.QR_GENERATE,
    namespace: "qr:gen",
    key: token.sub,
  });
  if (limited) return limited;

  try {
    const body = await request.json();
    const { lotId, quantity = 1, options = {} } = body;

    if (!lotId) {
      return NextResponse.json({ error: "lotId is required" }, { status: 400 });
    }

    const qty = Math.min(100, Math.max(1, parseInt(quantity, 10) || 1));

    // Quota enforcement — refuse if the user would exceed their plan limit.
    // Returns 402 Payment Required to hint the client should upgrade.
    const quotaCheck = await canGenerateQr(token.sub, qty);
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

    // Generate the QR codes — each encodes the public product passport URL
    // `/p/<lotId>` so scanning opens the lot's digital passport page.
    const baseUrl =
      process.env.NEXT_PUBLIC_SCAN_URL?.replace(/\/$/, "") ||
      "https://verifscan.sn";
    // Pre-existing TypeScript inference: `const qrCodes = []` is inferred as
    // `never[]`, which then rejects the `.push(...)` below. Annotate the
    // array explicitly so the push type-checks cleanly.
    const qrCodes: Array<Awaited<ReturnType<typeof db.qRCode.create>> & { publicUrl: string }> = [];

    for (let i = 0; i < qty; i++) {
      // Generate a unique code (stored in DB for tracking/analytics)
      const uniqueCode = `${lot.lotNumber || lot.reference}-${Date.now()}-${i}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;
      // The scannable URL points to the public route `/p/[lotId]`.
      const publicUrl = `${baseUrl}/p/${lot.id}?code=${uniqueCode}`;

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
