"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Loader2, X, ImageIcon } from "lucide-react";

/**
 * ImageUploadWithPreview — robust image upload with IMMEDIATE preview.
 *
 * Key features:
 *  1. Uses a Blob URL (URL.createObjectURL) for instant preview BEFORE the
 *     upload completes — the user sees their image immediately, never a
 *     broken-image icon while the network request is in flight.
 *  2. Once the upload succeeds, the Blob URL is replaced by the server-returned
 *     URL (/uploads/<uuid>.<ext>) so the preview persists across remounts.
 *  3. Uses a plain <img> tag (NOT next/image) — avoids Next.js image optimizer
 *     issues with dynamically-uploaded local files.
 *  4. Revokes the Blob URL on unmount / replacement to prevent memory leaks.
 *  5. Surfaces upload errors inline with a clear, actionable message.
 *
 * Usage:
 *   <ImageUploadWithPreview
 *     value={formData.photo}
 *     onChange={(url) => setFormData({ ...formData, photo: url })}
 *     label="Photo du produit"
 *   />
 */
type Props = {
  /** Current image URL (server path like "/uploads/abc.png" or ""). */
  value?: string;
  /** Called with the new server URL once upload succeeds. */
  onChange: (url: string) => void;
  /** Optional label above the upload zone. */
  label?: string;
  /** Optional helper hint shown below the upload zone. */
  hint?: string;
  /** Optional className for the outer wrapper. */
  className?: string;
  /** Aspect ratio of the preview zone. Default "200px" tall. */
  height?: number;
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ImageUploadWithPreview({
  value,
  onChange,
  label,
  hint = "JPG, PNG, WebP ou GIF — 5 MB max",
  className = "",
  height = 200,
}: Props) {
  // preview holds EITHER a blob: URL (during/after upload of a new file)
  // OR the server URL (after upload completes, or the initial value).
  const [preview, setPreview] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep a ref to the current blob URL so we can revoke it later.
  const blobUrlRef = useRef<string | null>(null);

  // Sync external value → preview when the parent's value changes
  // (e.g. when opening the modal with an existing photo).
  useEffect(() => {
    if (value && value !== preview) {
      // Don't override a blob: preview that's still being uploaded
      if (!preview || !preview.startsWith("blob:")) {
        setPreview(value);
      }
    }
  }, [value, preview]);

  // ── CRITICAL FIX ─────────────────────────────────────────────────
  // Revoke the Blob URL ONLY AFTER `preview` has been committed to a
  // non-blob URL (the server-returned path). Previously we revoked the
  // blob URL synchronously right before calling setPreview(serverUrl),
  // which created a window where the <img> still had src="blob:…"
  // pointing to an already-revoked blob → the image would appear for a
  // few seconds (during upload) then suddenly break when the upload
  // completed. By deferring the revoke to this effect, we guarantee the
  // <img> element has already re-rendered with the new server URL
  // before the old blob URL is destroyed.
  useEffect(() => {
    if (preview && !preview.startsWith("blob:") && blobUrlRef.current) {
      const blob = blobUrlRef.current;
      blobUrlRef.current = null;
      // Defer to the next macrotask so the browser has fully committed
      // the new <img src> and any in-flight paint of the old blob has
      // completed before we destroy it.
      const id = setTimeout(() => {
        try {
          URL.revokeObjectURL(blob);
        } catch {
          /* already revoked — ignore */
        }
      }, 0);
      return () => clearTimeout(id);
    }
  }, [preview]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // ---- Client-side validation ----
      if (!file.type.startsWith("image/")) {
        setError("Veuillez sélectionner un fichier image.");
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(
          `Format non supporté (${file.type}). Utilisez JPG, PNG, WebP ou GIF.`,
        );
        return;
      }
      if (file.size > MAX_SIZE) {
        setError(
          `Le fichier dépasse 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
        );
        return;
      }

      // ---- IMMEDIATE preview via Blob URL ----
      // Revoke any previous blob URL to avoid leaking memory.
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      const objectUrl = URL.createObjectURL(file);
      blobUrlRef.current = objectUrl;
      setPreview(objectUrl);

      // ---- Upload to server ----
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          throw new Error(data.error || "Échec de l'upload.");
        }

        // ── CRITICAL FIX ───────────────────────────────────────────
        // Switch the preview to the server URL FIRST. The blob URL is
        // NOT revoked here — the useEffect above will revoke it on the
        // next tick, AFTER React has committed the new <img src> to the
        // DOM. This prevents the "image shows then breaks" race where
        // the <img> briefly pointed to a revoked blob.
        setPreview(data.url);
        onChange(data.url);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Erreur réseau lors de l'upload.";
        setError(msg);
        // Revert to the previous value (or null) so the user doesn't see a
        // broken preview.
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        setPreview(value || null);
      } finally {
        setUploading(false);
        // Reset the input so the same file can be selected again.
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [onChange, value],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleRemove = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPreview(null);
    setError(null);
    onChange("");
  }, [onChange]);

  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">
          {label}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onFileChange}
        className="hidden"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        style={{ height: `${height}px` }}
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl border-2 transition-colors ${
          dragActive
            ? "border-[#2563EB] bg-[#EFF6FF]"
            : preview
              ? "border-[#E5E7EB] bg-white"
              : "border-dashed border-[#E5E7EB] bg-[#F9FAFB]"
        }`}
      >
        {preview ? (
          <>
            {/* Plain <img> tag — NOT next/image — so dynamically uploaded
                local files don't go through the Next.js image optimizer.
                The `key` forces React to mount a fresh <img> element when
                the src changes (e.g. blob: → /uploads/…), guaranteeing a
                clean load and avoiding any stale error state from a
                previous (possibly revoked) blob URL. */}
            <img
              key={preview}
              src={preview}
              alt="Aperçu"
              className="h-full w-full object-cover"
              onError={() => {
                // If even the preview fails (shouldn't happen with blob
                // URLs, but defensive), surface an error instead of a
                // broken icon.
                setError("Impossible de charger l'aperçu de l'image.");
              }}
            />

            {/* Upload overlay spinner */}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <div className="flex flex-col items-center gap-2 text-white">
                  <Loader2 size={28} className="animate-spin" />
                  <span className="text-[12px] font-medium">
                    Upload en cours…
                  </span>
                </div>
              </div>
            )}

            {/* Top-right action buttons */}
            {!uploading && (
              <div className="absolute right-2 top-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2.5 py-1.5 text-[12px] font-medium text-[#374151] shadow-sm transition-colors hover:bg-white"
                >
                  <Upload className="h-3.5 w-3.5" /> Changer
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-[#EF4444] shadow-sm transition-colors hover:bg-white"
                  aria-label="Retirer la photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#6B7280] transition-colors hover:text-[#2563EB] disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 size={28} className="animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImageIcon size={28} />
                <span className="text-[13px] font-medium">
                  Cliquez ou glissez une image
                </span>
                <span className="text-[11px] text-[#9CA3AF]">{hint}</span>
              </div>
            )}
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[#EF4444]">
          <X size={12} /> {error}
        </p>
      )}
    </div>
  );
}
