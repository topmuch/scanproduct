import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import {
  asciiHeader,
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * SuperAdmin — consultation / modification du produit attaché à un pack
 * de QR codes artisans (demande utilisateur : « le QR code créé par
 * l'artisan doit pouvoir être modifié par le superadmin, avec un bouton
 * Modifier à côté du QR code »).
 *
 * GET  /api/admin/packs/<packId>/product
 *   → état actuel (données produit du lot maître + champs commerciaux du
 *     pack) pour pré-remplir le formulaire de modification.
 *
 * PATCH /api/admin/packs/<packId>/product
 *   → met à jour TOUTES les étiquettes du pack (maître + produits) avec
 *     les données produit saisies, ainsi que les champs pack (contact,
 *     réseaux sociaux, prix consommateur, désignation).
 *     Même pouvoir que l'activation artisan (activate-pack) mais réservé
 *     au SUPERADMIN et audité (auditLog).
 *
 * AUTO-RÉPARATION : en cas de P2021/P2022 (table/colonne manquante = db
 * push raté sur le volume), on applique ensureArtisanTables puis on rejoue
 * UNE fois — le SuperAdmin voit simplement la modification aboutir.
 */

type RouteCtx = { params: Promise<{ packId: string }> };

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
  productPrice: z.string().trim().max(40).optional().or(z.literal("")),
  productDesignation: z.string().trim().max(300).optional().or(z.literal("")),
});

const PatchBodySchema = z.object({
  productData: ProductDataSchema,
});

