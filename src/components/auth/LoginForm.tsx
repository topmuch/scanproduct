"use client";

// ============================================================================
// LoginForm — formulaire de connexion partagé entre les DEUX pages dédiées
// ============================================================================
//   /login        → space="fabricant"  (Espace Fabricant, accent vert)
//   /login/admin  → space="admin"      (Espace SuperAdmin, accent marine)
//
// Chaque page n'affiche QUE son propre espace : plus de sélecteur d'onglets
// (demande utilisateur : séparer les 2 pages pour éviter toute confusion).
// Le routing post-login reste décidé par le rôle serveur (SUPERADMIN →
// /superadmin, sinon /dashboard) — la page choisie ne change jamais les
// droits d'accès.
// ============================================================================

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Vous n'êtes pas autorisé à accéder à cette page.",
  // "suspended" is used both as a URL query param (from proxy.ts) and as
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
  // holds the old session cookie).
  session_invalid:
    "Votre session n'est plus valide (compte introuvable). Veuillez vous reconnecter.",
  default: "Une erreur est survenue. Veuillez réessayer.",
};

// Message shown when the fetch itself fails (server unreachable / network
// down). This is the most common cause of the generic error: the dev server
// or the Coolify container is not running.
const NETWORK_ERROR =
  "Serveur indisponible. Le serveur est peut-être en cours de redémarrage — réessayez dans quelques secondes.";

export type LoginSpace = "fabricant" | "admin";

interface SpaceConfig {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  // Icon badge (header)
  badge: string;
  // Submit button
  button: string;
}

const SPACE_CONFIG: Record<LoginSpace, SpaceConfig> = {
  fabricant: {
    title: "Espace Fabricant",
    subtitle: "Connectez-vous pour gérer vos produits, lots et QR codes.",
    icon: Factory,
    badge: "bg-gradient-to-br from-[#10B981] to-[#047857]",
    button:
      "bg-gradient-to-r from-[#022150] to-[#10B981] shadow-[#022150]/25 hover:shadow-[#022150]/40",
  },
  admin: {
    title: "Espace SuperAdmin",
    subtitle: "Console d'administration VerifScan — accès réservé.",
    icon: ShieldCheck,
    badge: "bg-gradient-to-br from-[#022150] to-[#0A2B5F]",
    button: "bg-[#022150] shadow-[#022150]/30 hover:bg-[#011D46]",
  },
};

export function LoginForm({ space }: { space: LoginSpace }) {
  const router = useRouter();
  const cfg = SPACE_CONFIG[space];
  const Icon = cfg.icon;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const msg = ERROR_MESSAGES[res.error];
      setError(
        msg ?? `Une erreur est survenue (${res.error}). Veuillez réessayer.`
      );
      setLoading(false);
      return;
    }

    // Fetch the session to learn the role and route accordingly. The server
    // role always wins — the login page is a doorway, not an access rule.
    try {
      const r = await fetch("/api/auth/session");
      const session = await r.json();
      const role = session?.user?.role;
      const target = role === "SUPERADMIN" ? "/superadmin" : "/dashboard";
      router.push(target);
      router.refresh();
    } catch {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-[0_8px_32px_rgba(2,33,80,0.08)]">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md ${cfg.badge}`}
          >
            <Icon className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#111827]">
            {cfg.title}
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">{cfg.subtitle}</p>
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
              htmlFor={`${space}-email`}
              className="mb-1.5 block text-sm font-medium text-[#374151]"
            >
              Adresse email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                id={`${space}-email`}
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
              htmlFor={`${space}-password`}
              className="mb-1.5 block text-sm font-medium text-[#374151]"
            >
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                id={`${space}-password`}
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

          <div className="flex justify-end">
            <Link
              href="/mot-de-passe-oublie"
              className="text-[13px] font-medium text-[#022150] transition-colors hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`group inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70 ${cfg.button}`}
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

        {/* Lien croisé discret vers l'autre espace */}
        <div className="mt-5 border-t border-[#F3F4F6] pt-4 text-center text-[13px]">
          {space === "fabricant" ? (
            <Link
              href="/login/admin"
              className="text-[#9CA3AF] transition-colors hover:text-[#022150]"
            >
              Vous êtes administrateur ?{" "}
              <span className="font-medium underline">Espace SuperAdmin</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-[#9CA3AF] transition-colors hover:text-[#022150]"
            >
              Vous êtes fabricant ?{" "}
              <span className="font-medium underline">Espace Fabricant</span>
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}
