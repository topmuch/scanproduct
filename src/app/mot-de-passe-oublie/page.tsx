import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordClient } from "./forgot-password-client";

/**
 * /mot-de-passe-oublie — Réinitialisation du mot de passe (public).
 *
 * Deux modes dans la même page :
 *   1. Sans `?token=`  → formulaire de DEMANDE (email → lien de reset 1 h)
 *   2. Avec `?token=`  → formulaire de RESET (nouveau mot de passe)
 *
 * Accessible depuis les 3 pages de connexion (lien « Mot de passe oublié ? »).
 * noindex : page utilitaire, hors SEO.
 */
export const metadata: Metadata = {
  title: "Mot de passe oublié — VerifScan",
  description:
    "Réinitialisez le mot de passe de votre compte VerifScan : recevez un lien sécurisé par email et choisissez un nouveau mot de passe.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#022150] px-6 py-12">
      {/* Décor — même famille que /login/admin */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-96 w-96 rounded-full bg-[#10B981]/10 blur-3xl" />
        <div className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-[#215D9B]/20 blur-3xl" />
      </div>

      {/* Logo — variante blanche dédiée (fond marine) */}
      <Link href="/" className="relative z-10 mb-8 flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/verifscan-logo-white.webp?v=1"
          alt="VerifScan"
          className="h-12 w-auto shrink-0"
          width={720}
          height={247}
        />
      </Link>

      <div className="relative z-10 flex w-full max-w-md justify-center">
        <ForgotPasswordClient />
      </div>

      <p className="relative z-10 mt-8 text-center text-xs text-white/50">
        <Link href="/" className="transition-colors hover:text-white/80">
          ← Retour à l&apos;accueil
        </Link>
      </p>
    </div>
  );
}
