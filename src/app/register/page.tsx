"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    city: "",
    password: "",
    confirm: "",
    accept: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (
      !form.name ||
      !form.companyName ||
      !form.email ||
      !form.password
    ) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (form.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!form.accept) {
      setError("Vous devez accepter les conditions générales.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          companyName: form.companyName,
          email: form.email,
          phone: form.phone,
          city: form.city,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription.");
        setLoading(false);
        return;
      }

      // Auto sign-in after successful registration
      const signRes = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (signRes?.error) {
        setError(
          "Compte créé. Veuillez vous connecter manuellement."
        );
        setLoading(false);
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-[#10B981] via-[#059669] to-[#2563EB] lg:flex">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute right-10 top-1/3 h-96 w-96 rounded-full bg-[#2563EB]/30 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8" />
            <span className="font-display text-2xl font-bold">VerifScan</span>
          </Link>

          <div>
            <h2 className="font-display text-4xl font-bold leading-tight">
              Devenez partenaire
              <br />
              VerifScan.
            </h2>
            <p className="mt-4 max-w-md text-[#D1FAE5]">
              Rejoignez les fabricants qui sécurisent leurs produits et
              construisent la confiance de leurs clients.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Essai gratuit de 14 jours — sans carte bancaire",
                "Génération illimitée de QR codes sur le plan Pro",
                "Support local à Dakar, en français",
              ].map((feat) => (
                <li key={feat} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                  <span className="text-[#F0FDF4]">{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-[#D1FAE5]/70">
            © {new Date().getFullYear()} VerifScan — Dakar, Sénégal 🇸🇳
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex w-full items-center justify-center px-6 py-10 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-[0_8px_32px_rgba(16,185,129,0.06)]">
            <div className="mb-6 text-center">
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#10B981] to-[#2563EB] text-white shadow-md">
                <Building2 className="h-6 w-6" />
              </div>
              <h1 className="font-display text-2xl font-bold text-[#111827]">
                Créer un compte fabricant
              </h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                Essai gratuit — aucune carte requise
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#B91C1C]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  icon={<User className="h-4 w-4" />}
                  label="Nom complet *"
                  value={form.name}
                  onChange={(v) => update("name", v)}
                  placeholder="Sarine Diop"
                />
                <Field
                  icon={<Building2 className="h-4 w-4" />}
                  label="Entreprise *"
                  value={form.companyName}
                  onChange={(v) => update("companyName", v)}
                  placeholder="Sarine Bio"
                />
              </div>

              <Field
                icon={<Mail className="h-4 w-4" />}
                label="Email professionnel *"
                type="email"
                value={form.email}
                onChange={(v) => update("email", v)}
                placeholder="contact@entreprise.sn"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  icon={<Phone className="h-4 w-4" />}
                  label="Téléphone"
                  value={form.phone}
                  onChange={(v) => update("phone", v)}
                  placeholder="+221 77 000 00 00"
                />
                <Field
                  icon={<Building2 className="h-4 w-4" />}
                  label="Ville"
                  value={form.city}
                  onChange={(v) => update("city", v)}
                  placeholder="Dakar"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#374151]">
                  Mot de passe *
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="Min. 8 caractères"
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

              <Field
                icon={<Lock className="h-4 w-4" />}
                label="Confirmer le mot de passe *"
                type="password"
                value={form.confirm}
                onChange={(v) => update("confirm", v)}
                placeholder="••••••••"
              />

              <label className="flex cursor-pointer items-start gap-2 text-sm text-[#6B7280]">
                <input
                  type="checkbox"
                  checked={form.accept}
                  onChange={(e) => update("accept", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#E5E7EB] text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span>
                  J'accepte les{" "}
                  <Link href="#" className="text-[#2563EB] hover:underline">
                    conditions générales
                  </Link>{" "}
                  et la{" "}
                  <Link href="#" className="text-[#2563EB] hover:underline">
                    politique de confidentialité
                  </Link>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#10B981] to-[#2563EB] text-sm font-semibold text-white shadow-md shadow-[#10B981]/25 transition-all hover:shadow-lg hover:shadow-[#10B981]/40 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création du compte…
                  </>
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-[#6B7280]">
              Déjà partenaire ?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#2563EB] hover:underline"
              >
                Se connecter
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[#9CA3AF]">
            <Link href="/" className="hover:text-[#6B7280]">
              ← Retour à l'accueil
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#374151]">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
          {icon}
        </span>
        <input
          type={type}
          required={label.includes("*")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-3 text-sm text-[#111827] outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20"
        />
      </div>
    </div>
  );
}
