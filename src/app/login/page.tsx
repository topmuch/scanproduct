"use client";

import { useState, Suspense } from "react";
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
  Sparkles,
} from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Vous n'êtes pas autorisé à accéder à cette page.",
  // "suspended" is used both as a URL query param (from middleware) and as
  // the res.error value when authorize() throws new Error("suspended").
  suspended: "Votre compte a été suspendu. Contactez le support.",
  CredentialsSignin: "Email ou mot de passe incorrect.",
  // Configuration = NEXTAUTH_SECRET missing or cookie/URL mismatch behind a
  // reverse proxy. Happens on Coolify when env vars aren't set correctly.
  Configuration:
    "Erreur de configuration serveur (NEXTAUTH_SECRET). Contactez l'administrateur.",
  // CSRF token mismatch — the csrf cookie wasn't sent back. Happens behind a
  // proxy or after a server restart (csrf token rotated).
  CallbackVerifyError:
    "Session expirée ou jeton invalide. Rafraîchissez la page et réessayez.",
  OAuthCallback: "La connexion via le fournisseur a échoué. Réessayez.",
  // session_invalid = the JWT references a user.id that no longer exists in
  // the database (e.g. the DB was reset/re-seeded while the browser still
  // holds the old session cookie). The dashboard redirects here. The user
  // just needs to sign in again with valid credentials.
  session_invalid:
    "Votre session n'est plus valide (compte introuvable). Veuillez vous reconnecter.",
  default: "Une erreur est survenue. Veuillez réessayer.",
};

// Message shown when the fetch itself fails (server unreachable / network
// down). This is the most common cause of the generic error: the dev server
// or the Coolify container is not running.
const NETWORK_ERROR =
  "Serveur indisponible. Le serveur est peut-être en cours de redémarrage — réessayez dans quelques secondes.";

// ============================================================================
// Espaces de connexion — séparation visuelle Fabricant / SuperAdmin
// ============================================================================
type Space = "fabricant" | "admin";

interface SpaceInfo {
  id: Space;
  label: string;
  tagline: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  // Card selected state
  activeCard: string;
  activeIcon: string;
  // Demo account
  demo: { email: string; password: string; name: string };
}

