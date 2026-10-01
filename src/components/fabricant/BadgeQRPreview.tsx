"use client";

import { QRCodeCanvas } from "qrcode.react";

/**
 * BadgeQRPreview — aperçu fidèle du design officiel « LABEL VERIFSCAN » :
 * cercle jaune #F8E805, « LABEL VERIFSCAN » en arc haut,
 * « SCANNEZ POUR EN SAVOIR PLUS » en arc bas, arcs décoratifs latéraux,
 * QR noir au centre (modules clairs = jaune, comme le modèle client).
 *
 * Rendu en SVG navigateur (textPath natif) avec la même géométrie que le
 * module serveur `src/lib/qr-badge.ts` — approximation typographique
 * (police système) suffisante pour un aperçu instantané sans appel API.
 */
export function BadgeQRPreview({
  value,
  size = 150,
}: {
  value: string;
  size?: number;
}) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 1000 1000"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <circle cx="500" cy="500" r="472" fill="#F8E805" />
        <defs>
          <path id="vs-arc-top" d="M 48,500 A 452,452 0 0 1 952,500" fill="none" />
          <path id="vs-arc-bot" d="M 48,500 A 452,452 0 0 0 952,500" fill="none" />
        </defs>
        <text
          fontFamily="system-ui, Arial, sans-serif"
          fontSize="58"
          fontWeight="800"
          letterSpacing="14"
          fill="#000000"
        >
          <textPath href="#vs-arc-top" startOffset="50%" textAnchor="middle">
            LABEL VERIFSCAN
          </textPath>
        </text>
        <text
          fontFamily="system-ui, Arial, sans-serif"
          fontSize="44"
          fontWeight="800"
          letterSpacing="4"
          fill="#000000"
        >
          <textPath href="#vs-arc-bot" startOffset="50%" textAnchor="middle">
            SCANNEZ POUR EN SAVOIR PLUS
          </textPath>
        </text>
        <g fill="none" stroke="#000000" strokeWidth="17" strokeLinecap="round">
          <path d="M 941,385 A 452,452 0 0 1 918,663" />
          <path d="M 59,385 A 452,452 0 0 0 82,663" />
        </g>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <QRCodeCanvas
          value={value}
          size={Math.round(size * 0.5)}
          fgColor="#000000"
          bgColor="rgba(0,0,0,0)"
          level="Q"
          marginSize={0}
          style={{ width: size * 0.5, height: size * 0.5 }}
        />
      </div>
    </div>
  );
}
