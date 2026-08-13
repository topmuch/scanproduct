"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  MAKERS_TABLE,
  type Maker,
  type Plan,
  type UserStatus,
} from "@/lib/admin-data";

// ============================================================================
// Admin data store — wraps the static MAKERS_TABLE so the superadmin can
// add/suspend/delete fabricants from the UI. The store owns a deep copy of
// the initial data so callers cannot mutate the original constant.
// ============================================================================
const initialMakers: Maker[] = structuredClone(MAKERS_TABLE);

type AdminDataState = {
  makers: Maker[];
  addMaker: (m: Omit<Maker, "id" | "registeredAt" | "lastLogin" | "scans30d" | "products" | "scans" | "mrr" | "nextBilling" | "paymentMethod" | "quotaProducts" | "quotaQrUsed" | "quotaQrTotal" | "productsList" | "notes" | "activity" | "logoColor"> & { logoColor?: string }) => Maker;
  updateMaker: (id: string, patch: Partial<Maker>) => void;
  deleteMaker: (id: string) => void;
  toggleMakerStatus: (id: string) => void;
};

const PLAN_MRR: Record<Plan, number> = {
  Starter: 10000,
  Pro: 25000,
  Enterprise: 75000,
  Essai: 0,
};

const PLAN_QUOTA: Record<Plan, string> = {
  Starter: "10 / 50",
  Pro: "50 / ∞",
  Enterprise: "∞ / ∞",
  Essai: "5 / 10",
};

export const useAdminData = create<AdminDataState>((set) => ({
  makers: initialMakers,

  addMaker: (m) => {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();
    const newMaker: Maker = {
      id: `M-${Date.now()}`,
      company: m.company,
      logoColor: m.logoColor ?? "#2563EB",
      contactName: m.contactName,
      email: m.email,
      phone: m.phone,
      whatsapp: m.whatsapp ?? m.phone,
      address: m.address,
      plan: m.plan,
      status: m.status,
      products: 0,
      scans: 0,
      scans30d: Array.from({ length: 30 }, () => 0),
      registeredAt: today,
      lastLogin: now,
      mrr: PLAN_MRR[m.plan],
      nextBilling: today,
      paymentMethod: "—",
      quotaProducts: PLAN_QUOTA[m.plan],
      quotaQrUsed: 0,
      quotaQrTotal: m.plan === "Starter" ? 1000 : m.plan === "Pro" ? 5000 : 50000,
      productsList: [],
      notes: [],
      activity: [{ date: today, label: "Compte créé par l'administrateur" }],
    };
    set((s) => ({ makers: [newMaker, ...s.makers] }));
    return newMaker;
  },

  updateMaker: (id, patch) =>
    set((s) => ({
      makers: s.makers.map((m) =>
        m.id === id ? { ...m, ...patch } : m
      ),
    })),

  deleteMaker: (id) =>
    set((s) => ({ makers: s.makers.filter((m) => m.id !== id) })),

  toggleMakerStatus: (id) =>
    set((s) => ({
      makers: s.makers.map((m) =>
        m.id === id
          ? { ...m, status: m.status === "Actif" ? "Suspendu" : "Actif" }
          : m
      ),
    })),
}));

// ============================================================================
// Convenience typed hooks
// ============================================================================
export function useMakers() {
  return useAdminData(
    useShallow((s) => ({
      makers: s.makers,
      addMaker: s.addMaker,
      updateMaker: s.updateMaker,
      deleteMaker: s.deleteMaker,
      toggleMakerStatus: s.toggleMakerStatus,
    }))
  );
}

export type { Maker, Plan, UserStatus };
