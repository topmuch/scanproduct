"use client";

// ============================================================================
// /login/admin — Page de connexion SUPERADMIN (dédiée)
// ============================================================================
// Séparée de la page Fabricant (/login) pour éviter toute confusion : thème
// marine plein écran, contenu console d'administration. Le middleware
// (src/proxy.ts) ne protège que /dashboard et /superadmin — cette page reste
// publique. Le routing post-login est toujours décidé par le rôle serveur.
// ============================================================================

import { Suspense } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck, LayoutDashboard, Users, ReceiptText, BarChart3 } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#022150] px-6 py-12">
      {/* Décor */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-96 w-96 rounded-full bg-[#10B981]/10 blur-3xl" />
        <div className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-[#215D9B]/20 blur-3xl" />
      </div>

      {/* Logo */}
      <Link href="/" className="relative z-10 mb-8 flex items-center">
        <img
          src="/verifscan-logo.webp?v=5"
          alt="VerifScan"
          className="h-12 w-auto shrink-0 brightness-0 invert"
          width={720}
          height={247}
        />
      </Link>

      {/* Bandeau "accès réservé" */}
      <p className="relative z-10 mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
        <ShieldCheck className="h-4 w-4" />
        Accès réservé à l'administration
      </p>

      {/* Formulaire */}
      <div className="relative z-10 flex justify-center">
        <Suspense
          fallback={
            <div className="flex h-12 w-12 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          }
        >
          <LoginForm space="admin" />
        </Suspense>
      </div>

      {/* Rappels de périmètre */}
      <div className="relative z-10 mt-8 grid max-w-md grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Users, label: "Utilisateurs" },
          { icon: ReceiptText, label: "Devis" },
          { icon: LayoutDashboard, label: "Abonnements" },
          { icon: BarChart3, label: "Statistiques" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center backdrop-blur-sm"
          >
            <item.icon className="h-4 w-4 text-[#10B981]" />
            <span className="text-[11px] font-medium text-white/80">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <p className="relative z-10 mt-8 text-center text-xs text-white/50">
        <Link href="/" className="transition-colors hover:text-white/80">
          ← Retour à l'accueil
        </Link>
      </p>
    </div>
  );
}
