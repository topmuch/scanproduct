import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import {
  getLotWithDetails,
  recordScan,
  isBotUserAgent,
} from "@/lib/public-data";
import { parseJsonArray, parseJsonObject } from "@/lib/utils";

/**
 * GET /api/lots/[id]
 * Public endpoint — returns the full Digital Passport data for a lot.
 *
 * Query params:
 *   scan  — if "true", records a scan visit (increments counters + creates
 *           a Scan row). Bot/crawler requests are skipped to avoid
 *           inflating scan counters.
 *
 * Security: the response NEVER includes sensitive fabricant fields
 * (password, email, phone, address, taxId…). Only public contact fields
 * needed by the passport UI are returned.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sp = request.nextUrl.searchParams;
  const shouldRecordScan = sp.get("scan") === "true";

  try {
    const lot = await getLotWithDetails(id);

    if (!lot) {
      return NextResponse.json({ error: "Lot not found" }, { status: 404 });
    }

    // Optionally record a scan — but skip bots/crawlers so analytics
    // counters (lot.totalScans, product.totalScans) are not inflated by
    // search-engine crawlers or uptime monitors hitting the JSON endpoint.
    if (shouldRecordScan) {
      const userAgent = request.headers.get("user-agent") || undefined;
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        undefined;

      if (userAgent && isBotUserAgent(userAgent)) {
        // Skip scan recording for bots — still return the lot data.
      } else {
        // Detect device type
        let deviceType: string | undefined;
        if (userAgent) {
          if (/mobile/i.test(userAgent)) deviceType = "mobile";
          else if (/tablet/i.test(userAgent)) deviceType = "tablet";
          else deviceType = "desktop";
        }

        // Detect OS
        let os: string | undefined;
        if (userAgent) {
          if (/android/i.test(userAgent)) os = "Android";
          else if (/iphone|ipad/i.test(userAgent)) os = "iOS";
          else if (/windows/i.test(userAgent)) os = "Windows";
          else if (/mac/i.test(userAgent)) os = "macOS";
          else if (/linux/i.test(userAgent)) os = "Linux";
        }

        // Detect browser
        let browser: string | undefined;
        if (userAgent) {
          if (/chrome/i.test(userAgent)) browser = "Chrome";
          else if (/firefox/i.test(userAgent)) browser = "Firefox";
          else if (/safari/i.test(userAgent)) browser = "Safari";
          else if (/edge/i.test(userAgent)) browser = "Edge";
        }

        await recordScan(lot.id, { userAgent, ipAddress, deviceType, os, browser });
      }
    }

    // Strip sensitive fabricant fields before returning JSON.
    // The passport UI only needs public contact fields; we never expose
    // password hash, email, phone, address, taxId, points, badges, etc.
    const {
      password,
      email,
      phone,
      address,
      taxId,
      points,
      badges,
      emailVerified,
      lastLoginAt,
      ...publicFabricant
    } = lot.fabricant;

    return NextResponse.json({
      ...lot,
      fabricant: publicFabricant,
      salesCountries: parseJsonArray<string>(lot.salesCountries),
      allergens: parseJsonArray<string>(lot.allergens),
      nutritionalInfo: parseJsonObject(lot.nutritionalInfo),
      warnings: parseJsonArray<string>(lot.warnings),
    });
  } catch (error) {
    console.error("[GET /api/lots/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to fetch lot" }, { status: 500 });
  }
}

/**
 * PATCH /api/lots/[id]
 * Auth-required (FABRICANT) — updates a lot owned by the authenticated user.
 *
 * Body (all optional):
 *   lotNumber              — string
 *   manufactureDate        — ISO date
 *   expiryDate             — ISO date
 *   ingredients            — string
 *   weight                 — string
 *   manufacturingLocation  — string
 *   transformationLocation — string
 *   salesCountries         — string[]
 *   status                 — "ACTIVE" | "RECALLED" | "EXPIRED" | "DRAFT"
 *   recallReason           — string
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const lot = await db.lot.findUnique({
      where: { id },
      select: { fabricantId: true, lotNumber: true, reference: true, status: true },
    });
    if (!lot) {
      return NextResponse.json({ error: "Lot not found" }, { status: 404 });
    }
    if (lot.fabricantId !== token.sub) {
      return NextResponse.json(
        { error: "You can only update your own lots" },
        { status: 403 },
      );
    }

    const patch: Record<string, unknown> = {};
    if (typeof body.lotNumber === "string" && body.lotNumber.trim()) patch.lotNumber = body.lotNumber.trim();
    if (body.manufactureDate) patch.manufactureDate = new Date(body.manufactureDate);
    if (body.expiryDate) patch.expiryDate = new Date(body.expiryDate);
    if (typeof body.ingredients === "string") patch.ingredients = body.ingredients || null;
    if (typeof body.weight === "string") patch.weight = body.weight || null;
    if (typeof body.manufacturingLocation === "string") patch.manufacturingLocation = body.manufacturingLocation || null;
    if (typeof body.transformationLocation === "string") patch.transformationLocation = body.transformationLocation || null;
    if (Array.isArray(body.salesCountries)) {
      patch.salesCountries = JSON.stringify(body.salesCountries.filter((c: unknown) => typeof c === "string"));
    }
    if (["ACTIVE", "RECALLED", "EXPIRED", "DRAFT"].includes(body.status)) {
      patch.status = body.status;
      if (body.status === "RECALLED") {
        patch.recalledAt = new Date();
        if (typeof body.recallReason === "string") patch.recallReason = body.recallReason;
      }
    }

    const updated = await db.lot.update({
      where: { id },
      data: patch,
    });

    // If the lot was just recalled, append a history event.
    if (body.status === "RECALLED" && lot.status !== "RECALLED") {
      db.lotHistory
        .create({
          data: {
            lotId: id,
            type: "rappelle",
            title: "Lot rappelé",
            description: typeof body.recallReason === "string" ? body.recallReason : "Rappelé par le fabricant",
            date: new Date(),
          },
        })
        .catch(() => undefined);
    }

    db.auditLog
      .create({
        data: {
          userId: token.sub,
          action: "UPDATE_LOT",
          entity: "Lot",
          entityId: id,
          metadata: JSON.stringify({ fields: Object.keys(patch) }),
        },
      })
      .catch(() => undefined);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/lots/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update lot" }, { status: 500 });
  }
}

/**
 * DELETE /api/lots/[id]
 * Auth-required (FABRICANT) — hard-deletes a lot owned by the authenticated
 * user. Cascades to QR codes, scans, history events (per schema onDelete:
 * Cascade on LotHistory, QRCode, Scan).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const lot = await db.lot.findUnique({
      where: { id },
      select: { fabricantId: true, lotNumber: true, reference: true },
    });
    if (!lot) {
      return NextResponse.json({ error: "Lot not found" }, { status: 404 });
    }
    if (lot.fabricantId !== token.sub) {
      return NextResponse.json(
        { error: "You can only delete your own lots" },
        { status: 403 },
      );
    }

    // Hard delete — schema cascades to LotHistory, QRCode, Scan.
    await db.lot.delete({ where: { id } });

    db.auditLog
      .create({
        data: {
          userId: token.sub,
          action: "DELETE_LOT",
          entity: "Lot",
          entityId: id,
          metadata: JSON.stringify({ lotNumber: lot.lotNumber, reference: lot.reference }),
        },
      })
      .catch(() => undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/lots/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to delete lot" }, { status: 500 });
  }
}
