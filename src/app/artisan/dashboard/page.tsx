"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  Eye,
  FileText,
  Lock,
  LogOut,
  Package,
  Pencil,
  Phone,
  QrCode,
  RefreshCw,
  Star,
  X,
} from "lucide-react";

/**
 * /artisan/dashboard — Tableau de bord de l'artisan informel.
 *
 * Protégé par le JWT artisan (localStorage) — les API renvoient 401 si le
 * token est absent/expiré → redirection vers /artisan/login.
 *
 * Sections : en-tête ambre (avatar initiale + déconnexion), stats rapides,
 * notifications de scans (7 jours), packs, produits (Modifier / Voir /
 * Stats) et actions rapides (changement de mot de passe, activation d'un
 * nouveau pack, export PDF).
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
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
        Activé
      </span>
    );
  if (status === "sold")
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
        En cours
      </span>
    );
  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-600">
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

  return (
    <main className="min-h-screen bg-stone-50" data-testid="artisan-dashboard">
      {/* ── En-tête ambre ────────────────────────────────────────────────── */}
      <header className="bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 px-4 pb-8 pt-6 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-xl font-extrabold text-amber-600 shadow-md">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold text-white drop-shadow-sm" data-testid="dashboard-welcome">
              Bonjour {displayName} !
            </h1>
            <p className="flex items-center gap-1 text-sm text-amber-100">
              <Phone className="h-3.5 w-3.5" />
              {data?.artisan.phone ?? "..."}
            </p>
          </div>
          <button
            onClick={logout}
            data-testid="logout-btn"
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/30"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      <div className="mx-auto -mt-4 max-w-3xl space-y-6 px-4 pb-14 sm:px-6">
        {loading && !data && (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-10 text-gray-500 shadow-sm">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Chargement...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-red-50 p-6 text-center text-sm font-medium text-red-600">
            {error}
            <button onClick={load} className="ml-2 underline">
              Réessayer
            </button>
          </div>
        )}

        {data && (
          <>
            {/* ── Stats rapides ──────────────────────────────────────────── */}
            <section className="grid grid-cols-3 gap-3" data-testid="dashboard-stats">
              {[
                { value: data.stats.totalScans, label: "Scans totaux" },
                { value: data.stats.totalProducts, label: "Produits actifs" },
                { value: data.stats.totalQRCodes, label: "QR codes" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-white p-4 text-center shadow-sm">
                  <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-gray-500">{s.label}</p>
                </div>
              ))}
            </section>

            {/* ── Notifications (scans 7 derniers jours) ─────────────────── */}
            {data.notifications.length > 0 && (
              <section
                className="space-y-2 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100"
                data-testid="dashboard-notifications"
              >
                <h2 className="flex items-center gap-2 text-sm font-bold text-blue-900">
                  <Bell className="h-4 w-4" />
                  Activité récente
                </h2>
                {data.notifications.map((n) => (
                  <div key={n.productName} className="rounded-xl bg-white p-3 text-[13px] shadow-sm">
                    <p className="font-semibold text-gray-800">
                      Votre <span className="text-amber-600">{n.productName}</span> a reçu{" "}
                      {n.scanCount} nouveau{n.scanCount > 1 ? "x" : ""} scan{n.scanCount > 1 ? "s" : ""} !
                    </p>
                    <p className="mt-0.5 text-[12px] text-gray-500">
                      {relativeTime(n.lastScanAt)}
                      {n.place ? ` • ${n.place}` : ""}
                    </p>
                  </div>
                ))}
              </section>
            )}

            {/* ── Vos packs ──────────────────────────────────────────────── */}
            <section className="rounded-2xl bg-white p-5 shadow-sm" data-testid="dashboard-packs">
              <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-gray-900">
                <Package className="h-5 w-5 text-amber-500" />
                Vos packs
              </h2>
              <div className="space-y-2">
                {data.packs.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Aucun pack pour le moment. Scannez votre QR Code Maître pour commencer.
                  </p>
                )}
                {data.packs.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800">Pack #{p.packNumber}</p>
                      <p className="truncate font-mono text-[11px] text-gray-500">{p.masterQrCode}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[12px] text-gray-500">
                      {statusPackBadge(p.status)}
                      <span>· {p.quantity} QR</span>
                      <span>· {p.totalScans} scans</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Vos produits ───────────────────────────────────────────── */}
            <section className="rounded-2xl bg-white p-5 shadow-sm" data-testid="dashboard-products">
              <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-gray-900">
                <Star className="h-5 w-5 text-amber-500" />
                Vos produits
              </h2>
              <div className="space-y-3">
                {data.products.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Aucun produit activé. Scannez le QR Code Maître de votre pack pour activer
                    vos produits.
                  </p>
                )}
                {data.products.map((prod) => (
                  <div
                    key={prod.id}
                    data-testid={`product-card-${prod.id}`}
                    className="rounded-xl border border-gray-100 p-3"
                  >
                    <div className="flex gap-3">
                      {prod.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={prod.photoUrl}
                          alt={prod.name}
                          className="h-16 w-16 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-2xl">
                          🧴
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-gray-800">{prod.name}</p>
                          {prod.isMostScanned && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              ⭐ Populaire
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-500">
                          {prod.contenance ?? "—"} · Pack #{prod.packNumber} · {prod.qrCount} QR
                        </p>
                        <p className="text-[12px] font-semibold text-amber-600">
                          {prod.scanCount} scans
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/artisan/products/${prod.id}/edit`}
                        data-testid={`product-edit-${prod.id}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-amber-500 py-2 text-[12px] font-bold text-amber-600 transition-colors hover:bg-amber-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Modifier
                      </Link>
                      <a
                        href={`/a/${prod.viewCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-[12px] font-bold text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Voir
                      </a>
                      <button
                        onClick={() => setStatsProduct(prod)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-[12px] font-bold text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Stats
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Actions rapides ────────────────────────────────────────── */}
            <section className="grid grid-cols-2 gap-3" data-testid="dashboard-actions">
              <button
                onClick={() => setPwdModal(true)}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <Lock className="h-5 w-5 text-amber-600" />
                </span>
                <span className="text-[13px] font-bold text-gray-700">Changer mot de passe</span>
              </button>
              <button
                onClick={() => setPackModal(true)}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <QrCode className="h-5 w-5 text-emerald-600" />
                </span>
                <span className="text-[13px] font-bold text-gray-700">Activer un pack</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <FileText className="h-5 w-5 text-blue-600" />
                </span>
                <span className="text-[13px] font-bold text-gray-700">Export PDF</span>
              </button>
              <a
                href="/a-propos"
                className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                  <CheckCircle2 className="h-5 w-5 text-rose-600" />
                </span>
                <span className="text-[13px] font-bold text-gray-700">À propos de VerifScan</span>
              </a>
            </section>
          </>
        )}
      </div>

      {/* ── Modal : changer le mot de passe ──────────────────────────────── */}
      {pwdModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setPwdModal(false)}
        >
          <form
            onSubmit={changePassword}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            data-testid="pwd-modal"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-gray-900">Changer le mot de passe</h3>
              <button type="button" onClick={() => setPwdModal(false)} aria-label="Fermer">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <input
              name="current"
              type="password"
              required
              placeholder="Mot de passe actuel"
              className="mb-3 w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-amber-500"
            />
            <input
              name="next"
              type="password"
              required
              minLength={4}
              placeholder="Nouveau mot de passe (4+ caractères)"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none focus:border-amber-500"
            />
            {pwdMsg && <p className="mt-3 text-sm font-medium text-gray-700">{pwdMsg}</p>}
            <button
              type="submit"
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-bold text-white shadow-lg shadow-amber-500/30"
            >
              Enregistrer
            </button>
          </form>
        </div>
      )}

      {/* ── Modal : stats d'un produit ───────────────────────────────────── */}
      {statsProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setStatsProduct(null)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" data-testid="stats-modal">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="truncate text-base font-extrabold text-gray-900">
                {statsProduct.name}
              </h3>
              <button type="button" onClick={() => setStatsProduct(null)} aria-label="Fermer">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-2xl font-extrabold text-amber-600">{statsProduct.scanCount}</p>
                <p className="text-[11px] font-medium text-gray-500">Scans</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-2xl font-extrabold text-emerald-600">{statsProduct.qrCount}</p>
                <p className="text-[11px] font-medium text-gray-500">QR codes actifs</p>
              </div>
            </div>
            <a
              href={`/a/${statsProduct.viewCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block rounded-xl border border-gray-200 py-2.5 text-center text-[13px] font-bold text-gray-600 hover:bg-gray-50"
            >
              Voir la fiche publique →
            </a>
          </div>
        </div>
      )}

      {/* ── Modal : activer un nouveau pack ──────────────────────────────── */}
      {packModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setPackModal(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-gray-900">Activer un nouveau pack</h3>
              <button type="button" onClick={() => setPackModal(false)} aria-label="Fermer">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              Scannez le <strong>QR Code Maître</strong> d&apos;un nouveau pack avec votre
              téléphone : la page d&apos;activation s&apos;ouvre automatiquement, les étiquettes
              du pack seront rattachées à votre compte.
            </p>
            <button
              onClick={() => setPackModal(false)}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-bold text-white shadow-lg shadow-amber-500/30"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
