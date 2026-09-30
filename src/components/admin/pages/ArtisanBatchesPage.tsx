"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
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
  Stethoscope,
  CopyX,
  Pencil,
  ShoppingCart,
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
import { ModifyPackModal } from "./ModifyPackModal";
import { SellPackModal } from "./SellPackModal";
import { getScanOrigin } from "@/lib/qr-url";

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
  if (status === "partial") return <Badge color="yellow">Partiel</Badge>;
  if (status === "sold") return <Badge color="orange">Vendu</Badge>;
  return <Badge color="gray">Disponible</Badge>;
};

export function ArtisanBatchesPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Pack en cours de modification par le SuperAdmin (données produit créées
  // par l'artisan — demande utilisateur : bouton « Modifier » à côté du QR)
  const [modifyingPack, setModifyingPack] = useState<{
    id: string;
    masterQrCode: string;
  } | null>(null);
  // Pack en cours de VENTE (spec Phase 3 : SuperAdmin vend un pack à un
  // artisan → compte créé + lien WhatsApp pour envoyer les codes)
  const [sellingPack, setSellingPack] = useState<{
    id: string;
    packNumber: number;
    quantity: number;
    price: number;
    masterQrCode: string;
  } | null>(null);

  const [totalQuantity, setTotalQuantity] = useState(1000);
  const [packSize, setPackSize] = useState(200);
  const [pricePerPack, setPricePerPack] = useState(70000);

  const fetchBatches = useCallback(
    async (opts?: { skipHeal?: boolean }) => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/batches");
        if (!res.ok) {
          // Extraire le détail renvoyé par l'API (ex. P2021 "table main.Batch
          // does not exist" = prisma db push raté sur le volume) — sinon un
          // simple "HTTP 500" est indéchiffrable pour le SuperAdmin.
          let msg = `HTTP ${res.status}`;
          try {
            const errData = await res.json();
            if (errData?.details) msg = `${errData.error ?? `HTTP ${res.status}`} — ${errData.details}`;
            else if (errData?.error) msg = errData.error;
          } catch {
            /* corps non JSON : on garde HTTP <status> */
          }
          throw new Error(msg);
        }
        const data = await res.json();
        setBatches(Array.isArray(data) ? data : []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        console.error(e);
        // Auto-réparation : table manquante (P2021) → l'app crée les tables
        // elle-même via /api/admin/db-health puis rejoue le chargement UNE fois.
        if (!opts?.skipHeal && /P2021|does not exist in the current database/i.test(msg)) {
          toast.loading("Tables manquantes — réparation automatique de la base…", {
            id: "db-heal",
            duration: 20000,
          });
          try {
            const healRes = await fetch("/api/admin/db-health", { method: "POST" });
            const healData = await healRes.json();
            if (healData?.report?.allGood) {
              toast.success(
                `Base réparée (${(healData.heal?.created ?? []).join(", ") || "tables en place"}) — rechargement…`,
                { id: "db-heal", duration: 6000 }
              );
              await fetchBatches({ skipHeal: true });
              return;
            }
            toast.error(
              `Réparation impossible : ${(healData?.heal?.errors ?? ["erreur inconnue"])
                .join(" | ")
                .slice(0, 300)}`,
              { id: "db-heal", duration: 12000 }
            );
          } catch {
            toast.error("Réparation automatique impossible (endpoint db-health injoignable)", {
              id: "db-heal",
              duration: 10000,
            });
          }
          return;
        }
        toast.error(
          msg ? `Impossible de charger les batches : ${msg}` : "Impossible de charger les batches",
          { duration: 10000 }
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

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

  // Diagnostic/réparation manuelle de la DB (endpoint SuperAdmin db-health)
  const [diagnosing, setDiagnosing] = useState(false);
  const runDbDiagnostic = async () => {
    setDiagnosing(true);
    try {
      const res = await fetch("/api/admin/db-health");
      const report = await res.json();
      if (report.allGood) {
        toast.success(
          `Base OK — ${report.totalTables} tables, système artisanal en place (${report.databaseUrl})`,
          { duration: 8000 }
        );
      } else {
        toast.loading("Tables artisanales manquantes — réparation…", { id: "db-heal", duration: 20000 });
        const healRes = await fetch("/api/admin/db-health", { method: "POST" });
        const healData = await healRes.json();
        if (healData?.report?.allGood) {
          toast.success(
            `Réparé — tables créées : ${(healData.heal?.created ?? []).join(", ") || "déjà présentes"}`,
            { id: "db-heal", duration: 8000 }
          );
          await fetchBatches({ skipHeal: true });
        } else {
          toast.error(
            `Échec réparation : ${(healData?.heal?.errors ?? [healData?.report?.queryError ?? "erreur inconnue"])
              .join(" | ")
              .slice(0, 300)}`,
            { id: "db-heal", duration: 12000 }
          );
        }
      }
    } catch {
      toast.error("Diagnostic impossible — endpoint db-health injoignable", { duration: 10000 });
    } finally {
      setDiagnosing(false);
    }
  };

  // Détection + dédoublonnage des batchs (relances pendant les incidents 500)
  const [deduping, setDeduping] = useState(false);
  const dedupeBatches = async () => {
    setDeduping(true);
    try {
      const res = await fetch("/api/admin/db-health");
      const report = await res.json();
      const groups: Array<{ duplicates: unknown[] }> = report.duplicateBatches ?? [];
      if (groups.length === 0) {
        toast.success("Aucun batch dupliqué détecté");
        return;
      }
      // 1) dry-run : ce qui serait supprimé (vides) vs protégé (scans/activations)
      const preview = await fetch("/api/admin/db-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dedupe", dryRun: true }),
      });
      const previewData = await preview.json();
      const deletable: string[] = previewData.deleted ?? [];
      const skipped: unknown[] = previewData.skipped ?? [];
      const msg = `${groups.length} groupe(s) de doublons détecté(s).\n${deletable.length} batch(s) vide(s) supprimable(s), ${skipped.length} protégé(s) (scans/activations).\nSupprimer les ${deletable.length} doublon(s) vide(s) maintenant ?`;
      if (!window.confirm(msg)) return;
      // 2) suppression réelle
      const finalRes = await fetch("/api/admin/db-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dedupe", dryRun: false }),
      });
      const finalData = await finalRes.json();
      const deletedCount = (finalData.deleted ?? []).length;
      if (deletedCount > 0) {
        toast.success(`${deletedCount} batch(s) dupliqué(s) supprimé(s)`, { duration: 8000 });
      } else {
        toast.info("Rien à supprimer");
      }
      if ((finalData.skipped ?? []).length > 0) {
        toast.warning(
          `${finalData.skipped.length} batch(s) protégé(s) (scans/activations) — suppression manuelle`,
          { duration: 10000 }
        );
      }
      await fetchBatches({ skipHeal: true });
    } catch {
      toast.error("Dédoublonnage impossible — endpoint db-health injoignable");
    } finally {
      setDeduping(false);
    }
  };

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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={runDbDiagnostic} disabled={diagnosing}>
              <Stethoscope className={`mr-1 h-4 w-4 ${diagnosing ? "animate-pulse" : ""}`} />
              Diagnostic DB
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={dedupeBatches}
              disabled={deduping}
              title="Détecte et supprime les batchs créés en double (relances pendant les incidents)"
            >
              <CopyX className={`mr-1 h-4 w-4 ${deduping ? "animate-pulse" : ""}`} />
              Doublons
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchBatches()} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
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
                        className="flex gap-3 rounded-lg border border-[#E5E7EB] p-4"
                      >
                        {/* QR du maître affiché en image — SCANNABLE :
                            encode l'URL publique {origin}/a/<code> (et non le
                            code brut) pour que la caméra du téléphone ouvre
                            directement la page (vue activation si le pack est
                            inactif, fiche produit sinon). 128px + marge 2 pour
                            un verrouillage caméra fiable. Bouton « Modifier »
                            juste à côté (demande utilisateur) : le SuperAdmin
                            corrige les données créées par l'artisan. */}
                        <div className="flex shrink-0 flex-col items-center gap-2">
                          <div
                            className="rounded-md border border-[#E5E7EB] bg-white p-1.5"
                            title="Scannez ce QR : il ouvre la page publique du pack"
                          >
                            <QRCodeCanvas
                              value={`${getScanOrigin().replace(/\/$/, "")}/a/${pack.masterQrCode}`}
                              size={128}
                              fgColor="#022150"
                              bgColor="#FFFFFF"
                              level="M"
                              marginSize={2}
                            />
                          </div>
                          <span className="text-center text-[10px] leading-tight text-[#6B7280]">
                            Scan → fiche produit
                          </span>
                          {pack.status === "activated" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setModifyingPack({
                                  id: pack.id,
                                  masterQrCode: pack.masterQrCode,
                                })
                              }
                              title="Modifier les informations produit créées par l'artisan"
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Modifier
                            </Button>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
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
                          {pack.status === "available" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSellingPack({
                                  id: pack.id,
                                  packNumber: pack.packNumber,
                                  quantity: pack.quantity,
                                  price: pack.price,
                                  masterQrCode: pack.masterQrCode,
                                })
                              }
                              title="Vendre ce pack à un artisan (compte + WhatsApp)"
                              data-testid={`sell-btn-${pack.id}`}
                            >
                              <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                              Vendre
                            </Button>
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal de modification (SuperAdmin → données produit de l'artisan) */}
      {modifyingPack && (
        <ModifyPackModal
          packId={modifyingPack.id}
          masterQrCode={modifyingPack.masterQrCode}
          onClose={() => setModifyingPack(null)}
          onSaved={() => fetchBatches({ skipHeal: true })}
        />
      )}

      {/* Modal de vente (SuperAdmin → pack disponible → artisan) */}
      {sellingPack && (
        <SellPackModal
          pack={sellingPack}
          onClose={() => setSellingPack(null)}
          onSold={() => fetchBatches({ skipHeal: true })}
        />
      )}
    </PageContainer>
  );
}
