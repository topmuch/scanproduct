"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Search, X, Package, Building2, ShieldCheck } from "lucide-react";
import { useUpdateUrl } from "../use-update-url";

type Props = {
  totalProducts: number;
  totalManufacturers: number;
  defaultValue: string;
};

/**
 * CatalogHero — premium full-bleed hero with gradient background, glassmorphism
 * search bar, and live stats (products / manufacturers / satisfaction).
 */
export function CatalogHero({
  totalProducts,
  totalManufacturers,
  defaultValue,
}: Props) {
  const updateUrl = useUpdateUrl();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    updateUrl({ search: trimmed || null });
  }

  function handleClear() {
    setValue("");
    updateUrl({ search: null });
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1e40af] via-[#2563eb] to-[#1e3a8a]">
      {/* Decorative blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-emerald-300/10 blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        {/* Live badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-sm font-medium text-white/90">
            {totalProducts.toLocaleString("fr-FR")} produits vérifiés disponibles
          </span>
        </div>

        {/* Title */}
        <h1 className="mx-auto mt-6 max-w-3xl text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          Découvrez des produits{" "}
          <span className="block bg-gradient-to-r from-blue-200 via-white to-emerald-200 bg-clip-text text-transparent">
            authentiques et traçables
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-4 max-w-2xl text-base text-blue-100/90 sm:text-lg">
          Parcourez notre catalogue de produits vérifiés par VerifScan.
          Scannez les QR codes pour accéder à leur traçabilité complète.
        </p>

        {/* Search bar */}
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="Rechercher un produit"
          className="mx-auto mt-8 max-w-2xl"
        >
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-5 h-5 w-5 text-gray-400"
              aria-hidden
            />
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Rechercher un produit, une marque…"
              aria-label="Termes de recherche"
              className="h-14 w-full rounded-2xl border-0 bg-white/95 pl-14 pr-32 text-base text-gray-900 shadow-2xl shadow-blue-900/20 outline-none backdrop-blur-sm transition-all placeholder:text-gray-400 focus:bg-white focus:ring-4 focus:ring-blue-300/50"
            />
            <div className="absolute right-2.5 flex items-center gap-1">
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Effacer la recherche"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-[#1D4ED8] hover:shadow-xl"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Rechercher</span>
              </button>
            </div>
          </div>
        </form>

        {/* Stats */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12">
          <Stat icon={<Package className="h-5 w-5" />} value={totalProducts.toLocaleString("fr-FR")} label="Produits" />
          <Divider />
          <Stat icon={<Building2 className="h-5 w-5" />} value={totalManufacturers.toLocaleString("fr-FR")} label="Fabricants" />
          <Divider />
          <Stat icon={<ShieldCheck className="h-5 w-5" />} value="100%" label="Vérifiés" />
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-blue-200 ring-1 ring-white/20 backdrop-blur-sm">
        {icon}
      </div>
      <div className="text-left">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs font-medium uppercase tracking-wide text-blue-200">{label}</div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="hidden h-10 w-px bg-white/20 sm:block" aria-hidden />;
}
