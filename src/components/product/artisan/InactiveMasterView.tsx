import Link from "next/link";
import { QrCode, Sparkles, ShieldCheck } from "lucide-react";

/**
 * InactiveMasterView — ce que voit l'artisan quand il scanne le QR Code
 * Maître de son pack (pack pas encore activé). Grand CTA vers le
 * formulaire d'activation en masse /activer-pack/<code>.
 */
export function InactiveMasterView({
  masterCode,
  packSize,
}: {
  masterCode: string;
  packSize: number;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-block rounded-full bg-amber-200 px-4 py-1 text-xs font-bold text-amber-800">
            QR CODE MAÎTRE
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Activez tout votre pack
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Un seul formulaire — vos {packSize} étiquettes s'activent d'un coup.
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

          <ul className="mb-5 space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              Remplissez les infos de votre produit une seule fois
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              Ajoutez une photo (optionnel mais recommandé)
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              Vos clients scannent et vous contactent sur WhatsApp
            </li>
          </ul>

          <Link
            href={`/activer-pack/${masterCode}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-4 text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl"
          >
            Activer mes {packSize} produits
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
