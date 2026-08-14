import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Zod schema for the registration payload.
 *
 * Validates:
 *   - name: 2–80 chars, no HTML
 *   - companyName: 2–120 chars
 *   - email: RFC-valid email, normalized to lowercase
 *   - phone: optional, 6–20 chars (digits, spaces, +, -, parentheses)
 *   - city: optional, max 80 chars
 *   - password: min 8 chars, at least 1 letter + 1 digit (basic strength)
 */
const RegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(80, "Le nom ne peut pas dépasser 80 caractères."),
  companyName: z
    .string()
    .trim()
    .min(2, "La raison sociale doit contenir au moins 2 caractères.")
    .max(120, "La raison sociale ne peut pas dépasser 120 caractères."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Adresse email invalide."),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s+()\-]{6,20}$/, "Numéro de téléphone invalide.")
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .trim()
    .max(80, "La ville ne peut pas dépasser 80 caractères.")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre.")
    .regex(/\d/, "Le mot de passe doit contenir au moins un chiffre."),
});

/**
 * POST /api/register
 * Creates a new FABRICANT account.
 *
 * Body:
 *   { name, companyName, email, phone?, city?, password }
 */
export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Corps de requête invalide (JSON attendu)." },
        { status: 400 }
      );
    }

    // Validate input with Zod
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: firstError?.message ?? "Champs invalides.",
          fields: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { name, companyName, email, phone, city, password } = parsed.data;
    const normalizedEmail = email;

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
