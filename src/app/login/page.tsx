"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  Factory,
  CheckCircle2,
} from "lucide-react";

/**
 * Resolve the post-login target URL based on the user's role AND the
 * `callbackUrl` from the query string.
 *
 * CRITICAL — this is what prevents the redirect loop:
 *   1. A logged-out user visits /dashboard  → middleware redirects to
 *      /login?callbackUrl=/dashboard.
 *   2. If that user is actually a SUPERADMIN, blindly honouring
 *      callbackUrl="/dashboard" sends them back to /dashboard, where the
 *      role-guard middleware blocks them → /login?error=unauthorized →
 *      they log in again → infinite loop.
 *
 * So: if the callbackUrl points to a route the user's role cannot access,
 * we drop it and fall back to the role-appropriate home. We also reject
 * absolute / non-relative callback URLs for safety (open-redirect guard).
 */
function resolveTargetUrl(
  role: string | undefined,
  callbackUrl: string
): string {
  const isSuperadmin = role === "SUPERADMIN";
  const roleHome = isSuperadmin ? "/superadmin" : "/dashboard";

  // No callback URL → use role-based default.
  if (!callbackUrl) return roleHome;

  // Only allow relative same-origin URLs (prevent open redirect).
  if (
    !callbackUrl.startsWith("/") ||
    callbackUrl.startsWith("//") ||
    callbackUrl.includes(":")
  ) {
    return roleHome;
  }

  // Role-mismatch guard: don't send a SUPERADMIN to /dashboard or a
  // FABRICANT to /superadmin, even if callbackUrl asks for it.
  const cb = callbackUrl.toLowerCase();
  if (isSuperadmin && cb.startsWith("/dashboard")) return "/superadmin";
  if (!isSuperadmin && cb.startsWith("/superadmin")) return "/dashboard";

  return callbackUrl;
}

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Vous n'êtes pas autorisé à accéder à cette page.",
  // "suspended" is used both as a URL query param (from middleware) and as
  // the res.error value when authorize() throws new Error("suspended").
  suspended: "Votre compte a été suspendu. Contactez le support.",
  CredentialsSignin: "Email ou mot de passe incorrect.",
  // Configuration = NEXTAUTH_SECRET missing or cookie/URL mismatch behind a
  // reverse proxy. Happens on Coolify when env vars aren't set correctly.
  Configuration:
    "Erreur de configuration serveur. Contactez l'administrateur.",
  // OAuthCallback / OAuthCreateAccount etc. — surface a clear message.
  OAuthCallback: "La connexion via le fournisseur a échoué. Réessayez.",
  default: "Une erreur est survenue. Veuillez réessayer.",
};

