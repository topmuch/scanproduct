"use client";

// ============================================================================
// Formulaire client de /mot-de-passe-oublie — 2 modes :
//   1. DEMANDE  : email → POST /api/auth/forgot-password → « email envoyé »
//   2. RESET    : ?token=... → POST /api/auth/reset-password → succès → /login
//
// Anti-énumération : le mode demande affiche TOUJOURS le même message de
// succès, que le compte existe ou non. Si le SMTP n'est pas configuré,
// l'API renvoie devLink (dev/QA uniquement) et on l'affiche avec un avertissement.
// ============================================================================

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";

type Mode = "request" | "request-done" | "reset" | "reset-done";

function ForgotPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [mode, setMode] = useState<Mode>(token ? "reset" : "request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [invalidToken, setInvalidToken] = useState<string | null>(null);

  const passwordOk = password.length >= 8 && password === confirm;

  // ── 1. Demande du lien ────────────────────────────────────────────────
  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        devLink?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue. Réessayez.");
      }
      setDevLink(data.devLink ?? null);
      setMode("request-done");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // ── 2. Pose du nouveau mot de passe ───────────────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordOk) {
      setError(
        password.length < 8
          ? "Le mot de passe doit contenir au moins 8 caractères."
          : "Les mots de passe ne correspondent pas.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Réinitialisation impossible.");
      }
      setMode("reset-done");
    } catch (err) {
      const msg = (err as Error).message;
      // Token expiré/invalide → on ramène au mode demande avec l'explication.
      if (msg.toLowerCase().includes("lien")) {
        setInvalidToken(msg);
        setMode("request");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "h-11 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-3 text-sm text-[#111827] outline-none transition-all focus:border-[#022150] focus:bg-white focus:ring-2 focus:ring-[#022150]/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-[0_8px_32px_rgba(2,33,80,0.08)]">
        {/* ── Mode DEMANDE ── */}
        {mode === "request" && (
          <>
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#022150] to-[#0A2B5F] text-white shadow-md">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="font-display text-2xl font-bold text-[#111827]">
                Mot de passe oublié ?
              </h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                Entrez votre adresse email : vous recevrez un lien sécurisé
                pour choisir un nouveau mot de passe.
              </p>
            </div>

            {invalidToken && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2.5 text-sm text-[#92400E]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{invalidToken}</span>
              </div>
            )}
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#B91C1C]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="mb-1.5 block text-sm font-medium text-[#374151]"
                >
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@entreprise.sn"
                    className={inputCls}
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#022150] text-sm font-semibold text-white shadow-md shadow-[#022150]/30 transition-all hover:bg-[#011D46] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi…
                  </>
                ) : (
                  <>
                    Recevoir le lien de réinitialisation
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-[#6B7280]">
              <Link
                href="/login"
                className="font-semibold text-[#022150] hover:underline"
              >
                ← Retour à la connexion
              </Link>
            </div>
          </>
        )}

        {/* ── Mode DEMANDE ENVOYÉE ── */}
        {mode === "request-done" && (
          <>
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#10B981] shadow-md">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="font-display text-2xl font-bold text-[#111827]">
                Vérifiez votre boîte email
              </h1>
              <p className="mt-2 text-sm text-[#6B7280]">
                Si un compte VerifScan existe pour{" "}
                <span className="font-semibold text-[#111827]">{email}</span>,
                un lien de réinitialisation vient d&apos;être envoyé. Il est
                valable <span className="font-semibold">1 heure</span>.
              </p>
            </div>

            {devLink && (
              <div className="mb-4 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2.5 text-[12px] text-[#92400E]">
                <p className="mb-1 font-semibold">
                  SMTP non configuré — lien direct (dev uniquement) :
                </p>
                <a
                  href={devLink}
                  className="break-all font-medium underline"
                  onClick={(e) => {
                    e.preventDefault();
                    // Passe en mode reset sans recharger (le token est dans l'URL).
                    const url = new URL(devLink);
                    window.location.href = `${window.location.pathname}?token=${url.searchParams.get("token") ?? ""}`;
                  }}
                >
                  {devLink}
                </a>
              </div>
            )}

            <div className="space-y-3">
              <Link
                href="/login"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#022150] text-sm font-semibold text-white shadow-md transition-all hover:bg-[#011D46]"
              >
                Retour à la connexion
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMode("request");
                  setError(null);
                }}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-sm font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB]"
              >
                Utiliser une autre adresse
              </button>
            </div>
          </>
        )}

        {/* ── Mode RESET (token) ── */}
        {mode === "reset" && (
          <>
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#022150] to-[#0A2B5F] text-white shadow-md">
                <Lock className="h-6 w-6" />
              </div>
              <h1 className="font-display text-2xl font-bold text-[#111827]">
                Nouveau mot de passe
              </h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                Choisissez un mot de passe solide (8 caractères minimum).
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#B91C1C]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1.5 block text-sm font-medium text-[#374151]"
                >
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    className={inputCls}
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-sm font-medium text-[#374151]"
                >
                  Confirmer
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Ressaisissez le mot de passe"
                    className={inputCls}
                  />
                </div>
                {confirm.length > 0 && password !== confirm && (
                  <p className="mt-1 text-[12px] font-medium text-[#DC2626]">
                    Les mots de passe ne correspondent pas.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !passwordOk}
                className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#022150] text-sm font-semibold text-white shadow-md shadow-[#022150]/30 transition-all hover:bg-[#011D46] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  <>
                    Enregistrer le nouveau mot de passe
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* ── Mode RESET RÉUSSI ── */}
        {mode === "reset-done" && (
          <>
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#10B981] shadow-md">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="font-display text-2xl font-bold text-[#111827]">
                Mot de passe modifié !
              </h1>
              <p className="mt-2 text-sm text-[#6B7280]">
                Votre nouveau mot de passe est actif. Connectez-vous maintenant
                avec vos identifiants.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#022150] text-sm font-semibold text-white shadow-md transition-all hover:bg-[#011D46]"
            >
              Se connecter
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}
      </div>
    </motion.div>
  );
}

export function ForgotPasswordClient() {
  return (
    <Suspense
      fallback={
        <div className="flex h-12 w-12 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
