import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import {
  UPLOAD_DIR,
  buildUploadUrl,
} from "@/lib/upload-config";

/**
 * POST /api/upload
 *
 * Image upload endpoint used by the FABRICANT dashboard:
 *   - Product image upload (ImageUploadWithPreview component)
 *   - Logo upload (ParametresPage)
 *
 * Behaviour:
 *   1. Requires an authenticated FABRICANT session (JWT).
 *   2. Accepts multipart/form-data with a single "file" field.
 *   3. Detects the ACTUAL image format from the file's magic bytes
 *      (NOT from the browser-reported MIME type, which reflects the
 *      filename extension and can be wrong — e.g. a .png renamed to
 *      .jpg, or vice versa). This guarantees the saved extension
 *      always matches the real content.
 *   4. Enforces a 5 MB size limit.
 *   5. Persists the file to UPLOAD_DIR (configurable via UPLOAD_DIR env
 *      var; defaults to public/uploads/products in dev, /app/uploads/products
 *      in Docker/Coolify) under `<uuid>.<ext>` and returns
 *      `{ url, filename, size, mimeType }` as JSON.
 *
 * The returned `url` is `/api/uploads/<filename>`, served by the dedicated
 * route /api/uploads/[...path] which streams the file with the correct
 * Content-Type. This decouples the storage location (which may be a
 * persistent volume OUTSIDE the standalone server's public/ dir in
 * production) from the public URL, so uploads work regardless of where
 * the volume is mounted.
 */
export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/** Canonical MIME type for each detected extension. */
const MIME_FOR_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/**
 * Detect the real image format from the first bytes of the file.
 *
 * Magic-byte signatures (see https://en.wikipedia.org/wiki/List_of_file_signatures):
 *   JPEG  — FF D8 FF
 *   PNG   — 89 50 4E 47 0D 0A 1A 0A   (‰PNG....)
 *   GIF   — 47 49 46 38               (GIF8)
 *   WebP  — 52 49 46 46 ?? ?? ?? ?? 57 45 42 50   (RIFF....WEBP)
 *   SVG   — text starting with "<?xml" or "<svg"
 *
 * Returns the canonical extension (without the dot) or null if the
 * content doesn't match any supported image format.
 */
function detectFormatFromBytes(buf: Buffer): string | null {
  // JPEG: FF D8 FF
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return "jpg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
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
    return "png";
  }

  // GIF: "GIF8"
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 && // G
    buf[1] === 0x49 && // I
    buf[2] === 0x46 && // F
    buf[3] === 0x38 // 8
  ) {
    return "gif";
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && // R
    buf[1] === 0x49 && // I
    buf[2] === 0x46 && // F
    buf[3] === 0x46 && // F
    buf[8] === 0x57 && // W
    buf[9] === 0x45 && // E
    buf[10] === 0x42 && // B
    buf[11] === 0x50 // P
  ) {
    return "webp";
  }

  // SVG: text starting with "<?xml" or "<svg" (possibly with leading BOM/whitespace)
  const head = buf.subarray(0, Math.min(buf.length, 256)).toString("utf8").trimStart();
  if (head.startsWith("<?xml") || head.startsWith("<svg")) {
    return "svg";
  }

  return null;
}

export async function POST(request: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token || !token.sub) {
    return NextResponse.json(
      { error: "Non autorisé. Veuillez vous connecter." },
      { status: 401 },
    );
  }

  try {
    // ── 2. Parse multipart form ────────────────────────────────────
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

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier reçu." },
        { status: 400 },
      );
    }

    // Blob/File — in Next.js 16 runtime, File is the global web File.
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Le champ 'file' doit être un fichier." },
        { status: 400 },
      );
    }

    // ── 3. Validate size ───────────────────────────────────────────
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

    // ── 4. Read file content into a Buffer ──────────────────────────
    const bytes = await file.arrayBuffer();
    const buf = Buffer.from(bytes);

    // ── 5. Detect REAL format from magic bytes ─────────────────────
    // We deliberately IGNORE file.type (browser-reported MIME) because it
    // reflects the filename extension, not the actual content. A user who
    // renames photo.jpg → photo.png would otherwise get a file saved as
    // .png containing JPEG data, which browsers can't decode →
    // "Image non disponible".
    const ext = detectFormatFromBytes(buf);
    if (!ext) {
      return NextResponse.json(
        {
          error:
            "Format d'image non reconnu ou corrompu. Utilisez JPG, PNG, WebP, GIF ou SVG.",
        },
        { status: 400 },
      );
    }

    // ── 6. Ensure upload directory exists ──────────────────────────
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // ── 7. Write file with a unique, safe name ─────────────────────
    // We deliberately IGNORE the original filename to prevent:
    //   - path traversal (../../etc/passwd)
    //   - unicode/emoji filenames breaking the filesystem
    //   - filename collisions
    const filename = `${randomUUID()}.${ext}`;
    const filepath = `${UPLOAD_DIR}/${filename}`;
    await writeFile(filepath, buf);

    // The public URL is /api/uploads/<filename>, served by the dedicated
    // route. This works regardless of whether UPLOAD_DIR is inside the
    // standalone server's public/ folder (dev) or on a separate volume
    // mounted at /app/uploads (prod).
    const url = buildUploadUrl(filename);

    return NextResponse.json({
      url,
      filename,
      size: file.size,
      mimeType: MIME_FOR_EXT[ext] || file.type,
    });
  } catch (error) {
    console.error("[POST /api/upload] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du fichier." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/upload — returns 405 Method Not Allowed.
 * Exists so we can distinguish "endpoint exists but wrong method" from
 * "endpoint does not exist" (404) when debugging.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Méthode non autorisée. Utilisez POST." },
    { status: 405 },
  );
}
