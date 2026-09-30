import Link from "next/link";
import { QrCode, Sparkles, ShieldCheck, Layers, Package } from "lucide-react";
import { Logo } from "@/components/landing/Logo";

/**
 * InactiveMasterView — ce que voit l'artisan quand il scanne le QR Code
 * Maître de son pack. Deux modes d'activation (choix à l'écran) :
 *   - MODE 1 : tout le pack d'un coup (1 formulaire, produits identiques)
 *   - MODE 2 : activer par produits différents (répartition des QR codes)
 *
 * Si le pack est DÉJÀ partiellement activé (mode flexible), la vue montre
 * la barre de progression (X/Y activés, restants) + les produits activés,
 * et propose de continuer.
 */
export function InactiveMasterView({
  masterCode,
  packSize,
  activatedCount = 0,
  groups = [],
}: {
  masterCode: string;
  packSize: number;
  activatedCount?: number;
  groups?: Array<{ productName: string; count: number }>;
}) {
  const isPartial = activatedCount > 0;
  const remaining = Math.max(packSize - activatedCount, 0);
  const pct = packSize > 0 ? Math.min(Math.round((activatedCount / packSize) * 100), 100) : 0;

  return (
    <main className="flex min-h-screen items-center justify-center bg-amber-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo officiel du site (demande utilisateur : le logo vu au scan
            doit être LE logo VerifScan) */}
        <div className="mb-6 flex justify-center">
          <Link href="/" aria-label="VerifScan accueil">
            <Logo size="md" />
          </Link>
        </div>

        <div className="mb-6 text-center">
          <div className="mb-3 inline-block rounded-full bg-amber-200 px-4 py-1 text-xs font-bold text-amber-800">
            QR CODE MAÎTRE
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isPartial ? "Continuez l'activation de votre pack" : "Activez votre pack"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {isPartial
              ? `${activatedCount} QR codes déjà activés — ${remaining} en attente.`
              : "Choisissez la façon d'activer vos étiquettes."}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-center gap-3 rounded-xl bg-amber-50 p-4">
            <QrCode className="h-8 w-8 text-amber-600" />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                Code du pack
              </div>
              <div className="font-mono text-sm font-bold text-gray-900">
                {masterCode}
              </div>
            </div>
          </div>

          {/* ── Barre de progression (pack partiellement activé) ── */}
          {isPartial && (
            <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-800">
                  {activatedCount}/{packSize} QR codes activés
                </span>
                <span className="text-emerald-600">
                  {remaining} restant{remaining > 1 ? "s" : ""}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                  style={{ width: `${pct}%` }}
                  role="progressbar"
                  aria-valuenow={activatedCount}
                  aria-valuemin={0}
                  aria-valuemax={packSize}
                />
              </div>
              {groups.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {groups.map((g) => (
                    <span
                      key={g.productName}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-emerald-200"
                    >
                      <Package className="h-3 w-3 text-emerald-500" />
                      {g.productName} · {g.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Les 2 modes d'activation ── */}
          <p className="mb-3 text-center text-[11px] font-bold uppercase tracking-wide text-gray-400">
            Comment voulez-vous activer {isPartial ? "la suite" : "votre pack"} ?
          </p>

          {/* MODE 1 — tout d'un coup */}
          <Link
            href={`/activer-pack/${masterCode}?mode=simple`}
            data-testid="mode-simple"
            className="mb-3 block rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 transition-colors hover:border-emerald-400 hover:bg-emerald-50"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500">
                <Sparkles className="h-5 w-5 text-white" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-gray-900">
                  ✅ Tout le {isPartial ? "restant" : "pack"} d&apos;un coup
                </p>
                <p className="mt-0.5 text-xs text-gray-600">
                  Mêmes infos pour les {isPartial ? remaining : packSize} produits —
                  un seul formulaire, ultra simple.
                </p>
              </div>
            </div>
          </Link>

          {/* MODE 2 — par produits différents */}
          <Link
            href={`/activer-pack/${masterCode}?mode=flexible`}
            data-testid="mode-flexible"
            className="block rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4 transition-colors hover:border-amber-400 hover:bg-amber-50"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500">
                <Layers className="h-5 w-5 text-white" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-gray-900">
                  ✏️ Activer par produits différents
                </p>
                <p className="mt-0.5 text-xs text-gray-600">
                  Ex : 100 karité + 50 lavande + 50 miel — un formulaire par
                  produit.
                </p>
              </div>
            </div>
          </Link>

          <p className="mt-3 text-center text-xs text-gray-500">
            ⏱ 2 minutes · aucun compte nécessaire
          </p>
        </div>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-gray-600">
              Pack officiel VerifScan
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
