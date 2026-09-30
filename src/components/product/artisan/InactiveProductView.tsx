import Link from "next/link";
import { Hourglass, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/landing/Logo";

/**
 * InactiveProductView — scan d'une étiquette ARTISAN-… tant que le pack
 * n'a pas été activé par l'artisan. Message d'attente bienveillant, pas
 * une erreur.
 */
export function InactiveProductView({
  qrCode,
  hint,
}: {
  qrCode: string;
  hint: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-md text-center">
        {/* Logo officiel du site (demande utilisateur : le logo vu au scan
            doit être LE logo VerifScan) */}
        <div className="mb-6 flex justify-center">
          <Link href="/" aria-label="VerifScan accueil">
            <Logo size="md" />
          </Link>
        </div>
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <Hourglass className="h-10 w-10 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bientôt disponible
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-600">
          {hint} Revenez scanner ce QR code très bientôt — l'artisan prépare
          sa page produit.
        </p>

        <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Référence de l'étiquette
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-gray-800">
            {qrCode}
          </div>
        </div>

        <div className="mt-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-gray-600">
              Vérifié par VerifScan
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
