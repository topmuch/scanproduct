"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

/**
 * PhotoPicker — sélection de photo avec DEUX modes explicites
 * (demande utilisateur : « télécharger la photo OU prendre une photo
 * avec son téléphone ») :
 *
 *   1. « Prendre une photo »    → <input capture="environment"> : ouvre
 *      directement l'appareil photo du téléphone (caméra arrière).
 *   2. « Télécharger une photo » → input fichier classique : galerie /
 *      fichiers de l'appareil.
 *
 * Notes de comportement :
 *   - Mobile (iOS/Android) : le bouton caméra ouvre l'appareil photo,
 *     le bouton télécharger ouvre la galerie. Aucun des deux ne bloque
 *     l'autre — l'artisan choisit librement.
 *   - Desktop : l'attribut `capture` est ignoré par les navigateurs,
 *     les deux boutons ouvrent le sélecteur de fichiers (fallback standard).
 *   - Aperçu immédiat des photos choisies (object URLs révoquées au
 *     re-render pour éviter les fuites mémoire).
 *   - Bouton ✗ par photo pour la retirer.
 *   - maxCount=1 : la nouvelle photo REMPLACE l'existante (photo
 *     principale). maxCount>1 : les photos s'accumulent jusqu'à la limite.
 *   - L'input est réinitialisé après chaque sélection (e.target.value="")
 *     pour permettre de re-choisir la même photo après suppression.
 */

type PhotoPickerProps = {
  label: string;
  /** Petite ligne d'aide sous le label. */
  helpText?: string;
  /** Nombre maximum de photos conservées (défaut 1 = photo principale). */
  maxCount?: number;
  /** Autorise la sélection multiple via la galerie (ignoré pour la caméra). */
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
};

export default function PhotoPicker({
  label,
  helpText,
  maxCount = 1,
  multiple = false,
  files,
  onChange,
}: PhotoPickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [limitWarning, setLimitWarning] = useState(false);

  // Aperçus : une object URL par fichier, régénérée quand la liste change.
  // Le cleanup de l'effet révoque les anciennes URLs (pas de fuite mémoire).
  const previews = useMemo(
    () =>
      files.map((f) => ({
        url: URL.createObjectURL(f),
        name: f.name,
        size: f.size,
      })),
    [files],
  );
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const addFiles = (incoming: FileList | null, fromCamera: boolean) => {
    setLimitWarning(false);
    if (!incoming || incoming.length === 0) return;

    // On ne garde que de vraies images (le accept="image/*" est un filtre
    // de confort côté sélecteur, pas une garantie).
    const images = Array.from(incoming).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (images.length === 0) return;

    // Photo principale (maxCount=1) : la nouvelle remplace l'ancienne.
    if (maxCount === 1) {
      onChange([images[0]]);
      return;
    }

    const room = maxCount - files.length;
    if (room <= 0) {
      setLimitWarning(true);
      return;
    }

    if (multiple && !fromCamera && images.length > room) {
      setLimitWarning(true);
    }
    const next = [...files, ...images.slice(0, room)];
    onChange(next);
  };

  const removeAt = (index: number) => {
    setLimitWarning(false);
    onChange(files.filter((_, i) => i !== index));
  };

  const isFull = files.length >= maxCount;

  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-gray-700">
        {label}
      </span>
      {helpText && <p className="mb-2 text-xs text-gray-500">{helpText}</p>}

      {/* Deux options côte à côte : caméra ou galerie/fichiers */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-100 px-3 py-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-200"
        >
          <Camera className="h-4 w-4 shrink-0" aria-hidden />
          Prendre une photo
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-colors ${
            isFull && maxCount > 1
              ? "border-gray-200 bg-gray-50 text-gray-400"
              : "border-amber-300 bg-white text-amber-800 hover:bg-amber-50"
          }`}
        >
          <ImagePlus className="h-4 w-4 shrink-0" aria-hidden />
          Télécharger
        </button>
      </div>

      {/* Inputs réels, cachés, pilotés par les boutons ci-dessus */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files, true);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files, false);
          e.target.value = "";
        }}
      />

      {limitWarning && (
        <p className="mt-2 text-xs font-medium text-red-600">
          Maximum {maxCount} photo{maxCount > 1 ? "s" : ""} — retirez-en une
          pour en ajouter une autre.
        </p>
      )}

      {/* Aperçus des photos sélectionnées */}
      {previews.length > 0 && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {previews.map((p, i) => (
              <div
                key={`${p.name}-${i}`}
                className="relative overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50"
              >
                {/* img element : URL locale blob, next/image inutile ici */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={`Aperçu ${i + 1}`}
                  className="h-20 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label="Retirer cette photo"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-green-700">
            {files.length} photo{files.length > 1 ? "s" : ""} prête
            {files.length > 1 ? "s" : ""}
            {maxCount > 1 ? ` sur ${maxCount}` : ""}
          </p>
        </>
      )}
    </div>
  );
}
