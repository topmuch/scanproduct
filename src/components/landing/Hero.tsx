"use client";

import { motion } from "framer-motion";

/**
 * Hero — full-width banner version.
 *
 * The previous two-column layout (marketing copy on the left + product scan
 * visualization on the right) has been replaced by a single full-bleed
 * promotional banner. The banner itself already contains the headline
 * ("Authenticité vérifiée. Confiance renforcée."), the product shot, the
 * VerifScan app mockup, and the three feature icons — so no overlay text
 * is needed on top of it.
 *
 * The image is rendered edge-to-edge (no horizontal padding, no max-width)
 * so it occupies the entire width of the hero section, exactly as requested.
 * It keeps its natural aspect ratio (nothing cropped) and scales down
 * gracefully on mobile.
 */
export function Hero() {
  return (
    <section id="accueil" className="relative w-full bg-white pt-16 lg:pt-20">
      <motion.img
        src="/hero-banner.png"
        alt="VerifScan — Authenticité vérifiée, confiance renforcée. Un scan garantit l'authenticité de vos produits et protège votre marque contre la contrefaçon."
        initial={{ opacity: 0, scale: 1.01 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        className="block h-auto w-full select-none"
        draggable={false}
      />
    </section>
  );
}
