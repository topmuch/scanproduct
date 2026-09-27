"use client";

import { useCallback, useEffect, useState } from "react";
import { X, ZoomIn } from "lucide-react";

/**
 * ZoomableProductImage — product photo with preserved aspect ratio
 * + full-screen zoom lightbox.
 *
 * Fixes two user-reported issues on the scan page (/p/[lotId]):
 *   1. "l'image est déformée" — the old markup used `object-cover` inside a
 *      square box, which cropped / distorted non-square product photos.
 *      We now render with `object-contain` on a neutral background so the
 *      whole photo is always visible at its true aspect ratio.
 *   2. "je veux que l'image s'affiche agrandie" — the photo slot was tiny
 *      (112–128 px). The slot is now much larger AND a tap opens a
 *      full-screen lightbox where the photo is displayed as big as the
 *      viewport allows (still with `object-contain`, never stretched).
 *
 * Client component (needs state for the lightbox).
 */
export function ZoomableProductImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  // Close the lightbox with the Escape key.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // Lock page scroll while the lightbox is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  if (failed) {
    return (
      <div
        className={
          "flex items-center justify-center bg-gradient-to-br from-[#F0F4F9] to-purple-50 text-5xl " +
          className
        }
        role="img"
        aria-label={alt}
      >
        📦
      </div>
    );
  }

  return (
    <>
      {/* ── Inline photo (clickable) ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Agrandir l'image du produit : ${alt}`}
        className={
          "group/zoom relative block cursor-zoom-in overflow-hidden bg-white focus:outline-none " +
          className
        }
      >
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          className="h-full w-full object-contain transition-transform duration-500 group-hover/zoom:scale-105"
        />
        {/* Subtle "tap to zoom" hint — bottom-right */}
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-200 group-hover/zoom:opacity-100 sm:h-8 sm:w-8">
          <ZoomIn className="h-4 w-4" />
        </span>
      </button>

      {/* ── Full-screen lightbox ─────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Vue agrandie : ${alt}`}
          onClick={close}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white shadow-lg backdrop-blur transition-colors hover:bg-white/30"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Product name caption */}
          <div className="absolute left-1/2 top-5 z-10 max-w-[80vw] -translate-x-1/2 truncate rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur">
            {alt}
          </div>

          {/* The photo, as large as possible, ratio always preserved */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[94vw] rounded-2xl bg-white object-contain shadow-2xl"
            draggable={false}
          />
        </div>
      )}
    </>
  );
}
