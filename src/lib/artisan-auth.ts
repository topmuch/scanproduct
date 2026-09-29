import crypto from "crypto";

/**
 * VerifScan — Authentification ARTISAN (portail informel).
 *
 * ── Pourquoi un JWT maison alors que les fabricants passent par NextAuth ──
 * L'artisan informel n'a ni email ni entreprise : son identifiant est son
 * NUMERO DE TELEPHONE et son mot de passe par défaut est « 0000 » (envoyé
 * par WhatsApp à la vente du pack). NextAuth est calé sur des sessions
 * cookie / comptes User (FABRICANT/SUPERADMIN) — inadapté ici. On utilise
 * donc un JWT HS256 signé, stocké dans le localStorage du téléphone de
 * l'artisan et envoyé via l'en-tête `Authorization: Bearer <token>`.
 *
 * ── Implémentation ──────────────────────────────────────────────────────
 * HMAC-SHA256 via node:crypto (aucune dépendance) :
 *   header.payload.signature  (base64url)
 * Payload : { sub: artisanId, phone, iat, exp } — expiration 30 jours.
 * Le secret vient de ARTISAN_JWT_SECRET (ou NEXTAUTH_SECRET à défaut).
 *
 * Le mot de passe est stocké HACHÉ (bcryptjs) — voir les routes
 * /api/artisan/login et /api/artisan/password.
 */

export const ARTISAN_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 jours

export interface ArtisanTokenPayload {
  artisanId: string;
  phone: string;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function jwtSecret(): string {
  return (
    process.env.ARTISAN_JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "verifscan-artisan-dev-secret"
  );
}

function sign(data: string): string {
  return b64url(crypto.createHmac("sha256", jwtSecret()).update(data).digest());
}

/** Crée un JWT artisan valable 30 jours. */
export function createArtisanToken(payload: ArtisanTokenPayload): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(
    JSON.stringify({
      sub: payload.artisanId,
      phone: payload.phone,
      iat: now,
      exp: now + ARTISAN_TOKEN_TTL_SECONDS,
    })
  );
  const unsigned = `${header}.${body}`;
  return `${unsigned}.${sign(unsigned)}`;
}

/**
 * Extrait et vérifie le payload du token artisan d'une requête.
 * Accepte `Authorization: Bearer <token>` (dashboard) — retourne null
 * si absent/invalide/expiré (jamais d'exception : appel "soft").
 */
export function getArtisanFromToken(request: Request): ArtisanTokenPayload | null {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  return verifyArtisanToken(match[1]);
}

/** Vérifie un token JWT artisan (signature + expiration). */
export function verifyArtisanToken(token: string): ArtisanTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = sign(`${header}.${body}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // timingSafeEqual exige des longueurs identiques
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as {
      sub?: string;
      phone?: string;
      exp?: number;
    };
    if (!payload.sub || !payload.phone) return null;
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;
    return { artisanId: payload.sub, phone: payload.phone };
  } catch {
    return null;
  }
}

/**
 * Garde stricte pour les routes API artisan. Jette une Error avec un
 * préfixe "HTTP_<status>:" que la route transforme en réponse JSON.
 * Usage : const artisan = requireArtisanAuth(request);
 */
export function requireArtisanAuth(request: Request): ArtisanTokenPayload {
  const payload = getArtisanFromToken(request);
  if (!payload) {
    throw new Error("HTTP_401:Non authentifié");
  }
  return payload;
}

/**
 * Normalise un numéro de téléphone sénégalais / international pour en faire
 * un identifiant STABLE : supprime espaces, tirets, parenthèses et points.
 * Les opérateurs du spec (« 77 123 45 67 », « +221771234567 », « 771234567 »)
 * doivent matcher le MÊME compte — on garde les chiffres et un éventuel
 * préfixe +. (Le +221 est retiré : le marché est national, le wa.me le
 * ré-ajoute avec l'indicatif 221.)
 */
export function normalizePhone(raw: string): string {
  const trimmed = (raw || "").trim();
  const plus = trimmed.startsWith("+");
  let digits = trimmed.replace(/[\s.\-()+]/g, "");
  // Indicatif Sénégal retiré pour la comparaison d'identité
  if (digits.startsWith("00221")) digits = digits.slice(5);
  else if (digits.startsWith("221") && digits.length > 9) digits = digits.slice(3);
  return (plus ? "+" : "") + digits;
}

/** Message d'erreur standardisé depuis une Error "HTTP_<status>:<message>". */
export function httpErrorStatus(error: unknown): { status: number; message: string } {
  const msg = error instanceof Error ? error.message : String(error);
  const match = /^HTTP_(\d{3}):([\s\S]*)$/.exec(msg);
  if (match) {
    return { status: Number(match[1]), message: match[2] };
  }
  return { status: 500, message: "Erreur serveur" };
}