const SPACES: Record<Space, SpaceInfo> = {
  fabricant: {
    id: "fabricant",
    label: "Espace Fabricant",
    tagline: "Lots, QR codes & scans",
    subtitle: "Accédez à votre tableau de bord fabricant",
    icon: Factory,
    activeCard: "border-[#10B981] bg-[#ECFDF5] ring-2 ring-[#10B981]/20",
    activeIcon: "bg-[#10B981] text-white shadow-sm",
    demo: {
      email: "sarine@biocosmetique.sn",
      password: "Demo1234!",
      name: "Fabricant",
    },
  },
  admin: {
    id: "admin",
    label: "Espace SuperAdmin",
    tagline: "Console d'administration",
    subtitle: "Accédez à la console d'administration",
    icon: ShieldCheck,
    activeCard: "border-[#022150] bg-[#F0F4F9] ring-2 ring-[#022150]/20",
    activeIcon: "bg-[#022150] text-white shadow-sm",
    demo: {
      email: "admin@verifscan.sn",
      password: "Admin123!2025",
      name: "SuperAdmin",
    },
  },
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "";
  const errorParam = params.get("error");
  // Preselect the space via ?space=admin (deep link from the site footer, etc.)
  const [space, setSpace] = useState<Space>(
    params.get("space") === "admin" ? "admin" : "fabricant"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam ? ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.default : null
  );

  const active = SPACES[space];
  const ActiveIcon = active.icon;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setError(null);

    // signIn() can throw if the server is unreachable (dev server down,
    // Coolify container restarting, network issue). We catch that and show
    // a clear network-level message instead of the generic error.
    let res: Awaited<ReturnType<typeof signIn>> | undefined;
    try {
      res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
    } catch {
      setError(NETWORK_ERROR);
      setLoading(false);
      return;
    }

    if (res?.error) {
      // If it's a CSRF error, the csrf cookie may be stale (e.g. after a
      // server restart). Refresh the page to get a fresh csrf token, then
      // let the user retry. This is better than showing an opaque error.
      if (res.error === "CallbackVerifyError") {
        setError(ERROR_MESSAGES.CallbackVerifyError);
        setLoading(false);
        // Auto-refresh csrf token after 1.5s so the next attempt works.
        setTimeout(() => {
          fetch("/api/auth/csrf").then(() => window.location.reload());
        }, 1500);
        return;
      }

      // Show the specific error message, or fall back to default but
      // INCLUDE the error code so the user/admin can diagnose.
      const msg = ERROR_MESSAGES[res.error];
      if (msg) {
        setError(msg);
      } else {
        setError(`Une erreur est survenue (${res.error}). Veuillez réessayer.`);
      }
      setLoading(false);
      return;
    }

    // Fetch the session to learn the role and route accordingly. The server
    // role always wins: the space selector is a visual/UX separator, not an
    // access-control mechanism.
    try {
      const r = await fetch("/api/auth/session");
      const session = await r.json();
      const role = session?.user?.role;
      const target =
        callbackUrl ||
        (role === "SUPERADMIN" ? "/superadmin" : "/dashboard");
      router.push(target);
      router.refresh();
    } catch {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-[0_8px_32px_rgba(2, 33, 80,0.06)]"
      >
        {/* Header — s'adapte à l'espace sélectionné */}
        <motion.div
          key={space}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-5 flex flex-col items-center text-center"
        >
          <div
            className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md transition-colors ${
              space === "admin"
                ? "bg-gradient-to-br from-[#022150] to-[#0A2B5F]"
                : "bg-gradient-to-br from-[#022150] to-[#10B981]"
            }`}
          >
            <ActiveIcon className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#111827]">
            Connexion
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">{active.subtitle}</p>
        </motion.div>

        {/* Sélecteur d'espace — deux tableaux de bord distincts */}
        <div
          className="mb-5 grid grid-cols-2 gap-3"
          role="tablist"
          aria-label="Choisir l'espace de connexion"
        >
          {(Object.values(SPACES) as SpaceInfo[]).map((s) => {
            const isActive = space === s.id;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSpace(s.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3.5 text-center transition-all ${
                  isActive
                    ? s.activeCard
                    : "border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#D1D5DB] hover:bg-white"
                }`}
              >
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                    isActive
                      ? s.activeIcon
                      : "border-[#E5E7EB] bg-white text-[#9CA3AF]"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={`text-sm font-semibold ${
                    isActive ? "text-[#111827]" : "text-[#6B7280]"
                  }`}
                >
                  {s.label}
                </span>
                <span className="text-[11px] leading-tight text-[#9CA3AF]">
                  {s.tagline}
                </span>
              </button>
            );
          })}
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

        {space === "fabricant" && (
          <div className="mt-6 text-center text-sm text-[#6B7280]">
            Pas encore partenaire ?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#022150] hover:underline"
            >
              Créer un compte
            </Link>
          </div>
        )}

        {/* Compte de démonstration — celui de l'espace actif uniquement */}
        <div className="mt-6 border-t border-[#F3F4F6] pt-5">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
            Compte de démonstration — {active.label}
          </p>
          <button
            type="button"
            onClick={() => {
              setEmail(active.demo.email);
              setPassword(active.demo.password);
            }}
            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
              space === "admin"
                ? "border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#022150] hover:bg-[#F0F4F9]"
                : "border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#10B981] hover:bg-[#ECFDF5]"
            }`}
          >
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                space === "admin"
                  ? "bg-[#022150]/10 text-[#022150]"
                  : "bg-[#10B981]/10 text-[#10B981]"
              }`}
            >
              <ActiveIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[#111827]">
                {active.demo.name}
              </span>
              <span className="block truncate text-xs text-[#6B7280]">
                {active.demo.email}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#022150]">
              <Sparkles className="h-3.5 w-3.5" />
              Remplir
            </span>
          </button>
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
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-[#022150] via-[#0A2B5F] to-[#10B981] lg:flex">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute right-10 top-1/3 h-96 w-96 rounded-full bg-[#10B981]/30 blur-3xl" />
          <div className="absolute bottom-10 left-1/4 h-64 w-64 rounded-full bg-[#F59E0B]/20 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link href="/" className="flex items-center">
            <img
              src="/verifscan-logo.webp?v=5"
              alt="VerifScan"
              className="h-14 w-auto shrink-0 brightness-0 invert"
              width={720}
              height={247}
            />
          </Link>

          <div>
            <h2 className="font-display text-4xl font-bold leading-tight">
              Authentifiez vos produits,
              <br />
              gagnez la confiance.
            </h2>
            <p className="mt-4 max-w-md text-[#DCE7F2]">
              La plateforme sénégalaise de traçabilité par QR codes pour les
              fabricants engagés dans la transparence.
            </p>

            {/* Deux espaces distincts */}
            <div className="mt-8 grid max-w-md grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#10B981] text-white">
                  <Factory className="h-4 w-4" />
                </span>
                <p className="mt-2.5 text-sm font-semibold">
                  Espace Fabricant
                </p>
                <p className="mt-0.5 text-xs text-[#DCE7F2]">
                  Produits, lots, QR codes et suivi des scans
                </p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#022150]">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <p className="mt-2.5 text-sm font-semibold">
                  Espace SuperAdmin
                </p>
                <p className="mt-0.5 text-xs text-[#DCE7F2]">
                  Utilisateurs, devis, abonnements et statistiques
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#DCE7F2]/70">
            © {new Date().getFullYear()} VerifScan — Dakar, Sénégal 🇸🇳
          </p>
        </div>
      </div>

      {/* Right form area */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <Suspense
          fallback={
            <div className="flex h-12 w-12 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#022150]" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
