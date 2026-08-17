"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * ProductQRCode — vrai QR code scannable affiché à côté du produit.
 *
 * - Encode l'URL absolue `${origin}/p/[lotId]` (récupérée côté client via
 *   window.location.origin) afin que le scan depuis n'importe quel appareil
 *   redirige vers le passeport numérique du lot.
 * - Pendant l'hydration (avant l'effect), on encode l'URL relative `/p/[lotId]`
 *   pour éviter un mismatch de hydration, puis on passe à l'absolue après mount.
 * - Taille par défaut : 76px ≈ 2cm à 96dpi (1cm = 37.8px @ 96dpi).
 * - SVG vectoriel : reste net à toute taille, imprimable.
 * - Quiet zone (marginSize=1) + fond blanc + foreground noir pur pour
 *   garantir la scannabilité par n'importe quel lecteur de QR.
 */

type Props = {
  /** ID du lot à encoder dans le QR (redirige vers /p/[lotId]). */
  lotId: string;
  /** ID du produit (fallback si pas de lot, utilisé pour l'aria-label). */
  productId?: string;
  /** Taille en pixels (76 ≈ 2cm @ 96dpi). */
  size?: number;
  /** Classes additionnelles sur le conteneur. */
  className?: string;
};

export function ProductQRCode({
  lotId,
  productId,
  size = 76,
  className,
}: Props) {
  const [origin, setOrigin] = React.useState<string>("");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Relative sur le serveur (pas de mismatch), absolue après mount côté client.
  const url = origin ? `${origin}/p/${lotId}` : `/p/${lotId}`;

  return (
    <div
      className={`flex items-center justify-center rounded-md bg-white ring-1 ring-black/5 ${className ?? ""}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`QR code à scanner pour ouvrir le passeport numérique du produit ${productId ?? lotId}`}
    >
      <QRCodeSVG
        value={url}
        size={size}
        level="M"
        marginSize={1}
        bgColor="#FFFFFF"
        fgColor="#000000"
      />
    </div>
  );
}
