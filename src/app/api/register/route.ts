import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/register
 * Creates a new FABRICANT account.
 *
 * Body:
 *   { name, companyName, email, phone?, city?, password }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, companyName, email, phone, city, password } = body as {
      name?: string;
      companyName?: string;
      email?: string;
      phone?: string;
      city?: string;
      password?: string;
    };

    // Basic validation
    if (!name || !companyName || !email || !password) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing user
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    await db.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashed,
        role: "FABRICANT",
        status: "ACTIVE",
        companyName,
        phone: phone || null,
        city: city || null,
        country: "Sénégal",
        points: 10, // Welcome bonus
      },
    });

    return NextResponse.json(
      { success: true, message: "Compte créé avec succès." },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/register] error:", err);
    return NextResponse.json(
      { error: "Erreur serveur lors de la création du compte." },
      { status: 500 }
    );
  }
}
