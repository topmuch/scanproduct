import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import {
  generateTempPassword,
  hashPassword,
  sendTempPasswordEmail,
} from "@/lib/password-reset";
import { isEmailConfigured } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/admin/users/[id]/reset-password — le SuperAdmin réinitialise le
// mot de passe d'un fabricant.
//
//   Body: { newPassword?: string }  (absent → génération auto "Verif-XXXX-XXXX")
//
//   → bcrypt(10) + update + AuditLog PASSWORD_RESET_BY_ADMIN + email du mot
//     de passe temporaire au fabricant (si SMTP configuré).
//   → Le mot de passe généré est retourné au SuperAdmin pour transmission
//     directe (téléphone/WhatsApp) en complément de l'email.
// ---------------------------------------------------------------------------

const BodySchema = z.object({
  newPassword: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(128)
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Corps optionnel : POST sans body (ou {}) → génération auto.
  let newPassword: string | undefined;
  try {
    const raw = await request.text();
    if (raw.trim()) {
      const parsed = BodySchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Corps invalide." },
          { status: 400 },
        );
      }
      newPassword = parsed.data.newPassword;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const generated = !newPassword;
    const tempPassword = newPassword ?? generateTempPassword();
    const hashed = await hashPassword(tempPassword);

    await db.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    const emailResult = await sendTempPasswordEmail(user, tempPassword);

    await db.auditLog.create({
      data: {
        userId: id,
        action: "PASSWORD_RESET_BY_ADMIN",
        entity: "User",
        entityId: id,
        metadata: JSON.stringify({
          by: session.user?.email ?? "superadmin",
          generated,
          emailed: emailResult.sent,
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      generated,
      emailed: emailResult.sent,
      smtpConfigured: isEmailConfigured(),
      // Renvoyé UNIQUEMENT si généré (jamais le mot de passe choisi par l'admin).
      ...(generated ? { tempPassword } : {}),
    });
  } catch (error) {
    console.error("[POST /api/admin/users/[id]/reset-password] Error:", error);
    return NextResponse.json(
      { error: "Impossible de réinitialiser le mot de passe." },
      { status: 500 },
    );
  }
}
