"use client";

// ============================================================================
// ArtisanLoginForm — formulaire de connexion de /artisan/login
// ============================================================================
// Logique STRICTEMENT inchangée (couverte par scripts/test-artisan-portal.ts) :
//   POST /api/artisan/login { phone, password }
//   → token JWT 30 j stocké en localStorage (verifscan_artisan_token)
//   → nom artisan en cache local (verifscan_artisan_name)
//   → redirection /artisan/dashboard
// Compte créé automatiquement à la première connexion (mot de passe par
// défaut « 0000 » communiqué par WhatsApp à la vente du pack).
//
// Présentation alignée sur le formulaire fabricant (components/auth/
// LoginForm.tsx) : mêmes bordures, mêmes focus rings #022150, même carte
// ombrée — seule la couleur d'accent (amber #F59E0B, identité artisan)
// et l'identifiant (téléphone au lieu d'email) changent.
// ============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Phone,
  Store,
} from "lucide-react";

const TOKEN_KEY = "verifscan_artisan_token";

export function ArtisanLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/artisan/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Connexion impossible");
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      if (data.artisan?.name) {
        localStorage.setItem("verifscan_artisan_name", data.artisan.name);
      }
      router.push("/artisan/dashboard");
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-[0_8px_32px_rgba(2,33,80,0.08)]">
        {/* En-tête */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#B45309] text-white shadow-md">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#111827]">
            Espace Artisan
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Connectez-vous avec votre numéro de téléphone.
          </p>
        </div>

        {error && (
          <div
            data-testid="login-error"
            className="mb-4 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#B91C1C]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="phone"
              className="mb-1.5 block text-sm font-medium text-[#374151]"
            >
              Numéro de téléphone
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                id="phone"
                data-testid="login-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="77 123 45 67"
                className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-3 text-sm text-[#111827] outline-none transition-all focus:border-[#022150] focus:bg-white focus:ring-2 focus:ring-[#022150]/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-[#374151]"
            >
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                id="password"
                data-testid="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-10 text-sm text-[#111827] outline-none transition-all focus:border-[#022150] focus:bg-white focus:ring-2 focus:ring-[#022150]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition-colors hover:text-[#6B7280]"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            data-testid="login-submit"
            disabled={loading}
            className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#022150] to-[#10B981] text-sm font-semibold text-white shadow-md shadow-[#022150]/25 transition-all hover:shadow-lg hover:shadow-[#022150]/40 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connexion…
              </>
            ) : (
              <>
                Se connecter
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Première connexion : mot de passe par défaut communiqué par WhatsApp */}
        <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2.5 text-[13px] text-[#92400E]">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Première connexion ? Utilisez le mot de passe par défaut{" "}
            <strong className="font-semibold">0000</strong> reçu par WhatsApp,
            puis changez-le depuis votre tableau de bord.
          </span>
        </div>

        {/* Lien croisé discret vers les autres espaces — même motif que /login */}
        <div className="mt-5 border-t border-[#F3F4F6] pt-4 text-center text-[13px]">
          <Link
            href="/login"
            className="text-[#9CA3AF] transition-colors hover:text-[#022150]"
          >
            Vous êtes fabricant ?{" "}
            <span className="font-medium underline">Espace Fabricant</span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
