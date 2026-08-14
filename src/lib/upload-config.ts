import path from "path";

/**
 * Centralized upload directory configuration.
 *
 * ── Why this exists ──────────────────────────────────────────────
 * In development, uploaded images are stored under `public/uploads/products/`
 * and served directly by Next.js as static files from the `public/` directory.
 *
 * In production (Docker / Coolify), the persistent volume may be mounted at a
 * location OUTSIDE the standalone server's `public/` directory — e.g. the
 * operator mounts it at `/app/uploads` instead of `/app/public/uploads`.
 * The Next.js standalone server ONLY serves files under its own `public/`
 * folder, so files written to `/app/uploads` would 404 and the UI would show
 * "Image non disponible — téléversez à nouveau l'image."
 *
 * To make uploads work regardless of where the volume is mounted, we:
 *   1. Write files to a configurable directory (UPLOAD_DIR env var).
 *   2. Serve them through a dedicated API route `/api/uploads/[...path]`
 *      (see src/app/api/uploads/[...path]/route.ts) which reads the file
 *      from UPLOAD_DIR and streams it with the correct Content-Type
 *      (detected from the file's magic bytes, not its extension).
 *
 * ── Configuration ───────────────────────────────────────────────
 * The upload directory is resolved in this priority order:
 *   1. UPLOAD_DIR env var (absolute path, e.g. "/app/uploads/products")
 *   2. Fallback: <cwd>/public/uploads/products  (dev mode)
 *
 * The PUBLIC URL prefix returned to the frontend is ALWAYS `/api/uploads`
 * so the frontend doesn't need to know where files are physically stored.
 */

function resolveUploadDir(): string {
  if (process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim() !== "") {
    return path.resolve(process.env.UPLOAD_DIR.trim());
  }
  // Dev fallback: public/uploads/products (served statically by Next.js)
  return path.join(process.cwd(), "public", "uploads", "products");
}

export const UPLOAD_DIR = resolveUploadDir();

/**
 * Public URL prefix for uploaded files.
 *
 * The frontend uses this prefix + the filename to build the <img src>.
 * The dedicated serve route /api/uploads/[...path] handles the actual
 * file streaming from UPLOAD_DIR.
 */
export const UPLOAD_PUBLIC_PREFIX = "/api/uploads";

/**
 * Build the public URL for an uploaded filename.
 * Example: buildUploadUrl("abc-123.jpg") → "/api/uploads/abc-123.jpg"
 */
export function buildUploadUrl(filename: string): string {
  return `${UPLOAD_PUBLIC_PREFIX}/${filename}`;
}

/**
 * Resolve a public URL (e.g. "/api/uploads/abc.jpg") back to an absolute
 * filesystem path inside UPLOAD_DIR. Used by the serve route to locate
 * the file on disk. Returns null if the resulting path would escape
 * UPLOAD_DIR (path-traversal guard).
 */
export function resolveUploadPathFromUrl(urlPath: string): string | null {
  // Strip the prefix and any leading slashes.
  const relative = urlPath.replace(UPLOAD_PUBLIC_PREFIX, "").replace(/^\/+/, "");
  if (!relative) return null;
  const resolved = path.resolve(UPLOAD_DIR, relative);
  // Ensure the resolved path is still inside UPLOAD_DIR (prevent ../ escape).
  if (!resolved.startsWith(UPLOAD_DIR + path.sep) && resolved !== UPLOAD_DIR) {
    return null;
  }
  return resolved;
}
