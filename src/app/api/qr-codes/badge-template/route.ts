import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { mkdir, writeFile, readdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { UPLOAD_DIR } from "@/lib/upload-config";
import { db } from "@/lib/db";

/**
 * Gestion du design de QR code IMPORTÉ par le FABRICANT.
 *
 * Le fabricant peut uploader sa propre image de badge (PNG/JPG/WebP, carré
 * recommandé). Cette image devient le fond de TOUS ses QR codes (design
 * « badge ») : le QR noir est composé au centre sur un fond blanc arrondi
 * (quiet zone) pour garantir la scannabilité. Quand aucun design personnel
 * n'est défini, le design officiel de la plateforme s'applique (s'il a été
 * importé par le SuperAdmin), sinon le badge jaune « LABEL VERIFSCAN ».
 *
 * ── GET /api/qr-codes/badge-template ─────────────────────────────
 *   { url: string | null } — le design personnel actuel (ou null).
 *
 * ── POST /api/qr-codes/badge-template ────────────────────────────
 *   multipart/form-data, champ "file" (image 5 MB max).
 *   - Validation par magic bytes (pas le MIME du navigateur).
 *   - Sauvegarde dans UPLOAD_DIR/qr-badge/template-<userId>.<ext>
 *     (les anciennes variantes sont supprimées).
 *   - Persistance User.badgeTemplateUrl + AuditLog.
 *   - { url, filename, size, mimeType }
 *
 * ── DELETE /api/qr-codes/badge-template ──────────────────────────
 *   Supprime le fichier + remet badgeTemplateUrl à null (retour au
 *   design officiel).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB — mêmes règles que /api/upload
const SUBDIR = "qr-badge";

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

/** Session courante (fabricant requis). */
async function requireFabricant(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token || !token.sub) return null;
  const user = await db.user.findUnique({
    where: { id: token.sub },
    select: { id: true, role: true, status: true, badgeTemplateUrl: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  if (user.role !== "FABRICANT") return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await requireFabricant(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json({ url: user.badgeTemplateUrl });
}

export async function POST(request: NextRequest) {
  const user = await requireFabricant(request);
  if (!user) {
    return NextResponse.json(
      { error: "Non autorisé — espace fabricant requis" },
      { status: 401 }
    );
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

    // ── Sauvegarde UPLOAD_DIR/qr-badge/template-<userId>.<ext> ─────
    const dir = path.join(UPLOAD_DIR, SUBDIR);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    // Supprime les anciennes variantes (extensions différentes) du même
    // utilisateur pour éviter les fichiers orphelins.
    try {
      const existing = await readdir(dir);
      for (const f of existing) {
        if (f.startsWith(`template-${user.id}.`)) {
          await unlink(path.join(dir, f));
        }
      }
    } catch {
      // non-fatal
    }

    const filename = `template-${user.id}.${ext}`;
    const filepath = path.join(dir, filename);
    await writeFile(filepath, buf);

    const url = `/api/uploads/${SUBDIR}/${filename}`;

    // ── Persistance + audit ──────────────────────────────────────────
    await db.user.update({
      where: { id: user.id },
      data: { badgeTemplateUrl: url },
    });

    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "UPDATE_QR_BADGE_TEMPLATE",
          entity: "User",
          entityId: user.id,
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
    console.error("[POST /api/qr-codes/badge-template] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du design." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireFabricant(request);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    // Supprime les fichiers du template personnel (toutes extensions).
    const dir = path.join(UPLOAD_DIR, SUBDIR);
    try {
      const existing = await readdir(dir);
      for (const f of existing) {
        if (f.startsWith(`template-${user.id}.`)) {
          await unlink(path.join(dir, f));
        }
      }
    } catch {
      // non-fatal
    }

    await db.user.update({
      where: { id: user.id },
      data: { badgeTemplateUrl: null },
    });

    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "DELETE_QR_BADGE_TEMPLATE",
          entity: "User",
          entityId: user.id,
        },
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({ ok: true, url: null });
  } catch (error) {
    console.error("[DELETE /api/qr-codes/badge-template] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du design." },
      { status: 500 }
    );
  }
}
