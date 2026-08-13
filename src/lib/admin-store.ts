"use client";

import { create } from "zustand";

export type AdminPage =
  | "dashboard"
  | "users"
  | "user-detail"
  | "subscriptions"
  | "categories"
  | "stats"
  | "support"
  | "ticket-detail"
  | "settings"
  | "plans";

type AdminState = {
  page: AdminPage;
  /** selected entity id for detail pages */
  selectedId: string | null;
  /** settings sub-section */
  settingsSection: string;
  setPage: (page: AdminPage) => void;
  openDetail: (page: AdminPage, id: string) => void;
  setSettingsSection: (section: string) => void;
  goBack: () => void;
};

export const useAdminNav = create<AdminState>((set) => ({
  page: "dashboard",
  selectedId: null,
  settingsSection: "general",
  setPage: (page) => set({ page, selectedId: null }),
  openDetail: (page, id) => set({ page, selectedId: id }),
  setSettingsSection: (settingsSection) => set({ settingsSection }),
  goBack: () => set({ page: "dashboard", selectedId: null }),
}));
