"use client";

// ============================================================================
// BarcodeScanner — camera + manual-entry barcode modal
// ============================================================================
// Opens a full-screen overlay that lets the fabricant either scan a product
// barcode with their device camera (html5-qrcode supports EAN-13/UPC) or
// type it manually. On detection / submit, the code is sent to
// /api/products/lookup which proxies Open Food Facts. If a match is found,
// the extracted data is handed back to the parent form for auto-fill.
//
// Design: emerald accent (#10B981) to match the V3 wizard. Falls back to a
// manual input when the camera is unavailable (desktop / denied permission).
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Camera,
  Keyboard,
  Loader2,
  PackageSearch,
  ScanLine,
  X,
} from "lucide-react";
import type { ExtractedOffData } from "@/lib/openfoodfacts";

type Props = {
  onBarcodeScanned: (barcode: string, productData: ExtractedOffData | null) => void;
  onClose: () => void;
};

type Mode = "camera" | "manual";

export function BarcodeScanner({ onBarcodeScanned, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("camera");
  const [manualBarcode, setManualBarcode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerDivId = "off-barcode-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const resolvedRef = useRef(false);

  // Ref to always hold the latest onBarcodeScanned callback without
  // forcing the camera effect to restart on every parent re-render.
  const onScannedRef = useRef(onBarcodeScanned);
  useEffect(() => {
    onScannedRef.current = onBarcodeScanned;
  }, [onBarcodeScanned]);

  // ── Shared lookup (stable — useCallback with no deps) ──────────────
  // Kept stable so the camera useEffect doesn't restart on every render.
  // It reads the latest parent callback via onScannedRef.
  const doLookup = useCallback(async (barcode: string) => {
    setIsLoading(true);
    setError(null);

    // Stop the camera while we search so the preview doesn't keep running.
    const s = scannerRef.current;
    if (s) {
      try {
        await s.stop();
        await s.clear();
      } catch {
        /* noop */
      }
      scannerRef.current = null;
    }

    try {
      const res = await fetch(
        `/api/products/lookup?barcode=${encodeURIComponent(barcode)}`,
      );
      const data = await res.json();

      if (data.found) {
        onScannedRef.current(data.barcode, data.product);
      } else {
        // Not on OFF — still record the barcode; the fabricant fills the rest.
        onScannedRef.current(data.barcode || barcode, null);
      }
    } catch {
      setError("Erreur réseau lors de la recherche.");
      // Allow a retry: re-arm the resolved flag so the camera can fire again.
      resolvedRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // ── Camera lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "camera") return;

    let cancelled = false;
    resolvedRef.current = false;

    const scanner = new Html5Qrcode(scannerDivId, { verbose: false });
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 160 }, aspectRatio: 1.4 },
        (decodedText) => {
          if (resolvedRef.current || cancelled) return;
          resolvedRef.current = true;
          void doLookup(decodedText);
        },
        () => {
          // Per-frame decode errors are normal — ignore them silently.
        },
      )
      .catch((err) => {
        if (cancelled) return;
        console.error("[BarcodeScanner] camera start failed:", err);
        setCameraError(
          "Caméra indisponible. Saisissez le code-barres manuellement.",
        );
        setMode("manual");
      });

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        // Best-effort stop — swallow errors (scanner may already be stopped).
        s.stop().then(() => s.clear().catch(() => undefined)).catch(() => undefined);
      }
    };
  }, [mode, doLookup]);

  // ── Manual submit ───────────────────────────────────────────────────
  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = manualBarcode.trim();
    if (!code) {
      setError("Veuillez saisir un code-barres.");
      return;
    }
    void doLookup(code);
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scanner un code-barres"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: "#10B981" }}
            >
              <ScanLine size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-[#111827]">
                Scanner un code-barres
              </h2>
              <p className="text-[12px] text-[#6B7280]">
                Auto-remplissage via Open Food Facts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode switch */}
        <div className="flex gap-1 border-b border-[#E5E7EB] bg-[#F9FAFB] px-5 py-2">
          <ModeTab
            active={mode === "camera"}
            onClick={() => setMode("camera")}
            icon={<Camera size={15} />}
            label="Caméra"
          />
          <ModeTab
            active={mode === "manual"}
            onClick={() => setMode("manual")}
            icon={<Keyboard size={15} />}
            label="Saisie manuelle"
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2
                size={40}
                className="animate-spin"
                style={{ color: "#10B981" }}
              />
              <p className="mt-4 text-[14px] font-medium text-[#374151]">
                Recherche du produit…
              </p>
              <p className="mt-1 text-[12px] text-[#9CA3AF]">
                Interrogation d&apos;Open Food Facts
              </p>
            </div>
          ) : mode === "camera" ? (
            <div className="space-y-4">
              <div
                id={scannerDivId}
                className="overflow-hidden rounded-xl border-2 border-[#E5E7EB] bg-black"
              />
              <p className="text-center text-[12px] text-[#6B7280]">
                Placez le code-barres du produit dans le cadre de la caméra.
              </p>
              {cameraError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800">
                  {cameraError}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="manual-barcode"
                  className="mb-1.5 block text-[13px] font-medium text-[#374151]"
                >
                  Code-barres (EAN-13)
                </label>
                <input
                  id="manual-barcode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={manualBarcode}
                  onChange={(e) =>
                    setManualBarcode(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="Ex : 3017620422003"
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 font-mono text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20"
                />
                <p className="mt-1.5 text-[12px] text-[#9CA3AF]">
                  Saisissez les chiffres sous le code-barres du produit.
                </p>
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#10B981" }}
                disabled={isLoading}
              >
                <PackageSearch size={16} />
                Rechercher
              </button>
            </form>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-5 py-3">
          <p className="text-center text-[11px] text-[#9CA3AF]">
            Données fournies par{" "}
            <span className="font-medium text-[#6B7280]">Open Food Facts</span>{" "}
            — base de données ouverte
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small mode-tab pill
// ---------------------------------------------------------------------------

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
        active
          ? "bg-white text-[#10B981] shadow-sm ring-1 ring-[#E5E7EB]"
          : "text-[#6B7280] hover:text-[#374151]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
