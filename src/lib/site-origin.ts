/**
 * VerifScan — Résolution ROBUSTE de l'origine publique du site (serveur).
 *
 * PROBLÈME RÉSOLU : derrière un reverse proxy (Coolify / Traefik / Nginx /
 * Cloudflare), `request.nextUrl.origin` peut renvoyer l'adresse INTERNE du
 * conteneur — ex. « https://0.0.0.0:80 » — au lieu du nom de domaine
 * réellement consulté par l'utilisateur. Conséquences signalées :
 *   - les QR imprimés encodaient « https://0.0.0.0:80/a/ART-… » → le
 *     téléphone ne pouvait rien ouvrir (« QR pas scannable ») ;
 *   - le message WhatsApp pointait « https://0.0.0.0:80/artisan/login » →
 *     lien mort pour l'artisan.
 *
 * STRATÉGIE — le premier candidat JOIGNABLE depuis un téléphone gagne :
 *   1. `x-forwarded-host` + `x-forwarded-proto` — posés par le proxy, c'est
 *      le domaine tapé par l'utilisateur (celui où le site et ses données
 *      existent réellement) ;
 *   2. l'origine de la requête Next (accès direct sans proxy) ;
 *   3. `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SCAN_URL` / `NEXTAUTH_URL` —
 *      filet de sécurité configuré dans Coolify quand même le proxy ment ;
 *   4. l'origine brute (dernier recours — comportement défini en toutes
 *      circonstances, + avertissement console en production).
 *
 * « Public » = hôte distinct de 0.0.0.0 / 127.0.0.1 / localhost / ::1 /
 * host.docker.internal / *.local / *.internal — des adresses qu'un
 * TÉLÉPHONE ne peut jamais atteindre.
 *
 * EN DÉVELOPPEMENT (NODE_ENV !== "production") : l'origine consultée gagne
 * d'abord (localhost:3000 — c'est là que le batch vient d'être créé) ; mais
 * si la requête passe par un domaine public (aperçu sandbox, tunnel), ce
 * domaine est retenu — les QR imprimés depuis l'aperçu deviennent
 * réellement scannables depuis un téléphone. La variable d'environnement ne
 * doit JAMAIS détourner un dev local (elle pointerait vers un domaine où
 * les données de test n'existent pas).
 */

const NON_PUBLIC_HOSTS = new Set([
  "localhost",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
  "[::1]",
  "[::]",
  "host.docker.internal",
]);

/**
 * Un hôte est « public » s'il est joignable depuis l'extérieur
 * (un téléphone qui scanne). Les adresses d'écoute internes
 * (0.0.0.0, localhost, 127.0.0.1, ::1…) ne le sont jamais.
 */
export function isPublicHost(hostname: string): boolean {
  const h = hostname.toLowerCase().trim().replace(/^\[|\]$/g, "");
  if (!h) return false;
  if (NON_PUBLIC_HOSTS.has(h) || NON_PUBLIC_HOSTS.has(`[${h}]`)) return false;
  if (h.endsWith(".local") || h.endsWith(".internal")) return false;
  return true;
}

export function isPublicOrigin(url: string): boolean {
  try {
    return isPublicHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

function normalizeOrigin(u: string): string {
  return u.trim().replace(/\/+$/, "");
}

/** Reconstruit une origine depuis un en-tête Host (peut contenir le port,
 *  ou une liste « host1, host2 » quand plusieurs proxys se relaient). */
function originFromHostHeader(
  hostHeader: string,
  protoHeader: string | null | undefined
): string {
  const host = hostHeader.split(",")[0].trim();
  const proto = (protoHeader ?? "https").split(",")[0].trim() || "https";
  if (!host) return "";
  return `${proto}://${host}`;
}

export interface OriginInputs {
  /** En-tête x-forwarded-host (posé par le proxy). */
  forwardedHost?: string | null;
  /** En-tête x-forwarded-proto (https derrière Coolify). */
  forwardedProto?: string | null;
  /** `request.nextUrl.origin` — adresse vue par le serveur. */
  rawOrigin?: string | null;
  /** Variable d'environnement explicite (NEXT_PUBLIC_APP_URL…). */
  envUrl?: string | null;
  /** Force le mode production (tests). Défaut : NODE_ENV === "production". */
  isProd?: boolean;
}

/** Remplace 0.0.0.0 / 127.0.0.1 / [::] par localhost (adresse d'écoute
 *  uniquement — un navigateur, lui, navigue sur localhost). */
export function localhostify(origin: string): string {
  try {
    const u = new URL(origin);
    if (["0.0.0.0", "127.0.0.1", "[::]", "::", "[::1]"].includes(u.hostname)) {
      return `http://localhost${u.port ? `:${u.port}` : ""}`;
    }
  } catch {
    /* chaîne non URL — renvoyée telle quelle */
  }
  return origin;
}

/**
 * Fonction PURE (testable sans serveur) — choisit l'origine publique.
 * Voir la stratégie en tête de fichier.
 */
export function computeSiteOrigin(inputs: OriginInputs): string {
  const isProd = inputs.isProd ?? process.env.NODE_ENV === "production";

  const forwarded = inputs.forwardedHost?.trim()
    ? originFromHostHeader(inputs.forwardedHost.trim(), inputs.forwardedProto)
    : "";
  const raw = inputs.rawOrigin?.trim() ? normalizeOrigin(inputs.rawOrigin) : "";
  const env = inputs.envUrl?.trim() ? normalizeOrigin(inputs.envUrl) : "";

  if (isProd) {
    // Production : premier candidat joignable depuis un téléphone.
    for (const candidate of [forwarded, raw, env]) {
      if (candidate && isPublicOrigin(candidate)) return candidate;
    }
    // Rien de public (proxy ment + env absente) : comportement défini + alerte.
    if (raw || env) {
      console.warn(
        "[site-origin] Aucune origine publique détectable " +
          `(forwarded=${forwarded || "—"}, raw=${raw || "—"}, env=${env || "—"}). ` +
          "Configurez NEXT_PUBLIC_APP_URL=https://votre-domaine dans Coolify."
      );
    }
    return localhostify(raw || env || "https://verifscan.com");
  }

  // Développement :
  //  1. domaine public consulté (aperçu sandbox / tunnel) → QR scannables ;
  //  2. origine locale de la requête (localhost:3000) — JAMAIS l'env, qui
  //     pointerait vers un domaine sans les données de test ;
  //  3. env publique (dev derrière proxy sans forwarded-host, rare).
  if (forwarded && isPublicOrigin(forwarded)) return forwarded;
  if (raw) return localhostify(raw);
  if (env && isPublicOrigin(env)) return env;
  return "http://localhost:3000";
}

/** Variable d'environnement d'origine explicite (ordre de priorité). */
function envSiteUrl(): string | null {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SCAN_URL ||
    process.env.NEXTAUTH_URL ||
    null
  );
}

/**
 * Wrapper serveur : déduit tout depuis la requête Next.
 * Accepte NextRequest/Request (propriété url) ou un objet minimal headers+nextUrl.
 */
type OriginRequest = {
  headers: Headers;
  url?: string;
  nextUrl?: { origin: string };
};

export function resolveSiteOrigin(request: OriginRequest): string {
  const h = request.headers;
  const rawOrigin = request.nextUrl?.origin ??
    (request.url ? new URL(request.url).origin : null);
  return computeSiteOrigin({
    forwardedHost: h.get("x-forwarded-host"),
    forwardedProto: h.get("x-forwarded-proto"),
    rawOrigin,
    envUrl: envSiteUrl(),
  });
}
