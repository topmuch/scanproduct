import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { httpErrorStatus, normalizePhone, requireArtisanAuth } from "@/lib/artisan-auth";
import {
  asciiHeader,
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * Portail ARTISAN — consultation / modification EN MASSE d'un produit.
 *
 * GET  /api/artisan/products/<lotId>
 *   → pré-remplissage du formulaire d'édition (données produit du lot +
 *     champs pack : réseaux sociaux, prix affiché, désignation, galerie).
 *
 * PUT  /api/artisan/products/<lotId>
 *   → « Quand l'artisan modifie un produit, TOUS les QR codes du même
 *     produit sont mis à jour automatiquement » (spec) : on met à jour tous
 *     les lots du MÊME pack portant le MÊME productName (maître inclus),
 *     puis les champs pack correspondants. Comportement identique au PATCH
 *     SuperAdmin (/api/admin/packs/<packId>/product) mais réservé au
 *     PROPRIÉTAIRE du pack.
 *
 * Sécurité :
 *   - JWT artisan obligatoire (Authorization: Bearer).
 *   - Propriété vérifiée : pack.artisanId === artisan.id, ou — pour les
 *     packs vendus avant l'introduction des comptes — correspondance du
 *     téléphone (auquel cas le pack est lié au compte, migration douce).
 *   - Un pack d'un autre artisan → 404 (sans révéler son existence).
 *
 * AUTO-RÉPARATION : P2021/P2022 → DDL appliqué puis requête rejouée UNE fois.
 */

type RouteCtx = { params: Promise<{ productId: string }> };

const ProductDataSchema = z.object({
  productName: z.string().trim().min(2).max(120),
  contenance: z.string().trim().min(1).max(40),
  ingredients: z.string().trim().min(2).max(2000),
  manufacturingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  artisanName: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().min(7).max(30),
  contactEmail: z.string().trim().email().max(120).optional().or(z.literal("")),
  photoUrl: z.string().max(500).optional().or(z.literal("")),
  artisanBio: z.string().trim().max(1200).optional().or(z.literal("")),
  usageTips: z.string().trim().max(800).optional().or(z.literal("")),
  instagramUrl: z.string().trim().max(200).optional().or(z.literal("")),
  facebookUrl: z.string().trim().max(200).optional().or(z.literal("")),
  tiktokUrl: z.string().trim().max(200).optional().or(z.literal("")),
  artisanPhotos: z.array(z.string().max(500)).max(3).optional(),
  productPrice: z.string().trim().max(40).optional().or(z.literal("")),
  productDesignation: z.string().trim().max(300).optional().or(z.literal("")),
});

