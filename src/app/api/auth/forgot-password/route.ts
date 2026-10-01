import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/password-reset";
import { isEmailConfigured } from "@/lib/email";

// Toujours Node.js (bcrypt + nodemailer + SQLite), jamais de cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password — demande publique de réinitialisation.
//
// ANTI-ÉNUMÉRATION : la réponse est TOUJOURS { ok: true }, que l'email
// existe ou non — on ne révèle jamais qui a un compte. Quand le compte
// existe : token HMAC (1 h) + email avec le lien /mot-de-passe-oublie?token=…
//
// SMTP non configuré (dev / deploys sans email) : on retourne `devLink`
// pour que l'admin puisse quand même terminer le flow localement — en prod
// configurée ce champ est absent.
// ---------------------------------------------------------------------------

const BodySchema = z.object({
  email: z.string().email().max(255),
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
      { error: "Adresse email invalide." },
      { status: 400 },
    );
  }
  const email = parsed.data.email.trim().toLowerCase();

  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, status: true, password: true },
    });

    let devLink: string | undefined;
    if (user) {
      const result = await sendPasswordResetEmail({
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.password ?? "",
      });
      // SMTP non configuré → exposer le lien à l'appelant (dev/QA only).
      if (!isEmailConfigured()) {
        devLink = result.resetUrl;
      }

      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "PASSWORD_RESET_REQUESTED",
          entity: "User",
          entityId: user.id,
          metadata: JSON.stringify({ email }),
        },
      });
    }

    // Réponse identique que le compte existe ou non.
    return NextResponse.json({ ok: true, ...(devLink ? { devLink } : {}) });
  } catch (error) {
    console.error("[POST /api/auth/forgot-password] Error:", error);
    // Même en cas d'erreur serveur on ne casse pas l'anti-énumération.
    return NextResponse.json({ ok: true });
  }
}
