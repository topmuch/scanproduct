"use client";

import { useId, useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

/**
 * BadgeQRPreview — aperçu FIDÈLE du design de badge actuel :
 *
 *   1. Design importé (fabricant connecté → son design ; sinon design
 *      officiel de la plateforme importé par le SuperAdmin) : l'image
 *      sert de fond « cover », le QR noir est posé au centre sur un
 *      fond blanc arrondi (quiet zone) — géométrie identique au rendu
 *      serveur `renderCustomTemplateQR` (qr-badge.ts) :
 *      pad 62 % arrondi 5 % du canvas, QR 50 % centré.
 *   2. Aucun design importé (ou endpoint indisponible) → badge jaune
 *      « LABEL VERIFSCAN » rendu en SVG navigateur (textPath natif),
 *      même géométrie que le module serveur — approximation
 *      typographique (police système) suffisante pour un aperçu.
 *
 * ⚠️ Les IDs SVG (arcs textPath) sont uniques par instance (useId) :
 * la grille de QR codes affiche jusqu'à 12 badges simultanément.
 */

// ── Cache module : 1 seule requête / minute quelle que soit la page ──
// (grille = jusqu'à 12 instances qui partagent la même résolution).
type BadgeTemplate = { url: string | null; version: number | null };
let templateCache: (BadgeTemplate & { fetchedAt: number }) | null = null;
let templatePromise: Promise<BadgeTemplate | null> | null = null;

function fetchBadgeTemplate(): Promise<BadgeTemplate | null> {
  if (templateCache && Date.now() - templateCache.fetchedAt < 60_000) {
    return Promise.resolve(templateCache);
  }
  if (!templatePromise) {
    templatePromise = fetch("/api/qr-codes/badge-template/preview", {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: BadgeTemplate | null) => {
        templateCache = {
          url: d?.url ?? null,
          version: d?.version ?? null,
          fetchedAt: Date.now(),
        };
        return templateCache;
      })
      .catch(() => null)
      .finally(() => {
        templatePromise = null;
      });
  }
  return templatePromise;
}

export function BadgeQRPreview({
  value,
  size = 150,
}: {
  value: string;
  size?: number;
}) {
  // useId renvoie « :r1: » — les deux-points sont neutralisés pour une
  // référence fragment SVG (#id) fiable dans tous les navigateurs.
  const uid = useId().replace(/:/g, "");
  const arcTopId = `vs-arc-top-${uid}`;
  const arcBotId = `vs-arc-bot-${uid}`;
  const [tpl, setTpl] = useState<BadgeTemplate | null>(null);

  useEffect(() => {
    let alive = true;
    fetchBadgeTemplate().then((d) => {
      if (alive && d?.url) setTpl({ url: d.url, version: d.version });
    });
    return () => {
      alive = false;
    };
  }, []);

  // Cache-busting : l'URL du template est stable d'un upload à l'autre,
  // la version (mtime) force le rechargement après un nouveau design.
  const templateSrc = tpl?.url
    ? `${tpl.url}${tpl.url.includes("?") ? "&" : "?"}v=${tpl.version ?? 0}`
    : null;

  if (templateSrc) {
    // ── Design importé : image de fond + quiet zone blanche + QR ──
    // Géométrie calquée sur renderCustomTemplateQR (qr-badge.ts).
    return (
      <div className="relative" style={{ width: size, height: size }}>
        {/* Image de fond (source interne contrôlée — <img> volontaire) */}
        <img
          src={templateSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <div
          className="absolute"
          style={{
            inset: "19%",
            width: "62%",
            height: "62%",
            borderRadius: size * 0.05,
            background: "#FFFFFF",
          }}
        />
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

  // ── Repli : badge jaune « LABEL VERIFSCAN » (SVG navigateur) ─────
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 1000 1000"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <circle cx="500" cy="500" r="472" fill="#F8E805" />
        <defs>
          <path id={arcTopId} d="M 48,500 A 452,452 0 0 1 952,500" fill="none" />
          <path id={arcBotId} d="M 48,500 A 452,452 0 0 0 952,500" fill="none" />
        </defs>
        <text
          fontFamily="system-ui, Arial, sans-serif"
          fontSize="58"
          fontWeight="800"
          letterSpacing="14"
          fill="#000000"
        >
          <textPath href={`#${arcTopId}`} startOffset="50%" textAnchor="middle">
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
          <textPath href={`#${arcBotId}`} startOffset="50%" textAnchor="middle">
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
