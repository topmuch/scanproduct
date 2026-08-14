"use client";

/**
 * VerifScan — Fabricant dashboard data context.
 *
 * Wraps the entire fabricant shell so every page can read the server-fetched
 * data (profile, products, lots, qrCodes, stats, score, abonnement, …)
 * without re-fetching or importing mock constants.
 *
 * `refresh()` triggers a server re-render via `router.refresh()` — used by
 * mutation flows (create/update/delete) to re-pull fresh Prisma data.
 */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { FabricantData } from "@/lib/fabricant-types";

type FabricantDataContextValue = {
  data: FabricantData;
  refresh: () => void;
};

const FabricantDataContext = createContext<FabricantDataContextValue | null>(null);

export function FabricantDataProvider({
  initialData,
  children,
}: {
  initialData: FabricantData;
  children: ReactNode;
}) {
  const router = useRouter();
  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  // `initialData` is the snapshot from the server at render time. We don't
  // store it in local state because mutations call API routes + router.refresh()
  // to get a fresh server-rendered snapshot — keeping it in state would
  // diverge from the DB truth.
  const value = useMemo<FabricantDataContextValue>(
    () => ({ data: initialData, refresh }),
    [initialData, refresh],
  );

  return (
    <FabricantDataContext.Provider value={value}>
      {children}
    </FabricantDataContext.Provider>
  );
}

/**
 * Hook used by every fabricant page to access the dashboard data.
 * Throws if used outside the provider (programmer error — surfaces as a
 * loud runtime error rather than a silent undefined).
 */
export function useFabricantData(): FabricantDataContextValue {
  const ctx = useContext(FabricantDataContext);
  if (!ctx) {
    throw new Error("useFabricantData must be used within <FabricantDataProvider>");
  }
  return ctx;
}
