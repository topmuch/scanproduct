import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-keys";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import {
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * VerifScan API publique v1 — vérification d'un code produit.
 *
 * ── GET /api/v1/verify/[code] ───────────────────────────────────
 * Auth: Authorization: Bearer sk_live_… (ou X-API-Key) — clé générée dans
 * Paramètres → API & Intégrations.
 *
 * Réponse (200):
 *   code inconnu          → { valid: false, status: "unknown_code" } (404)
 *   étiquette inactivée   → { valid: false, status: "inactive", product: {...} }
 *   produit authentifié   → { valid: true, status: "active", product: {...},
 *                             stats: { scans, lastScanAt } }
 *
 * LECTURE SEULE : ce endpoint n'enregistre PAS de scan (les statistiques
 * officielles restent celles de la page /a/<code>) et ne déclenche pas de
 * webhook scan.verified. Rate-limité par IP (60 req/min).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  // 1. Auth par clé API (401/403 → réponse prête à renvoyer)
  const auth = await authenticateApiKey(request);
  if (!auth.ok) {
    return NextResponse.json(
      { valid: false, error: auth.error },
      { status: auth.status },
    );
  }

  // 2. Rate-limit par IP (au-dessus de l'auth : protège aussi les clés valides)
  const limited = applyRateLimit(request, {
    ...RATE_LIMITS.PUBLIC_SCAN,
    namespace: "api:v1:verify",
  });
  if (limited) return limited;

  const { code } = await params;

  // 3. Résolution du code (même source de vérité que la page /a/<code>)
  const findLot = () =>
    db.preActivatedLot.findUnique({
      where: { qrCode: code },
      select: {
        id: true,
        qrCode: true,
        isMaster: true,
        status: true,
        productName: true,
        productPrice: true,
        productDesignation: true,
        contenance: true,
        manufacturingDate: true,
        expirationDate: true,
        artisanName: true,
        photoUrl: true,
        activatedAt: true,
        pack: {
          select: { status: true, productPrice: true, productDesignation: true },
        },
        _count: { select: { scans: true } },
      },
    });

  let lot: Awaited<ReturnType<typeof findLot>> = null;
  try {
    lot = await findLot();
  } catch (error) {
    if (!isTableMissingError(error)) throw error;
    const heal = await ensureArtisanTables();
    if (!heal.ok) {
      return NextResponse.json(
        { valid: false, error: "Erreur base de données." },
        { status: 500 },
      );
    }
    lot = await findLot();
  }

  if (!lot) {
    return NextResponse.json(
      {
        valid: false,
        status: "unknown_code",
        error: `Aucun produit VerifScan ne correspond au code « ${code} ». Le code est peut-être contrefait.`,
      },
      { status: 404 },
    );
  }

  const packStatus = lot.pack?.status ?? "available";
  const isActive = lot.status === "active";
  const product = {
    name:
      lot.productName ??
      lot.pack?.productDesignation ??
      lot.productDesignation ??
      "Produit artisanal",
    price: lot.productPrice ?? lot.pack?.productPrice ?? null,
    contenance: lot.contenance,
    manufacturingDate: lot.manufacturingDate,
    expirationDate: lot.expirationDate,
    artisanName: lot.artisanName,
    photoUrl: lot.photoUrl,
    activatedAt: lot.activatedAt,
    isMasterCode: lot.isMaster,
  };

  if (!isActive) {
    return NextResponse.json({
      valid: false,
      status: "inactive",
      checkedBy: auth.keyName,
      product,
      message:
        lot.isMaster
          ? "Code maître pas encore activé — le pack n'a pas été activé par l'artisan."
          : "Étiquette pas encore activée — le pack n'a pas été activé par l'artisan.",
    });
  }

  return NextResponse.json({
    valid: true,
    status: "active",
    checkedBy: auth.keyName,
    packStatus,
    product,
    stats: {
      scans: lot._count.scans,
    },
  });
}
