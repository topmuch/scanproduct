"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  PRODUITS,
  LOTS,
  QR_CODES,
  type Lot,
  type Product,
  type QRCode,
} from "@/lib/fabricant-data";

// ============================================================================
// Initial state — deep copies of the mock data so the store owns its own data
// and callers cannot mutate the original constants by accident.
// ============================================================================
const initialProduits: Product[] = structuredClone(PRODUITS);
const initialLots: Lot[] = structuredClone(LOTS);
const initialQRCodes: QRCode[] = structuredClone(QR_CODES);

// ============================================================================
// Helpers
// ============================================================================
function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

// ============================================================================
// Store contract
// ============================================================================
type FabricantDataState = {
  produits: Product[];
  lots: Lot[];
  qrCodes: QRCode[];

  // ---- Products ----------------------------------------------------------
  addProduct: (
    p: Omit<Product, "id" | "lots" | "scans" | "scansParMois" | "createdAt">
  ) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => Product | undefined;
  toggleProductStatus: (id: string) => void;

  // ---- Lots --------------------------------------------------------------
  addLot: (l: Omit<Lot, "id" | "scans">) => Lot;
  deleteLot: (id: string) => void;
  markLotRecalled: (id: string) => void;

  // ---- QR codes ----------------------------------------------------------
  deleteQRCode: (id: string) => void;
};

// ============================================================================
// Store implementation
// ============================================================================
export const useFabricantData = create<FabricantDataState>((set, get) => ({
  produits: initialProduits,
  lots: initialLots,
  qrCodes: initialQRCodes,

  // ---- Products ----------------------------------------------------------
  addProduct: (p) => {
    const newProduct: Product = {
      ...p,
      id: `p${Date.now()}`,
      lots: 0,
      scans: 0,
      scansParMois: 0,
      createdAt: todayIso(),
    };
    set((s) => ({ produits: [newProduct, ...s.produits] }));
    return newProduct;
  },

  updateProduct: (id, patch) =>
    set((s) => ({
      produits: s.produits.map((p) =>
        p.id === id ? { ...p, ...patch } : p
      ),
    })),

  deleteProduct: (id) =>
    set((s) => ({
      produits: s.produits.filter((p) => p.id !== id),
      // Cascade: remove lots belonging to this product too, so the Lots page
      // never shows orphan rows.
      lots: s.lots.filter((l) => l.produitId !== id),
    })),

  duplicateProduct: (id) => {
    const original = get().produits.find((p) => p.id === id);
    if (!original) return undefined;
    const copy: Product = {
      ...original,
      id: `p${Date.now()}`,
      nom: `${original.nom} (copie)`,
      lots: 0,
      scans: 0,
      scansParMois: 0,
      createdAt: todayIso(),
    };
    set((s) => ({ produits: [copy, ...s.produits] }));
    return copy;
  },

  toggleProductStatus: (id) =>
    set((s) => ({
      produits: s.produits.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "masque" ? "actif" : "masque" }
          : p
      ),
    })),

  // ---- Lots --------------------------------------------------------------
  addLot: (l) => {
    const newLot: Lot = {
      ...l,
      id: `l${Date.now()}`,
      scans: 0,
    };
    set((s) => ({
      lots: [newLot, ...s.lots],
      // Keep product.lots counter in sync so the ProduitsPage cards reflect
      // the new lot immediately.
      produits: s.produits.map((p) =>
        p.id === newLot.produitId ? { ...p, lots: p.lots + 1 } : p
      ),
    }));
    return newLot;
  },

  deleteLot: (id) => {
    const lot = get().lots.find((l) => l.id === id);
    set((s) => ({ lots: s.lots.filter((l) => l.id !== id) }));
    if (lot) {
      set((s) => ({
        produits: s.produits.map((p) =>
          p.id === lot.produitId
            ? { ...p, lots: Math.max(0, p.lots - 1) }
            : p
        ),
      }));
    }
  },

  markLotRecalled: (id) =>
    set((s) => ({
      lots: s.lots.map((l) =>
        l.id === id ? { ...l, status: "rappelle" } : l
      ),
    })),

  // ---- QR codes ----------------------------------------------------------
  deleteQRCode: (id) =>
    set((s) => ({ qrCodes: s.qrCodes.filter((q) => q.id !== id) })),
}));

// ============================================================================
// Convenience typed hooks — each returns the relevant collection + the
// actions that mutate it. Components subscribe to a single slice so they only
// re-render when the slice they care about changes. `useShallow` keeps the
// returned object referentially stable across unrelated store updates.
// ============================================================================
export function useProduits() {
  return useFabricantData(
    useShallow((s) => ({
      produits: s.produits,
      addProduct: s.addProduct,
      updateProduct: s.updateProduct,
      deleteProduct: s.deleteProduct,
      duplicateProduct: s.duplicateProduct,
      toggleProductStatus: s.toggleProductStatus,
    }))
  );
}

export function useLots() {
  return useFabricantData(
    useShallow((s) => ({
      lots: s.lots,
      addLot: s.addLot,
      deleteLot: s.deleteLot,
      markLotRecalled: s.markLotRecalled,
    }))
  );
}

export function useQRCodes() {
  return useFabricantData(
    useShallow((s) => ({
      qrCodes: s.qrCodes,
      deleteQRCode: s.deleteQRCode,
    }))
  );
}
