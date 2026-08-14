import { NextRequest, NextResponse } from "next/server";
import { getLotWithDetails, recordScan, isBotUserAgent } from "@/lib/public-data";
import { calculateTransparencyScore, parseJsonArray, parseJsonObject } from "@/lib/utils";

/**
 * GET /api/lots/[lotId]
 * Public endpoint — returns the full Digital Passport data for a lot.
 *
 * Query params:
 *   scan  — if "true", records a scan visit (increments counters + creates Scan row).
 *           Bot/crawler requests are skipped to avoid inflating scan counters.
 *
 * Security: the response NEVER includes sensitive fabricant fields
 * (password, email, phone, address, taxId…). Only public contact fields
 * needed by the passport UI are returned.
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
    const { password, email, phone, address, taxId, points, badges,
            emailVerified, lastLoginAt, ...publicFabricant } = lot.fabricant;

    return NextResponse.json({
      ...lot,
      fabricant: publicFabricant,
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
