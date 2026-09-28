import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import {
  UPLOAD_DIR,
  buildUploadUrl,
} from "@/lib/upload-config";
import { db } from "@/lib/db";

/**
 * POST /api/artisan/upload
 *
 * Upload de la photo produit pour l'ACTIVATION ARTISANALE (sans compte).
 *
 * L'upload /api/upload historique exige une session FABRICANT — or l'artisan
 * n'a pas de compte. Cette route publique est bornée :
 *   1. `masterCode` (multipart field) doit exister en base, être isMaster,
 *      appartenir à un pack encore `inactive` → exploitable uniquement
 *      pendant l'activation d'un pack légitime.
 *   2. Image ≤ 5 Mo, format détecté par magic bytes (jpg/png/webp/gif).
 *   3. Fichier stocké dans UPLOAD_DIR (volume persistant), servi via
 *      /api/uploads/<fichier> comme les autres images.
 */
export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024;

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
  return null;
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formulaire invalide" }, { status: 400 });
  }

  // ── Garde : le pack doit être activable ────────────────────────────────
  const masterCode = String(formData.get("masterCode") || "").trim();
  if (!masterCode.startsWith("MASTER-")) {
    return NextResponse.json({ error: "Code maître invalide" }, { status: 400 });
  }
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
      { error: "Format d'image non reconnu (jpg, png, webp, gif uniquement)" },
      { status: 415 }
    );
  }

  const filename = `artisan-${randomUUID()}.${ext}`;
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(`${UPLOAD_DIR}/${filename}`, buffer);
  } catch (e) {
    console.error("[artisan/upload] écriture impossible:", e);
    return NextResponse.json({ error: "Erreur serveur pendant l'écriture" }, { status: 500 });
  }

  return NextResponse.json({ url: buildUploadUrl(filename), filename, size: file.size });
}
