import path from "path";

/**
 * Centralized upload directory configuration.
 *
 * ── Why this exists ──────────────────────────────────────────────
 * Uploaded images (product images, logos, QR codes) must be stored on
 * a PERSISTENT volume so they survive container redeployments. In dev
 * they live under `public/uploads/products/` (served statically by
 * Next.js). In production (Docker / Coolify), a persistent volume is
 * mounted at a known path and we write there.
 *
 * ── Coolify volume mount (production) ────────────────────────────
 * The operator mounts a persistent volume at:
 *   /app/public/uploads/product   (singular "product")
 *
 * The Next.js standalone server only serves its own `public/` folder
 * as static files, BUT uploaded files are served through the dedicated
 * API route `/api/uploads/[...path]` (see
 * src/app/api/uploads/[...path]/route.ts) which reads from UPLOAD_DIR
 * and streams the file with the correct Content-Type (detected from
 * magic bytes). This decouples storage location from public URL.
 *
 * ── Configuration priority ──────────────────────────────────────
 *   1. UPLOAD_DIR env var (absolute path) — always wins
 *   2. Production default: /app/public/uploads/product
 *      (matches the Coolify persistent volume mount)
 *   3. Dev fallback: <cwd>/public/uploads/products
 *      (served statically by Next.js dev server)
 *
 * The PUBLIC URL prefix returned to the frontend is ALWAYS `/api/uploads`
 * so the frontend doesn't need to know where files are physically stored.
 */

function resolveUploadDir(): string {
  // 1. Explicit env var always wins (set in Dockerfile or Coolify env).
  if (process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim() !== "") {
    return path.resolve(process.env.UPLOAD_DIR.trim());
  }
  // 2. Production (standalone Docker / Coolify) — matches the persistent
  //    volume mount: /app/public/uploads/product (singular "product").
  //    The Dockerfile creates this dir with chmod 777 and the operator
  //    mounts a persistent Coolify volume here.
  if (process.env.NODE_ENV === "production") {
    return "/app/public/uploads/product";
  }
  // 3. Dev fallback — served statically by Next.js from public/
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

/**
 * Log the resolved upload directory once at module load time.
 *
 * This makes it trivial to debug "image disappeared after redeploy" issues:
 * the operator can check the container logs and confirm UPLOAD_DIR points
 * to the persistent volume mount.
 *
 * Logged on first import only (module singleton).
 */
if (typeof process !== "undefined") {
  const tag = "[upload-config]";
  console.log(
    `${tag} UPLOAD_DIR resolved to: ${UPLOAD_DIR}`,
    `\n${tag}   - NODE_ENV:        ${process.env.NODE_ENV ?? "(unset)"}`,
    `\n${tag}   - UPLOAD_DIR env:  ${process.env.UPLOAD_DIR ?? "(unset → using default)"}`,
    `\n${tag}   - Public URL prefix: ${UPLOAD_PUBLIC_PREFIX}/<filename>`,
  );
}
