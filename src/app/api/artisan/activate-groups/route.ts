import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/artisan-auth";
import {
  asciiHeader,
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * POST /api/artisan/activate-groups — ACTIVATION FLEXIBLE par produits.
 *
 * Un pack peut contenir PLUSIEURS produits différents (ex. 100 karité +
 * 50 lavande + 50 miel) : l'artisan répartit ses QR codes en groupes et
 * remplit un formulaire PAR groupe. Chaque groupe reçoit SES infos produit
 * (les lots portent désormais leur propre productPrice/productDesignation).
 *
 * Comportement :
 * - Les groupes sont servis DANS L'ORDRE sur les étiquettes inactives
 *   triées par qrCode ascendant → répartition déterministe
 *   (100 karité = ART-…-0001..0100, 50 lavande = -0101..0150, …).
 * - Somme des groupes ≤ restants : activer UNE PARTIE du pack est permis
 *   (le reste sera activé plus tard en re-scannant le maître).
 * - Pack partiel → status "partial", le maître reste inactif : re-scanner
 *   le maître rouvre l'écran d'activation avec la barre de progression.
 * - Pack complet → status "activated" + maître activé avec les données du
 *   1er groupe (comportement identique au Mode 1).
 * - Lien artisan (compte, vente, réseaux, galerie) posé à la 1re
 *   activation ; les passes suivantes n'écrasent que ce qui est fourni.
 * - Compat mono-produit : un seul groupe couvrant TOUT le pack remplit
 *   aussi Pack.productPrice/productDesignation (lecture historique).
 *
 * Sécurité : validation zod stricte, transaction atomique, rate limit
 * mémoire 30/5 min/IP, auto-réparation P2021/P2022 (rejeu unique).
 */

const GroupProductSchema = z.object({
  productName: z.string().trim().min(2).max(120),
  productDesignation: z.string().trim().max(300).optional().or(z.literal("")),
  contenance: z.string().trim().min(1).max(40),
  ingredients: z.string().trim().min(2).max(2000),
  manufacturingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  photoUrl: z.string().max(500).optional().or(z.literal("")),
  artisanBio: z.string().trim().max(1200).optional().or(z.literal("")),
  usageTips: z.string().trim().max(800).optional().or(z.literal("")),
  productPrice: z.string().trim().max(40).optional().or(z.literal("")),
});

const SharedSchema = z.object({
  artisanName: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().min(7).max(30),
  contactEmail: z.string().trim().email().max(120).optional().or(z.literal("")),
  instagramUrl: z.string().trim().max(200).optional().or(z.literal("")),
  facebookUrl: z.string().trim().max(200).optional().or(z.literal("")),
  tiktokUrl: z.string().trim().max(200).optional().or(z.literal("")),
  // Galerie « L'atelier en images » — partagée par tout le pack (max 3)
  artisanPhotos: z.array(z.string().max(500)).max(3).optional(),
});

const BodySchema = z.object({
  masterCode: z.string().trim().min(8).max(80),
  groups: z
    .array(
      z.object({
        count: z.number().int().min(1).max(500),
        productData: GroupProductSchema,
      })
    )
    .min(1)
    .max(10),
  shared: SharedSchema,
});

// ── Rate limit mémoire (par IP) — mêmes seuils que activate-pack ──────────
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 30;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "inconnu";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { masterCode, groups, shared } = parsed.data;

  if (!masterCode.startsWith("MASTER-")) {
    return NextResponse.json({ error: "Code maître invalide" }, { status: 400 });
  }

  // Dates valides pour CHAQUE groupe (péremption après fabrication)
  const groupDates = groups.map((g) => {
    const manufacturingDate = new Date(`${g.productData.manufacturingDate}T00:00:00.000Z`);
    const expirationDate = new Date(`${g.productData.expirationDate}T00:00:00.000Z`);
    if (Number.isNaN(manufacturingDate.getTime()) || Number.isNaN(expirationDate.getTime())) {
      throw new Error(
        `DATES_INVALIDES:Dates invalides pour « ${g.productData.productName} »`
      );
    }
    if (expirationDate <= manufacturingDate) {
      throw new Error(
        `DATES_INVALIDES:La péremption doit suivre la fabrication pour « ${g.productData.productName} »`
      );
    }
    return { manufacturingDate, expirationDate };
  });

  const run = async (): Promise<NextResponse> => {
    const result = await db.$transaction(
      async (tx) => {
        // 1. Charger le maître + son pack + toutes ses étiquettes
        const masterLot = await tx.preActivatedLot.findUnique({
          where: { qrCode: masterCode },
          include: { pack: { include: { lots: true } } },
        });

        if (!masterLot || !masterLot.isMaster) {
          throw new Error("CODE_INVALIDE:Code maître inconnu");
        }
        const pack = masterLot.pack;

        const inactiveLots = pack.lots
          .filter((l) => !l.isMaster && l.status === "inactive")
          .sort((a, b) => a.qrCode.localeCompare(b.qrCode));
        const activeCount = pack.lots.filter(
          (l) => !l.isMaster && l.status === "active"
        ).length;

        if (inactiveLots.length === 0 || masterLot.status === "active") {
          throw new Error("DEJA_ACTIVE:Toutes les étiquettes de ce pack sont déjà activées");
        }

        const total = pack.quantity;
        const remaining = Math.max(total - activeCount, 0);
        const sum = groups.reduce((s, g) => s + g.count, 0);
        if (sum > remaining || sum > inactiveLots.length) {
          throw new Error(
            `TROP_DE_QR:${sum} QR demandés pour ${remaining} restants — réduisez les quantités`
          );
        }

        // 2. Servir les groupes dans l'ordre sur les étiquettes inactives
        const now = new Date();
        let cursor = 0;
        let firstCode = "";
        const groupsApplied: Array<{ productName: string; count: number }> = [];

        for (let i = 0; i < groups.length; i++) {
          const g = groups[i];
          const slice = inactiveLots.slice(cursor, cursor + g.count);
          cursor += g.count;
          const { manufacturingDate, expirationDate } = groupDates[i];
          const lotData = {
            status: "active" as const,
            activatedAt: now,
            productName: g.productData.productName,
            contenance: g.productData.contenance,
            ingredients: g.productData.ingredients,
            manufacturingDate,
            expirationDate,
            artisanName: shared.artisanName,
            contactPhone: shared.contactPhone,
            photoUrl: g.productData.photoUrl || null,
            productPrice: g.productData.productPrice || null,
            productDesignation: g.productData.productDesignation || null,
            artisanBio: g.productData.artisanBio || null,
            usageTips: g.productData.usageTips || null,
          };
          await Promise.all(
            slice.map((lot) =>
              tx.preActivatedLot.update({ where: { id: lot.id }, data: lotData })
            )
          );
          if (!firstCode && slice[0]) firstCode = slice[0].qrCode;
          groupsApplied.push({
            productName: g.productData.productName,
            count: slice.length,
          });
        }

        // 3. Lien artisan (1re activation) — compte créé/lié pour que le
        //    dashboard affiche immédiatement le pack (mot de passe 0000).
        const normalizedPhone = normalizePhone(shared.contactPhone).replace(/^\+/, "");
        let artisanId = pack.artisanId;
        if (!artisanId) {
          let artisan = await tx.artisan.findUnique({ where: { phone: normalizedPhone } });
          if (!artisan) {
            artisan = await tx.artisan.create({
              data: {
                phone: normalizedPhone,
                password: await bcrypt.hash("0000", 10),
                name: shared.artisanName,
              },
            });
          } else if (!artisan.name) {
            artisan = await tx.artisan.update({
              where: { id: artisan.id },
              data: { name: shared.artisanName },
            });
          }
          artisanId = artisan.id;
        }

        // 4. Statut du pack + champs partagés
        const activatedTotal = activeCount + sum;
        const fullyActivated = activatedTotal >= total;
        await tx.pack.update({
          where: { id: pack.id },
          data: {
            status: fullyActivated ? "activated" : "partial",
            ...(pack.artisanId
              ? {}
              : {
                  soldTo: shared.artisanName,
                  soldAt: now,
                  artisanPhone: shared.contactPhone,
                  artisanId,
                  artisanEmail: shared.contactEmail || null,
                }),
            // Passes suivantes : on ne met à jour QUE ce qui est fourni
            // (ne jamais effacer les réseaux/galerie d'une passe précédente)
            ...(shared.instagramUrl ? { instagramUrl: shared.instagramUrl } : {}),
            ...(shared.facebookUrl ? { facebookUrl: shared.facebookUrl } : {}),
            ...(shared.tiktokUrl ? { tiktokUrl: shared.tiktokUrl } : {}),
            ...(shared.artisanPhotos && shared.artisanPhotos.length > 0
              ? { artisanPhotos: JSON.stringify(shared.artisanPhotos) }
              : {}),
            // Compat mono-produit : 1 seul groupe couvrant tout le pack
            // remplit aussi les champs pack lus par l'existant.
            ...(fullyActivated && groups.length === 1 && sum === total
              ? {
                  productPrice: groups[0].productData.productPrice || null,
                  productDesignation: groups[0].productData.productDesignation || null,
                }
              : {}),
          },
        });

        // 5. Pack complet → le maître devient une page produit (1er groupe)
        if (fullyActivated) {
          const first = groups[0].productData;
          await tx.preActivatedLot.update({
            where: { id: masterLot.id },
            data: {
              status: "active",
              activatedAt: now,
              productName: first.productName,
              contenance: first.contenance,
              ingredients: first.ingredients,
              manufacturingDate: groupDates[0].manufacturingDate,
              expirationDate: groupDates[0].expirationDate,
              artisanName: shared.artisanName,
              contactPhone: shared.contactPhone,
              photoUrl: first.photoUrl || null,
              productPrice: first.productPrice || null,
              productDesignation: first.productDesignation || null,
              artisanBio: first.artisanBio || null,
              usageTips: first.usageTips || null,
            },
          });
        }

        return {
          activated: sum,
          activatedTotal,
          quantity: total,
          remaining: Math.max(total - activatedTotal, 0),
          fullyActivated,
          firstCode,
          groupsApplied,
        };
      },
      { timeout: 25000 }
    );

    return NextResponse.json({
      success: true,
      activated: result.activated,
      activatedTotal: result.activatedTotal,
      quantity: result.quantity,
      remaining: result.remaining,
      fullyActivated: result.fullyActivated,
      firstCode: result.firstCode,
      groups: result.groupsApplied,
      message: `${result.activated} QR codes activés — ${result.activatedTotal}/${result.quantity} au total`,
    });
  };

  try {
    return await run();
  } catch (error) {
    // Auto-réparation puis rejeu unique (P2021/P2022)
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          const res = await run();
          const healed = [
            heal.created.length > 0 ? `tables: ${heal.created.join(",")}` : null,
            heal.columnsAdded.length > 0 ? `colonnes: ${heal.columnsAdded.join(",")}` : null,
          ]
            .filter(Boolean)
            .join(" | ");
          res.headers.set("x-db-healed", asciiHeader(healed) || "ok");
          console.log(`[activate-groups] Réussi après auto-réparation (${healed})`);
          return res;
        } catch (retryError) {
          error = retryError;
        }
      } else {
        console.error("[activate-groups] Auto-réparation échouée:", heal.errors);
      }
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.startsWith("CODE_INVALIDE:")) {
      return NextResponse.json({ error: msg.split(":")[1] }, { status: 404 });
    }
    if (msg.startsWith("DEJA_ACTIVE:")) {
      return NextResponse.json({ error: msg.split(":")[1] }, { status: 409 });
    }
    if (msg.startsWith("TROP_DE_QR:") || msg.startsWith("DATES_INVALIDES:")) {
      return NextResponse.json({ error: msg.split(":")[1] }, { status: 400 });
    }
    console.error("[activate-groups] Erreur:", error);
    const details = msg.slice(0, 300);
    return NextResponse.json(
      { error: "Erreur serveur pendant l'activation", details },
      { status: 500 }
    );
  }
}
