"use client";

import { useEffect } from "react";

/**
 * ScanTracker — enregistre le scan côté client (fire-and-forget).
 *
 * Le fuseau horaire IANA du visiteur (Intl.DateTimeFormat) n'est
 * accessible QUE depuis le navigateur : c'est le signal géo gratuit qui
 * alimente la détection de contrefaçon (même QR scanné depuis 2 régions
 * en < 48 h → alerte + email artisan). Remplace l'ancien enregistrement
 * serveur (qui ne voyait ni timezone ni JS réel).
 *
 * Garde sessionStorage 60 s : évite le double-comptage des double-montages
 * (React strict mode) et des rafraîchissements rapides.
 */
export function ScanTracker({ qrCode }: { qrCode: string }) {
  useEffect(() => {
    try {
      const key = `vs-scan-${qrCode}`;
      const last = Number(window.sessionStorage.getItem(key) || "0");
      if (Date.now() - last < 60_000) return;
      window.sessionStorage.setItem(key, String(Date.now()));

      const timezone =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "";
      const deviceType = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
        ? "mobile"
        : "desktop";

      void fetch("/api/artisan/track-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: qrCode, timezone, deviceType }),
        keepalive: true,
      }).catch(() => {
        // tracking jamais bloquant
      });
    } catch {
      // sessionStorage indisponible (navigation privée stricte) → tant pis
    }
  }, [qrCode]);

  return null;
}
