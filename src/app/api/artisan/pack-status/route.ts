import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * GET /api/artisan/pack-status?masterCode=MASTER-…
 *
 * État d'activation d'un pack, lu depuis la page /activer-pack/<code> :
 *   - quantity        : taille totale du pack (ex. 200)
 *   - activatedCount  : étiquettes produit déjà actives (ex. 100)
 *   - remaining       : QR codes restants (ex. 100)
 *   - status          : available | sold | partial | activated
 *   - groups          : produits déjà activés [{productName, count}] —
 *                       alimente la barre de progression et le récapitulatif.
 *
 * Public (sans auth) : l'activation artisanale est SANS COMPTE par design —
 * la possession du code maître (imprimé sur le pack de l'artisan) vaut
 * autorisation. La route n'expose que des agrégats (noms + quantités).
 */

export async function GET(request: NextRequest) {
  const masterCode = request.nextUrl.searchParams.get("masterCode")?.trim() ?? "";
  if (!masterCode.startsWith("MASTER-")) {
    return NextResponse.json({ error: "Code maître invalide" }, { status: 400 });
  }

  const respond = async () => {
    const master = await db.preActivatedLot.findUnique({
      where: { qrCode: masterCode },
      include: { pack: { include: { lots: true } } },
    });

    if (!master || !master.isMaster) {
      return NextResponse.json({ error: "Code maître inconnu" }, { status: 404 });
    }

    const productLots = master.pack.lots.filter((l) => !l.isMaster);
    const activatedCount = productLots.filter((l) => l.status === "active").length;
    const quantity = master.pack.quantity;

    // Groupes déjà activés (par productName, ordre qrCode asc)
    const groupMap = new Map<string, { productName: string; count: number; photoUrl: string | null }>();
    for (const lot of productLots
      .filter((l) => l.status === "active")
      .sort((a, b) => a.qrCode.localeCompare(b.qrCode))) {
      const name = lot.productName ?? "Produit sans nom";
      const existing = groupMap.get(name);
      if (existing) {
        existing.count += 1;
      } else {
        groupMap.set(name, { productName: name, count: 1, photoUrl: lot.photoUrl });
      }
    }

    return NextResponse.json({
      found: true,
      masterQrCode: master.qrCode,
      masterActive: master.status === "active",
      status: master.pack.status,
      quantity,
      activatedCount,
      remaining: Math.max(quantity - activatedCount, 0),
      groups: [...groupMap.values()].map((g) => ({
        productName: g.productName,
        count: g.count,
        photoUrl: g.photoUrl,
      })),
    });
  };

  try {
    return await respond();
  } catch (error) {
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          return await respond();
        } catch (retryError) {
          console.error("[pack-status] retry:", retryError);
        }
      }
    }
    console.error("[pack-status]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
