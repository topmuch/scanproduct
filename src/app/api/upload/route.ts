import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/upload
 * Accepts a multipart/form-data upload with a single "file" field (image).
 * Saves it to /public/uploads/products/<uuid>.<ext>.
 * Returns { url: "/uploads/products/<uuid>.<ext>" } on success.
 *
 * IMPORTANT (alignment with Coolify volume):
 *   The Coolify persistent volume is mounted on /app/public/uploads/products.
 *   This route MUST write to that exact subdirectory so uploaded files
 *   survive container restarts. The returned URL `/uploads/products/...`
 *   is served by Next.js as a static file from /public/uploads/products/.
 *
 * Auth: any authenticated user (SUPERADMIN or FABRICANT).
 * Limits: 5 MB, JPG/PNG/WebP/GIF only.
 */
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export async function POST(req: NextRequest) {
  // ---- Auth check ----
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Aucun fichier fourni." },
        { status: 400 }
      );
    }

    // ---- Validate type ----
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Type de fichier non autorisé: ${file.type}. Formats acceptés: JPG, PNG, WebP, GIF.`,
        },
        { status: 400 }
      );
    }

    // ---- Validate size ----
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Le fichier dépasse 5 MB." },
        { status: 400 }
      );
    }

    // ---- Generate unique filename ----
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const uniqueName = `${randomUUID()}.${ext}`;

    // ---- Ensure the uploads directory exists ----
    // MUST be public/uploads/products — matches the Coolify volume mount
    // AND the directory created in the Dockerfile. Files written here are
    // served at /uploads/products/<name> by Next.js static file serving.
    const uploadDir = join(process.cwd(), "public", "uploads", "products");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch {
      // dir may already exist — ignore
    }

    // ---- Write the file ----
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    // ---- Return the public URL (matches the static file path) ----
    const url = `/uploads/products/${uniqueName}`;

    return NextResponse.json(
      { url, filename: file.name, size: file.size },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/upload] error:", err);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'upload." },
      { status: 500 }
    );
  }
}