/** ISO date (YYYY-MM-DD) depuis un Date SQL. */
function isoDate(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

/** Charge pack + lot maître (avec les colonnes produit). */
async function loadPackWithMaster(packId: string) {
  const pack = await db.pack.findUnique({
    where: { id: packId },
    include: {
      lots: {
        where: { isMaster: true },
        select: {
          id: true,
          qrCode: true,
          status: true,
          productName: true,
          contenance: true,
          ingredients: true,
          manufacturingDate: true,
          expirationDate: true,
          artisanName: true,
          contactPhone: true,
          photoUrl: true,
          productPrice: true,
          productDesignation: true,
          artisanBio: true,
          usageTips: true,
        },
      },
    },
  });
  if (!pack) return null;
  return { pack, master: pack.lots[0] ?? null };
}

/** Réponse de pré-remplissage (identique après heal ou pas). */
function prefillResponse(loaded: NonNullable<Awaited<ReturnType<typeof loadPackWithMaster>>>) {
  const { pack, master } = loaded;
  return {
    pack: {
      id: pack.id,
      masterQrCode: pack.masterQrCode,
      status: pack.status,
      packNumber: pack.packNumber,
      quantity: pack.quantity,
    },
    productData: {
      productName: master?.productName ?? "",
      productDesignation: master?.productDesignation ?? pack.productDesignation ?? "",
      contenance: master?.contenance ?? "",
      ingredients: master?.ingredients ?? "",
      manufacturingDate: isoDate(master?.manufacturingDate),
      expirationDate: isoDate(master?.expirationDate),
      artisanName: master?.artisanName ?? pack.soldTo ?? "",
      contactPhone: master?.contactPhone ?? pack.artisanPhone ?? "",
      contactEmail: pack.artisanEmail ?? "",
      photoUrl: master?.photoUrl ?? "",
      artisanBio: master?.artisanBio ?? "",
      usageTips: master?.usageTips ?? "",
      instagramUrl: pack.instagramUrl ?? "",
      facebookUrl: pack.facebookUrl ?? "",
      tiktokUrl: pack.tiktokUrl ?? "",
      productPrice: master?.productPrice ?? pack.productPrice ?? "",
    },
  };
}

/** Pré-remplissage du formulaire de modification (SuperAdmin). */
export async function GET(_request: NextRequest, ctx: RouteCtx) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { packId } = await ctx.params;
  try {
    const loaded = await loadPackWithMaster(packId);
    if (!loaded) {
      return NextResponse.json({ error: "Pack introuvable" }, { status: 404 });
    }
    return NextResponse.json(prefillResponse(loaded));
  } catch (error) {
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        const loaded = await loadPackWithMaster(packId);
        if (loaded) {
          return NextResponse.json(prefillResponse(loaded));
        }
        return NextResponse.json({ error: "Pack introuvable" }, { status: 404 });
      }
    }
    console.error("[GET admin/packs/:id/product]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** Modification des données produit de tout le pack par le SuperAdmin. */
export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { packId } = await ctx.params;

  let pd: z.infer<typeof ProductDataSchema>;
  try {
    pd = PatchBodySchema.parse(await request.json()).productData;
  } catch (e) {
    const details =
      e instanceof z.ZodError
        ? e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join(" ; ")
            .slice(0, 300)
        : "Corps invalide";
    return NextResponse.json(
      { error: "Données invalides", details },
      { status: 400 },
    );
  }

  const manufacturingDate = new Date(`${pd.manufacturingDate}T00:00:00.000Z`);
  const expirationDate = new Date(`${pd.expirationDate}T00:00:00.000Z`);
  if (
    Number.isNaN(manufacturingDate.getTime()) ||
    Number.isNaN(expirationDate.getTime())
  ) {
    return NextResponse.json(
      { error: "Dates invalides (format attendu AAAA-MM-JJ)" },
      { status: 400 },
    );
  }

  const run = async () => {
    const pack = await db.pack.findUnique({
      where: { id: packId },
      select: { id: true, lots: { select: { id: true } } },
    });
    if (!pack) {
      return { status: 404, body: { error: "Pack introuvable" } };
    }

    const sharedLotData = {
      productName: pd.productName,
      contenance: pd.contenance,
      ingredients: pd.ingredients,
      manufacturingDate,
      expirationDate,
      artisanName: pd.artisanName,
      contactPhone: pd.contactPhone,
      photoUrl: pd.photoUrl || null,
      // Activation flexible : prix + désignation portés PAR LOT
      productPrice: pd.productPrice || null,
      productDesignation: pd.productDesignation || null,
      artisanBio: pd.artisanBio || null,
      usageTips: pd.usageTips || null,
    };

    // GROUPE PRODUIT du maître (pas tout le pack) : en activation flexible,
    // un pack contient plusieurs produits — la correction du SuperAdmin ne
    // doit toucher QUE le produit affiché par le formulaire (celui du
    // maître), jamais les autres groupes.
    const allLots = await db.preActivatedLot.findMany({
      where: { packId: pack.id },
      select: { id: true, isMaster: true, productName: true },
    });
    const masterName = allLots.find((l) => l.isMaster)?.productName ?? null;
    const targetLots =
      masterName === null
        ? allLots
        : allLots.filter(
            (l) => (l.productName ?? "") === masterName || l.isMaster,
          );

    await db.$transaction(async (tx) => {
      await Promise.all(
        targetLots.map((lot) =>
          tx.preActivatedLot.update({
            where: { id: lot.id },
            data: sharedLotData,
          }),
        ),
      );

      // Pack mono-produit uniquement : prix/désignation reflétés au niveau
      // pack (les packs multi-produits gardent leurs valeurs PAR LOT).
      const productGroupCount = await tx.preActivatedLot.findMany({
        where: { packId: pack.id, status: "active", isMaster: false },
        distinct: ["productName"],
        select: { productName: true },
      });
      await tx.pack.update({
        where: { id: pack.id },
        data: {
          soldTo: pd.artisanName,
          artisanPhone: pd.contactPhone,
          artisanEmail: pd.contactEmail || null,
          instagramUrl: pd.instagramUrl || null,
          facebookUrl: pd.facebookUrl || null,
          tiktokUrl: pd.tiktokUrl || null,
          ...(productGroupCount.length <= 1
            ? {
                productPrice: pd.productPrice || null,
                productDesignation: pd.productDesignation || null,
              }
            : {}),
        },
      });
    });

    await db.auditLog.create({
      data: {
        userId: session.user?.id ?? null,
        action: "ADMIN_UPDATE_PACK_PRODUCT",
        entity: "Pack",
        entityId: packId,
        metadata: JSON.stringify({
          lotsUpdated: targetLots.length,
          productName: pd.productName,
          artisanName: pd.artisanName,
        }),
      },
    });

    return {
      status: 200,
      body: { success: true, lotsUpdated: targetLots.length },
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
          // asciiHeader obligatoire : un en-tête HTTP refuse tout code > 255
          const healed = [
            heal.created.length > 0 ? `tables: ${heal.created.join(",")}` : null,
            heal.columnsAdded.length > 0 ? `colonnes: ${heal.columnsAdded.join(",")}` : null,
          ]
            .filter(Boolean)
            .join(" | ");
          res.headers.set("x-db-healed", asciiHeader(healed) || "ok");
          return res;
        } catch (retryError) {
          console.error("[PATCH admin/packs/:id/product] retry:", retryError);
        }
      } else {
        console.error("[PATCH admin/packs/:id/product] heal failed:", heal.errors);
      }
    }
    console.error("[PATCH admin/packs/:id/product]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
