import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { httpErrorStatus, requireArtisanAuth } from "@/lib/artisan-auth";
import {
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";

/**
 * PATCH /api/artisan/password — changement de mot de passe de l'artisan
 * (action rapide « Changer mot de passe » du dashboard).
 *
 * Corps : { currentPassword, newPassword }
 * Vérifie le mot de passe actuel (bcrypt) puis enregistre le nouveau
 * (hashé, 10 rounds). Session JWT inchangée — le token reste valable.
 */

const BodySchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(4).max(72),
});

const run = async (artisanId: string, current: string, next: string) => {
  const artisan = await db.artisan.findUnique({ where: { id: artisanId } });
  if (!artisan) {
    return NextResponse.json({ error: "Artisan introuvable" }, { status: 404 });
  }

  const ok = await bcrypt.compare(current, artisan.password);
  if (!ok) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 401 });
  }

  await db.artisan.update({
    where: { id: artisan.id },
    data: { password: await bcrypt.hash(next, 10) },
  });

  return NextResponse.json({ success: true, message: "Mot de passe mis à jour" });
};

export async function PATCH(request: NextRequest) {
  let artisanId: string;
  try {
    artisanId = requireArtisanAuth(request).artisanId;
  } catch (error) {
    const { status, message } = httpErrorStatus(error);
    return NextResponse.json({ error: message }, { status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nouveau mot de passe invalide (4 caractères minimum)" },
      { status: 400 }
    );
  }

  try {
    return await run(artisanId, parsed.data.currentPassword, parsed.data.newPassword);
  } catch (error) {
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          return await run(artisanId, parsed.data.currentPassword, parsed.data.newPassword);
        } catch (retryError) {
          console.error("[artisan/password] retry:", retryError);
        }
      }
    }
    const { status, message } = httpErrorStatus(error);
    if (status !== 500) {
      return NextResponse.json({ error: message }, { status });
    }
    console.error("[artisan/password]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
