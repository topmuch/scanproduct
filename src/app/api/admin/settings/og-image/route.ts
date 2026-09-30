import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile, readdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { UPLOAD_DIR } from "@/lib/upload-config";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { getSetting, setSetting, SETTING_KEYS } from "@/lib/settings";
import { db } from "@/lib/db";

/**
 * OpenGraph image management API for the SuperAdmin dashboard.
 *
 * ── POST /api/admin/settings/og-image ───────────────────────────
 * Accepts multipart/form-data with a single "file" field (the new OG image).
 * - Validates it's a real image (magic-byte detection).
 * - Saves it to UPLOAD_DIR/site/og-image.<ext> (overwrites any previous file).
 * - Stores the public URL in the Setting table (key = "ogImageUrl").
 * - Writes an audit log entry.
 * - Returns { url, filename, size, mimeType }.
 *
 * ── GET /api/admin/settings/og-image ────────────────────────────
 * Returns { url: string | null } — the current OG image URL (or null if
 * no custom image has been uploaded, in which case layout.tsx falls back
 * to the default /og-image.png).
 *
 * Recommended dimensions: 1200×630 px (OpenGraph / Twitter large card).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB — OG images are photos/renders
const OG_SUBDIR = "site"; // subdirectory inside UPLOAD_DIR

const MIME_FOR_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** Detect the real image format from magic bytes. Returns extension (no dot). */
function detectFormatFromBytes(buf: Buffer): string | null {
  // PNG
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "png";
  }
  // JPEG
  if (
    buf.length >= 3 &&
    buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  ) {
    return "jpg";
  }
  // GIF
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38
  ) {
    return "gif";
  }
  // WebP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = await getSetting(SETTING_KEYS.ogImageUrl);
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
        { status: 400 },
      );
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Aucun fichier reçu." },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "Le fichier est vide." },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error: `Le fichier dépasse 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
        },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buf = Buffer.from(bytes);
    const ext = detectFormatFromBytes(buf);
    if (!ext) {
      return NextResponse.json(
        {
          error:
            "Format non reconnu. Utilisez PNG, JPG, WebP ou GIF (1200×630 px recommandé).",
        },
        { status: 400 },
      );
    }

    // Save to UPLOAD_DIR/site/og-image.<ext>
    const siteDir = path.join(UPLOAD_DIR, OG_SUBDIR);
    if (!existsSync(siteDir)) {
      await mkdir(siteDir, { recursive: true });
    }

    // Remove any previous OG image files (different extensions) to avoid
    // stale files lingering when the admin uploads a new format.
    try {
      const existing = await readdir(siteDir);
      for (const f of existing) {
        if (f.startsWith("og-image.")) {
          await unlink(path.join(siteDir, f));
        }
      }
    } catch {
      // non-fatal — continue
    }

    const filename = `og-image.${ext}`;
    const filepath = path.join(siteDir, filename);
    await writeFile(filepath, buf);

    // Public URL — served by /api/uploads/[...path]/route.ts
    const url = `/api/uploads/${OG_SUBDIR}/${filename}`;

    // Persist the URL in the Setting table so layout.tsx's generateMetadata
    // can use it for OpenGraph + Twitter cards.
    await setSetting(SETTING_KEYS.ogImageUrl, url);

    // Audit log
    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_OG_IMAGE",
          entity: "Setting",
          entityId: SETTING_KEYS.ogImageUrl,
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
    console.error("[POST /api/admin/settings/og-image] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de l'image OpenGraph." },
      { status: 500 },
    );
  }
}
