import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { existsSync } from "fs";
import {
  UPLOAD_DIR,
  resolveUploadPathFromUrl,
  UPLOAD_PUBLIC_PREFIX,
} from "@/lib/upload-config";

/**
 * GET /api/uploads/[...path]
 *
 * Serves uploaded image files from UPLOAD_DIR (configurable via the
 * UPLOAD_DIR env var).
 *
 * ── Why this route exists ────────────────────────────────────────
 * The Next.js standalone server only serves static files from its own
 * `public/` directory. In production (Docker / Coolify), the persistent
 * volume may be mounted OUTSIDE `public/` — e.g. at `/app/uploads` —
 * so files written there by /api/upload would 404 and the UI would show
 * "Image non disponible — téléversez à nouveau l'image."
 *
 * This route bridges that gap: it reads the file from UPLOAD_DIR (wherever
 * it is) and streams it as the HTTP response with the correct
 * Content-Type, detected from the file's magic bytes (not its extension,
 * which may not match the real content — see /api/upload).
 *
 * ── Security ────────────────────────────────────────────────────
 * - Path-traversal guard: resolveUploadPathFromUrl() rejects any path
 *   that would escape UPLOAD_DIR (e.g. /api/uploads/../../etc/passwd).
 * - Only files that actually exist on disk are served; otherwise 404.
 * - Content-Type is derived from magic bytes, so a mismatched extension
 *   (e.g. JPEG content saved as .png by a legacy bug) still gets the
 *   correct `image/jpeg` header and the browser can decode it.
 * - Long-cache headers for performance (immutable, since filenames are
 *   UUID-based and never change after upload).
 */
export const runtime = "nodejs";

/** Detect the real image format from magic bytes. Returns a MIME type. */
function detectMimeType(buf: Buffer): string | null {
  // JPEG
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return "image/gif";
  }
  // WebP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  // SVG (text-based)
  const head = buf.subarray(0, Math.min(buf.length, 256)).toString("utf8").trimStart();
  if (head.startsWith("<?xml") || head.startsWith("<svg")) {
    return "image/svg+xml";
  }
  return null;
}

/** Fallback: map a file extension to a MIME type (used only if magic-byte
 *  detection fails, e.g. for very small/truncated files). */
function mimeFromExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: "Chemin manquant." }, { status: 400 });
  }

  // Reconstruct the relative path (e.g. "abc-123.jpg" or "sub/abc.jpg")
  const relativePath = segments.join("/");
  const urlPath = `${UPLOAD_PUBLIC_PREFIX}/${relativePath}`;

  // Resolve to an absolute filesystem path, with path-traversal guard.
  const filepath = resolveUploadPathFromUrl(urlPath);
  if (!filepath) {
    return NextResponse.json({ error: "Chemin invalide." }, { status: 400 });
  }

  // Check the file exists.
  if (!existsSync(filepath)) {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  try {
    const data = await readFile(filepath);
    // Detect the real Content-Type from magic bytes — this is the key
    // fix for the "Image non disponible" bug: even if a file was saved
    // with a mismatched extension (legacy bug), the browser gets the
    // correct Content-Type and can decode the image.
    const mimeType = detectMimeType(data) || mimeFromExt(filepath);

    // Get file stats for Last-Modified header
    const stats = await stat(filepath);
    const lastModified = stats.mtime.toUTCString();

    // Stream the file with long-cache headers. Filenames are UUID-based
    // and never change after upload, so caching is safe.
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Last-Modified": lastModified,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(`[GET ${UPLOAD_PUBLIC_PREFIX}/${relativePath}] Error:`, error);
    return NextResponse.json(
      { error: "Erreur lors de la lecture du fichier." },
      { status: 500 },
    );
  }
}
