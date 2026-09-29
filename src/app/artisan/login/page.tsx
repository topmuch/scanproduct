"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, LogIn, Phone, QrCode } from "lucide-react";

/**
 * /artisan/login — Connexion du portail ARTISAN (parcours informel).
 *
 * Identifiant = numéro de téléphone, mot de passe par défaut « 0000 »
 * (envoyé par WhatsApp à la vente du pack). Compte créé automatiquement à
 * la première connexion. Le JWT (30 j) est stocké en localStorage puis
 * l'artisan est redirigé vers /artisan/dashboard.
 */

const TOKEN_KEY = "verifscan_artisan_token";

export default function ArtisanLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
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
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 px-4 py-10"
      data-testid="artisan-login-page"
    >
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
          <QrCode className="h-9 w-9 text-amber-500" />
        </div>
        <span className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">
          VerifScan
        </span>
        <span className="text-sm font-medium text-amber-100">
          Espace artisan
        </span>
      </div>

      {/* Carte de connexion */}
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl"
      >
        <h1 className="text-xl font-extrabold text-gray-900">Se connecter</h1>
        <p className="mt-1 text-sm text-gray-500">
          Accédez à vos produits, packs et statistiques de scans.
        </p>

        <label className="mt-5 block text-sm font-semibold text-gray-700" htmlFor="phone">
          Numéro de téléphone
        </label>
        <div className="relative mt-1.5">
          <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
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
            className="w-full rounded-xl border-2 border-gray-200 py-3 pl-11 pr-4 outline-none transition-colors focus:border-amber-500"
          />
        </div>

        <label className="mt-4 block text-sm font-semibold text-gray-700" htmlFor="password">
          Mot de passe
        </label>
        <div className="relative mt-1.5">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            id="password"
            data-testid="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="0000"
            className="w-full rounded-xl border-2 border-gray-200 py-3 pl-11 pr-4 outline-none transition-colors focus:border-amber-500"
          />
        </div>

        {error && (
          <p
            data-testid="login-error"
            className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          data-testid="login-submit"
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 font-bold text-white shadow-lg shadow-amber-500/30 transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <LogIn className="h-5 w-5" />
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-center text-[13px] text-amber-800">
          💡 Mot de passe par défaut : <strong>0000</strong>
        </p>
      </form>

      <Link
        href="/"
        className="mt-6 text-sm font-medium text-white/90 underline-offset-4 hover:underline"
      >
        ← Retour à l&apos;accueil
      </Link>
    </main>
  );
}
