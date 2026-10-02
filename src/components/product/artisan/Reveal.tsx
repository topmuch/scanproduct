"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reveal — apparition « effet waouh » au scroll (page produit artisan).
 *
 * Enveloppe un bloc et déclenche la transition CSS `.art-reveal →
 * .art-visible` dès que le bloc entre dans le viewport (IntersectionObserver,
 * une seule observation puis auto-déconnexion). `delay` (ms) permet les
 * apparences staggered (cards « Pourquoi choisir », étapes timeline…).
 *
 * Robustesse :
 *  - SSR / JS désactivé → l'observer ne tourne pas : on force `visible`
 *    après un court délai pour que le contenu reste TOUJOURS lisible
 *    (aucun texte piégé en opacity 0).
 *  - prefers-reduced-motion → le CSS global neutralise la transition.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** Décalage de la transition en ms (apparences staggered). */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;

    // Pas d'observer disponible (ancien navigateur, crawler) → visible direct.
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      // Se déclenche quand ~12 % du bloc est visible, avec une marge basse
      // pour que l'apparition commence avant que le bloc touche le bord.
      { threshold: 0.12, rootMargin: "0px 0px -36px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Filet de sécurité : si l'observer n'a jamais déclenché (onglet en
  // arrière-plan, edge cases), on force l'affichage après 2,5 s.
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`art-reveal ${visible ? "art-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
