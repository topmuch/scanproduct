"use client";

import { useCallback, useEffect, useState } from "react";
import {
  QrCode,
  Plus,
  FileDown,
  RefreshCw,
  CheckCircle2,
  Clock,
  Package,
  ChevronDown,
  ChevronUp,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageContainer,
  SectionTitle,
  Card,
  CardHeader,
  Badge,
  Button,
} from "@/components/admin/ui";

/**
 * ArtisanBatchesPage — onglet « Production QR Artisans » du SuperAdmin.
 *
 * Workflow :
 *   1. Générer un batch (total, taille pack, prix) → packs + QR codes
 *   2. Télécharger le PDF d'impression (Maître encadré rouge)
 *   3. Suivre les packs : disponibles / vendus / activés par les artisans
 */

type PackItem = {
  id: string;
  packNumber: number;
  quantity: number;
  price: number;
  masterQrCode: string;
  status: string;
  soldTo: string | null;
  soldAt: string | null;
  artisanPhone?: string | null;
  lotsCount: number;
};

type BatchItem = {
  id: string;
  totalQuantity: number;
  packSize: number;
  numberOfPacks: number;
  status: string;
  printedAt: string | null;
  createdAt: string;
  packs: PackItem[];
  stats: { activatedPacks: number; activeLots: number };
};

const packBadge = (status: string) => {
  if (status === "activated") return <Badge color="green">Activé</Badge>;
  if (status === "sold") return <Badge color="orange">Vendu</Badge>;
  return <Badge color="gray">Disponible</Badge>;
};

