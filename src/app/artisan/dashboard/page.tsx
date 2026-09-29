"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Layers,
  Lock,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Phone,
  QrCode,
  RefreshCw,
  ScanLine,
  Share2,
  Sparkles,
  Star,
  X,
} from "lucide-react";

/**
 * /artisan/dashboard — Tableau de bord de l'artisan (design 2.0).
 *
 * Protégé par le JWT artisan (localStorage) — les API renvoient 401 si le
 * token est absent/expiré → redirection vers /artisan/login.
 *
 * Design : en-tête ambre décoré (avatar + badge en ligne), 4 cartes stats
 * en chevauchement, activité récente, grille 2 colonnes sur desktop
 * (produits + packs à gauche, actions rapides + partage WhatsApp à
 * droite), barres de progression des scans, squelettes de chargement et
 * états vides illustrés.
 */

const TOKEN_KEY = "verifscan_artisan_token";

type DashboardData = {
  artisan: { id: string; phone: string; name: string | null };
  packs: Array<{
    id: string;
    packNumber: number;
    quantity: number;
    price: number;
    masterQrCode: string;
    status: string;
    totalScans: number;
    createdAt: string;
  }>;
  products: Array<{
    id: string;
    viewCode: string;
    name: string;
    contenance: string | null;
    photoUrl: string | null;
    packId: string;
    packNumber: number;
    qrCount: number;
    scanCount: number;
    isMostScanned: boolean;
  }>;
  stats: {
    totalScans: number;
    totalProducts: number;
    totalQRCodes: number;
    totalPacks: number;
  };
  notifications: Array<{
    productName: string;
    scanCount: number;
    lastScanAt: string;
    place: string | null;
  }>;
};

function statusPackBadge(status: string) {
  if (status === "activated")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Activé
      </span>
    );
  if (status === "sold")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
        <Clock className="h-3 w-3" />
        En cours
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600 ring-1 ring-gray-200">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Disponible
    </span>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

