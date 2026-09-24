import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { TestQrPanel, type FixtureTestQr } from "@/components/gs1/TestQrPanel";

/**
 * ============================================================================
 * VerifScan — Page de test GS1 Digital Link : /test-qr
 * ============================================================================
 * Outil de recette : affiche des QR Codes RÉELS générés depuis les données de
 * la base (produit avec GTIN → GS1 Digital Link ; produit sans GTIN → QR
 * standard). Les QR pointent vers l'origine courante : ouvrez cette page dans
 * votre navigateur, scannez un QR avec un téléphone → le resolver répond 302
 * vers la page passeport produit.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Test GS1 Digital Link — VerifScan",
  robots: { index: false, follow: false },
};

async function chargerFixtures(): Promise<FixtureTestQr[]> {
  const fixtures: FixtureTestQr[] = [];

  // 1) Produit avec GTIN valide → QR GS1 Digital Link (client industriel).
  try {
    const produitGtin = await db.product.findFirst({
      where: { barcode: { not: null }, status: "ACTIVE" },
      include: {
        lots: {
          where: { status: { not: "DRAFT" } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    const lot = produitGtin?.lots[0];
    if (produitGtin && lot) {
      fixtures.push({
        nom: produitGtin.name,
        type: "GS1",
        produitId: produitGtin.id,
        barcode: produitGtin.barcode,
        lot: lot.lotNumber ?? lot.reference,
        serie: "SN-DEMO-001",
      });
    }
  } catch (e) {
    console.error("[/test-qr] fixture GS1 :", e);
  }

  // 2) Produit sans GTIN → QR standard (petit producteur local).
  try {
    const produitStd = await db.product.findFirst({
      where: { barcode: null, status: "ACTIVE" },
      include: {
        lots: {
          where: { status: { not: "DRAFT" } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    const lot = produitStd?.lots[0];
    if (produitStd && lot) {
      fixtures.push({
        nom: produitStd.name,
        type: "STANDARD",
        produitId: produitStd.id,
        lot: lot.lotNumber ?? lot.reference,
      });
    }
  } catch (e) {
    console.error("[/test-qr] fixture standard :", e);
  }

  return fixtures;
}

export default async function TestQrPage() {
  const fixtures = await chargerFixtures();

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <header className="mb-10 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Test GS1 Digital Link — VerifScan
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
            Scannez l&apos;un des QR Codes ci-dessous avec votre téléphone :
            le resolver GS1 doit vous rediriger (HTTP 302) vers la page
            passeport du produit (DLUO, ingrédients, statut, certifications).
            Les QR sont générés depuis les données réelles de la base et
            pointent vers ce serveur.
          </p>
        </header>

        {fixtures.length === 0 ? (
          <p className="text-center text-sm text-slate-500">
            Aucun produit éligible en base (ajoutez un produit avec ou sans
            code-barans via le dashboard fabricant).
          </p>
        ) : (
          <TestQrPanel fixtures={fixtures} />
        )}

        <section className="mx-auto mt-10 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs leading-relaxed text-amber-800">
          <p className="font-bold">Rappel de conformité GS1 :</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              AI 01 — GTIN normalisé sur 14 chiffres, chiffre de contrôle
              vérifié (Modulo 10 GS1) ;
            </li>
            <li>
              AI 10 — numéro de lot, 20 caractères max (CSET 82 restreint) ;
            </li>
            <li>
              AI 21 — numéro de série unique par unité imprimée, 20 caractères
              max ;
            </li>
            <li>
              une série inconnue du système résout quand même vers le lot, mais
              est marquée <code>serieInconnue</code> dans les analytics
              (signal anti-contrefaçon).
            </li>
          </ul>
        </section>

        <p className="mt-8 text-center">
          <Link
            href="/"
            className="text-xs font-semibold text-teal-700 hover:underline"
          >
            ← Retour à l&apos;accueil VerifScan
          </Link>
        </p>
      </div>
    </div>
  );
}