// Message shown when the fetch itself fails (server unreachable / network
// down). This is the most common cause of the generic error: the dev server
// or the Coolify container is not running.
const NETWORK_ERROR =
  "Serveur indisponible. Le serveur est peut-être en cours de redémarrage — réessayez dans quelques secondes.";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "";
  const errorParam = params.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam ? ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.default : null
  );

  // ── Guards against race conditions ─────────────────────────────────
  // `submittingRef` is set to true while handleSubmit is in flight, so the
  // auto-redirect useEffect below doesn't fire mid-login and cause a
  // double-navigation (router.push + router.replace racing each other,
  // which leaves the browser stuck on /login even though the server
  // rendered /dashboard successfully — the original "boucle" bug).
  const submittingRef = useRef(false);
  // `autoRedirectedRef` ensures the useEffect only fires ONCE on mount.
  // Without this, any re-render (e.g. router state change during client
  // navigation) re-triggers the session fetch + redirect.
  const autoRedirectedRef = useRef(false);

  // ── Auto-redirect already-authenticated users ──────────────────────
  // If a logged-in user lands on /login (e.g. middleware bounced them
  // from /dashboard → /login?error=unauthorized because their role didn't
  // match), skip the login form entirely and send them to their real home.
  // This is the second half of the redirect-loop fix: without it the user
  // would see "Vous n'êtes pas autorisé" on /login even though they ARE
  // logged in, and every manual re-login would just loop again.
  useEffect(() => {
    if (autoRedirectedRef.current) return;
    autoRedirectedRef.current = true;
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((session) => {
        if (cancelled || submittingRef.current) return;
        if (session?.user?.role) {
          const target = resolveTargetUrl(session.user.role, callbackUrl);
          // Only redirect if we're actually going somewhere other than
          // /login — otherwise we'd loop on /login itself.
          if (target !== "/login") {
            // Use a hard navigation so the browser does a full page load.
            // router.replace() is a client-side transition that can
            // silently no-op if the server is slow to compile the target
            // route (which was happening: server rendered /dashboard 200
            // but the URL stayed on /login).
            window.location.href = target;
          }
        }
      })
      .catch(() => {
        /* not logged in — stay on the login form */
      });
    return () => {
      cancelled = true;
    };
  }, [callbackUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setError(null);
    submittingRef.current = true;

    // signIn() can throw if the server is unreachable (dev server down,
    // Coolify container restarting, network issue). We catch that and show
    // a clear network-level message instead of the generic "Une erreur est
    // survenue" which leaves the user guessing.
    let res: { error?: string; status?: number; ok?: boolean } | undefined;
    try {
      res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
    } catch {
      setError(NETWORK_ERROR);
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    if (res?.error) {
      setError(ERROR_MESSAGES[res.error] ?? ERROR_MESSAGES.default);
      setLoading(false);
      submittingRef.current = false;
      return;
    }

    // Fetch the session to learn the role and route accordingly.
    // We use the role-aware resolver so a SUPERADMIN with
    // callbackUrl=/dashboard (and vice-versa) doesn't get bounced back
    // here by the role-guard middleware — that was the redirect loop.
    //
    // IMPORTANT: we use window.location.href instead of router.push() +
    // router.refresh(). The App Router's client-side navigation can
    // silently fail when the target route needs a cold compile (4-5s for
    // /dashboard). The server returns 200 but the browser URL never
    // updates, leaving the user stuck on /login — the "boucle" symptom.
    // A hard navigation forces the browser to wait for the full page load.
    try {
      const r = await fetch("/api/auth/session", { cache: "no-store" });
      const session = await r.json();
      const role = session?.user?.role;
      const target = resolveTargetUrl(role, callbackUrl);
      window.location.href = target;
    } catch {
      window.location.href = "/dashboard";
    }
  }

  return (
    <div className="w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-[0_8px_32px_rgba(37,99,235,0.06)]"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#10B981] text-white shadow-md">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#111827]">
            Connexion
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Accédez à votre espace VerifScan
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#B91C1C]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-[#374151]"
            >
              Adresse email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.sn"
                className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-3 text-sm text-[#111827] outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20"
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
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-10 text-sm text-[#111827] outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                aria-label={showPassword ? "Masquer" : "Afficher"}
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
            disabled={loading}
            className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#10B981] text-sm font-semibold text-white shadow-md shadow-[#2563EB]/25 transition-all hover:shadow-lg hover:shadow-[#2563EB]/40 disabled:cursor-not-allowed disabled:opacity-70"
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

        <div className="mt-6 text-center text-sm text-[#6B7280]">
          Pas encore partenaire ?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#2563EB] hover:underline"
          >
            Créer un compte
          </Link>
        </div>

        <div className="mt-6 border-t border-[#F3F4F6] pt-5">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
            Comptes de démonstration
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@verifscan.sn");
                setPassword("Admin123!2025");
              }}
              className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-left transition-colors hover:border-[#2563EB] hover:bg-[#EFF6FF]"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[#2563EB]" />
              <div>
                <p className="font-semibold text-[#111827]">SuperAdmin</p>
                <p className="text-[#6B7280]">admin@verifscan.sn</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail("sarine@biocosmetique.sn");
                setPassword("Demo1234!");
              }}
              className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-left transition-colors hover:border-[#10B981] hover:bg-[#ECFDF5]"
            >
              <Factory className="h-3.5 w-3.5 text-[#10B981]" />
              <div>
                <p className="font-semibold text-[#111827]">Fabricant</p>
                <p className="text-[#6B7280]">sarine@bio…</p>
              </div>
            </button>
          </div>
        </div>
      </motion.div>

      <p className="mt-6 text-center text-xs text-[#9CA3AF]">
        <Link href="/" className="hover:text-[#6B7280]">
          ← Retour à l'accueil
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left brand panel (hidden on mobile) */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-[#2563EB] via-[#1E40AF] to-[#10B981] lg:flex">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute right-10 top-1/3 h-96 w-96 rounded-full bg-[#10B981]/30 blur-3xl" />
          <div className="absolute bottom-10 left-1/4 h-64 w-64 rounded-full bg-[#F59E0B]/20 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link href="/" className="flex items-center">
            <img
              src="/verifscan-logo.webp"
              alt="VerifScan"
              className="h-10 w-auto brightness-0 invert"
              width={256}
              height={62}
            />
          </Link>

          <div>
            <h2 className="font-display text-4xl font-bold leading-tight">
              Authentifiez vos produits,
              <br />
              gagnez la confiance.
            </h2>
            <p className="mt-4 max-w-md text-[#DBEAFE]">
              La plateforme sénégalaise de traçabilité par QR codes pour les
              fabricants engagés dans la transparence.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Générez des QR codes uniques par produit",
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

          <p className="text-xs text-[#DBEAFE]/70">
            © {new Date().getFullYear()} VerifScan — Dakar, Sénégal 🇸🇳
          </p>
        </div>
      </div>

      {/* Right form area */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <Suspense
          fallback={
            <div className="flex h-12 w-12 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
