import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { httpErrorStatus, requireArtisanAuth } from "@/lib/artisan-auth";
import {
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * GET /api/artisan/dashboard — données du tableau de bord artisan.
 *
 * Headers : Authorization: Bearer <token JWT artisan>
 *
 * Regroupe :
 *   - artisan        : {id, phone, name}
 *   - packs          : packs liés (artisanId OU artisanPhone — packs vendus
 *                      avant l'introduction du compte Artisan) + scans
 *   - products       : produits agrégés par (pack, productName) — tous les
 *                      QR codes du même produit forment UNE ligne avec
 *                      qrCount / scanCount / badge « Populaire »
 *   - stats          : totalScans / totalProducts / totalQRCodes / totalPacks
 *   - notifications  : scans récents (7 jours) agrégés par produit
 *                      (« Votre savon au karité a reçu N nouveaux scans »)
 */

type RouteCtx = { params: Promise<Record<string, never>> };

const run = async (artisanId: string, phone: string): Promise<NextResponse> => {
  const artisan = await db.artisan.findUnique({ where: { id: artisanId } });
  if (!artisan) {
    return NextResponse.json({ error: "Artisan introuvable" }, { status: 404 });
  }

  // Packs liés par compte OU par téléphone (packs vendus avant le portail)
  const packs = await db.pack.findMany({
    where: { OR: [{ artisanId: artisan.id }, { artisanPhone: phone }] },
    orderBy: { packNumber: "asc" },
    include: {
      lots: {
        include: { _count: { select: { scans: true } } },
      },
    },
  });

  // ── Agrégation des produits (pack + productName identiques) ─────────────
  type ProductRow = {
    id: string; // id du 1er lot actif → page d'édition
    viewCode: string; // QR du 1er lot actif → page publique /a/<code>
    name: string;
    contenance: string | null;
    photoUrl: string | null;
    packId: string;
    packNumber: number;
    qrCount: number;
    scanCount: number;
  };
  const productMap = new Map<string, ProductRow>();
  let totalScans = 0;
  let totalQRCodes = 0;

  for (const pack of packs) {
    for (const lot of pack.lots) {
      totalScans += lot._count.scans;
      if (lot.status !== "active" || lot.isMaster) continue;
      totalQRCodes += 1;

      const key = `${pack.id}::${lot.productName ?? ""}`;
      const existing = productMap.get(key);
      if (existing) {
        existing.qrCount += 1;
        existing.scanCount += lot._count.scans;
      } else {
        productMap.set(key, {
          id: lot.id,
          viewCode: lot.qrCode,
          name: lot.productName ?? "Produit sans nom",
          contenance: lot.contenance,
          photoUrl: lot.photoUrl,
          packId: pack.id,
          packNumber: pack.packNumber,
          qrCount: 1,
          scanCount: lot._count.scans,
        });
      }
    }
  }

  const products = [...productMap.values()];
  const maxScans = products.reduce((m, p) => Math.max(m, p.scanCount), 0);
  const productsOut = products.map((p) => ({
    ...p,
    isMostScanned: p.scanCount > 0 && p.scanCount === maxScans && products.length > 1,
  }));

  // ── Notifications : scans des 7 derniers jours, agrégés par produit ─────
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const lotIds = packs.flatMap((p) => p.lots.map((l) => l.id));
  const recentScans =
    lotIds.length > 0
      ? await db.artisanScan.findMany({
          where: { lotId: { in: lotIds }, scannedAt: { gte: since } },
          orderBy: { scannedAt: "desc" },
          take: 400,
          include: { lot: { select: { productName: true } } },
        })
      : [];

  const notifMap = new Map<string, { name: string; count: number; lastAt: Date; place: string | null }>();
  for (const scan of recentScans) {
    const name = scan.lot.productName ?? "votre produit";
    const entry = notifMap.get(name) ?? { name, count: 0, lastAt: scan.scannedAt, place: null };
    entry.count += 1;
    if (scan.scannedAt > entry.lastAt) entry.lastAt = scan.scannedAt;
    if (!entry.place && (scan.country || scan.city)) {
      entry.place = [scan.city, scan.country].filter(Boolean).join(", ") || null;
    }
    notifMap.set(name, entry);
  }
  const notifications = [...notifMap.values()]
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
    .slice(0, 5)
    .map((n) => ({
      productName: n.name,
      scanCount: n.count,
      lastScanAt: n.lastAt.toISOString(),
      place: n.place,
    }));

  return NextResponse.json({
    artisan: { id: artisan.id, phone: artisan.phone, name: artisan.name },
    packs: packs.map((p) => ({
      id: p.id,
      packNumber: p.packNumber,
      quantity: p.quantity,
      price: p.price,
      masterQrCode: p.masterQrCode,
      status: p.status,
      totalScans: p.lots.reduce((s, l) => s + l._count.scans, 0),
      createdAt: p.createdAt.toISOString(),
    })),
    products: productsOut,
    stats: {
      totalScans,
      totalProducts: products.length,
      totalQRCodes,
      totalPacks: packs.length,
    },
    notifications,
  });
};

export async function GET(_request: NextRequest, _ctx: RouteCtx) {
  let artisanId: string;
  let phone: string;
  try {
    const payload = requireArtisanAuth(_request);
    artisanId = payload.artisanId;
    phone = payload.phone;
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    return await run(artisanId, phone);
  } catch (error) {
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          return await run(artisanId, phone);
        } catch (retryError) {
          console.error("[artisan/dashboard] retry:", retryError);
        }
      } else {
        console.error("[artisan/dashboard] heal failed:", heal.errors);
      }
    }
    const { status, message } = httpErrorStatus(error);
    if (status !== 500) {
      return NextResponse.json({ error: message }, { status });
    }
    console.error("[artisan/dashboard]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
