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
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  contexte: { params: Promise<{ gs1: string[] }> }
): Promise<NextResponse> {
  const { gs1 } = await contexte.params;

  // ── IndexNow : fichier de clé à la racine /{clé}.txt ──────────────────
  // La spécification IndexNow (api.indexnow.org — Bing/Yandex/Seznam/Naver)
  // exige que la clé soit prouvable en ligne à la racine du domaine :
  //   GET https://verifscan.com/{indexNowKey}.txt → la clé en texte brut.
  // Servie ici (catch-all racine) pour n'ajouter AUCUNE route au routeur :
  // tout autre *.txt ou chemin inconnu suit le flux GS1/404 habituel.
  if (gs1?.length === 1 && gs1[0].endsWith(".txt")) {
    try {
      const row = await db.setting.findUnique({ where: { key: "indexNowKey" } });
      if (row?.value && gs1[0] === `${row.value}.txt`) {
        return new NextResponse(row.value, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }
    } catch {
      /* DB indisponible → flux GS1/404 habituel */
    }
  }

  return gererRequeteResolver(request, gs1 ?? []);
}
