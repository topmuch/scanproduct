"use client";

import { useEffect } from "react";

/**
 * Removes the `_r` cache-buster query param from the URL after a successful
 * dashboard load.
 *
 * The param is added by DashboardLoadError's "Réessayer" button to force a
 * fresh server request (bypassing the Next.js router cache). Once the real
 * dashboard renders, we clean the URL via history.replaceState so it stays
 * tidy — no extra navigation, no flicker.
 */
export function StripRetryParam() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("_r")) {
      url.searchParams.delete("_r");
      window.history.replaceState(null, "", url.pathname);
    }
  }, []);

  return null;
}