export function ArtisanBatchesPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [totalQuantity, setTotalQuantity] = useState(1000);
  const [packSize, setPackSize] = useState(200);
  const [pricePerPack, setPricePerPack] = useState(70000);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/batches");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBatches(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les batches");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const createBatch = async (
    override?: { totalQuantity: number; packSize: number; pricePerPack: number }
  ) => {
    const qty = override?.totalQuantity ?? totalQuantity;
    const size = override?.packSize ?? packSize;
    const price = override?.pricePerPack ?? pricePerPack;
    if (size < 1 || qty < size || qty % size !== 0) {
      toast.error(
        `Le total (${qty}) doit être divisible par la taille du pack (${size})`
      );
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalQuantity: qty, packSize: size, pricePerPack: price }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Le détail serveur aide à diagnostiquer un 500 en prod (ex. table manquante)
        throw new Error(
          data.details
            ? `${data.error || `HTTP ${res.status}`} — ${data.details}`
            : data.error || `HTTP ${res.status}`
        );
      }
      toast.success(
        `Batch créé : ${data.batch.totalQuantity} QR codes dans ${data.batch.numberOfPacks} packs`
      );
      await fetchBatches();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de la création");
    } finally {
      setCreating(false);
    }
  };

  const createTestBatch = () => createBatch({ totalQuantity: 1, packSize: 1, pricePerPack: 0 });

  const downloadPDF = (batchId: string) => {
    window.open(`/api/admin/print-batch/${batchId}`, "_blank");
    setTimeout(fetchBatches, 1500);
  };

  const numberOfPacks =
    packSize > 0 && totalQuantity % packSize === 0
      ? Math.floor(totalQuantity / packSize)
      : null;

  return (
    <PageContainer>
      <SectionTitle
        title="Production QR Artisans"
        subtitle="Batches de QR codes pré-imprimés, vendus en packs aux artisans. Activation en masse par QR Code Maître."
        action={
          <Button variant="outline" size="sm" onClick={fetchBatches} disabled={loading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        }
      />

      {/* ── Nouvelle production ─────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader
          title="Nouvelle production"
          subtitle="Les codes sont générés immédiatement et restent inactifs jusqu'à l'activation par l'artisan."
          action={<QrCode className="h-5 w-5 text-[#022150]" />}
        />
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
              Total QR codes
            </label>
            <input
              type="number"
              min={1}
              max={5000}
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#022150]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
              Taille d'un pack
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={packSize}
              onChange={(e) => setPackSize(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#022150]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
              Prix par pack (FCFA)
            </label>
            <input
              type="number"
              min={0}
              step={500}
              value={pricePerPack}
              onChange={(e) => setPricePerPack(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#022150]"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={() => createBatch()} disabled={creating} className="flex-1">
              <Plus className="mr-1 h-4 w-4" />
              {creating ? "Génération…" : "Générer le batch"}
            </Button>
            <Button
              variant="outline"
              onClick={createTestBatch}
              disabled={creating}
              title="Crée un batch minimal : 1 QR produit + son QR Code Maître, prix 0 — pour valider le workflow de bout en bout"
            >
              <FlaskConical className="mr-1 h-4 w-4" />
              1 QR de test
            </Button>
          </div>
        </div>
        <div className="border-t border-[#F3F4F6] px-5 py-3">
          <p className="text-[13px] text-[#6B7280]">
            {numberOfPacks !== null ? (
              <>
                Cela créera <strong>{numberOfPacks} packs</strong> de{" "}
                <strong>{packSize} QR codes</strong> + {numberOfPacks} QR Codes
                Maîtres. Pour valider le workflow, cliquez sur « 1 QR de test ».
              </>
            ) : (
              <span className="text-red-600">
                Le total doit être divisible par la taille du pack.
              </span>
            )}
          </p>
        </div>
      </Card>

      {/* ── Liste des batches ───────────────────────────────────────────── */}
      <SectionTitle title={`Batches produits (${batches.length})`} />
      {loading ? (
        <Card className="p-8 text-center text-sm text-[#6B7280]">Chargement…</Card>
      ) : batches.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[#6B7280]">
          Aucun batch pour le moment. Générez votre premier batch ci-dessus.
        </Card>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => (
            <Card key={batch.id}>
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-[16px] font-bold text-[#111827]">
                      Batch {batch.id.slice(0, 8).toUpperCase()}
                    </h3>
                    {batch.status === "printed" ? (
                      <Badge color="green">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Imprimé
                      </Badge>
                    ) : (
                      <Badge color="orange">
                        <Clock className="mr-1 h-3 w-3" /> En attente
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] text-[#6B7280]">
                    {batch.totalQuantity} QR codes · {batch.numberOfPacks} packs
                    de {batch.packSize} · créé le{" "}
                    {new Date(batch.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#9CA3AF]">
                    {batch.stats.activatedPacks}/{batch.numberOfPacks} packs
                    activés · {batch.stats.activeLots} QR actifs
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadPDF(batch.id)}>
                    <FileDown className="mr-1 h-4 w-4" />
                    PDF d'impression
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(expanded === batch.id ? null : batch.id)}
                  >
                    {expanded === batch.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    Packs
                  </Button>
                </div>
              </div>

              {/* Détail des packs */}
              {expanded === batch.id && (
                <div className="border-t border-[#F3F4F6] px-5 py-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {batch.packs.map((pack) => (
                      <div
                        key={pack.id}
                        className="rounded-lg border border-[#E5E7EB] p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#111827]">
                            <Package className="h-4 w-4 text-[#022150]" />
                            Pack {pack.packNumber}
                          </span>
                          {packBadge(pack.status)}
                        </div>
                        <div className="mt-2 font-mono text-[12px] font-bold text-[#022150]">
                          {pack.masterQrCode}
                        </div>
                        <div className="mt-1 text-[12px] text-[#6B7280]">
                          {pack.quantity} étiquettes ·{" "}
                          {pack.price.toLocaleString("fr-FR")} FCFA
                        </div>
                        {pack.soldTo && (
                          <div className="mt-1 text-[12px] text-[#6B7280]">
                            Artisan : <strong>{pack.soldTo}</strong>
                            {pack.artisanPhone ? ` · ${pack.artisanPhone}` : ""}
                          </div>
                        )}
                        <a
                          href={`/a/${pack.masterQrCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-[12px] font-medium text-[#022150] underline-offset-2 hover:underline"
                        >
                          Voir la page du maître →
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
