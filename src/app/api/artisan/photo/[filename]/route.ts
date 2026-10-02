import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isTableMissingError, ensureArtisanTables } from "@/lib/ensure-artisan-tables";

/**
 * GET /api/artisan/photo/<filename>
 *
 * Sert les photos du parcours ARTISANAL stockées EN BASE (table
 * ArtisanPhoto, BLOB) — voir /api/artisan/upload pour la justification :
 * les fichiers sur disque disparaissent aux redéploiements Coolify si le
 * volume n'est pas monté ; la DB persiste toujours (volume /app/data).
 *
 * - Content-Type exact stocké à l'upload (WebP après compression sharp).
 * - Cache long immutable : les filenames sont des UUID, jamais modifiés
 *   après upload → le navigateur ne re-télécharge jamais deux fois.
 * - 404 si le filename est inconnu (photo supprimée / DB réinitialisée) —
 *   le composant SafeImage affiche alors son placeholder élégant.
 */
export const runtime = "nodejs";

/** Garde-fou : le filename doit matcher le format émis à l'upload. */
function isValidFilename(name: string): boolean {
  return /^artisan-[0-9a-f-]{36}\.(webp|jpg|jpeg|png|gif)$/i.test(name);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  if (!isValidFilename(filename)) {
    return NextResponse.json({ error: "Nom de fichier invalide." }, { status: 400 });
  }

  const load = () =>
    db.artisanPhoto.findUnique({
      where: { filename },
      select: { mimeType: true, data: true },
    });

  let photo: Awaited<ReturnType<typeof load>> = null;
  try {
    photo = await load();
  } catch (error) {
    // Auto-réparation : table absente en prod (DB créée avant ce module)
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          photo = await load();
        } catch (retry) {
          console.error("[artisan/photo] rejeu après réparation échoué:", retry);
        }
      }
    } else {
      console.error("[artisan/photo] lecture DB échouée:", error);
    }
  }

  if (!photo) {
    return NextResponse.json({ error: "Photo introuvable." }, { status: 404 });
  }

  // Prisma SQLite : Bytes → Buffer (Node). Sinon Uint8Array → Buffer.
  const body = Buffer.isBuffer(photo.data) ? photo.data : Buffer.from(photo.data as Uint8Array);

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": photo.mimeType,
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
