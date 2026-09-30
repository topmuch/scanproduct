import type { Metadata } from "next";
import Link from "next/link";
import {
  Camera,
  BarChart3,
  QrCode,
  PencilLine,
  CheckCircle2,
} from "lucide-react";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { ArtisanLoginForm } from "./login-form";

/**
 * /artisan/login — Connexion du portail ARTISAN (parcours informel).
 *
 * Refonte (demande utilisateur) : la page était un îlot amber isolé, sans
 * menu ni footer. Elle utilise désormais la coquille standard du site public
 * (PublicHeader avec menu + PublicFooter) et la charte VerifScan
 * (#022150 marine / #10B981 émeraude / blanc), sur le même schéma
 * split-screen que /login (Espace Fabricant). L'amber (#F59E0B) reste
 * présent en touche discrète : c'est LA couleur identitaire de l'espace
 * artisan (dashboard, badges) et elle fait partie de la palette du site.
 *
 * Identifiant = numéro de téléphone, mot de passe par défaut « 0000 »
 * (envoyé par WhatsApp à la vente du pack). Compte créé automatiquement à
 * la première connexion. Le JWT (30 j) est stocké en localStorage puis
 * l'artisan est redirigé vers /artisan/dashboard.
 *
 * NOTE : page serveur (metadata) + formulaire client (login-form.tsx) —
 * les data-testid du formulaire (artisan-login-page, login-phone,
 * login-password, login-submit, login-error) sont conservés : ils sont
 * couverts par scripts/test-artisan-portal.ts.
 */

export const metadata: Metadata = {
  title: "Connexion Artisan — VerifScan",
  description:
    "Espace artisan VerifScan : activez vos packs, publiez vos produits et suivez vos scans en temps réel. Connexion par numéro de téléphone.",
  robots: { index: false, follow: false },
};

const BENEFITS = [
  {
    icon: QrCode,
    text: "Activez vos packs en scannant le QR Code Maître",
  },
  {
    icon: Camera,
    text: "Publiez vos produits avec des photos prises au téléphone",
  },
  {
    icon: BarChart3,
    text: "Suivez vos scans et produits populaires en temps réel",
  },
  {
    icon: PencilLine,
    text: "Modifiez vos fiches produits à tout moment",
  },
];

export default function ArtisanLoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Menu du site (identique aux autres pages publiques) */}
      <PublicHeader />

      <main
        data-testid="artisan-login-page"
        className="flex flex-1 flex-col bg-white"
      >
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* ── Panneau de marque (desktop) — même famille que /login ── */}
          <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-[#022150] via-[#0A2B5F] to-[#10B981] lg:flex">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
              <div className="absolute right-10 top-1/3 h-96 w-96 rounded-full bg-[#10B981]/30 blur-3xl" />
              <div className="absolute bottom-10 left-1/4 h-64 w-64 rounded-full bg-[#F59E0B]/20 blur-3xl" />
            </div>

            <div className="relative z-10 flex w-full flex-col justify-between p-12 text-white">
              {/* Logo officiel (contient déjà le wordmark) */}
              <Link href="/" className="flex items-center" aria-label="VerifScan accueil">
                <img
                  src="/verifscan-logo.webp?v=5"
                  alt="VerifScan"
                  className="h-14 w-auto shrink-0 brightness-0 invert"
                  width={720}
                  height={247}
                />
              </Link>

              <div>
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                  Espace Artisan
                </p>
                <h2 className="font-display text-4xl font-bold leading-tight">
                  Votre savoir-faire,
                  <br />
                  authentifié au scan.
                </h2>
                <p className="mt-4 max-w-md text-[#DCE7F2]">
                  Le portail simple des artisans VerifScan : activez vos packs,
                  publiez vos produits et laissez vos clients vérifier
                  l&apos;authenticité en un scan.
                </p>

                <ul className="mt-8 space-y-3">
                  {BENEFITS.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3 text-sm">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                        <Icon className="h-5 w-5 text-[#34D399]" />
                      </span>
                      <span className="text-[#F0F9FF]">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-[#DCE7F2]/70">
                © {new Date().getFullYear()} VerifScan — Dakar, Sénégal
              </p>
            </div>
          </div>

          {/* ── Zone formulaire ── */}
          <div className="flex w-full flex-col items-center justify-center px-4 py-10 sm:px-6 lg:w-1/2 lg:py-12">
            <ArtisanLoginForm />

            <p className="mt-6 text-center text-xs text-[#9CA3AF]">
              <Link href="/" className="transition-colors hover:text-[#6B7280]">
                ← Retour à l&apos;accueil
              </Link>
            </p>

            {/* Rassuration « vérifié » — rappel de la promesse du site */}
            <div className="mt-8 flex items-center gap-2 text-xs font-medium text-[#6B7280]">
              <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
              Produits vérifiables par vos clients sur verifscan.com
            </div>
          </div>
        </div>
      </main>

      {/* Footer du site (identique aux autres pages publiques) */}
      <PublicFooter />
    </div>
  );
}
