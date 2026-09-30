import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { asciiHeader, ensureArtisanTables, isTableMissingError } from "@/lib/ensure-artisan-tables";
import { detectCounterfeit, notifyArtisanCounterfeit } from "@/lib/artisan-anti-counterfeit";

/**
 * POST /api/artisan/track-scan
 *
 * Enregistre le scan d'un produit artisanal ACTIF (page /a/[code]) et
 * alimente la détection de contrefaçon.
 *
 * Pourquoi côté client ? Le fuseau horaire IANA du visiteur
 * (Intl.DateTimeFormat) n'est accessible que depuis le navigateur — c'est
 * LE signal géo gratuit (pas d'API IP) qui permet de repérer un même QR
 * scanné depuis 2 régions en < 48 h (produit copié).
 *
 * Corps : { code, timezone?, deviceType? } — toujours { ok: true } en
 * sortie (2xx) sauf invalides : le tracking ne doit JAMAIS perturber le
 * parcours client. Le composant ScanTracker appelle cette route une fois
 * par vue (garde sessionStorage 60 s contre les double-montages).
 */

const BodySchema = z.object({
  code: z.string().trim().min(4).max(80),
  timezone: z.string().trim().max(64).optional().or(z.literal("")),
  deviceType: z.string().trim().max(20).optional().or(z.literal("")),
});

// Rate limit mémoire généreux (les vrais clients scannent 1×/page vue)
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 60;
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
    return NextResponse.json({ ok: false, error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Données invalides" }, { status: 400 });
  }
  const { code, timezone, deviceType } = parsed.data;

  const lot = await db.preActivatedLot.findUnique({
    where: { qrCode: code },
    include: { pack: { select: { artisanEmail: true, status: true } } },
  });
  // Lot inconnu/inactif → silencieux (pas d'info aux faux scanners).
  // Le statut du LOT décide : un pack partiel (activation flexible) expose
  // déjà ses produits actifs au scan.
  if (!lot || lot.status !== "active") {
    return NextResponse.json({ ok: true });
  }

  const h = request.headers;
  await db.artisanScan.create({
    data: {
      lotId: lot.id,
      deviceType: deviceType || null,
      timezone: timezone || null,
      country: h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? null,
      city: h.get("x-vercel-ip-city") ?? null,
    },
  });

  // Anti-contrefaçon : même QR scanné depuis 2 régions en < 48 h
  if (timezone) {
    const alert = await detectCounterfeit(lot.id, timezone);
    if (alert) {
      void notifyArtisanCounterfeit({
        to: lot.pack.artisanEmail,
        productName: lot.productName ?? "Produit artisanal",
        artisanName: lot.artisanName ?? "Artisan",
        alert,
      });
    }
  }

  return NextResponse.json({ ok: true });
};

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "inconnu";
  if (rateLimited(ip)) {
    // 429 silencieux côté client (le tracker ignore les erreurs)
    return NextResponse.json({ ok: false, error: "Trop de requêtes" }, { status: 429 });
  }

  try {
    return await run(request);
  } catch (error) {
    // Auto-réparation P2021/P2022 puis rejeu unique (vieille DB de prod)
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
          return res;
        } catch {
          // rejeu échoué → on retombe sur la réponse silencieuse
        }
      }
    }
    // Jamais d'erreur visible pour le client final
    console.error("[track-scan] échec (non bloquant):", error);
    return NextResponse.json({ ok: true });
  }
}
