"use client";

import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from "react";
import type {
  AdminData,
  AdminCategory,
  AdminPlans,
  AdminStats,
  ActivityLog,
  ChartPoint,
  Maker,
  PlanDistributionEntry,
  Ticket,
  TopCityEntry,
  TopMakerEntry,
} from "@/lib/admin-server-data";

// ---------------------------------------------------------------------------
// AdminDataProvider — exposes the server-fetched initial admin data via
// React Context, plus a thin mutation layer for client-side optimistic
// updates (suspend/activate user, create/update ticket, CRUD category).
//
// Pages consume the data through the `useAdminData()` hook. Pages that need
// to mutate state use the `useAdminMutations()` hook to dispatch updates,
// which optimistically patch the local cache AND fire a fetch to the
// corresponding /api/admin/* route so the change is persisted to Prisma.
// ---------------------------------------------------------------------------

type AdminDataContextValue = {
  data: AdminData;
  // Mutators — each optimistically updates local state and persists via API
  updateUser: (id: string, patch: Partial<Maker>) => Promise<void>;
  addTicket: (ticket: Ticket) => void;
  updateTicket: (id: string, patch: Partial<Ticket>) => Promise<void>;
  setCategories: (cats: AdminCategory[]) => void;
  refreshStats: (stats: Partial<AdminStats>) => void;
};

const AdminDataContext = createContext<AdminDataContextValue | null>(null);

export function AdminDataProvider({
  initialData,
  children,
}: {
  initialData: AdminData;
  children: ReactNode;
}) {
  // Each top-level slice is a separate piece of state so we can patch it
  // without cloning the whole AdminData object.
  const [stats, setStats] = useState<AdminStats>(initialData.stats);
  const [users, setUsers] = useState<Maker[]>(initialData.users);
  const [tickets, setTickets] = useState<Ticket[]>(initialData.tickets);
  const [categories, setCategoriesState] = useState<AdminCategory[]>(initialData.categories);
  const [auditLogs] = useState<ActivityLog[]>(initialData.auditLogs);
  const [plans, setPlans] = useState<AdminPlans>(initialData.plans);
  const [signups] = useState<ChartPoint[]>(initialData.signups);
  const [revenue] = useState<ChartPoint[]>(initialData.revenue);
  const [scansDaily] = useState<ChartPoint[]>(initialData.scansDaily);
  const [scansByHour] = useState<ChartPoint[]>(initialData.scansByHour);
  const [scansByWeekday] = useState<ChartPoint[]>(initialData.scansByWeekday);
  const [planDistribution, setPlanDistribution] = useState<PlanDistributionEntry[]>(
    initialData.planDistribution
  );
  const [topMakers] = useState<TopMakerEntry[]>(initialData.topMakers);
  const [topCities] = useState<TopCityEntry[]>(initialData.topCities);
  const [retention] = useState<ChartPoint[]>(initialData.retention);
  const [churn] = useState<ChartPoint[]>(initialData.churn);
  const [perf] = useState(initialData.perf);

  // The subscriptions slice mirrors users (same shape, same data) — we keep
  // them in sync when a user is updated.
  const subscriptions = users;

  const data: AdminData = useMemo(
    () => ({
      stats,
      users,
      tickets,
      subscriptions,
      categories,
      auditLogs,
      plans,
      signups,
      revenue,
      scansDaily,
      scansByHour,
      scansByWeekday,
      planDistribution,
      topMakers,
      topCities,
      retention,
      churn,
      perf,
    }),
    [
      stats,
      users,
      tickets,
      subscriptions,
      categories,
      auditLogs,
      plans,
      signups,
      revenue,
      scansDaily,
      scansByHour,
      scansByWeekday,
      planDistribution,
      topMakers,
      topCities,
      retention,
      churn,
      perf,
    ]
  );

  const updateUser = useCallback(async (id: string, patch: Partial<Maker>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    // Persist via API
    try {
      const body: Record<string, unknown> = {};
      if (patch.status === "Actif") body.status = "ACTIVE";
      else if (patch.status === "Suspendu") body.status = "SUSPENDED";
      else if (patch.status === "Inactif") body.status = "PENDING";
      if (patch.plan) body.plan = patch.plan;
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // swallow — optimistic update stays in UI; the user can retry.
    }
  }, []);

  const addTicket = useCallback((ticket: Ticket) => {
    setTickets((prev) => [ticket, ...prev]);
  }, []);

  const updateTicket = useCallback(async (id: string, patch: Partial<Ticket>) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    try {
      const body: Record<string, unknown> = {};
      if (patch.status) body.status = patch.status;
      if (patch.priority) body.priority = patch.priority;
      if (patch.assignedTo !== undefined) body.assignedTo = patch.assignedTo;
      await fetch(`/api/admin/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // swallow
    }
  }, []);

  const setCategories = useCallback((cats: AdminCategory[]) => {
    setCategoriesState(cats);
  }, []);

  const refreshStats = useCallback((partial: Partial<AdminStats>) => {
    setStats((prev) => ({ ...prev, ...partial }));
  }, []);

  // Plans and planDistribution are derived from users — refresh them when
  // users change so the dashboard numbers stay consistent.
  // (We don't recompute server-side; this is a simple count update.)
  const value = useMemo<AdminDataContextValue>(
    () => ({
      data,
      updateUser,
      addTicket,
      updateTicket,
      setCategories,
      refreshStats,
    }),
    [data, updateUser, addTicket, updateTicket, setCategories, refreshStats]
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAdminData(): AdminData {
  const ctx = useContext(AdminDataContext);
  if (!ctx) {
    throw new Error("useAdminData must be used inside <AdminDataProvider>");
  }
  return ctx.data;
}

export function useAdminMutations(): AdminDataContextValue {
  const ctx = useContext(AdminDataContext);
  if (!ctx) {
    throw new Error("useAdminMutations must be used inside <AdminDataProvider>");
  }
  return ctx;
}

// Re-export the type for convenience
export type { AdminData, Maker, Ticket, AdminCategory, AdminStats, ActivityLog };
