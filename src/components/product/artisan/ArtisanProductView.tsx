import { Leaf, ShieldCheck, CalendarDays, Package } from "lucide-react";

/**
 * ArtisanProductView — page produit artisanale (scan client final).
 * Design chaleureux ambre/stone, volontairement différent de la page
 * produit formelle : photo plein écran, fraîcheur en 2 pastilles, et
 * surtout le bouton WhatsApp de contact direct avec l'artisan.
 */

type Props = {
  lot: {
    qrCode: string;
    productName: string;
    contenance: string;
    ingredients: string;
    manufacturingDate: Date | null;
    expirationDate: Date | null;
    artisanName: string;
    contactPhone: string;
    photoUrl?: string | null;
  };
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Normalise un numéro sénégalais/local vers le format international wa.me. */
function toWhatsAppLink(phone: string, artisanName: string, productName: string): string {
  const digits = phone.replace(/\D/g, "");
  let international = digits;
  if (international.startsWith("00")) international = international.slice(2);
  else if (international.startsWith("221")) international = international;
  else if (international.startsWith("0")) international = `221${international.slice(1)}`;
  else if (international.length <= 9) international = `221${international}`;
  const message = `Bonjour ${artisanName}, je suis intéressé(e) par votre ${productName} vu sur VerifScan.`;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

export function ArtisanProductView({ lot }: Props) {
  const waLink = toWhatsAppLink(lot.contactPhone, lot.artisanName, lot.productName);

  return (
    <main className="min-h-screen bg-stone-50">
      {/* 1. Grande photo */}
      <div className="relative h-80 bg-stone-200">
        {lot.photoUrl ? (
          <img
            src={lot.photoUrl}
            alt={lot.productName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-200 to-orange-300">
            <Leaf className="h-24 w-24 text-white/90" />
          </div>
        )}
        <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-amber-700 shadow-sm backdrop-blur">
          <span className="inline-flex items-center gap-1">
            <Leaf className="h-3.5 w-3.5" /> Fait main
          </span>
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-6 max-w-lg px-5">
        {/* 2. Infos principales */}
        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">{lot.productName}</h1>
          <p className="mt-1 font-medium text-amber-600">Par {lot.artisanName}</p>
          {lot.contenance && (
            <div className="mt-4 flex items-center gap-3 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-1 font-medium">
                <Package className="h-3.5 w-3.5" /> {lot.contenance}
              </span>
            </div>
          )}
        </div>

        {/* 3. Ingrédients */}
        {lot.ingredients && (
          <div className="mt-4 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-900">
              <Leaf className="h-4 w-4 text-green-600" /> Composition naturelle
            </h2>
            <p className="leading-relaxed text-gray-700">{lot.ingredients}</p>
          </div>
        )}

        {/* 4. Fraîcheur */}
        <div className="mt-4 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-900">
            <CalendarDays className="h-4 w-4 text-amber-600" /> Fraîcheur
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-green-50 p-3">
              <div className="text-xs font-medium text-green-700">Fabriqué le</div>
              <div className="text-sm font-bold text-green-900">
                {formatDate(lot.manufacturingDate)}
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <div className="text-xs font-medium text-amber-700">À utiliser avant</div>
              <div className="text-sm font-bold text-amber-900">
                {formatDate(lot.expirationDate)}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Contact WhatsApp */}
        {lot.contactPhone && (
          <div className="mb-8 mt-6">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-green-500 py-4 text-lg font-bold text-white shadow-lg transition-all transform hover:bg-green-600 active:scale-95"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Contacter {lot.artisanName}
            </a>
            <p className="mt-3 text-center text-xs text-gray-500">
              Ou appelez le {lot.contactPhone}
            </p>
          </div>
        )}

        {/* 6. Footer de confiance */}
        <div className="pb-8 text-center">
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
