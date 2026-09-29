import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createArtisanToken,
  normalizePhone,
} from "@/lib/artisan-auth";
import { ensureArtisanTables, isTableMissingError } from "@/lib/ensure-artisan-tables";

/**
 * POST /api/artisan/login
 *
 * Connexion du portail ARTISAN (/artisan/login) — parcours informel.
 *
 * L'identifiant est le NUMERO DE TELEPHONE (normalisé : espaces/tirets/
 * indicatifs retirés). Deux cas d'usage :
 *   1. Artisan déjà créé (par la vente du pack via /api/admin/sell-pack, ou
 *      par une connexion précédente) → vérification bcrypt du mot de passe.
 *   2. Première connexion (aucun compte) → CRÉATION AUTOMATIQUE :
 *      - mot de passe saisi « 0000 » (ou vide) → compte créé avec le mot de
 *        passe par défaut « 0000 » reçu par WhatsApp ;
 *      - autre mot de passe saisi → ce mot de passe devient celui du compte
 *        (l'artisan initialise son accès à la première connexion).
 *
 * Réponse succès : { success, token (JWT 30 j), artisan: {id, phone, name} }
 * Réponse erreur : 401 { error: "Mot de passe incorrect" }
 *
 * AUTO-RÉPARATION : si la table Artisan n'existe pas encore en prod (db push
 * raté sur le volume — cf. P2021/P2022), le DDL est appliqué puis la requête
 * rejouée UNE fois : l'artisan ne voit rien.
 */

const BodySchema = z.object({
  phone: z.string().trim().min(6).max(30),
  password: z.string().min(4).max(72),
});

const DEFAULT_PASSWORD = "0000";

// ── Rate limit mémoire (par IP) : 10 connexions / 5 min / IP ──────────────
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 10;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

const run = async (phone: string, password: string): Promise<NextResponse> => {
  const artisan = await db.artisan.findUnique({ where: { phone } });

  if (!artisan) {
    // ── Création automatique (première utilisation) ────────────────────────
    const initialPassword =
      password === DEFAULT_PASSWORD || password.trim() === ""
        ? DEFAULT_PASSWORD
        : password;
    const created = await db.artisan.create({
      data: {
        phone,
        password: await hashPassword(initialPassword),
        name: null,
      },
    });
    return NextResponse.json({
      success: true,
      created: true,
      token: createArtisanToken({ artisanId: created.id, phone: created.phone }),
      artisan: { id: created.id, phone: created.phone, name: created.name },
    });
  }

  // ── Compte existant : vérification bcrypt ────────────────────────────────
  const ok = await bcrypt.compare(password, artisan.password);
  if (!ok) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    created: false,
    token: createArtisanToken({ artisanId: artisan.id, phone: artisan.phone }),
    artisan: { id: artisan.id, phone: artisan.phone, name: artisan.name },
  });
};

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "inconnu";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 }
    );
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
      { error: "Numéro de téléphone ou mot de passe invalide" },
      { status: 400 }
    );
  }

  // Numéro normalisé (« 77 123 45 67 », « +221771234567 » et « 771234567 »
  // désignent le MÊME compte).
  const phone = normalizePhone(parsed.data.phone).replace(/^\+/, "");
  const password = parsed.data.password;

  try {
    return await run(phone, password);
  } catch (error) {
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          return await run(phone, password);
        } catch (retryError) {
          console.error("[artisan/login] retry:", retryError);
        }
      } else {
        console.error("[artisan/login] heal failed:", heal.errors);
      }
    }
    console.error("[artisan/login]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
