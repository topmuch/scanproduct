"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { OutlineButton } from "./ui";
import { downloadBadgeQR } from "@/lib/qr-utils";
import { getScanOrigin } from "@/lib/qr-url";

/**
 * DesignDownloadButton — télécharge le design officiel « LABEL VERIFSCAN »
 * en PNG haute résolution, à la demande (bouton permanent du dashboard).
 *
 * Le badge est rendu par /api/qr-codes/render-badge — exactement le même
 * pipeline serveur (sharp + SVG texte en arc, police DejaVu) que les
 * téléchargements de QR codes, exports ZIP et PDF d'étiquettes. Le fichier
 * sort toujours avec le design À JOUR, indépendamment de la date de
 * génération des QR.
 *
 * Le QR encodé dans le modèle est un QR de démonstration pointant vers le
 * catalogue public (${origin}/produits) — le badge reste scannable et
 * imprimable. Pour obtenir un badge lié à un produit précis, utiliser le
 * téléchargement par QR (grille « Mes QR Codes », dialog aperçu ou export
 * ZIP / PDF).
 *
 * Props :
 *   label     — texte du bouton (défaut « Télécharger le nouveau design »).
 *   className — classes additionnelles transmises à OutlineButton.
 *   disabled  — désactive le bouton (état parent).
 */
export function DesignDownloadButton({
  label = "Télécharger le nouveau design",
  className,
  disabled = false,
}: {
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const telecharger = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // 1200 px = 1016 DPI à 3 cm — conforme au gabarit officiel.
      await downloadBadgeQR(
        `${getScanOrigin()}/produits`,
        "label-verifscan-design.png",
        1200
      );
      toast.success("Nouveau design « LABEL VERIFSCAN » téléchargé", {
        description:
          "PNG 1200 px — imprimable dès 3 cm. Le QR du modèle pointe vers le catalogue public.",
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Échec du téléchargement du design",
        {
          description:
            "Réessayez dans quelques instants — si le problème persiste, rechargez la page.",
        }
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <OutlineButton
      onClick={telecharger}
      disabled={disabled || busy}
      className={className}
    >
      <Download className={"h-4 w-4" + (busy ? " animate-pulse" : "")} />
      {busy ? "Préparation du design…" : label}
    </OutlineButton>
  );
}