/** Petite carte de statistique (icône colorée + valeur + libellé). */
function StatCard({
  icon,
  value,
  label,
  chipClass,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  chipClass: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md">
      <span
        className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl ${chipClass}`}
      >
        {icon}
      </span>
      <p className="text-2xl font-extrabold leading-none text-gray-900">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
    </div>
  );
}

export default function ArtisanDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Modals
  const [pwdModal, setPwdModal] = useState(false);
  const [statsProduct, setStatsProduct] = useState<DashboardData["products"][number] | null>(null);
  const [packModal, setPackModal] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");

  const load = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace("/artisan/login");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/artisan/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        router.replace("/artisan/login");
        return;
      }
      if (!res.ok) {
        setError("Chargement impossible. Réessayez.");
        return;
      }
      setData(await res.json());
      setError("");
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    router.replace("/artisan/login");
  };

  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const currentPassword = String(form.get("current") || "");
    const newPassword = String(form.get("next") || "");
    const token = localStorage.getItem(TOKEN_KEY) ?? "";
    setPwdMsg("");
    const res = await fetch("/api/artisan/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json();
    if (!res.ok) {
      setPwdMsg(json?.error || "Échec du changement");
      return;
    }
    setPwdMsg("✅ Mot de passe mis à jour");
    setTimeout(() => {
      setPwdModal(false);
      setPwdMsg("");
    }, 1200);
  };

  const displayName = data?.artisan.name || "Artisan";

  // Progression des scans par produit (relative au produit le plus scanné)
  const maxScans = data?.products.length
    ? Math.max(...data.products.map((p) => p.scanCount), 1)
    : 1;
  const firstPublicProduct = data?.products.find((p) => p.viewCode);

  return (
    <main className="min-h-screen bg-[#faf7f1]" data-testid="artisan-dashboard">
      {/* ── En-tête ambre décoré ─────────────────────────────────────────── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 px-4 pb-16 pt-6 sm:px-6">
        {/* bulles décoratives */}
        <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -left-20 top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-1/3 top-28 h-14 w-14 rounded-full bg-amber-200/25" />
        <div className="pointer-events-none absolute left-1/2 -bottom-8 h-24 w-24 rounded-full bg-orange-400/30" />

        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-extrabold text-orange-600 ring-2 ring-white/60 shadow-md sm:h-14 sm:w-14 sm:text-xl">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-orange-500 bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
                <Sparkles className="h-3 w-3" />
                Espace Artisan
              </span>
              <h1
                className="mt-1 truncate text-lg font-extrabold text-white drop-shadow-sm sm:text-xl"
                data-testid="dashboard-welcome"
              >
                Bonjour {displayName} 👋
              </h1>
            </div>
            <button
              onClick={load}
              aria-label="Rafraîchir"
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/30 sm:flex"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={logout}
              data-testid="logout-btn"
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/30"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-amber-100">
            <Phone className="h-3.5 w-3.5" />
            {data?.artisan.phone ?? "••• •• •• ••"}
            <span className="ml-2 hidden rounded-full bg-black/10 px-2 py-0.5 text-[11px] sm:inline">
              Votre atelier en un coup d'œil
            </span>
          </p>
        </div>
      </header>

      <div className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 pb-14 sm:px-6">
        {/* ── Squelettes de chargement ───────────────────────────────────── */}
        {loading && !data && (
          <div className="space-y-4" data-testid="dashboard-loading">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/70" />
              ))}
            </div>
            <div className="h-32 animate-pulse rounded-2xl bg-white/70" />
            <div className="h-64 animate-pulse rounded-2xl bg-white/70" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-red-50 p-6 text-center text-sm font-medium text-red-600 ring-1 ring-red-100">
            {error}
            <button onClick={load} className="ml-2 font-bold underline">
              Réessayer
            </button>
          </div>
        )}

        {data && (
          <div className="grid gap-5 lg:grid-cols-3">
            {/* ═══ COLONNE PRINCIPALE ══════════════════════════════════════ */}
            <div className="space-y-5 lg:col-span-2">
              {/* ── Stats rapides (4 cartes) ─────────────────────────────── */}
              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="dashboard-stats">
                <StatCard
                  icon={<ScanLine className="h-5 w-5 text-amber-600" />}
                  value={data.stats.totalScans}
                  label="Scans totaux"
                  chipClass="bg-amber-100"
                />
                <StatCard
                  icon={<Package className="h-5 w-5 text-emerald-600" />}
                  value={data.stats.totalProducts}
                  label="Produits actifs"
                  chipClass="bg-emerald-100"
                />
                <StatCard
                  icon={<QrCode className="h-5 w-5 text-blue-600" />}
                  value={data.stats.totalQRCodes}
                  label="QR codes"
                  chipClass="bg-blue-100"
                />
                <StatCard
                  icon={<Layers className="h-5 w-5 text-violet-600" />}
                  value={data.stats.totalPacks}
                  label="Packs"
                  chipClass="bg-violet-100"
                />
              </section>

              {/* ── Activité récente (scans 7 derniers jours) ────────────── */}
              {data.notifications.length > 0 && (
                <section
                  className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
                  data-testid="dashboard-notifications"
                >
                  <div className="flex items-center justify-between border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-3.5">
                    <h2 className="flex items-center gap-2 text-sm font-extrabold text-amber-900">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                      </span>
                      Activité récente
                    </h2>
                    <span className="text-[11px] font-semibold text-amber-700/70">
                      7 derniers jours
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {data.notifications.map((n) => (
                      <div key={n.productName} className="flex items-start gap-3 px-5 py-3.5">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
                          <ScanLine className="h-4 w-4 text-amber-600" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] leading-snug text-gray-800">
                            Votre <span className="font-bold text-orange-600">{n.productName}</span>{" "}
                            a reçu{" "}
                            <span className="font-bold">{n.scanCount}</span> nouveau
                            {n.scanCount > 1 ? "x" : ""} scan{n.scanCount > 1 ? "s" : ""} !
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                              {relativeTime(n.lastScanAt)}
                            </span>
                            {n.place && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                                <MapPin className="h-2.5 w-2.5" />
                                {n.place}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Vos produits ─────────────────────────────────────────── */}
              <section
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
                data-testid="dashboard-products"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                      <Package className="h-5 w-5 text-emerald-600" />
                    </span>
                    Vos produits
                  </h2>
                  {data.products.length > 0 && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">
                      {data.products.length}
                    </span>
                  )}
                </div>

                {data.products.length === 0 ? (
                  <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/50 px-6 py-10 text-center">
                    <span className="text-4xl">🧴</span>
                    <p className="mt-3 text-sm font-bold text-gray-700">
                      Aucun produit activé
                    </p>
                    <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-gray-500">
                      Scannez le <strong>QR Code Maître</strong> de votre pack pour
                      activer vos produits et les rendre visibles par vos clients.
                    </p>
                    <button
                      onClick={() => setPackModal(true)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-[13px] font-bold text-white shadow-md shadow-amber-500/25"
                    >
                      <QrCode className="h-4 w-4" />
                      Comment activer ?
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.products.map((prod) => (
                      <div
                        key={prod.id}
                        data-testid={`product-card-${prod.id}`}
                        className="group rounded-xl border border-gray-100 bg-white p-4 transition-all hover:border-amber-200 hover:shadow-md"
                      >
                        <div className="flex gap-3.5">
                          {prod.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={prod.photoUrl}
                              alt={prod.name}
                              className="h-20 w-20 shrink-0 rounded-xl object-cover ring-2 ring-amber-100"
                            />
                          ) : (
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-3xl ring-2 ring-amber-100">
                              🧴
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <p className="min-w-0 flex-1 truncate text-[15px] font-extrabold text-gray-900">
                                {prod.name}
                              </p>
                              {prod.isMostScanned && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                  Populaire
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600 ring-1 ring-gray-100">
                                {prod.contenance ?? "—"}
                              </span>
                              <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600 ring-1 ring-gray-100">
                                Pack #{prod.packNumber}
                              </span>
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 ring-1 ring-blue-100">
                                {prod.qrCount} QR
                              </span>
                            </div>
                            <div className="mt-2.5">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span className="text-gray-400">Scans</span>
                                <span className="text-orange-600">{prod.scanCount}</span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                                  style={{
                                    width:
                                      prod.scanCount > 0
                                        ? `${Math.max(8, (prod.scanCount / maxScans) * 100)}%`
                                        : "0%",
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3.5 flex gap-2">
                          <Link
                            href={`/artisan/products/${prod.id}/edit`}
                            data-testid={`product-edit-${prod.id}`}
                            className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-[12px] font-bold text-white shadow-sm shadow-amber-500/25 transition-all hover:shadow-md hover:shadow-amber-500/35"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Modifier
                          </Link>
                          <a
                            href={`/a/${prod.viewCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-gray-200 py-2.5 text-[12px] font-bold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Voir
                          </a>
                          <button
                            onClick={() => setStatsProduct(prod)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-gray-200 py-2.5 text-[12px] font-bold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                            Stats
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Vos packs ────────────────────────────────────────────── */}
              <section
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
                data-testid="dashboard-packs"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                      <Layers className="h-5 w-5 text-violet-600" />
                    </span>
                    Vos packs
                  </h2>
                  {data.packs.length > 0 && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">
                      {data.packs.length}
                    </span>
                  )}
                </div>

                {data.packs.length === 0 ? (
                  <p className="rounded-xl border-2 border-dashed border-gray-100 bg-gray-50/50 px-5 py-8 text-center text-[13px] text-gray-500">
                    Aucun pack pour le moment. Scannez votre{" "}
                    <strong>QR Code Maître</strong> pour commencer.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {data.packs.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50/80 to-white px-4 py-3.5 transition-colors hover:border-violet-200"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-extrabold text-gray-900">
                              Pack #{p.packNumber}
                            </p>
                            {statusPackBadge(p.status)}
                          </div>
                          <p className="mt-0.5 truncate font-mono text-[10.5px] text-gray-400">
                            {p.masterQrCode}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-600">
                            {p.quantity} QR
                          </span>
                          <span className="rounded-lg bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-600">
                            {p.totalScans} scans
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* ═══ COLONNE LATÉRALE ════════════════════════════════════════ */}
            <div className="space-y-5">
              {/* ── Actions rapides ──────────────────────────────────────── */}
              <section
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
                data-testid="dashboard-actions"
              >
                <h2 className="mb-3.5 flex items-center gap-2 text-base font-extrabold text-gray-900">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                  </span>
                  Actions rapides
                </h2>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setPackModal(true)}
                    className="group flex flex-col gap-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3.5 text-left shadow-sm transition-transform active:scale-[0.97] hover:shadow-md"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                      <QrCode className="h-5 w-5 text-white" />
                    </span>
                    <span className="text-[12px] font-extrabold leading-tight text-white">
                      Activer un pack
                    </span>
                  </button>
                  <button
                    onClick={() => setPwdModal(true)}
                    className="group flex flex-col gap-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-3.5 text-left shadow-sm transition-transform active:scale-[0.97] hover:shadow-md"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                      <Lock className="h-5 w-5 text-white" />
                    </span>
                    <span className="text-[12px] font-extrabold leading-tight text-white">
                      Changer mot de passe
                    </span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="group flex flex-col gap-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3.5 text-left shadow-sm transition-transform active:scale-[0.97] hover:shadow-md"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                      <FileText className="h-5 w-5 text-white" />
                    </span>
                    <span className="text-[12px] font-extrabold leading-tight text-white">
                      Export PDF
                    </span>
                  </button>
                  <a
                    href="/a-propos"
                    className="group flex flex-col gap-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 p-3.5 text-left shadow-sm transition-transform active:scale-[0.97] hover:shadow-md"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </span>
                    <span className="text-[12px] font-extrabold leading-tight text-white">
                      À propos de VerifScan
                    </span>
                  </a>
                </div>
              </section>

              {/* ── Partage WhatsApp (1er produit public) ────────────────── */}
              {firstPublicProduct && (
                <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-green-600 p-5 shadow-sm ring-1 ring-black/5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                      <Share2 className="h-5 w-5 text-white" />
                    </span>
                    <div>
                      <h2 className="text-[15px] font-extrabold text-white">
                        Faites découvrir vos produits
                      </h2>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-emerald-50">
                        Partagez votre fiche « {firstPublicProduct.name} » sur
                        WhatsApp : vos clients scannent, vérifient et vous
                        contactent directement.
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `🌿 Découvrez mes produits faits main sur VerifScan : ${
                        typeof window !== "undefined" ? window.location.origin : ""
                      }/a/${firstPublicProduct.viewCode}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-[13px] font-extrabold text-emerald-700 shadow-md transition-transform active:scale-[0.98] hover:bg-emerald-50"
                  >
                    <Share2 className="h-4 w-4" />
                    Partager sur WhatsApp
                  </a>
                </section>
              )}

              {/* ── Astuce ───────────────────────────────────────────────── */}
              <section className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/60 p-5">
                <h3 className="flex items-center gap-2 text-[13px] font-extrabold text-amber-900">
                  <ChevronRight className="h-4 w-4 text-amber-600" />
                  Le saviez-vous ?
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-amber-800/80">
                  Chaque scan de vos étiquettes est enregistré avec le lieu et
                  l'heure : plus vos produits circulent, plus vos{" "}
                  <strong>statistiques</strong> vous aident à voir où votre
                  clientèle se trouve.
                </p>
              </section>

              {/* ── Pied de page marque ──────────────────────────────────── */}
              <p className="pb-2 text-center text-[11px] font-semibold text-gray-400">
                <span className="font-extrabold text-gray-500">VerifScan</span>{" "}
                · Authentifiez vos produits faits main 🌿
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal : changer le mot de passe ──────────────────────────────── */}
      {pwdModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setPwdModal(false)}
        >
          <form
            onSubmit={changePassword}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            data-testid="pwd-modal"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                  <Lock className="h-4 w-4 text-amber-600" />
                </span>
                Changer le mot de passe
              </h3>
              <button type="button" onClick={() => setPwdModal(false)} aria-label="Fermer">
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <input
              name="current"
              type="password"
              required
              placeholder="Mot de passe actuel"
              className="mb-3 w-full rounded-xl border-2 border-gray-200 bg-gray-50/60 px-4 py-3 text-sm outline-none transition-colors focus:border-amber-500 focus:bg-white"
            />
            <input
              name="next"
              type="password"
              required
              minLength={4}
              placeholder="Nouveau mot de passe (4+ caractères)"
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50/60 px-4 py-3 text-sm outline-none transition-colors focus:border-amber-500 focus:bg-white"
            />
            {pwdMsg && <p className="mt-3 text-sm font-medium text-gray-700">{pwdMsg}</p>}
            <button
              type="submit"
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-bold text-white shadow-lg shadow-amber-500/30 transition-transform active:scale-[0.98]"
            >
              Enregistrer
            </button>
          </form>
        </div>
      )}

      {/* ── Modal : stats d'un produit ───────────────────────────────────── */}
      {statsProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setStatsProduct(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            data-testid="stats-modal"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="min-w-0 flex-1 truncate text-base font-extrabold text-gray-900">
                {statsProduct.name}
              </h3>
              <button type="button" onClick={() => setStatsProduct(null)} aria-label="Fermer">
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 ring-1 ring-amber-100">
                <ScanLine className="mx-auto mb-1.5 h-5 w-5 text-amber-500" />
                <p className="text-2xl font-extrabold text-amber-600">
                  {statsProduct.scanCount}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Scans
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 ring-1 ring-emerald-100">
                <QrCode className="mx-auto mb-1.5 h-5 w-5 text-emerald-500" />
                <p className="text-2xl font-extrabold text-emerald-600">
                  {statsProduct.qrCount}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  QR actifs
                </p>
              </div>
            </div>
            <a
              href={`/a/${statsProduct.viewCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 py-2.5 text-[13px] font-bold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              Voir la fiche publique
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      {/* ── Modal : activer un nouveau pack ──────────────────────────────── */}
      {packModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setPackModal(false)}
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <QrCode className="h-4 w-4 text-emerald-600" />
                </span>
                Activer un nouveau pack
              </h3>
              <button type="button" onClick={() => setPackModal(false)} aria-label="Fermer">
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <ol className="space-y-2.5 text-[13px] leading-relaxed text-gray-600">
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-extrabold text-emerald-700">
                  1
                </span>
                Prenez la fiche de votre pack (fournie avec les étiquettes).
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-extrabold text-emerald-700">
                  2
                </span>
                Scannez le <strong>QR Code Maître</strong> avec votre téléphone.
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-extrabold text-emerald-700">
                  3
                </span>
                Remplissez la fiche produit : vos étiquettes sont activées
                d'un coup et rattachées à votre compte.
              </li>
            </ol>
            <button
              onClick={() => setPackModal(false)}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-bold text-white shadow-lg shadow-emerald-500/30 transition-transform active:scale-[0.98]"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
