import Link from "next/link";
import { db } from "@/lib/db";
import {
  ensureArtisanTables,
  isTableMissingError,
} from "@/lib/ensure-artisan-tables";
import ActivatePackClient, {
  type PackInfo,
  type PreviousInfo,
  type PreviousProduct,
} from "./activate-client";

/**
 * /activer-pack/[masterCode] — activation du pack artisanal.
 *
 * Page SERVEUR : charge l'état du pack (taille, déjà activés, restants,
 * produits déjà activés) puis rend le client qui propose les DEUX modes :
 *   - MODE 1   : tout le pack d'un coup (1 formulaire, produits identiques)
 *   - FLEXIBLE : activer par produits différents (répartition des QR codes,
 *                ex. 100 karité + 50 lavande + 50 miel)
 * Le mode peut être pré-sélectionné via ?mode=simple|flexible (liens du
 * QR Maître) ; sans paramètre, l'artisan choisit à l'écran.
 */
export const dynamic = "force-dynamic";

async function loadPackInfo(
  masterCode: string,
): Promise<{ packInfo: PackInfo; previousInfo: PreviousInfo | null } | null> {
  const fetchInfo = async (): Promise<{
    packInfo: PackInfo;
    previousInfo: PreviousInfo | null;
  } | null> => {
    if (!masterCode.startsWith("MASTER-")) return null;
    const master = await db.preActivatedLot.findUnique({
      where: { qrCode: masterCode },
      include: { pack: { include: { lots: true } } },
    });
    if (!master || !master.isMaster) return null;

    const productLots = master.pack.lots.filter((l) => !l.isMaster);
    const activatedLots = productLots.filter((l) => l.status === "active");
    const activatedCount = activatedLots.length;
    const groupMap = new Map<string, { productName: string; count: number }>();
    for (const l of activatedLots.sort((a, b) =>
      a.qrCode.localeCompare(b.qrCode),
    )) {
      const name = l.productName ?? "Produit sans nom";
      const g = groupMap.get(name);
      if (g) g.count += 1;
      else groupMap.set(name, { productName: name, count: 1 });
    }

    const packInfo: PackInfo = {
      status: master.pack.status,
      quantity: master.pack.quantity,
      activatedCount,
      remaining: Math.max(master.pack.quantity - activatedCount, 0),
      groups: [...groupMap.values()],
    };

    // ── MÉMOIRE D'ACTIVATION ──
    // Pack partiellement activé : on reconstruit ce que l'artisan avait
    // déjà rempli (identité partagée sur le Pack + détails produits sur
    // les lots activés) pour le lui reproposer automatiquement.
    let previousInfo: PreviousInfo | null = null;
    if (activatedCount > 0) {
      const byName = new Map<string, typeof activatedLots>();
      for (const l of activatedLots.sort((a, b) =>
        a.qrCode.localeCompare(b.qrCode),
      )) {
        const name = l.productName ?? "Produit sans nom";
        const arr = byName.get(name);
        if (arr) arr.push(l);
        else byName.set(name, [l]);
      }
      const products: PreviousProduct[] = [...byName.entries()].map(
        ([name, lots]) => {
          const l = lots[0];
          let precautions = "";
          if (l.precautions) {
            try {
              const parsed = JSON.parse(l.precautions);
              if (Array.isArray(parsed)) {
                precautions = parsed
                  .filter((x) => typeof x === "string")
                  .join("\n");
              } else {
                precautions = l.precautions;
              }
            } catch {
              precautions = l.precautions;
            }
          }
          return {
            productName: l.productName ?? name,
            productDesignation: l.productDesignation ?? "",
            contenance: l.contenance ?? "",
            ingredients: l.ingredients ?? "",
            manufacturingDate: l.manufacturingDate
              ? l.manufacturingDate.toISOString().slice(0, 10)
              : "",
            expirationDate: l.expirationDate
              ? l.expirationDate.toISOString().slice(0, 10)
              : "",
            productPrice: l.productPrice ?? "",
            artisanBio: l.artisanBio ?? "",
            usageTips: l.usageTips ?? "",
            precautions,
            storageConditions: l.storageConditions ?? "",
            templateId: l.templateId ?? "",
            labCertificateUrl: l.labCertificateUrl ?? "",
            count: lots.length,
          };
        },
      );
      previousInfo = {
        artisanName: activatedLots[0]?.artisanName ?? "",
        contactPhone: activatedLots[0]?.contactPhone ?? "",
        contactEmail: master.pack.artisanEmail ?? "",
        instagramUrl: master.pack.instagramUrl ?? "",
        facebookUrl: master.pack.facebookUrl ?? "",
        tiktokUrl: master.pack.tiktokUrl ?? "",
        products,
      };
    }

    return { packInfo, previousInfo };
  };

  try {
    return await fetchInfo();
  } catch (error) {
    if (isTableMissingError(error)) {
      const heal = await ensureArtisanTables();
      if (heal.ok) {
        try {
          return await fetchInfo();
        } catch (retryError) {
          console.error("[activer-pack] retry:", retryError);
        }
      }
    }
    console.error("[activer-pack] chargement du pack:", error);
    return null;
  }
}

export default async function ActivatePackPage({
  params,
  searchParams,
}: {
  params: Promise<{ masterCode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { masterCode } = await params;
  const sp = await searchParams;
  const modeParam = typeof sp.mode === "string" ? sp.mode : undefined;
  const initialMode =
    modeParam === "flexible" ? "flexible" : modeParam === "simple" ? "simple" : null;

  const loaded = await loadPackInfo(masterCode);

  if (!loaded) {
    // Code maître inconnu / invalide ou erreur DB — écran propre.
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-100 bg-white p-8 text-center shadow-sm">
          <h1 className="mb-2 text-xl font-bold text-gray-900">Code maître inconnu</h1>
          <p className="mb-6 text-sm text-gray-600">
            Ce QR Code Maître n&apos;existe pas (ou le lien est incomplet).
            Scannez le QR Maître imprimé sur votre pack VerifScan.
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-amber-500 px-6 py-3 font-semibold text-white hover:bg-amber-600"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ActivatePackClient
      masterCode={masterCode}
      initialPackInfo={loaded.packInfo}
      initialMode={initialMode}
      previousInfo={loaded.previousInfo}
    />
  );
}
