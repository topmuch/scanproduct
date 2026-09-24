"use client";

/**
 * ============================================================================
 * VerifScan — Panneau de test GS1 Digital Link (client)
 * ============================================================================
 * Affiche des QR Codes scannables AU TÉLÉPHONE pour valider le resolver en
 * conditions réelles. Les URL sont construites côté client à partir de
 * `window.location.origin` : le QR pointe donc toujours vers le serveur que
 * l'utilisateur est en train de visiter (dev, preview, prod…).
 * ============================================================================
 */

import { useSyncExternalStore } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  genererUrlGs1,
  genererUrlStandard,
  normaliserGtin,
} from "@/lib/gs1";

/** Fixture transmise par la page serveur. */
export interface FixtureTestQr {
  /** Nom du produit (affichage). */
  nom: string;
  /** Type de QR à afficher. */
  type: "GS1" | "STANDARD";
  /** Identifiant interne du produit (QR standard). */
  produitId: string;
  /** GTIN brut du produit (QR GS1, si présent). */
  barcode?: string | null;
  /** Numéro de lot ou référence (AI 10). */
  lot: string;
  /** Série de démonstration (AI 21). */
  serie?: string;
}

function CarteQr({
  titre,
  sousTitre,
  url,
  attendu,
}: {
  titre: string;
  sousTitre: string;
  url: string;
  attendu: string;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-center">
        <h3 className="text-base font-bold text-slate-900">{titre}</h3>
        <p className="mt-1 text-xs text-slate-500">{sousTitre}</p>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-3">
        <QRCodeCanvas value={url} size={200} level="M" marginSize={1} />
      </div>

      <code className="w-full break-all rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
        {url}
      </code>

      <p className="text-center text-[11px] text-slate-400">
        Au scan : {attendu}
      </p>

      <a
        href={url}
        className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800"
      >
        Ouvrir directement (sans scan)
      </a>
    </div>
  );
}

/**
 * Panneau principal — reçoit les fixtures du serveur et construit les URL
 * avec l'origine courante du navigateur.
 */
export function TestQrPanel({ fixtures }: { fixtures: FixtureTestQr[] }) {
  // Lecture de l'origine uniquement disponible côté client, sans setState
  // dans un effet (pattern React 19 useSyncExternalStore : valeur stable,
  // hydratation propre, pas de rendu en cascade).
  const origine = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => ""
  );

  const cartes = fixtures.map((f) => {
    if (f.type === "GS1" && f.barcode) {
      const gtin = normaliserGtin(f.barcode);
      if (gtin) {
        return (
          <CarteQr
            key={f.produitId + f.type}
            titre={`GS1 Digital Link — ${f.nom}`}
            sousTitre="Client industriel · AI 01 (GTIN) + AI 10 (lot) + AI 21 (série)"
            url={genererUrlGs1(
              { gtin, lot: f.lot, ...(f.serie ? { serie: f.serie } : {}) },
              origine
            )}
            attendu="302 → page passeport produit (statut, DLUO, ingrédients, certifications)"
          />
        );
      }
    }
    return (
      <CarteQr
        key={f.produitId + f.type}
        titre={`QR Standard — ${f.nom}`}
        sousTitre="Petit producteur local · URL courte VerifScan"
        url={genererUrlStandard(f.produitId, origine)}
        attendu="302 → page passeport du lot actif du produit"
      />
    );
  });

  return (
    <div className="flex flex-wrap items-stretch justify-center gap-6">
      {origine === "" ? (
        <p className="text-xs text-slate-400">Génération des QR…</p>
      ) : (
        cartes
      )}
    </div>
  );
}
