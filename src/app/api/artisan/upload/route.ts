import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getArtisanFromToken, normalizePhone } from "@/lib/artisan-auth";
import { isTableMissingError, ensureArtisanTables } from "@/lib/ensure-artisan-tables";

/**
 * POST /api/artisan/upload
 *
 * Upload de photos du parcours ARTISANAL (photo produit / galerie atelier).
 *
 * ── STOCKAGE EN BASE (fix « photo ne s'affiche plus après activation ») ──
 * Avant : fichier écrit sur le disque (UPLOAD_DIR) + URL /api/uploads/<f>.
 *   → en production Coolify, tout fichier hors volume persistant est PERDU
 *     à chaque redéploiement (recréation du conteneur) → images cassées sur
 *     toutes les pages publiques.
 * Maintenant : l'image est COMPRESSÉE (sharp → WebP ≤ 1200px, ~60-150 Ko)
 *   puis stockée dans la table SQLite `ArtisanPhoto` (BLOB). La DB vit sur
 *   le volume /app/data — monté obligatoirement (sinon la base entière
 *   disparaît) → les photos survivent aux redéploiements, comme les comptes.
 *   URL renvoyée : /api/artisan/photo/<filename> (route de service dédiée,
 *   lecture DB). Les anciennes URLs /api/uploads/… restent servies (compat).
 *
 * Deux modes d'autorisation :
 *   1. ACTIVATION (sans compte) : champ `masterCode` multipart — le code
 *      maître doit exister, être isMaster et appartenir à un pack encore
 *      activable → exploitable uniquement pendant l'activation légitime.
 *   2. ÉDITION (portail artisan connecté) : JWT artisan en en-tête
 *      `Authorization: Bearer` + champ `packId` — le pack doit appartenir à
 *      l'artisan (artisanId, ou correspondance téléphone pour les packs
 *      vendus avant l'introduction des comptes). Permet de changer la photo
 *      d'un produit DÉJÀ activé depuis /artisan/products/<id>/edit.
 *
 * Contraintes fichier : image ≤ 5 Mo (jpg/png/webp/gif), PDF ≤ 5 Mo.
 * Format détecté par magic bytes — JAMAIS par l'extension.
 *
 * ── DOCUMENTS PDF (certificat laboratoire) ──────────────────────────────
 * Le wizard d'activation permet d'insérer un certificat d'analyse/attestation
 * de laboratoire : les magic bytes « %PDF » sont reconnus, le fichier est
 * stocké BRUT (sharp ne compresse pas les PDF) avec mimeType
 * application/pdf — servi en inline par /api/artisan/photo/<filename>
 * (le lecteur PDF du navigateur l'ouvre directement).
 */
export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024;
/** Dimension maximale (côté long) après compression — largement suffisant
 *  pour l'affichage mobile/desktop, garde la base légère. */
const MAX_DIMENSION = 1200;
/** Qualité WebP — compromis poids/qualité éprouvé pour photos produits. */
const WEBP_QUALITY = 82;

function detectFormatFromBytes(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "png";
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif";
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "webp";
  // PDF (certificat laboratoire) : signature « %PDF- » en tête.
  if (buf.length >= 5 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "pdf";
  return null;
}

/** Compression WebP (sharp) — retourne null si sharp échoue (fallback brut). */
async function compressToWebp(buf: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(buf)
      .rotate() // respecte l'orientation EXIF (photos prises au téléphone)
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch (e) {
    console.error("[artisan/upload] compression sharp échouée (fallback original):", e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formulaire invalide" }, { status: 400 });
  }

  // ── Garde : ACTIVATION par code maître OU ÉDITION authentifiée ──────────
  const masterCode = String(formData.get("masterCode") || "").trim();
  const packIdField = String(formData.get("packId") || "").trim();
  const artisan = getArtisanFromToken(request);

  if (masterCode.startsWith("MASTER-")) {
    // Mode 1 : activation (sans compte) — le pack doit être activable
    const masterLot = await db.preActivatedLot.findUnique({
      where: { qrCode: masterCode },
      include: { pack: true },
    });
    if (!masterLot || !masterLot.isMaster) {
      return NextResponse.json({ error: "Code maître inconnu" }, { status: 404 });
    }
    if (masterLot.pack.status === "activated" || masterLot.status === "active") {
      return NextResponse.json({ error: "Ce pack est déjà activé" }, { status: 409 });
    }
  } else if (artisan && packIdField) {
    // Mode 2 : édition authentifiée — le pack doit appartenir à l'artisan
    const pack = await db.pack.findUnique({ where: { id: packIdField } });
    if (!pack) {
      return NextResponse.json({ error: "Pack introuvable" }, { status: 404 });
    }
    const owned =
      pack.artisanId === artisan.artisanId ||
      (!pack.artisanId &&
        !!pack.artisanPhone &&
        normalizePhone(pack.artisanPhone) === artisan.phone);
    if (!owned) {
      // 404 volontaire : ne pas révéler l'existence d'un pack étranger
      return NextResponse.json({ error: "Pack introuvable" }, { status: 404 });
    }
  } else {
    return NextResponse.json(
      { error: "Code maître invalide" },
      { status: 400 }
    );
  }

  // ── Fichier ────────────────────────────────────────────────────────────
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant (champ 'file')" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 5 Mo)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = detectFormatFromBytes(buffer);
  if (!ext) {
    return NextResponse.json(
      { error: "Format non reconnu (images jpg, png, webp, gif ou PDF uniquement)" },
      { status: 415 }
    );
  }

  // ── Compression + stockage EN BASE (ArtisanPhoto BLOB) ─────────────────
  // PDF : stockage BRUT — sharp ne traite que les images, tenter de le
  // passer dans sharp renverrait null (fallback) puis un fichier illisible.
  const isPdf = ext === "pdf";
  const webp = isPdf ? null : await compressToWebp(buffer);
  const stored = webp ?? buffer; // fallback : original si sharp indisponible
  const mimeType = isPdf
    ? "application/pdf"
    : webp
      ? "image/webp"
      : `image/${ext === "jpg" ? "jpeg" : ext}`;
  const filename = `artisan-${randomUUID()}.${isPdf ? "pdf" : webp ? "webp" : ext}`;

  try {
    await db.artisanPhoto.create({
      data: { filename, mimeType, size: stored.length, data: new Uint8Array(stored) },
    });
  } catch (e) {
    // Auto-réparation : table absente en prod (DB créée avant ce module)
    if (isTableMissingError(e)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          await db.artisanPhoto.create({
            data: { filename, mimeType, size: stored.length, data: new Uint8Array(stored) },
          });
          // enregistré après réparation → continuer
        } catch (retry) {
          console.error("[artisan/upload] écriture DB après réparation impossible:", retry);
          return NextResponse.json(
            { error: "Erreur serveur pendant l'enregistrement de la photo" },
            { status: 500 },
          );
        }
      } else {
        console.error("[artisan/upload] auto-réparation impossible:", heal.errors);
        return NextResponse.json(
          { error: "Erreur serveur pendant l'enregistrement de la photo" },
          { status: 500 },
        );
      }
    } else {
      console.error("[artisan/upload] écriture DB impossible:", e);
      return NextResponse.json(
        { error: "Erreur serveur pendant l'enregistrement de la photo" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    url: `/api/artisan/photo/${filename}`,
    filename,
    size: stored.length,
  });
}
