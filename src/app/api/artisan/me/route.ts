import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getArtisanFromToken, httpErrorStatus } from "@/lib/artisan-auth";

/**
 * GET /api/artisan/me — profil de l'artisan connecté (JWT du portail).
 *
 * Utilisé par le wizard /activer-pack : si le client a déjà un compte
 * (il s'est connecté à /artisan/dashboard), le wizard récupère son nom
 * et son téléphone pour PRÉREMPLIR l'étape « Marque » et afficher la
 * bannière « Ce nouveau lot sera ajouté à votre tableau de bord ».
 *
 * Headers : Authorization: Bearer <token JWT artisan>
 * Réponse  : { artisan: {id, phone, name, createdAt}, packsCount }
 * Erreur   : 401 { error } — token absent/invalide/expiré.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = getArtisanFromToken(request);
    if (!auth) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const artisan = await db.artisan.findUnique({
      where: { id: auth.artisanId },
      select: { id: true, phone: true, name: true, createdAt: true },
    });
    if (!artisan) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    // Nombre de lots déjà rattachés — utile pour le message du wizard
    // (« votre tableau de bord contient déjà N lot(s) »).
    const packsCount = await db.pack.count({ where: { artisanId: artisan.id } });
    return NextResponse.json({ artisan, packsCount });
  } catch (error) {
    const { status, message } = httpErrorStatus(error);
    return NextResponse.json({ error: message }, { status });
  }
}
