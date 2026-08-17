/**
 * VerifScan — Service Worker
 *
 * Stratégies de cache :
 *   - Navigation (pages HTML) : network-first → cache → page offline
 *     L'utilisateur voit toujours la dernière version quand il a du réseau,
 *     et peut naviguer hors ligne grâce au cache.
 *   - Assets same-origin (JS/CSS/fonts/_next/static) : stale-while-revalidate
 *     Rapide (sert le cache immédiatement) et se met à jour en arrière-plan.
 *   - Images cross-origin : cache-first avec mise à jour en arrière-plan.
 *   - API (/api/*) : network-first, fallback cache (pour les données produit).
 *
 * Le cache est versionné : à chaque changement de CACHE_VERSION, l'ancien
 * cache est supprimé à l'activation. En production, Next.js peut forcer le
 * rechargement si besoin via skipWaiting + clients.claim.
 */

const CACHE_VERSION = "verifscan-v1-20260817";
const OFFLINE_URL = "/offline";

// App shell — pages et assets critiques pré-cacheés à l'installation.
// On garde la liste courte : le reste se cache au fil de la navigation.
const APP_SHELL = [
  "/",
  "/produits",
  OFFLINE_URL,
  "/manifest.json",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-192-maskable.png",
  "/icon-512-maskable.png",
  "/apple-icon.png",
];

// ────────────────────────────────────────────────────────────────────────────
// Install : pré-cache l'app shell.
// ────────────────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      // addAll est atomique : si un fetch échoue, rien n'est caché.
      // On ignore les échecs individuels ( certaines ressources peuvent
      // ne pas exister en dev) avec un fallback addAll→Promise.allSettled.
      .then((cache) =>
        Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
      )
  );
  // Prend le contrôle immédiatement sans attendre le reload.
  self.skipWaiting();
});

// ────────────────────────────────────────────────────────────────────────────
// Activate : nettoie les anciennes versions de cache.
// ────────────────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ────────────────────────────────────────────────────────────────────────────
// Fetch : applique la stratégie selon le type de requête.
// ────────────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // On ne gère que les requêtes GET (les POST/PATCH/DELETE ne se cachent pas).
  if (request.method !== "GET") return;

  // Ignore les requêtes non HTTP(S) (chrome-extension://, data:, etc.).
  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // ── Navigation (pages HTML) : network-first → cache → offline ──────────
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // On ne cache que les réponses valides (status 200, same-origin).
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // ── API (/api/*) : network-first avec fallback cache (données produit) ─
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || Response.error()))
    );
    return;
  }

  // ── Assets same-origin : stale-while-revalidate ────────────────────────
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200 && response.type === "basic") {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        // Sert le cache immédiatement si disponible, sinon attend le réseau.
        return cached || network;
      })
    );
    return;
  }

  // ── Cross-origin (images produit, etc.) : cache-first ───────────────────
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});

// ────────────────────────────────────────────────────────────────────────────
// Message handler : permet au client de demander un update immédiat.
// ────────────────────────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
