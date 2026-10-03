import Link from "next/link";
import {
  QrCode,
  ShieldCheck,
  Package,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Wheat,
  Camera,
  Store,
  ClipboardList,
} from "lucide-react";
import { Logo } from "@/components/landing/Logo";

/**
 * InactiveMasterView — PREMIER écran que voit l'artisan quand il scanne le
 * QR Code Maître de son pack. C'est la PORTE D'ENTRÉE de l'onboarding guidé :
 *
 *   Scan → « Activez votre pack » (cet écran) → « Choisissez la façon
 *   d'activer vos étiquettes » (écran d'accueil du wizard) → 7 questions,
 *   UNE par écran (Marque+WhatsApp → Produit → Ingrédients → Fraîcheur →
 *   Photos → Vente → Récap).
 *
 * L'écran annonce les étapes de l'onboarding pour que l'artisan voie
 * IMMÉDIATEMENT qu'il est dans le parcours guidé (et non dans l'ancien
 * formulaire). Le choix de la méthode d'activation (tout d'un coup vs par
 * produits différents) se fait À L'ÉCRAN SUIVANT, dans le wizard.
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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo officiel du site (demande utilisateur : le logo vu au scan
            doit être LE logo VerifScan) */}
        <div className="mb-6 flex justify-center">
          <Link href="/" aria-label="VerifScan accueil">
            <Logo size="md" />
          </Link>
        </div>

        <div className="mb-5 text-center">
          <div className="mb-3 inline-block rounded-full bg-amber-200 px-4 py-1 text-xs font-bold text-amber-800">
            {isPartial ? "ACTIVATION EN COURS" : "ONBOARDING GUIDÉ"}
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {isPartial ? "Continuez l'activation de votre pack" : "Activez votre pack"}
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-gray-600">
            {isPartial
              ? `${activatedCount} QR codes déjà activés — ${remaining} en attente.`
              : "7 questions, une par écran — remplissez tout sans vous tromper."}
          </p>
        </div>

        {/* ── Aperçu des étapes de l'onboarding (signale le NOUVEAU parcours) ── */}
        {!isPartial && (
          <div className="mb-4 flex items-center justify-center gap-1.5">
            {[
              { icon: MessageCircle, label: "Marque" },
              { icon: Wheat, label: "Produit" },
              { icon: ClipboardList, label: "Ingrédients" },
              { icon: Camera, label: "Photos" },
              { icon: Store, label: "Vente" },
            ].map(({ icon: Icon, label }, i, arr) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="flex flex-col items-center gap-1">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-amber-200 bg-white shadow-sm">
                    <Icon className="h-4 w-4 text-amber-600" />
                  </span>
                  <span className="text-[9px] font-bold text-gray-500">{label}</span>
                </div>
                {i < arr.length - 1 && (
                  <span className="mb-3.5 h-0.5 w-2.5 rounded bg-amber-200" />
                )}
              </div>
            ))}
          </div>
        )}

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

          {/* ── CTA unique : ouvre l'écran « Choisissez la façon » du wizard ── */}
          <Link
            href={`/activer-pack/${masterCode}`}
            data-testid="start-onboarding"
            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-center shadow-lg shadow-amber-200 transition-all hover:shadow-xl hover:shadow-amber-300 active:scale-[0.98]"
          >
            <Sparkles className="h-5 w-5 text-white" />
            <span className="text-base font-extrabold text-white">
              {isPartial ? "Continuer l'activation" : "Commencer l'activation"}
            </span>
            <ArrowRight className="h-5 w-5 text-white transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-2.5 text-center text-xs font-medium text-gray-500">
            {isPartial
              ? "Reprenez où vous en êtes — progression conservée."
              : "À l'étape suivante, vous choisirez votre façon d'activer : tout le pack d'un coup, ou produit par produit."}
          </p>

          {/* ── Accès direct aux 2 modes (utilisateurs avancés / compat) ── */}
          <div className="mt-4 border-t border-gray-100 pt-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Accès direct
            </p>
            <div className="mt-1 flex items-center justify-center gap-3 text-xs font-semibold">
              <Link
                href={`/activer-pack/${masterCode}?mode=simple`}
                data-testid="mode-simple"
                className="text-emerald-600 underline-offset-2 hover:underline"
              >
                Tout le pack d&apos;un coup
              </Link>
              <span className="text-gray-300">·</span>
              <Link
                href={`/activer-pack/${masterCode}?mode=flexible`}
                data-testid="mode-flexible"
                className="text-amber-600 underline-offset-2 hover:underline"
              >
                Par produits différents
              </Link>
            </div>
          </div>

          <p className="mt-3 text-center text-xs text-gray-500">
            ⏱ 2 minutes · guidé étape par étape · aucun compte nécessaire
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
