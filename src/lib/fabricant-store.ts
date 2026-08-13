"use client";

import { create } from "zustand";

export type FabricantPage =
  | "accueil"
  | "produits"
  | "produit-detail"
  | "lots"
  | "lot-detail"
  | "qr-codes"
  | "statistiques"
  | "score"
  | "abonnement"
  | "parametres";

export type SettingsSection =
  | "entreprise"
  | "logo"
  | "contact"
  | "securite"
  | "notifications"
  | "integrations"
  | "donnees";

type FabricantState = {
  page: FabricantPage;
  selectedId: string | null;
  settingsSection: SettingsSection;
  mobileSidebarOpen: boolean;
  setPage: (page: FabricantPage) => void;
  openDetail: (page: FabricantPage, id: string) => void;
  setSettingsSection: (section: SettingsSection) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  goBack: () => void;
};

export const useFabricantNav = create<FabricantState>((set) => ({
  page: "accueil",
  selectedId: null,
  settingsSection: "entreprise",
  mobileSidebarOpen: false,
  setPage: (page) => set({ page, selectedId: null, mobileSidebarOpen: false }),
  openDetail: (page, id) => set({ page, selectedId: id, mobileSidebarOpen: false }),
  setSettingsSection: (settingsSection) => set({ settingsSection }),
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
  goBack: () => set({ page: "produits", selectedId: null }),
}));
