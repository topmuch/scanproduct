"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Copy, Check, QrCode } from "lucide-react";
import type { LotWithDetails } from "@/lib/public-data";

type Props = {
  lot: LotWithDetails;
};

/**
 * QRCodeSection — interactive card that renders a QR code (canvas), lets the
 * user download it as PNG, and copy the public URL.
 * Client component (needs canvas + clipboard).
 */
export function QRCodeSection({ lot }: Props) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const publicUrl = `https://verifscan.roomscan.pro/1/${lot.id}`;

  function handleDownload() {
    const canvas = canvasWrapperRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${lot.reference || lot.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = publicUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
        📱 QR code & partage
      </h2>

      <div className="mt-4 grid grid-cols-1 items-center gap-5 sm:grid-cols-2">
        {/* QR */}
        <div className="flex flex-col items-center gap-3">
          <div
            ref={canvasWrapperRef}
            className="flex h-44 w-44 items-center justify-center rounded-xl border-2 border-gray-200 bg-white p-3 shadow-sm"
          >
            <QRCodeCanvas
              value={publicUrl}
              size={160}
              level="H"
              marginSize={0}
              fgColor="#0F172A"
              bgColor="#FFFFFF"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <QrCode className="h-3.5 w-3.5" />
            <span className="font-mono">{lot.reference}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600">
            Scannez ce QR code pour accéder directement au passeport numérique de
            ce produit. Partagez-le en toute confiance.
          </p>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Lien public
            </p>
            <p className="mt-0.5 break-all font-mono text-xs text-gray-800">
              {publicUrl}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Download className="h-4 w-4" />
              Télécharger le QR
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copier le lien
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
