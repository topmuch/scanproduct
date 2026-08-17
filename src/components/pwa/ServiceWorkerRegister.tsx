"use client";

import { useEffect } from "react";

/**
 * ServiceWorkerRegister — enregistre le service worker (public/sw.js) pour
 * activer le mode hors ligne et les capacités PWA.
 *
 * - En production : enregistre immédiatement.
 * - En dev : on attend le chargement complet de la page pour ne pas ralentir
 *   le hot-reload de Turbopack.
 *
 * Le SW est servi depuis /sw.js (fichier statique dans public/), donc il a un
 * scope racine (/) et contrôle tout le site.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Vérifie les mises à jour toutes les heures.
          setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
        })
        .catch((err) => {
          console.warn("[PWA] SW registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
