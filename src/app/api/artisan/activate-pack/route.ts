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
 * POST /api/artisan/activate-pack
 *
 * Activation EN MASSE du pack artisanal (MODE 1 — « tout le pack d'un coup »)
 * : l'artisan scanne le QR Code Maître et remplit un formulaire unique —
 * TOUTES les étiquettes ENCORE INACTIVES du pack reçoivent les mêmes infos
 * produit et passent `active`.
 *
 * Compatible packs PARTIELS (activation flexible par groupes) : si une
 * partie des étiquettes est déjà active, ce formulaire active le RESTANT
 * — le maître/pack ne passent « activated » qu'une fois tout activé.
 *
 * Sécurité :
 * - Transaction atomique + garde `status === 'inactive'` → double
 *   activation impossible (race condition de 2 scans simultanés).
 * - Validation zod stricte des données produit.
 * - Rate limit mémoire : 10 activations / 5 min / IP.
 * - Le pack passe `activated`, l'artisan est enregistré sur le pack.
 *
 * AUTO-RÉPARATION : si la DB de prod est restée sur un schéma ancien (ex.
 * PreActivatedLot sans les colonnes artisanBio/usageTips ajoutées par la
 * page artisan v2 — `prisma db push` échouant silencieusement sur le volume),
 * l'activation échouerait en P2022. On répare le schéma via
 * $executeRawUnsafe puis on rejoue UNE fois — l'artisan ne voit rien.
 */

const ProductDataSchema = z.object({
  productName: z.string().trim().min(2).max(120),
  contenance: z.string().trim().min(1).max(40),
  ingredients: z.string().trim().min(2).max(2000),
  manufacturingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  artisanName: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().min(7).max(30),
  // Email optionnel — affiché sur la page produit (ligne « Écrire »)
  contactEmail: z.string().trim().email().max(120).optional().or(z.literal("")),
  photoUrl: z.string().max(500).optional().or(z.literal("")),
  // Optionnels — alimentent les sections « Histoire » et « Conseils » de la
  // page publique engageante. Absents = sections avec contenu par défaut.
  artisanBio: z.string().trim().max(1200).optional().or(z.literal("")),
  usageTips: z.string().trim().max(800).optional().or(z.literal("")), // 1 conseil par ligne
  // Réseaux sociaux (optionnels) — affichés dans la carte « Coordonnées »
  instagramUrl: z.string().trim().max(200).optional().or(z.literal("")),
  facebookUrl: z.string().trim().max(200).optional().or(z.literal("")),
  tiktokUrl: z.string().trim().max(200).optional().or(z.literal("")),
  // Galerie « L'atelier en images » — tableau JSON d'URLs (max 3)
  artisanPhotos: z.array(z.string().max(500)).max(3).optional(),
  // Prix consommateur affiché sur la page produit (texte libre, ex. « 5 000 FCFA »)
  productPrice: z.string().trim().max(40).optional().or(z.literal("")),
  // Désignation du produit : description courte sous le nom sur la page publique
  productDesignation: z.string().trim().max(300).optional().or(z.literal("")),
});

const BodySchema = z.object({
  masterCode: z.string().trim().min(8).max(80),
  productData: ProductDataSchema,
});

// ── Rate limit mémoire (par IP) ──────────────────────────────────────────
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
  const { masterCode, productData } = parsed.data;

  if (!masterCode.startsWith("MASTER-")) {
    return NextResponse.json({ error: "Code maître invalide" }, { status: 400 });
  }

  const manufacturingDate = new Date(`${productData.manufacturingDate}T00:00:00.000Z`);
  const expirationDate = new Date(`${productData.expirationDate}T00:00:00.000Z`);
  if (Number.isNaN(manufacturingDate.getTime()) || Number.isNaN(expirationDate.getTime())) {
    return NextResponse.json({ error: "Dates invalides" }, { status: 400 });
  }
  if (expirationDate <= manufacturingDate) {
    return NextResponse.json(
      { error: "La date de péremption doit être après la date de fabrication" },
      { status: 400 }
    );
  }

  const run = async (): Promise<NextResponse> => {
    const result = await db.$transaction(
      async (tx) => {
        // 1. Charger le maître + son pack + les étiquettes à activer
        const masterLot = await tx.preActivatedLot.findUnique({
          where: { qrCode: masterCode },
          include: {
            pack: {
              include: { lots: { where: { isMaster: false } } },
            },
          },
        });

        if (!masterLot || !masterLot.isMaster) {
          throw new Error("CODE_INVALIDE:Code maître inconnu");
        }
        // Pack partiel autorisé : on active uniquement les étiquettes
        // encore inactives (le reste a pu être activé par groupes via
        // /api/artisan/activate-groups).
        const inactiveLots = masterLot.pack.lots.filter((l) => l.status === "inactive");
        if (
          masterLot.status === "active" ||
          masterLot.pack.status === "activated" ||
          inactiveLots.length === 0
        ) {
          throw new Error("DEJA_ACTIVE:Ce pack a déjà été activé");
        }

        const sharedData = {
          status: "active" as const,
          activatedAt: new Date(),
          productName: productData.productName,
          contenance: productData.contenance,
          ingredients: productData.ingredients,
          manufacturingDate,
          expirationDate,
          artisanName: productData.artisanName,
          contactPhone: productData.contactPhone,
          photoUrl: productData.photoUrl || null,
          // Par-lot aussi (activation flexible) — l'overwrite pack ci-dessous
          // garde la compatibilité avec les lectures historiques.
          productPrice: productData.productPrice || null,
          productDesignation: productData.productDesignation || null,
          artisanBio: productData.artisanBio || null,
          usageTips: productData.usageTips || null,
        };

        // 2. Activer les étiquettes produit ENCORE INACTIVES du pack
        await Promise.all(
          inactiveLots.map((lot) =>
            tx.preActivatedLot.update({
              where: { id: lot.id },
              data: sharedData,
            })
          )
        );

        // 3. Activer le maître lui-même
        await tx.preActivatedLot.update({
          where: { id: masterLot.id },
          data: sharedData,
        });

        // 4. Enregistrer l'artisan sur le pack + statut activated.
        //    Portail artisan : le compte Artisan est créé/lié (téléphone =
        //    identifiant, mot de passe par défaut « 0000 ») pour que le
        //    dashboard /artisan/dashboard affiche immédiatement le pack,
        //    même si le pack n'a pas été « vendu » au préalable.
        const normalizedPhone = normalizePhone(productData.contactPhone).replace(/^\+/, "");
        let artisan = await tx.artisan.findUnique({ where: { phone: normalizedPhone } });
        if (!artisan) {
          artisan = await tx.artisan.create({
            data: {
              phone: normalizedPhone,
              password: await bcrypt.hash("0000", 10),
              name: productData.artisanName,
            },
          });
        } else if (!artisan.name) {
          artisan = await tx.artisan.update({
            where: { id: artisan.id },
            data: { name: productData.artisanName },
          });
        }

        const fullyActivated =
          inactiveLots.length +
            masterLot.pack.lots.filter((l) => l.status === "active").length >=
          masterLot.pack.quantity;

        await tx.pack.update({
          where: { id: masterLot.packId },
          data: {
            status: fullyActivated ? "activated" : "partial",
            soldTo: productData.artisanName,
            soldAt: new Date(),
            artisanPhone: productData.contactPhone,
            artisanId: artisan.id,
            artisanEmail: productData.contactEmail || null,
            instagramUrl: productData.instagramUrl || null,
            facebookUrl: productData.facebookUrl || null,
            tiktokUrl: productData.tiktokUrl || null,
            artisanPhotos:
              productData.artisanPhotos && productData.artisanPhotos.length > 0
                ? JSON.stringify(productData.artisanPhotos)
                : null,
            productPrice: productData.productPrice || null,
            productDesignation: productData.productDesignation || null,
          },
        });

        return {
          activated: inactiveLots.length,
          // Code du 1er produit activé → le bouton « Voir le produit activé »
          // de l'écran de succès mène directement à la page publique.
          firstCode: inactiveLots[0]?.qrCode ?? masterLot.qrCode,
        };
      },
      { timeout: 20000 }
    );

    return NextResponse.json({
      success: true,
      activated: result.activated,
      firstCode: result.firstCode,
      message: `${result.activated} produits activés avec succès !`,
    });
  };

  try {
    return await run();
  } catch (error) {
    // Auto-réparation puis rejeu unique (P2021/P2022 : table ou colonne
    // manquante = db push raté en prod). Les erreurs métier
    // (CODE_INVALIDE / DEJA_ACTIVE) ne matchent jamais isTableMissingError.
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          const res = await run();
          const healed = [heal.created.length > 0 ? `tables: ${heal.created.join(",")}` : null,
            heal.columnsAdded.length > 0 ? `colonnes: ${heal.columnsAdded.join(",")}` : null]
            .filter(Boolean)
            .join(" | ");
          // asciiHeader obligatoire : un en-tête HTTP refuse tout code > 255
          res.headers.set("x-db-healed", asciiHeader(healed) || "ok");
          console.log(`[activate-pack] Réussi après auto-réparation (${healed})`);
          return res;
        } catch (retryError) {
          error = retryError;
        }
      } else {
        console.error("[activate-pack] Auto-réparation échouée:", heal.errors);
      }
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.startsWith("CODE_INVALIDE:")) {
      return NextResponse.json({ error: msg.split(":")[1] }, { status: 404 });
    }
    if (msg.startsWith("DEJA_ACTIVE:")) {
      return NextResponse.json({ error: msg.split(":")[1] }, { status: 409 });
    }
    console.error("[activate-pack] Erreur:", error);
    // Détail exposé (sans donnée sensible) → un 500 en prod est
    // diagnostiquable depuis le message d'erreur affiché à l'écran.
    const details = msg.slice(0, 300);
    return NextResponse.json(
      { error: "Erreur serveur pendant l'activation", details },
      { status: 500 }
    );
  }
}
