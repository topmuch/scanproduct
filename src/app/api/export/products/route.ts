import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

/**
 * GET /api/export/products
 *
 * Exports the authenticated fabricant's product catalog as CSV.
 *
 * ── Query params ────────────────────────────────────────────────
 *   period   — optional, accepted for API symmetry but ignored
 *              (products are exported in full, regardless of period)
 *
 * ── Returns ─────────────────────────────────────────────────────
 *   text/csv file download with columns:
 *   Nom, Marque, Categorie, Poids, Statut, Total Scans,
 *   Score Transparence, Moyenne Avis, Date Creation
 *
 * Auth: FABRICANT only — returns only the fabricant's own products.
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
    // Fetch all products owned by the fabricant, newest first.
    // NOTE: the Prisma relation is named `categoryRef` (see schema.prisma),
    // not `category` (which is the legacy free-text field on Product).
    const products = await db.product.findMany({
      where: { fabricantId: token.sub },
      include: { categoryRef: true },
      orderBy: { createdAt: "desc" },
    });

    // ── Build CSV ───────────────────────────────────────────────
    const headers = [
      "Nom",
      "Marque",
      "Categorie",
      "Poids",
      "Statut",
      "Total Scans",
      "Score Transparence",
      "Moyenne Avis",
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

    const rows = products.map((p) => {
      return [
        p.name,
        p.brand || "",
        // Prefer the linked Category.name, fall back to legacy free-text
        p.categoryRef?.name || p.category || "",
        p.weight || "",
        p.status || "",
        String(p.totalScans ?? 0),
        String(p.transparencyScore ?? 0),
        // averageRating is a Float; format to 2 decimals
        p.averageRating != null ? p.averageRating.toFixed(2) : "0,00",
        new Date(p.createdAt).toLocaleDateString("fr-FR"),
      ]
        .map(escapeCsv)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\r\n");

    const filename = `produits-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": Buffer.byteLength(csv, "utf-8").toString(),
      },
    });
  } catch (error) {
    console.error("[GET /api/export/products] Error:", error);
    return NextResponse.json(
      { error: "Échec de l'export des produits" },
      { status: 500 }
    );
  }
}
