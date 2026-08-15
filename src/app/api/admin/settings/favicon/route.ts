import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { UPLOAD_DIR } from "@/lib/upload-config";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { setSetting, getFaviconUrl, SETTING_KEYS } from "@/lib/settings";
import { db } from "@/lib/db";

/**
 * Favicon management API for the SuperAdmin dashboard.
 *
 * ── POST /api/admin/settings/favicon ────────────────────────────
 * Accepts multipart/form-data with a single "file" field (the new favicon).
 * - Validates it's a real image (magic-byte detection).
 * - Saves it to UPLOAD_DIR/site/favicon.<ext> (overwrites any previous favicon).
 * - Stores the public URL in the Setting table (key = "faviconUrl").
 * - Writes an audit log entry.
 * - Returns { url, filename, size, mimeType }.
 *
 * ── GET /api/admin/settings/favicon ─────────────────────────────
 * Returns { url: string | null } — the current favicon URL (or null if
 * no custom favicon has been uploaded, in which case the frontend falls
 * back to the default /favicon.ico).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB — favicons are small
const FAVICON_SUBDIR = "site"; // subdirectory inside UPLOAD_DIR

const MIME_FOR_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};

/** Detect the real image format from magic bytes. Returns extension (no dot). */
function detectFormatFromBytes(buf: Buffer): string | null {
  // ICO — 00 00 01 00
  if (buf.length >= 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) {
    return "ico";
  }
  // PNG
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "png";
  }
  // JPEG
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpg";
  }
  // GIF
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
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
  // SVG (text)
  const head = buf.subarray(0, Math.min(buf.length, 256)).toString("utf8").trimStart();
  if (head.startsWith("<?xml") || head.startsWith("<svg")) {
    return "svg";
  }
  return null;
}

export async function GET() {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = await getFaviconUrl();
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
      return NextResponse.json({ error: "Le fichier est vide." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Le fichier dépasse 2 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).` },
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
            "Format non reconnu. Utilisez ICO, PNG, JPG, WebP, GIF ou SVG.",
        },
        { status: 400 },
      );
    }

    // Save to UPLOAD_DIR/site/favicon.<ext>
    const siteDir = path.join(UPLOAD_DIR, FAVICON_SUBDIR);
    if (!existsSync(siteDir)) {
      await mkdir(siteDir, { recursive: true });
    }

    // Remove any previous favicon files (different extensions) to avoid
    // stale files lingering when the admin uploads a new format.
    try {
      const existing = await readdir(siteDir);
      for (const f of existing) {
        if (f.startsWith("favicon.")) {
          await unlink(path.join(siteDir, f));
        }
      }
    } catch {
      // non-fatal — continue
    }

    const filename = `favicon.${ext}`;
    const filepath = path.join(siteDir, filename);
    await writeFile(filepath, buf);

    // Public URL — served by /api/uploads/[...path]/route.ts
    const url = `/api/uploads/${FAVICON_SUBDIR}/${filename}`;

    // Persist the URL in the Setting table so layout.tsx's generateMetadata
    // can read it.
    await setSetting(SETTING_KEYS.faviconUrl, url);

    // Audit log
    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_FAVICON",
          entity: "Setting",
          entityId: SETTING_KEYS.faviconUrl,
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
    console.error("[POST /api/admin/settings/favicon] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du favicon." },
      { status: 500 },
    );
  }
}
