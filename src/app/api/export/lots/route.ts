import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

/**
 * GET /api/export/lots
 *
 * Exports the authenticated fabricant's lots (batches) as CSV.
 *
 * ── Query params ────────────────────────────────────────────────
 *   productId   — optional, filter to lots of a specific product
 *
 * ── Returns ─────────────────────────────────────────────────────
 *   text/csv file download with columns:
 *   Reference, Numero Lot, Produit, Quantite, Date Fabrication,
 *   Date Expiration, Statut, Lieu Fabrication, Total Scans,
 *   QR Codes Count, Score Transparence, Date Creation
 *
 * Auth: FABRICANT only — returns only the fabricant's own lots.
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
    const productId = sp.get("productId");

    // Fetch all lots owned by the fabricant, newest first. Optionally
    // filtered by productId.
    const lots = await db.lot.findMany({
      where: {
        fabricantId: token.sub,
        ...(productId ? { productId } : {}),
      },
      include: {
        product: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // ── Build CSV ───────────────────────────────────────────────
    const headers = [
      "Reference",
      "Numero Lot",
      "Produit",
      "Quantite",
      "Date Fabrication",
      "Date Expiration",
      "Statut",
      "Lieu Fabrication",
      "Total Scans",
      "QR Codes Count",
      "Score Transparence",
      "Date Creation",
    ];

    const escapeCsv = (val: string | null | undefined): string => {
      const s = val ?? "";
      // Escape quotes and wrap in quotes if contains comma/quote/newline.
      if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = lots.map((l) => {
      return [
        l.reference || "",
        l.lotNumber || "",
        l.product?.name || "",
        String(l.quantity ?? 0),
        l.manufactureDate
          ? new Date(l.manufactureDate).toLocaleDateString("fr-FR")
          : "",
        l.expiryDate
          ? new Date(l.expiryDate).toLocaleDateString("fr-FR")
          : "",
        l.status || "",
        l.manufacturingLocation || "",
        String(l.totalScans ?? 0),
        String(l.qrCodeCount ?? 0),
        String(l.transparencyScore ?? 0),
        new Date(l.createdAt).toLocaleDateString("fr-FR"),
      ]
        .map(escapeCsv)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\r\n");

    const filename = `lots-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": Buffer.byteLength(csv, "utf-8").toString(),
      },
    });
  } catch (error) {
    console.error("[GET /api/export/lots] Error:", error);
    return NextResponse.json(
      { error: "Échec de l'export des lots" },
      { status: 500 }
    );
  }
}
