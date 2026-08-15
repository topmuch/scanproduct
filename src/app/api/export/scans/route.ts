import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

/**
 * GET /api/export/scans
 *
 * Exports the authenticated fabricant's scan history as CSV.
 *
 * ── Query params ────────────────────────────────────────────────
 *   period   — "7d" | "30d" | "90d" | "12m" | "all" (default "30d")
 *   lotId    — optional, filter by specific lot
 *   productId — optional, filter by specific product (via its lots)
 *
 * ── Returns ─────────────────────────────────────────────────────
 *   text/csv file download with columns:
 *   Date, Lot, Produit, QR Code, Pays, Ville, Region, Appareil, OS, Navigateur, IP
 *
 * Auth: FABRICANT only — returns only the fabricant's own scans.
 */
export async function GET(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const sp = request.nextUrl.searchParams;
    const period = sp.get("period") || "30d";
    const lotId = sp.get("lotId");
    const productId = sp.get("productId");

    // ── Compute date range ───────────────────────────────────────
    const now = new Date();
    let since: Date | null = null;
    switch (period) {
      case "7d":
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "12m":
        since = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        since = null;
        break;
      default:
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // ── Build the where clause ──────────────────────────────────
    const where: {
      lot: { fabricantId: string; id?: string; productId?: string };
      scannedAt?: { gte: Date };
    } = {
      lot: { fabricantId: token.sub },
    };
    if (since) where.scannedAt = { gte: since };
    if (lotId) where.lot.id = lotId;
    if (productId) where.lot.productId = productId;

    // ── Fetch scans ─────────────────────────────────────────────
    const scans = await db.scan.findMany({
      where,
      orderBy: { scannedAt: "desc" },
      take: 10000, // safety cap
      include: {
        lot: {
          select: {
            lotNumber: true,
            reference: true,
            product: { select: { name: true } },
          },
        },
        qrCode: { select: { code: true } },
      },
    });

    // ── Build CSV ───────────────────────────────────────────────
    const headers = [
      "Date",
      "Heure",
      "Lot",
      "Produit",
      "Code QR",
      "Pays",
      "Ville",
      "Region",
      "Type appareil",
      "OS",
      "Navigateur",
      "Adresse IP",
    ];

    const escapeCsv = (val: string | null | undefined): string => {
      const s = val ?? "";
      // Escape quotes and wrap in quotes if contains comma/quote/newline.
      if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = scans.map((s) => {
      const d = new Date(s.scannedAt);
      const date = d.toLocaleDateString("fr-FR");
      const time = d.toLocaleTimeString("fr-FR");
      return [
        date,
        time,
        s.lot.lotNumber || s.lot.reference,
        s.lot.product?.name || "",
        s.qrCode?.code || "",
        s.country || "",
        s.city || "",
        s.region || "",
        s.deviceType || "",
        s.os || "",
        s.browser || "",
        s.ipAddress || "",
      ]
        .map(escapeCsv)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\r\n");

    const filename = `scans-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": Buffer.byteLength(csv, "utf-8").toString(),
      },
    });
  } catch (error) {
    console.error("[GET /api/export/scans] Error:", error);
    return NextResponse.json(
      { error: "Échec de l'export des scans" },
      { status: 500 }
    );
  }
}
