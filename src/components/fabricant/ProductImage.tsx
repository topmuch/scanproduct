"use client";

import { useState } from "react";

/**
 * ProductImage — robust product/lot image renderer.
 *
 * Renders the provided `src` when it is a non-empty, loadable image URL.
 * Falls back to a branded gradient placeholder (category icon + initials)
 * when `src` is empty, OR when the <img> fails to load (onError).
 *
 * This fixes the "broken image icon" bug that appeared whenever a product
 * was created without uploading a photo (photo = "") — the placeholder
 * keeps every card / row / dropdown visually consistent instead of
 * showing the browser's torn-image icon.
 */
export function ProductImage({
  src,
  alt,
  icon,
  className = "",
}: {
  src?: string;
  alt: string;
  /** Category emoji (e.g. "🥤"). Falls back to 📦 when omitted. */
  icon?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = src && src.trim() !== "" && !failed;

  if (showImg) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }

  // ---- Placeholder ----
  // Branded gradient (indigo → emerald) with the category emoji centered.
  // Uses container-query units (cqmin) so the emoji scales with the slot:
  //   • 32px dropdown thumbnail → ~16px emoji
  //   • 48px row thumbnail      → ~24px emoji
  //   • 200px product card      → ~64px emoji
  //   • 400px hero image        → ~64px emoji (capped)
  // `container-type: size` on the wrapper makes cqmin available.
  const emoji = icon || "📦";

  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1E3A8A] to-[#10B981] ${className}`}
      style={{ containerType: "size" }}
      role="img"
      aria-label={alt}
    >
      <span style={{ fontSize: "min(50cqmin, 64px)", lineHeight: 1 }}>
        {emoji}
      </span>
    </div>
  );
}
