"use client";

import { create } from "zustand";

export type AdminPage =
  | "dashboard"
  | "users"
  | "user-detail"
  | "subscriptions"
  | "categories"
  | "blog"
  | "batches"
  | "stats"
  | "support"
  | "ticket-detail"
  | "messages"
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

/**
 * Compteur de messages de contact NON LUS (badge de la barre latérale).
 * Petit store dédié : le fetch vit dans AdminSidebar et n'alourdit pas le
 * payload AdminData servi au chargement de toutes les pages admin.
 */
type ContactBadgeState = {
  newCount: number | null;
  setNewCount: (n: number | null) => void;
};

export const useContactMessagesBadge = create<ContactBadgeState>((set) => ({
  newCount: null,
  setNewCount: (newCount) => set({ newCount }),
}));
