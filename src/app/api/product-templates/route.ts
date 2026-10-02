import { NextRequest, NextResponse } from "next/server";
import {
  ALL_PRODUCT_TEMPLATES,
  AGROALIMENTAIRE_TEMPLATES,
  PRODUCT_TEMPLATES,
} from "@/lib/product-templates";

/**
 * GET /api/product-templates — Recherche de produits types.
 *
 * Query params :
 *   q         — texte de recherche (nom ou ingrédient, insensible à la casse)
 *   category  — "cosmetique" | "agroalimentaire" | "all" (défaut : all)
 *
 * Réponse : { templates: ProductTemplate[] }
 * Aucune authentification requise (données statiques non sensibles) —
 * utile pour les formulaires classiques ET l'écran d'activation artisan.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim().toLowerCase();
  const category = searchParams.get("category") || "all";

  let base: typeof ALL_PRODUCT_TEMPLATES;
  switch (category) {
    case "cosmetique":
      base = PRODUCT_TEMPLATES;
      break;
    case "agroalimentaire":
      base = AGROALIMENTAIRE_TEMPLATES;
      break;
    default:
      base = ALL_PRODUCT_TEMPLATES;
  }

  const filtered = query
    ? base.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.typicalIngredients.some((i) => i.toLowerCase().includes(query)),
      )
    : base;

  return NextResponse.json({ templates: filtered });
}
