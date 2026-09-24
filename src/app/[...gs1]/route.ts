/**
 * ============================================================================
 * VerifScan — Resolver racine conforme GS1 Digital Link : /[[...gs1]]
 * ============================================================================
 *
 * Le standard GS1 Digital Link impose que l'URI soit résolue À LA RACINE du
 * domaine encodé dans le QR Code :
 *
 *     GET /01/<GTIN>/10/<LOT>/21/<SERIE>          → 302 → /p/<lotId>
 *     GET /gtin/<GTIN>/lot/<LOT>/ser/<SERIE>      → 302 → /p/<lotId>
 *     GET /01/<GTIN>                              → 302 → /p/<lotId> (lot récent)
 *
 * Cette route racine catch-all n'intercepte QUE les chemins sans route
 * dédiée : Next.js donne toujours la priorité aux routes existantes
 * (/produits, /p/[lotId], /api/*, /login…), elle sert donc de résolveur
 * conforme au standard ET de page 404 « produit introuvable » de secours.
 *
 * Toute la logique est partagée dans `src/lib/gs1-resolver.ts`.
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { gererRequeteResolver } from "@/lib/gs1-resolver";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  contexte: { params: Promise<{ gs1: string[] }> }
): Promise<NextResponse> {
  const { gs1 } = await contexte.params;
  return gererRequeteResolver(request, gs1 ?? []);
}