/** ISO date (YYYY-MM-DD) depuis un Date SQL. */
function isoDate(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

/** Lot + pack chargés avec garde de propriété. Retourne l'erreur éventuelle. */
type OwnedLoad =
  | { error: { status: number; message: string }; lot: null; pack: null; legacyOwned: false }
  | {
      error: null;
      lot: NonNullable<Awaited<ReturnType<typeof loadLotWithPack>>>;
      pack: NonNullable<Awaited<ReturnType<typeof loadLotWithPack>>>["pack"];
      legacyOwned: boolean;
    };

async function loadLotWithPack(productId: string) {
  return db.preActivatedLot.findUnique({
    where: { id: productId },
    include: { pack: true },
  });
}

async function loadOwnedProduct(
  productId: string,
  artisanId: string,
  phone: string
): Promise<OwnedLoad> {
  const lot = await loadLotWithPack(productId);
  if (!lot) {
    return {
      error: { status: 404, message: "Produit introuvable" },
      lot: null,
      pack: null,
      legacyOwned: false,
    };
  }
  const pack = lot.pack;
  const owned = pack.artisanId === artisanId;
  const legacyOwned =
    !pack.artisanId && !!pack.artisanPhone && normalizePhone(pack.artisanPhone) === phone;
  if (!owned && !legacyOwned) {
    // 404 volontaire : ne pas révéler l'existence d'un produit étranger
    return {
      error: { status: 404, message: "Produit introuvable" },
      lot: null,
      pack: null,
      legacyOwned: false,
    };
  }
  return { error: null, lot, pack, legacyOwned };
}

/** Pré-remplissage du formulaire d'édition. */
export async function GET(request: NextRequest, ctx: RouteCtx) {
  let artisanId: string;
  let phone: string;
  try {
    const payload = requireArtisanAuth(request);
    artisanId = payload.artisanId;
    phone = payload.phone;
  } catch (error) {
    const { status, message } = httpErrorStatus(error);
    return NextResponse.json({ error: message }, { status });
  }

  const { productId } = await ctx.params;

  const respond = async () => {
    const loaded = await loadOwnedProduct(productId, artisanId, phone);
    if (loaded.error || !loaded.lot || !loaded.pack) {
      return NextResponse.json(
        { error: loaded.error?.message ?? "Produit introuvable" },
        { status: loaded.error?.status ?? 404 }
      );
    }
    const { lot, pack } = loaded;
    // Nombre de QR codes du groupe produit (bandeau du formulaire d'édition)
    const groupCount = await db.preActivatedLot.count({
      where: { packId: pack.id, productName: lot.productName ?? "" },
    });
    let gallery: string[] = [];
    if (pack.artisanPhotos) {
      try {
        const parsed: unknown = JSON.parse(pack.artisanPhotos);
        if (Array.isArray(parsed)) gallery = parsed.filter((u): u is string => typeof u === "string");
      } catch {
        /* JSON invalide → galerie vide */
      }
    }
    return NextResponse.json({
      groupCount,
      product: {
        id: lot.id,
        qrCode: lot.qrCode,
        status: lot.status,
        productName: lot.productName ?? "",
        contenance: lot.contenance ?? "",
        ingredients: lot.ingredients ?? "",
        manufacturingDate: isoDate(lot.manufacturingDate),
        expirationDate: isoDate(lot.expirationDate),
        artisanName: lot.artisanName ?? "",
        contactPhone: lot.contactPhone ?? "",
        photoUrl: lot.photoUrl ?? "",
        artisanBio: lot.artisanBio ?? "",
        usageTips: lot.usageTips ?? "",
      },
      pack: {
        id: pack.id,
        masterQrCode: pack.masterQrCode,
        packNumber: pack.packNumber,
        quantity: pack.quantity,
        contactEmail: pack.artisanEmail ?? "",
        instagramUrl: pack.instagramUrl ?? "",
        facebookUrl: pack.facebookUrl ?? "",
        tiktokUrl: pack.tiktokUrl ?? "",
        productPrice: pack.productPrice ?? "",
        productDesignation: pack.productDesignation ?? "",
        artisanPhotos: gallery,
      },
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
          console.error("[artisan/products GET] retry:", retryError);
        }
      }
    }
    const { status, message } = httpErrorStatus(error);
    if (status !== 500) {
      return NextResponse.json({ error: message }, { status });
    }
    console.error("[artisan/products GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** Modification EN MASSE : tous les QR codes du même produit. */
export async function PUT(request: NextRequest, ctx: RouteCtx) {
  let artisanId: string;
  let phone: string;
  try {
    const payload = requireArtisanAuth(request);
    artisanId = payload.artisanId;
    phone = payload.phone;
  } catch (error) {
    const { status, message } = httpErrorStatus(error);
    return NextResponse.json({ error: message }, { status });
  }

  const { productId } = await ctx.params;

  let pd: z.infer<typeof ProductDataSchema>;
  try {
    pd = ProductDataSchema.parse(await request.json());
  } catch (e) {
    const details =
      e instanceof z.ZodError
        ? e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join(" ; ")
            .slice(0, 300)
        : "Corps invalide";
    return NextResponse.json({ error: "Données invalides", details }, { status: 400 });
  }

  const manufacturingDate = new Date(`${pd.manufacturingDate}T00:00:00.000Z`);
  const expirationDate = new Date(`${pd.expirationDate}T00:00:00.000Z`);
  if (
    Number.isNaN(manufacturingDate.getTime()) ||
    Number.isNaN(expirationDate.getTime())
  ) {
    return NextResponse.json(
      { error: "Dates invalides (format attendu AAAA-MM-JJ)" },
      { status: 400 }
    );
  }
  if (expirationDate <= manufacturingDate) {
    return NextResponse.json(
      { error: "La date de péremption doit être après la date de fabrication" },
      { status: 400 }
    );
  }

  const run = async () => {
    const loaded = await loadOwnedProduct(productId, artisanId, phone);
    if (loaded.error || !loaded.lot || !loaded.pack) {
      const status = loaded.error?.status ?? 404;
      const message = loaded.error?.message ?? "Produit introuvable";
      return { status, body: { error: message } };
    }
    const { lot, pack, legacyOwned } = loaded;

    // Groupe produit : tous les lots du pack portant le même nom (maître inclus)
    const group = await db.preActivatedLot.findMany({
      where: { packId: pack.id, productName: lot.productName ?? "" },
      select: { id: true },
    });

    const sharedLotData = {
      productName: pd.productName,
      contenance: pd.contenance,
      ingredients: pd.ingredients,
      manufacturingDate,
      expirationDate,
      artisanName: pd.artisanName,
      contactPhone: pd.contactPhone,
      photoUrl: pd.photoUrl || null,
      artisanBio: pd.artisanBio || null,
      usageTips: pd.usageTips || null,
    };

    await db.$transaction(async (tx) => {
      await Promise.all(
        group.map((g) =>
          tx.preActivatedLot.update({ where: { id: g.id }, data: sharedLotData })
        )
      );

      // Champs pack (mêmes pouvoirs que le formulaire d'activation).
      // ⚠️ artisanId n'est JAMAIS modifié ici : l'artisan ne peut pas
      // transférer la propriété du pack en changeant son numéro de contact.
      await tx.pack.update({
        where: { id: pack.id },
        data: {
          soldTo: pd.artisanName,
          artisanEmail: pd.contactEmail || null,
          instagramUrl: pd.instagramUrl || null,
          facebookUrl: pd.facebookUrl || null,
          tiktokUrl: pd.tiktokUrl || null,
          productPrice: pd.productPrice || null,
          productDesignation: pd.productDesignation || null,
          ...(typeof pd.artisanPhotos !== "undefined"
            ? {
                artisanPhotos:
                  pd.artisanPhotos && pd.artisanPhotos.length > 0
                    ? JSON.stringify(pd.artisanPhotos)
                    : null,
              }
            : {}),
        },
      });

      // Migration douce : pack legacy (vendu avant les comptes) lié au compte
      if (legacyOwned && !pack.artisanId) {
        await tx.pack.update({ where: { id: pack.id }, data: { artisanId } });
      }
    });

    return {
      status: 200,
      body: {
        success: true,
        updated: group.length,
        message: `${group.length} QR codes mis à jour`,
      },
    };
  };

  try {
    const result = await run();
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          const result = await run();
          const res = NextResponse.json(result.body, { status: result.status });
          const healed = [
            heal.created.length > 0 ? `tables: ${heal.created.join(",")}` : null,
            heal.columnsAdded.length > 0 ? `colonnes: ${heal.columnsAdded.join(",")}` : null,
          ]
            .filter(Boolean)
            .join(" | ");
          res.headers.set("x-db-healed", asciiHeader(healed) || "ok");
          return res;
        } catch (retryError) {
          console.error("[artisan/products PUT] retry:", retryError);
        }
      } else {
        console.error("[artisan/products PUT] heal failed:", heal.errors);
      }
    }
    const { status, message } = httpErrorStatus(error);
    if (status !== 500) {
      return NextResponse.json({ error: message }, { status });
    }
    console.error("[artisan/products PUT]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
