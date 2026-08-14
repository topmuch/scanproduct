import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

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
 *   3. Validates MIME type against an allow-list and maps it to a safe
 *      file extension — the original filename is NEVER used, which
 *      prevents path-traversal and weird-unicode-name issues.
 *   4. Enforces a 5 MB size limit.
 *   5. Persists the file to `public/uploads/products/<uuid>.<ext>` and
 *      returns `{ url, filename, size }` as JSON.
 *
 * The returned `url` is a root-relative path (e.g. "/uploads/products/abc.png")
 * that is served statically by Next.js from the `public/` directory.
 *
 * NOTE: This route was missing from the codebase after the Prisma migration
 * (Task 2-a). The frontend kept calling /api/upload, but Next.js answered
 * with a 404 HTML page that couldn't be parsed as JSON — causing the
 * "upload en cours" spinner to loop forever (blob preview shown but upload
 * never resolved) and "Échec de l'upload" errors.
 */
export const runtime = "nodejs";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/** Allowed MIME types → safe file extension. */
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const PUBLIC_PATH = "/uploads/products";

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

    // ── 3. Validate MIME type → extension ─────────────────────────
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        {
          error: `Format non supporté (${file.type || "inconnu"}). Utilisez JPG, PNG, WebP, GIF ou SVG.`,
        },
        { status: 400 },
      );
    }

    // ── 4. Validate size ───────────────────────────────────────────
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

    // ── 5. Ensure upload directory exists ──────────────────────────
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // ── 6. Write file with a unique, safe name ─────────────────────
    // We deliberately IGNORE the original filename to prevent:
    //   - path traversal (../../etc/passwd)
    //   - unicode/emoji filenames breaking the static server
    //   - filename collisions
    const filename = `${randomUUID()}.${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    const url = `${PUBLIC_PATH}/${filename}`;

    return NextResponse.json({
      url,
      filename,
      size: file.size,
      mimeType: file.type,
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
