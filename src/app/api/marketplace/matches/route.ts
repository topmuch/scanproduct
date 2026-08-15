import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMarketplaceMatches } from "@/lib/marketplace";

export const runtime = "nodejs";

/**
 * GET /api/marketplace/matches
 *
 * AUTH required. Returns up to 5 suggested partner fabricants for
 * cross-promotion. The suggestion heuristic surfaces fabricants with the
 * biggest public catalog and shared categories with the caller.
 *
 * Response: { matches: Array<{ fabricantId, companyName, logoUrl, city,
 *                          country, productCount, sharedCategories }> }
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const matches = await getMarketplaceMatches(session.user.id);
    return NextResponse.json({ matches });
  } catch (error) {
    console.error("[GET /api/marketplace/matches] Error:", error);
    return NextResponse.json(
      { error: "Échec du chargement des partenaires suggérés" },
      { status: 500 },
    );
  }
}
