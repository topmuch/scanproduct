import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile, readdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { UPLOAD_DIR } from "@/lib/upload-config";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { setSetting, getSetting, SETTING_KEYS } from "@/lib/settings";
import { db } from "@/lib/db";

/**
 * Design QR OFFICIEL de la plateforme (SuperAdmin).
 *
 * Le SuperAdmin importe l'image de badge officielle (PNG/JPG/WebP). Elle
 * devient le fond des badges QR de TOUS les fabricants qui n'ont pas
 * importé leur propre design. Le QR noir est composé au centre sur un
 * fond blanc arrondi (quiet zone) pour garantir la scannabilité.
 *
 * ── GET /api/admin/settings/qr-badge-template ────────────────────
 *   { url: string | null } — design officiel actuel (ou null → badge
 *   jaune « LABEL VERIFSCAN » par défaut).
 *
 * ── POST /api/admin/settings/qr-badge-template ───────────────────
 *   multipart/form-data, champ "file" (image 5 MB max, magic bytes).
 *   - Sauvegarde UPLOAD_DIR/site/qr-badge.<ext> (anciennes variantes
 *     supprimées) + Setting "qrBadgeTemplateUrl" + AuditLog.
 *   - { url, filename, size, mimeType }
 *
 * ── DELETE /api/admin/settings/qr-badge-template ─────────────────
 *   Supprime les fichiers + le Setting (retour au badge jaune).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const SUBDIR = "site";
const BASENAME = "qr-badge";

const MIME_FOR_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Détecte le vrai format d'image par magic bytes. Retourne l'extension. */
function detectFormatFromBytes(buf: Buffer): string | null {
  // PNG — 89 50 4E 47
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) {
    return "png";
  }
  // JPEG — FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpg";
  }
  // WebP — RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

/** Supprime toutes les variantes qr-badge.* du dossier site/. */
async function removeExistingTemplates(dir: string) {
  try {
    const existing = await readdir(dir);
    for (const f of existing) {
      if (f.startsWith(`${BASENAME}.`)) {
        await unlink(path.join(dir, f));
      }
    }
  } catch {
    // non-fatal
  }
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = await getSetting(SETTING_KEYS.qrBadgeTemplateUrl);
  return NextResponse.json({ url });
}

export async function POST(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Requête invalide (multipart/form-data attendu)." },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Le fichier est vide." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Le fichier dépasse 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buf = Buffer.from(bytes);
    const ext = detectFormatFromBytes(buf);
    if (!ext) {
      return NextResponse.json(
        { error: "Format non reconnu. Utilisez PNG, JPG ou WebP." },
        { status: 400 }
      );
    }

    // ── Sauvegarde UPLOAD_DIR/site/qr-badge.<ext> ───────────────────
    const dir = path.join(UPLOAD_DIR, SUBDIR);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await removeExistingTemplates(dir);

    const filename = `${BASENAME}.${ext}`;
    const filepath = path.join(dir, filename);
    await writeFile(filepath, buf);

    const url = `/api/uploads/${SUBDIR}/${filename}`;

    // ── Persistance + audit ─────────────────────────────────────────
    await setSetting(SETTING_KEYS.qrBadgeTemplateUrl, url);

    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_QR_BADGE_TEMPLATE",
          entity: "Setting",
          entityId: SETTING_KEYS.qrBadgeTemplateUrl,
          metadata: JSON.stringify({ url, filename, size: file.size }),
        },
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      url,
      filename,
      size: file.size,
      mimeType: MIME_FOR_EXT[ext] || file.type,
    });
  } catch (error) {
    console.error("[POST /api/admin/settings/qr-badge-template] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du design officiel." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dir = path.join(UPLOAD_DIR, SUBDIR);
    await removeExistingTemplates(dir);
    await db.setting.deleteMany({
      where: { key: SETTING_KEYS.qrBadgeTemplateUrl },
    });

    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETE_QR_BADGE_TEMPLATE",
          entity: "Setting",
          entityId: SETTING_KEYS.qrBadgeTemplateUrl,
        },
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({ ok: true, url: null });
  } catch (error) {
    console.error("[DELETE /api/admin/settings/qr-badge-template] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du design officiel." },
      { status: 500 }
    );
  }
}
