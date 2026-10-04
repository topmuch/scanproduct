import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { normalizePhone } from "@/lib/artisan-auth";
import {
  asciiHeader,
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";
import { resolveSiteOrigin } from "@/lib/site-origin";

/**
 * POST /api/admin/sell-pack — VENTE d'un pack de QR codes à un artisan
 * (SuperAdmin, onglet « QR Artisans »).
 *
 * Corps : { packId, artisanPhone, artisanName }
 *
 * Transaction :
 *   1. Le pack doit être `available` (double vente impossible).
 *   2. Pack → status 'sold', soldAt, artisanPhone (normalisé), soldTo.
 *   3. Compte Artisan : créé avec le mot de passe par défaut « 0000 »
 *      (hashé bcrypt) s'il n'existe pas, sinon son nom est mis à jour.
 *   4. Lien pack ↔ artisan (artisanId).
 *
 * AUCUN envoi automatique : la route renvoie le LIEN wa.me pré-rempli que
 * le SuperAdmin clique (bouton vert « Envoyer via WhatsApp ») — cf. spec
 * « Interface après vente ». Le lien est construit avec l'origine de la
 * requête : le lien /artisan/login pointe vers l'environnement réellement
 * consulté par le SuperAdmin (sandbox, prod...).
 *
 * AUTO-RÉPARATION : en cas de P2021/P2022 (table/colonne manquante), le DDL
 * est appliqué puis la transaction rejouée UNE fois.
 */

const BodySchema = z.object({
  packId: z.string().trim().min(5).max(80),
  artisanPhone: z.string().trim().min(6).max(30),
  artisanName: z.string().trim().min(2).max(120),
});

const DEFAULT_PASSWORD = "0000";

/**
 * Message WhatsApp — NOUVEAU client : identifiants complets (0000).
 */
function buildWhatsAppMessage(opts: {
  artisanName: string;
  quantity: number;
  loginUrl: string;
  phone: string;
  password: string;
}): string {
  return [
    `🎉 Bonjour ${opts.artisanName} !`,
    "",
    `Votre pack de ${opts.quantity} QR codes est prêt.`,
    "",
    "📱 Connectez-vous à votre espace :",
    opts.loginUrl,
    "",
    `🔑 Identifiant : ${opts.phone}`,
    `🔑 Mot de passe : ${opts.password}`,
    "",
    "💡 Scannez votre QR Code Maître pour activer vos produits.",
    "",
    "L'équipe VerifScan",
  ].join("\n");
}

/**
 * Message WhatsApp — CLIENT EXISTANT (rachat de lot) : pas de nouveau
 * mot de passe, le lot rejoint automatiquement son dashboard existant.
 */
function buildReturningWhatsAppMessage(opts: {
  artisanName: string;
  quantity: number;
  loginUrl: string;
  phone: string;
}): string {
  return [
    `🎉 Bonjour ${opts.artisanName} !`,
    "",
    `Votre NOUVEAU pack de ${opts.quantity} QR codes est prêt.`,
    "",
    "✅ Il a été ajouté à votre tableau de bord VerifScan existant.",
    "",
    "📱 Connectez-vous avec vos identifiants habituels :",
    opts.loginUrl,
    `🔑 Identifiant : ${opts.phone}`,
    "",
    "💡 Scannez le QR Code Maître de ce nouveau lot pour activer vos produits.",
    "",
    "L'équipe VerifScan",
  ].join("\n");
}

const run = async (
  packId: string,
  artisanPhoneRaw: string,
  artisanName: string,
  origin: string
) => {
  const phone = normalizePhone(artisanPhoneRaw).replace(/^\+/, "");

  const result = await db.$transaction(async (tx) => {
    // 1. Pack disponible ? (garde anti double-vente dans la transaction)
    const pack = await tx.pack.findUnique({ where: { id: packId } });
    if (!pack) {
      throw new Error("HTTP_404:Pack introuvable");
    }
    if (pack.status !== "available") {
      throw new Error("HTTP_409:Ce pack a déjà été vendu");
    }

    // 2. Compte Artisan (créé avec le mot de passe « 0000 » par défaut)
    //    RACHAT DE LOT : si le compte existe DÉJÀ (lot précédent), on le
    //    réutilise — le nouveau lot rejoindra le dashboard existant.
    const existing = await tx.artisan.findUnique({ where: { phone } });
    const existed = Boolean(existing);
    let artisan = existing;
    if (!artisan) {
      artisan = await tx.artisan.create({
        data: {
          phone,
          password: await bcrypt.hash(DEFAULT_PASSWORD, 10),
          name: artisanName,
        },
      });
    } else if (artisan.name !== artisanName) {
      artisan = await tx.artisan.update({
        where: { id: artisan.id },
        data: { name: artisanName },
      });
    }

    // 3. Vente + lien pack ↔ artisan
    const soldAt = new Date();
    const updated = await tx.pack.update({
      where: { id: pack.id },
      data: {
        status: "sold",
        soldAt,
        artisanPhone: phone,
        soldTo: artisanName,
        artisanId: artisan.id,
      },
    });

    return { pack: updated, artisan, existed };
  });

  const loginUrl = `${origin.replace(/\/$/, "")}/artisan/login`;
  const message = result.existed
    ? buildReturningWhatsAppMessage({
        artisanName: result.artisan.name ?? artisanName,
        quantity: result.pack.quantity,
        loginUrl,
        phone: result.artisan.phone,
      })
    : buildWhatsAppMessage({
        artisanName: result.artisan.name ?? artisanName,
        quantity: result.pack.quantity,
        loginUrl,
        phone: result.artisan.phone,
        password: DEFAULT_PASSWORD,
      });
  const whatsappLink = `https://wa.me/221${result.artisan.phone}?text=${encodeURIComponent(message)}`;

  return NextResponse.json({
    success: true,
    pack: {
      id: result.pack.id,
      packNumber: result.pack.packNumber,
      quantity: result.pack.quantity,
      masterQrCode: result.pack.masterQrCode,
      status: result.pack.status,
    },
    artisan: {
      id: result.artisan.id,
      phone: result.artisan.phone,
      name: result.artisan.name,
    },
    defaultPassword: DEFAULT_PASSWORD,
    loginUrl,
    whatsappLink,
    whatsappMessage: message,
    // Rachat de lot : true = le client avait déjà un compte → le lot
    // rejoint son dashboard existant (mot de passe inchangé).
    existingClient: result.existed,
    message: "Pack vendu avec succès. Cliquez sur le lien WhatsApp pour envoyer les codes.",
  });
};

export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
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

  const { packId, artisanPhone, artisanName } = parsed.data;
  // Origine ROBUSTE (site-origin.ts) : derrière le proxy Coolify,
  // request.nextUrl.origin renvoyait « https://0.0.0.0:80 » → lien mort
  // dans le message WhatsApp. On retient x-forwarded-host (le domaine
  // réellement consulté par le SuperAdmin), sinon l'origine directe,
  // sinon NEXT_PUBLIC_APP_URL — jamais 0.0.0.0/localhost en production.
  const origin = resolveSiteOrigin(request);

  try {
    return await run(packId, artisanPhone, artisanName, origin);
  } catch (error) {
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          const res = await run(packId, artisanPhone, artisanName, origin);
          const healed = [
            heal.created.length > 0 ? `tables: ${heal.created.join(",")}` : null,
            heal.columnsAdded.length > 0 ? `colonnes: ${heal.columnsAdded.join(",")}` : null,
          ]
            .filter(Boolean)
            .join(" | ");
          // asciiHeader obligatoire : un en-tête HTTP refuse tout code > 255
          res.headers.set("x-db-healed", asciiHeader(healed) || "ok");
          return res;
        } catch (retryError) {
          error = retryError;
        }
      } else {
        console.error("[admin/sell-pack] heal failed:", heal.errors);
      }
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.startsWith("HTTP_404:")) {
      return NextResponse.json({ error: msg.split(":").slice(1).join(":") }, { status: 404 });
    }
    if (msg.startsWith("HTTP_409:")) {
      return NextResponse.json({ error: msg.split(":").slice(1).join(":") }, { status: 409 });
    }
    console.error("[admin/sell-pack]", error);
    return NextResponse.json({ error: "Erreur serveur pendant la vente" }, { status: 500 });
  }
}
