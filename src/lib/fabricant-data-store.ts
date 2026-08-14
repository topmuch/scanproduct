"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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
  generateQRCodes: (lotId: string, quantity?: number) => QRCode[];
};

// ============================================================================
// Store implementation
// ----------------------------------------------------------------------------
// PERSISTENCE:
// The store is wrapped with Zustand's `persist` middleware so that product
// edits (including uploaded photo URLs like "/uploads/products/<uuid>.png")
// survive page reloads. Without this, every reload re-initialised the store
// from the hardcoded PRODUITS/LOTS/QR_CODES constants, which orphaned every
// uploaded image file on disk — the file was still in public/uploads/products/
// but no product referenced it anymore, so the user saw the hardcoded photo
// instead of the one they just uploaded.
//
// `partialize` ensures we only persist the DATA (produits, lots, qrCodes),
// never the action functions (addProduct, updateProduct, …). Functions are
// re-created from the store initializer on every load, so persisting them
// would be wasteful (and they'd be dropped by JSON.stringify anyway).
//
// `version` lets us invalidate the persisted snapshot if the shape of the
// mock data changes in a future release — bump it and old browsers will
// discard their stale localStorage and re-seed from the hardcoded constants.
// ============================================================================
export const useFabricantData = create<FabricantDataState>()(
  persist(
    (set, get) => ({
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
    // Auto-generate a first QR code for the new lot so it immediately appears
    // on the QR codes page and in the lot/product detail views.
    const today = new Date().toISOString().split("T")[0];
    const autoQR: QRCode = {
      id: `q${Date.now()}`,
      code: `QR-${newLot.numero}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      lotId: newLot.id,
      lotNumero: newLot.numero,
      produitNom: newLot.produitNom,
      dateGeneration: today,
      scans: 0,
      status: "actif",
    };
    set((s) => ({
      lots: [newLot, ...s.lots],
      qrCodes: [autoQR, ...s.qrCodes],
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

  generateQRCodes: (lotId, quantity = 1) => {
    const lot = get().lots.find((l) => l.id === lotId);
    if (!lot) return [];
    const qty = Math.min(100, Math.max(1, quantity));
    const today = new Date().toISOString().split("T")[0];
    const newCodes: QRCode[] = Array.from({ length: qty }).map((_, i) => ({
      id: `q${Date.now()}-${i}`,
      code: `QR-${lot.numero}-${Date.now().toString(36).slice(-4)}-${i}`,
      lotId: lot.id,
      lotNumero: lot.numero,
      produitNom: lot.produitNom,
      dateGeneration: today,
      scans: 0,
      status: "actif" as const,
    }));
    set((s) => ({
      qrCodes: [...newCodes, ...s.qrCodes],
      // Update the lot's qrCodes counter so the LotDetailPage reflects the
      // newly generated codes immediately.
      lots: s.lots.map((l) =>
        l.id === lotId ? { ...l, qrCodes: l.qrCodes + qty } : l
      ),
    }));
    return newCodes;
  },
    }),
    {
      name: "verifscan-fabricant-data",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only persist the data arrays — never the action functions.
      partialize: (s) => ({
        produits: s.produits,
        lots: s.lots,
        qrCodes: s.qrCodes,
      }),
    },
  ),
);

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
      generateQRCodes: s.generateQRCodes,
    }))
  );
}
