import { NextRequest, NextResponse } from "next/server";
import { getProductByBarcode, extractProductData } from "@/lib/openfoodfacts";

/**
 * GET /api/products/lookup?barcode=<ean13>
 *
 * Public lookup against Open Food Facts. Used by the BarcodeScanner modal in
 * the product wizard to auto-fill name / brand / weight / ingredients etc.
 *
 * Response (found):
 *   { found: true, barcode, product: ExtractedOffData }
 *
 * Response (not found):
 *   { found: false, barcode, message }
 *
 * No auth required — this is a read-only proxy to a public database. Keeping
 * it server-side avoids CORS issues and lets us cache / rate-limit later.
 */
export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get("barcode")?.trim();

  if (!barcode) {
    return NextResponse.json(
      { error: "Paramètre `barcode` requis" },
      { status: 400 },
    );
  }

  // Basic shape validation — accept EAN-8 / EAN-13 / UPC-A (8-13 digits).
  const cleanBarcode = barcode.replace(/[\s-]/g, "");
  if (!/^\d{8,14}$/.test(cleanBarcode)) {
    return NextResponse.json(
      {
        found: false,
        barcode,
        message:
          "Code-barres invalide — un code EAN comporte 8 à 13 chiffres.",
      },
      { status: 200 },
    );
  }

  try {
    const offProduct = await getProductByBarcode(cleanBarcode);

    if (!offProduct) {
      return NextResponse.json(
        {
          found: false,
          barcode: cleanBarcode,
          message:
            "Produit introuvable sur Open Food Facts. Vous pouvez remplir les champs manuellement.",
        },
        { status: 200 },
      );
    }

    const extracted = extractProductData(offProduct);

    return NextResponse.json({
      found: true,
      barcode: cleanBarcode,
      product: extracted,
    });
  } catch (error) {
    console.error("[GET /api/products/lookup] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche Open Food Facts" },
      { status: 500 },
    );
  }
}
