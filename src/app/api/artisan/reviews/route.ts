import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { asciiHeader, ensureArtisanTables, isTableMissingError } from "@/lib/ensure-artisan-tables";

/**
 * POST /api/artisan/reviews
 *
 * Avis client PUBLIC sur un produit artisanal actif (page /a/[code],
 * section « Avis des clients »). Sans compte : un client qui vient de
 * scanner laisse nom + note (1-5) + commentaire.
 *
 * Garde-fous :
 *   - le lot doit exister et être ACTIF (pas d'avis sur un QR mort)
 *   - zod strict (nom 2-40, note 1-5, commentaire 2-500)
 *   - rate limit mémoire : 8 avis / 5 min / IP (anti spam)
 *   - auto-réparation P2021/P2022 + rejeu unique (table ArtisanReview
 *     absente d'une DB de prod ancienne)
 *   - modération légère : champ `hidden` prévu pour un futur back-office
 */

const BodySchema = z.object({
  code: z.string().trim().min(4).max(80),
  authorName: z.string().trim().min(2).max(40),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(2).max(500),
});

const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 8;
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

const run = async (request: NextRequest): Promise<NextResponse> => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { code, authorName, rating, comment } = parsed.data;

  const lot = await db.preActivatedLot.findUnique({
    where: { qrCode: code },
    select: { id: true, status: true, pack: { select: { status: true } } },
  });
  if (!lot || lot.status !== "active" || lot.pack.status !== "activated") {
    return NextResponse.json(
      { error: "Ce produit n'accepte pas d'avis pour le moment" },
      { status: 404 }
    );
  }

  const review = await db.artisanReview.create({
    data: { lotId: lot.id, authorName, rating, comment },
  });

  return NextResponse.json(
    {
      ok: true,
      review: {
        id: review.id,
        authorName: review.authorName,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      },
    },
    { status: 201 }
  );
};

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "inconnu";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Trop d'avis envoyés. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  try {
    return await run(request);
  } catch (error) {
    // Auto-réparation P2021/P2022 (table ArtisanReview manquante) puis rejeu
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          const res = await run(request);
          const healed = [
            heal.created.length > 0 ? `tables: ${heal.created.join(",")}` : null,
            heal.columnsAdded.length > 0 ? `colonnes: ${heal.columnsAdded.join(",")}` : null,
          ]
            .filter(Boolean)
            .join(" | ");
          res.headers.set("x-db-healed", asciiHeader(healed) || "ok");
          console.log(`[reviews] Réussi après auto-réparation (${healed})`);
          return res;
        } catch (retryError) {
          error = retryError;
        }
      } else {
        console.error("[reviews] Auto-réparation échouée:", heal.errors);
      }
    }
    console.error("[reviews] Erreur:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Erreur serveur pendant l'enregistrement de l'avis", details: msg.slice(0, 300) },
      { status: 500 }
    );
  }
}
