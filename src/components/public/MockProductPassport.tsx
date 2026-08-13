import Link from "next/link";
import { CheckCircle2, MapPin, Calendar, Package, Shield, QrCode, Factory } from "lucide-react";
import { PRODUITS, LOTS, MARQUE, type Lot } from "@/lib/fabricant-data";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

/**
 * MockProductPassport — renders a product passport for mock lot IDs (l1, l2…).
 *
 * The fabricant dashboard generates QR codes that encode `/p/<mockLotId>`.
 * Since these mock IDs don't exist in the Prisma database, the public scan
 * page falls back to this component so that scanned QR codes actually show
 * a real product passport instead of "Produit introuvable".
 *
 * This keeps the demo end-to-end: scan QR → see product info.
 */

function findMockLot(lotId: string): { lot: Lot; productIndex: number } | null {
  // Try direct lot ID match (l1, l2, …)
  let lot = LOTS.find((l) => l.id === lotId);
  let productIndex = -1;

  if (lot) {
    productIndex = PRODUITS.findIndex((p) => p.id === lot!.produitId);
    return { lot, productIndex };
  }

  // Try lot numero match (LOT-2026-XX-XXX)
  lot = LOTS.find((l) => l.numero === lotId);
  if (lot) {
    productIndex = PRODUITS.findIndex((p) => p.id === lot!.produitId);
    return { lot, productIndex };
  }

  // Try product ID match (p1, p2, …) — use first lot of that product
  const product = PRODUITS.find((p) => p.id === lotId);
  if (product) {
    lot = LOTS.find((l) => l.produitId === product.id);
    if (lot) {
      productIndex = PRODUITS.findIndex((p) => p.id === lot!.produitId);
      return { lot, productIndex };
    }
  }

  return null;
}

export function MockProductPassport({ lotId }: { lotId: string }) {
  const result = findMockLot(lotId);
  if (!result) return null;

  const { lot, productIndex } = result;
  const product = PRODUITS[productIndex];

  if (!product || !lot) return null;

  const isRecalled = lot.status === "rappelle";
  const isExpired = lot.status === "expire";

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <PublicHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 px-4 py-6">
        {/* Authenticity banner */}
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 ${
            isRecalled
              ? "border-red-200 bg-red-50"
              : isExpired
                ? "border-orange-200 bg-orange-50"
                : "border-green-200 bg-green-50"
          }`}
        >
          {isRecalled ? (
            <span className="text-2xl">⚠️</span>
          ) : isExpired ? (
            <span className="text-2xl">⏰</span>
          ) : (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          )}
          <div>
            <p className="text-[14px] font-bold text-[#111827]">
              {isRecalled
                ? "Produit rappelé"
                : isExpired
                  ? "Produit expiré"
                  : "Produit authentique — vérifié"}
            </p>
            <p className="text-[13px] text-[#6B7280]">
              {isRecalled
                ? "Ce lot a été rappelé par le fabricant. Ne pas consommer."
                : isExpired
                  ? "Ce lot a dépassé sa date de péremption."
                  : `Lot ${lot.numero} vérifié par VerifScan`}
            </p>
          </div>
        </div>

        {/* Product header */}
        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-[200px_1fr]">
            <div className="h-[200px] w-full overflow-hidden bg-[#F3F4F6] sm:h-full">
              <img
                src={product.photo}
                alt={product.nom}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-5">
              <div className="mb-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[12px] font-medium text-[#2563EB]">
                  <span>{product.categorieIcon}</span>
                  {product.categorie}
                </span>
              </div>
              <h1 className="font-display text-[24px] font-bold leading-tight text-[#111827]">
                {product.nom}
              </h1>
              <p className="mt-1 text-[14px] text-[#6B7280]">
                {product.marque} · {product.poids}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-[#374151]">
                {product.description}
              </p>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<QrCode className="h-5 w-5 text-[#2563EB]" />}
            label="Scans totaux"
            value={lot.scans.toString()}
          />
          <StatCard
            icon={<Shield className="h-5 w-5 text-[#10B981]" />}
            label="Authentification"
            value="Vérifié"
          />
          <StatCard
            icon={<Factory className="h-5 w-5 text-[#F59E0B]" />}
            label="Fabricant"
            value={MARQUE.nom}
          />
          <StatCard
            icon={<Package className="h-5 w-5 text-[#8B5CF6]" />}
            label="QR codes"
            value={lot.qrCodes.toString()}
          />
        </div>

        {/* Traceability info */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
          <h2 className="mb-4 font-display text-[16px] font-bold text-[#111827]">
            Informations de traçabilité
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoItem
              icon={<QrCode className="h-4 w-4 text-[#6B7280]" />}
              label="Numéro de lot"
              value={lot.numero}
            />
            <InfoItem
              icon={<Calendar className="h-4 w-4 text-[#6B7280]" />}
              label="Date de fabrication"
              value={lot.dateFabrication}
            />
            <InfoItem
              icon={<Calendar className="h-4 w-4 text-[#6B7280]" />}
              label="Date de péremption"
              value={lot.datePeremption}
            />
            <InfoItem
              icon={<MapPin className="h-4 w-4 text-[#6B7280]" />}
              label="Lieu de fabrication"
              value={lot.lieuFabrication}
            />
          </div>
        </div>

        {/* Ingredients */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
          <h2 className="mb-3 font-display text-[16px] font-bold text-[#111827]">
            Ingrédients
          </h2>
          <p className="text-[14px] leading-relaxed text-[#374151]">
            {lot.ingredients}
          </p>
        </div>

        {/* Fabricant */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
          <h2 className="mb-3 font-display text-[16px] font-bold text-[#111827]">
            Fabricant
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#10B981] text-[16px] font-bold text-white">
              {MARQUE.logo}
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#111827]">{MARQUE.nom}</p>
              <p className="text-[13px] text-[#6B7280]">Fabricant vérifié · {lot.lieuFabrication}</p>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="rounded-xl bg-gradient-to-br from-[#2563EB] to-[#10B981] p-5 text-center text-white">
          <p className="font-display text-[16px] font-bold">
            Passeport numérique VerifScan
          </p>
          <p className="mt-1 text-[13px] text-white/80">
            Ce produit a été scanné {lot.scans} fois. La vérité au bout du scan.
          </p>
          <Link
            href="/produits"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-[#2563EB] transition-colors hover:bg-white/90"
          >
            Voir le catalogue public
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[#F3F4F6]">
        {icon}
      </div>
      <p className="text-[12px] text-[#6B7280]">{label}</p>
      <p className="text-[16px] font-bold text-[#111827]">{value}</p>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#F3F4F6]">
        {icon}
      </span>
      <div>
        <p className="text-[12px] text-[#6B7280]">{label}</p>
        <p className="text-[14px] font-medium text-[#111827]">{value}</p>
      </div>
    </div>
  );
}

/**
 * Check if a lotId looks like a mock lot ID (l1–l87) or product ID (p1–p24).
 * Used by the public scan page to decide whether to try the mock fallback.
 */
export function isMockLotId(lotId: string): boolean {
  return findMockLot(lotId) !== null;
}
