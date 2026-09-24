/**
 * ============================================================================
 * VerifScan — Resolver universel : /r/[[...path]]
 * ============================================================================
 *
 * Point d'entrée des QR Codes « standard » (petits producteurs locaux) :
 *
 *     GET /r/<ID_UNIQUE_PRODUIT>  →  302 → /p/<lotId>  (page responsive)
 *
 * Il accepte AUSSI les URI GS1 passées sous /r/ (ex: /r/01/<GTIN>/10/<LOT>/21/<SERIE>),
 * pratique pour les tests et pour les intégrations qui préfèrent préfixer.
 *
 * Toute la logique (sécurité, rate limit, DB, redirection) vit dans
 * `src/lib/gs1-resolver.ts` — partagée avec la route racine conforme GS1.
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { gererRequeteResolver } from "@/lib/gs1-resolver";

// Résolution dynamique obligatoire : le statut produit (FRA / rappelé / expiré)
// doit être lu à chaque scan, jamais mis en cache.
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  contexte: { params: Promise<{ path?: string[] }> }
): Promise<NextResponse> {
  const { path } = await contexte.params;
  return gererRequeteResolver(request, path ?? []);
}

// Méthodes autres que GET explicitement refusées (le resolver répond 405).
export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: "Méthode non autorisée." }, { status: 405 });
}
