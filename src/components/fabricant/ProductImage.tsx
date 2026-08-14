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
  // Soft, light placeholder with the category emoji centered.
  //
  // ── Why not a colorful gradient? ────────────────────────────────
  // A previous version used `from-[#1E3A8A] to-[#10B981]` (navy → emerald)
  // which, when rendered on a small thumbnail, looked like a solid
  // "purple rectangle" to users — especially after an uploaded image
  // was lost post-deployment and the fallback kicked in. Users reported
  // "il affiche un carré violet" (it shows a purple square).
  //
  // The new design uses a light gray background with a subtle image icon
  // + the category emoji, making it immediately obvious that this is a
  // "no image" placeholder — not a real product photo or a branding
  // element. Uses container-query units (cqmin) so the emoji scales with
  // the slot size (dropdown thumb → product card → hero).
  const emoji = icon || "📦";

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-[#F3F4F6] ${className}`}
      style={{ containerType: "size" }}
      role="img"
      aria-label={alt}
    >
      {/* Subtle diagonal pattern so it's clearly a placeholder, not content */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent 0, transparent 8px, rgba(0,0,0,0.03) 8px, rgba(0,0,0,0.03) 16px)",
        }}
      />
      <span
        className="relative"
        style={{ fontSize: "min(50cqmin, 64px)", lineHeight: 1 }}
      >
        {emoji}
      </span>
    </div>
  );
}
