"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, BadgeCheck, AlertTriangle } from "lucide-react";

import { Logo } from "@/components/landing/Logo";

/**
 * ImmersiveHero — hero plein écran « effet waouh » pour la page produit
 * classique (/p/[lotId]). Reproduit à l'identique le hero de la page
 * artisan (/a/[code]) :
 *   - photo produit PLEIN ÉCRAN en zoom lent Ken Burns (art-kenburns) ;
 *   - halos lumineux animés (art-gradient-pan) pour la profondeur ;
 *   - pilule marque VerifScan centrée en haut ;
 *   - bouton « Découvrir » (scroll fluide vers la carte produit) + badge
 *     d'authenticité émeraude « Produit authentique » (ou rouge
 *     « Produit rappelé » si le lot est inactif) collés en bas.
 *
 * Demande utilisateur : « sur la page de produit classique je veux que
 * l'image du produit classique s'affiche comme l'image page produit
 * artisan » — la photo occupe désormais tout le premier écran, exactement
 * comme côté artisan, au lieu du petit carré 176 px dans la carte.
 *
 * Client component : le bouton « Découvrir » a besoin d'un onClick, et le
 * filet de sécurité image (404 → placeholder) a besoin de state. Le
 * placeholder reprend le dégradé chaud artisan (ambre→orange→rose) + gros
 * emoji de catégorie, pour une identité visuelle cohérente entre les deux
 * pages. Les classes art-* sont déjà définies dans globals.css (partagées
 * avec la page artisan) et désactivées sous prefers-reduced-motion.
 */

type Props = {
  /** URL de la photo produit (optionnelle — placeholder stylisé sinon). */
  imageUrl?: string | null;
  /** Nom du produit — utilisé comme alt de l'image. */
  productName: string;
  /** Emoji de catégorie affiché sur le placeholder sans photo. */
  emoji: string;
  /** Lot actif → badge émeraude ; sinon badge rouge « Produit rappelé ». */
  isActive: boolean;
  /** id de l'ancre de destination du bouton « Découvrir ». */
  targetId?: string;
};

export function ImmersiveHero({
  imageUrl,
  productName,
  emoji,
  isActive,
  targetId = "produit",
}: Props) {
  const [failed, setFailed] = useState(false);
  const showPhoto = !!imageUrl && !failed;

  // ⚠️ Course d'hydratation (même parade que SafeImage côté artisan) : une
  // image peut renvoyer 404 AVANT que le JS n'ait hydraté la page. L'event
  // `error` est alors émis sans listener React → perdu. Au montage, on
  // interroge l'état RÉEL de l'élément.
  const imgRef = (el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  };

  function scrollToProduct() {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <header className="relative flex min-h-[75svh] flex-col overflow-hidden bg-stone-950 sm:min-h-[92svh]">
      {/* Photo produit plein écran (zoom Ken Burns) ou placeholder stylisé */}
      <div className="absolute inset-0">
        {showPhoto ? (
          <img
            ref={imgRef}
            src={imageUrl}
            alt={productName}
            className="art-kenburns h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div
            role="img"
            aria-label={productName}
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500"
          >
            <span className="art-float text-[6.5rem] drop-shadow-2xl" aria-hidden>
              {emoji}
            </span>
          </div>
        )}
      </div>

      {/* Halos lumineux animés (profondeur, effet premium — mêmes teintes
          chaudes que le hero artisan pour une identité cohérente) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="art-gradient-pan absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl" />
        <div className="art-gradient-pan absolute -right-24 top-1/2 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        {/* Trame de points uniquement sur le placeholder (pas de photo) */}
        {!showPhoto && (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25% 25%, white 1.5px, transparent 1.5px)",
              backgroundSize: "26px 26px",
            }}
          />
        )}
      </div>

      {/* Voile TRÈS léger : le hero ne porte aucun texte en dehors du bouton
          — juste une petite ombre en bas pour asseoir le bouton Découvrir. */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/5 to-transparent" />

      {/* Pilule marque VerifScan (verre dépoli) — identique à la page artisan */}
      <div className="art-fade-down relative z-10 flex justify-center pt-5">
        <Link
          href="/"
          aria-label="VerifScan accueil"
          className="inline-flex items-center rounded-full bg-white px-5 py-2.5 shadow-xl ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95"
        >
          <Logo variant="default" size="sm" />
        </Link>
      </div>

      {/* Espace flexible → bouton collé en bas */}
      <div className="flex-1" />

      {/* Bouton « Découvrir » + badge d'authenticité (pilule pleine émeraude
          si le lot est actif, rouge « Produit rappelé » sinon — le signal de
          sécurité reste visible dès le premier écran). */}
      <div className="art-fade-up art-delay-2 relative z-30 flex flex-col items-center gap-3 pb-14">
        <button
          type="button"
          onClick={scrollToProduct}
          className="group flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-bold text-white shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:bg-white/20 active:scale-95"
        >
          Découvrir
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </button>
        {isActive ? (
          <span className="art-fade-up art-delay-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg ring-1 ring-white/40 backdrop-blur-md">
            <BadgeCheck className="h-4 w-4" />
            Produit authentique
          </span>
        ) : (
          <span className="art-fade-up art-delay-4 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg ring-1 ring-white/40 backdrop-blur-md">
            <AlertTriangle className="h-4 w-4" />
            Produit rappelé
          </span>
        )}
      </div>
    </header>
  );
}
