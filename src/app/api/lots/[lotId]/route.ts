import { NextRequest, NextResponse } from "next/server";
import { getLotWithDetails, recordScan } from "@/lib/public-data";
import { calculateTransparencyScore, parseJsonArray, parseJsonObject } from "@/lib/utils";

/**
 * GET /api/lots/[lotId]
 * Public endpoint — returns the full Digital Passport data for a lot.
 *
 * Query params:
 *   scan  — if "true", records a scan visit (increments counters + creates Scan row)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  const { lotId } = await params;
  const sp = request.nextUrl.searchParams;
  const shouldRecordScan = sp.get("scan") === "true";

  try {
    const lot = await getLotWithDetails(lotId);

    if (!lot) {
      return NextResponse.json({ error: "Lot not found" }, { status: 404 });
    }

    // Optionally record a scan
    if (shouldRecordScan) {
      const userAgent = request.headers.get("user-agent") || undefined;
      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        undefined;

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

    // Return the full lot detail
    return NextResponse.json({
      ...lot,
      salesCountries: parseJsonArray<string>(lot.salesCountries),
      allergens: parseJsonArray<string>(lot.allergens),
      nutritionalInfo: parseJsonObject(lot.nutritionalInfo),
      warnings: parseJsonArray<string>(lot.warnings),
    });
  } catch (error) {
    console.error("[GET /api/lots/[lotId]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lot" },
      { status: 500 }
    );
  }
}
