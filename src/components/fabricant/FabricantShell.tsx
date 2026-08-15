"use client";

import { useFabricantNav } from "@/lib/fabricant-store";
import type { FabricantData } from "@/lib/fabricant-types";
import { FabricantDataProvider } from "./FabricantDataProvider";
import { FabricantSidebar } from "./FabricantSidebar";
import { FabricantHeader } from "./FabricantHeader";
import { AccueilPage } from "./pages/AccueilPage";
import { ProduitsPage } from "./pages/ProduitsPage";
import { ProduitDetailPage } from "./pages/ProduitDetailPage";
import { LotsPage } from "./pages/LotsPage";
import { LotDetailPage } from "./pages/LotDetailPage";
import { QRCodesPage } from "./pages/QRCodesPage";
import { BulkQRPage } from "./pages/BulkQRPage";
import { StatistiquesPage } from "./pages/StatistiquesPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AIAssistantPage } from "./pages/AIAssistantPage";
import { ScorePage } from "./pages/ScorePage";
import { AbonnementPage } from "./pages/AbonnementPage";
import { ParametresPage } from "./pages/ParametresPage";

function renderPage(page: string) {
  switch (page) {
    case "accueil":
      return <AccueilPage />;
    case "produits":
      return <ProduitsPage />;
    case "produit-detail":
      return <ProduitDetailPage />;
    case "lots":
      return <LotsPage />;
    case "lot-detail":
      return <LotDetailPage />;
    case "qr-codes":
      return <QRCodesPage />;
    case "qr-masse":
      return <BulkQRPage />;
    case "statistiques":
      return <StatistiquesPage />;
    case "notifications":
      return <NotificationsPage />;
    case "ai-assistant":
      return <AIAssistantPage />;
    case "score":
      return <ScorePage />;
    case "abonnement":
      return <AbonnementPage />;
    case "parametres":
      return <ParametresPage />;
    default:
      return <AccueilPage />;
  }
}

export function FabricantShell({ initialData }: { initialData: FabricantData }) {
  const { page } = useFabricantNav();
  return (
    <FabricantDataProvider initialData={initialData}>
      <div className="min-h-screen bg-[#F9FAFB]">
        <FabricantSidebar />
        <div className="lg:pl-[260px]">
          <FabricantHeader />
          <main className="min-h-[calc(100vh-70px)] px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1400px]">{renderPage(page)}</div>
          </main>
        </div>
      </div>
    </FabricantDataProvider>
  );
}
