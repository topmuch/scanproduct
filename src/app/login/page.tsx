"use client";

// ============================================================================
// /login — Page de connexion FABRICANT (dédiée)
// ============================================================================
// Séparée de la page SuperAdmin (/login/admin) pour éviter toute confusion :
// chaque espace a sa propre URL et son propre thème.
// Compat : /login?space=admin redirige vers /login/admin (ancien deep-link).
// ============================================================================

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

function CompatRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  // Ancien deep-link ?space=admin → page dédiée /login/admin
  useEffect(() => {
    if (params.get("space") === "admin") {
      const admin = new URLSearchParams();
      if (params.get("error")) admin.set("error", params.get("error")!);
      if (params.get("callbackUrl"))
        admin.set("callbackUrl", params.get("callbackUrl")!);
      const qs = admin.toString();
      router.replace(`/login/admin${qs ? `?${qs}` : ""}`);
    }
  }, [params, router]);

  return null;
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left brand panel (hidden on mobile) */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-[#022150] via-[#0A2B5F] to-[#10B981] lg:flex">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute right-10 top-1/3 h-96 w-96 rounded-full bg-[#10B981]/30 blur-3xl" />
          <div className="absolute bottom-10 left-1/4 h-64 w-64 rounded-full bg-[#F59E0B]/20 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link href="/" className="flex items-center">
            <img
              src="/verifscan-logo-white.webp?v=1"
              alt="VerifScan"
              className="h-14 w-auto shrink-0"
              width={720}
              height={247}
            />
          </Link>

          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide backdrop-blur-sm">
              Espace Fabricant
            </p>
            <h2 className="font-display text-4xl font-bold leading-tight">
              Authentifiez vos produits,
              <br />
              gagnez la confiance.
            </h2>
            <p className="mt-4 max-w-md text-[#DCE7F2]">
              La plateforme sénégalaise de traçabilité par QR codes pour les
              fabricants engagés dans la transparence.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Générez des QR codes uniques par produit et par lot",
                "Suivez les scans en temps réel",
                "Améliorez votre score de transparence",
              ].map((feat) => (
                <li key={feat} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                  <span className="text-[#F0F9FF]">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-[#DCE7F2]/70">
            © {new Date().getFullYear()} VerifScan — Dakar, Sénégal 🇸🇳
          </p>
        </div>
      </div>

      {/* Right form area */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <Suspense
          fallback={
            <div className="flex h-12 w-12 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#022150]" />
            </div>
          }
        >
          <CompatRedirect />
          <LoginForm space="fabricant" />
        </Suspense>

        <p className="mt-6 text-center text-xs text-[#9CA3AF]">
          <Link href="/" className="hover:text-[#6B7280]">
            ← Retour à l'accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
