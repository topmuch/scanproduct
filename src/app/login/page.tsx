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
} from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Vous n'êtes pas autorisé à accéder à cette page.",
  suspended: "Votre compte a été suspendu. Contactez le support.",
  CredentialsSignin: "Email ou mot de passe incorrect.",
  default: "Une erreur est survenue. Veuillez réessayer.",
};

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError(ERROR_MESSAGES[res.error] ?? ERROR_MESSAGES.default);
      setLoading(false);
      return;
    }

    // Fetch the session to learn the role and route accordingly
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
