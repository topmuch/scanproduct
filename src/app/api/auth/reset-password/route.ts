import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  verifyPasswordResetToken,
  hashPassword,
} from "@/lib/password-reset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password — pose du nouveau mot de passe avec un token.
// Public (l'utilisateur vient de cliquer le lien reçu par email).
//
//   Body: { token: string, password: string }
//   → vérifie le token HMAC (1 h), hash le mot de passe (bcrypt 10),
//     met à jour l'utilisateur + AuditLog PASSWORD_RESET.
// ---------------------------------------------------------------------------

const BodySchema = z.object({
  token: z.string().min(10).max(500),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(128),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Token ou mot de passe invalide.",
      },
      { status: 400 },
    );
  }

  // Extraction structurelle du userId depuis le token (avant toute DB).
  const tokenParts = parsed.data.token.split(".");
  const claimedUserId = tokenParts.length === 4 ? tokenParts[0] : null;
  if (!claimedUserId) {
    return NextResponse.json(
      {
        error: "Ce lien est invalide ou a déjà été utilisé.",
      },
      { status: 400 },
    );
  }

  try {
    const existing = await db.user.findUnique({
      where: { id: claimedUserId },
      select: { id: true, email: true, password: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Compte introuvable." },
        { status: 404 },
      );
    }

    // Vérification COMPLÈTE avec le hash ACTUEL : signature + empreinte du
    // mot de passe courant (single-use sans DB : dès que le mot de passe a
    // changé, l'empreinte ne correspond plus → token consommé) + expiration.
    const check = verifyPasswordResetToken(
      parsed.data.token,
      existing.password ?? "",
    );
    if (!check.valid) {
      return NextResponse.json(
        {
          error: check.expired
            ? "Ce lien a expiré. Refaites une demande de réinitialisation."
            : "Ce lien est invalide, a déjà été utilisé ou a expiré. Refaites une demande.",
        },
        { status: 400 },
      );
    }

    const user = { id: existing.id, email: existing.email };

    const hashed = await hashPassword(parsed.data.password);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "PASSWORD_RESET",
        entity: "User",
        entityId: user.id,
        metadata: JSON.stringify({ via: "forgot-password" }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/auth/reset-password] Error:", error);
    return NextResponse.json(
      { error: "Impossible de réinitialiser le mot de passe. Réessayez." },
      { status: 500 },
    );
  }
}
