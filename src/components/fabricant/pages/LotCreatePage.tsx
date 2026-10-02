"use client";

// ============================================================================
// LotCreatePage — Création de lot en PLEINE PAGE (wizard 3 étapes)
// ============================================================================
// Remplace l'ancienne CreationModal (feedback utilisateur : "les onglets se
// déplacent rapidement et ça s'affiche sous forme de modale — l'idéal serait
// une page"). Même logique que le wizard produit (DynamicProductForm) que
// l'utilisateur valide :
//   Étape 1 — Produit concerné (cartes + auto-avance 400ms)
//   Étape 2 — Informations du lot (pré-remplissage depuis la fiche produit)
//   Étape 3 — QR codes
//
// Anti-doublon : à la sélection du produit, les champs partagés avec la
// création produit (Poids/Contenance, Ingrédients, Pays de vente) sont
// pré-remplis depuis la fiche produit — plus besoin de les ressaisir.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PAYS_CEDEAO,
  PAYS_INTERNATIONAUX,
  PAYS_VENTE,
  formatNombre,
  type Product,
} from "@/lib/fabricant-types";
import { useFabricantNav } from "@/lib/fabricant-store";
import { useFabricantData } from "../FabricantDataProvider";
import { ProductImage } from "@/components/fabricant/ProductImage";
import { toast } from "sonner";
import { GradientButton, OutlineButton, EmptyState } from "../ui";
import {
  getProductTemplateById,
  templateShelfLifeLabel,
} from "@/lib/product-templates";
import { calculateExpirationDate } from "@/lib/expiration-calculator";

const TODAY = new Date("2026-07-26");

// ============================================================================
// Steps
// ============================================================================
type StepId = "produit" | "informations" | "qr";

const STEPS: { id: StepId; label: string; shortLabel: string }[] = [
  { id: "produit", label: "Produit concerné", shortLabel: "Produit" },
  { id: "informations", label: "Informations du lot", shortLabel: "Informations" },
  { id: "qr", label: "QR codes", shortLabel: "QR Codes" },
];

const ALL_PAYS = new Set<string>([...PAYS_CEDEAO, ...PAYS_INTERNATIONAUX]);

// Direction-aware transition (same feel as the product wizard)
const stepVariants = {
  enter: (dir: 1 | -1) => ({ opacity: 0, x: dir * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: 1 | -1) => ({ opacity: 0, x: dir * -24 }),
};

// ============================================================================
// Main
// ============================================================================
export function LotCreatePage() {
  const { setPage, openDetail } = useFabricantNav();
  const { data, refresh } = useFabricantData();
  const produits = data.products;
  const quotaRestant = data.abonnement
    ? Math.max(
        0,
        data.abonnement.quota.qrCodes.limite - data.abonnement.quota.qrCodes.utilise,
      )
    : 0;

  // Wizard state
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [done, setDone] = useState(false);
  const [createdLotId, setCreatedLotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — product
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");

  // Step 2 — lot info
  const todayIso = TODAY.toISOString().split("T")[0];
  const [numero, setNumero] = useState("LOT-2026-07-001");
  const [dateFab, setDateFab] = useState(todayIso);
  const [datePerm, setDatePerm] = useState(() => {
    const d = new Date(TODAY);
    d.setDate(d.getDate() + 365);
    return d.toISOString().split("T")[0];
  });
  const [ingredients, setIngredients] = useState("");
  const [poids, setPoids] = useState("");
  const [lieuFab, setLieuFab] = useState("");
  const [lieuTrans, setLieuTrans] = useState("");
  const [lieuIdentique, setLieuIdentique] = useState(false);
  const [paysVente, setPaysVente] = useState<Set<string>>(
    new Set(["Sénégal", "Mali", "Côte d'Ivoire"])
  );
  const [notes, setNotes] = useState("");
  const [prefilledKeys, setPrefilledKeys] = useState<string[]>([]);

  // Step 3 — QR codes
  const [qrCount, setQrCount] = useState(100);
  const [qrTaille, setQrTaille] = useState<"petit" | "moyen" | "grand">("moyen");
  const [formats, setFormats] = useState<Set<string>>(new Set(["png", "pdf"]));
  const [optLot, setOptLot] = useState(true);
  const [optNom, setOptNom] = useState(true);
  const [optLogo, setOptLogo] = useState(true);
  const [optMarges, setOptMarges] = useState(false);
  const [etiquettesPage, setEtiquettesPage] = useState(20);
  const [qrCouleur, setQrCouleur] = useState("#000000");

  const selectedProduct =
    produits.find((p) => p.id === selectedProductId) || null;
  const quotaApres = Math.max(0, quotaRestant - qrCount);
  const tailleMo = Math.round(qrCount * 0.15 * 10) / 10;

  // ── Anti-doublon : pré-remplissage depuis la fiche produit ─────────
  // Les champs déjà saisis à la création du produit (poids, ingrédients,
  // pays de destination) sont repris automatiquement — plus de double saisie.
  useEffect(() => {
    if (!selectedProduct) {
      setPrefilledKeys([]);
      return;
    }
    const keys: string[] = [];
    if (selectedProduct.poids && selectedProduct.poids.trim()) {
      setPoids(selectedProduct.poids);
      keys.push("Poids / Contenance");
    }
    const catIngredients = selectedProduct.categoryData?.ingredients;
    if (typeof catIngredients === "string" && catIngredients.trim()) {
      setIngredients(catIngredients);
      keys.push("Ingrédients");
    }
    const destCountry = selectedProduct.exportData?.destinationCountry;
    if (typeof destCountry === "string" && destCountry.trim()) {
      const matches = destCountry
        .split(",")
        .map((s) => s.trim())
        .filter((p) => ALL_PAYS.has(p));
      if (matches.length > 0) {
        setPaysVente(new Set(matches));
        keys.push("Pays de vente");
      }
    }
    setPrefilledKeys(keys);
  }, [selectedProductId]);

  // ── Auto-calcul de la date de péremption depuis le template produit ──
  // Si le produit a été créé via l'assistant intelligent (templateId), la
  // durée de conservation est connue : entrer la date de fabrication
  // calcule automatiquement la péremption. La saisie manuelle reste
  // possible — l'auto-calcul ne réécrit que sur un changement de dateFab.
  const productTemplate = getProductTemplateById(selectedProduct?.templateId);
  useEffect(() => {
    if (!productTemplate || !dateFab) return;
    const exp = calculateExpirationDate(
      new Date(`${dateFab}T00:00:00`),
      productTemplate.shelfLifeMonths,
      productTemplate.shelfLifeDays,
    );
    setDatePerm(exp.toISOString().split("T")[0]);
    // Recalcule uniquement quand la date de fabrication ou le produit change
    // (pas quand l'utilisateur ajuste datePerm à la main).
  }, [productTemplate?.id, dateFab]);

  // ── Auto-avance à l'étape 2 après sélection d'un produit (400ms) ────
  useEffect(() => {
    if (stepIdx !== 0 || !selectedProductId) return;
    const t = setTimeout(() => {
      setDirection(1);
      setStepIdx(1);
    }, 400);
    return () => clearTimeout(t);
  }, [selectedProductId, stepIdx]);

  function toggleFormat(f: string) {
    const next = new Set(formats);
    if (next.has(f)) next.delete(f);
    else next.add(f);
    setFormats(next);
  }

  function togglePays(p: string) {
    const next = new Set(paysVente);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setPaysVente(next);
  }

  function genererNumero() {
    const rnd = Math.floor(Math.random() * 900) + 100;
    setNumero(`LOT-2026-07-${rnd}`);
  }

  function reset() {
    setStepIdx(0);
    setDirection(1);
    setDone(false);
    setCreatedLotId(null);
    setSelectedProductId(null);
    setProductSearch("");
    setNumero("LOT-2026-07-001");
    setDateFab(todayIso);
    setDatePerm(() => {
      const d = new Date(TODAY);
      d.setDate(d.getDate() + 365);
      return d.toISOString().split("T")[0];
    });
    setIngredients("");
    setPoids("");
    setLieuFab("");
    setLieuTrans("");
    setLieuIdentique(false);
    setPaysVente(new Set(["Sénégal", "Mali", "Côte d'Ivoire"]));
    setNotes("");
    setPrefilledKeys([]);
    setQrCount(100);
    setQrTaille("moyen");
    setFormats(new Set(["png", "pdf"]));
    setOptLot(true);
    setOptNom(true);
    setOptLogo(true);
    setOptMarges(false);
    setEtiquettesPage(20);
    setQrCouleur("#000000");
  }

  // Step validity
  const step1Valid = !!selectedProductId;
  const step2Valid =
    numero.trim() !== "" &&
    dateFab !== "" &&
    datePerm !== "" &&
    ingredients.trim() !== "" &&
    lieuFab.trim() !== "" &&
    paysVente.size > 0;
  const step3Valid = qrCount > 0 && formats.size > 0;
  const currentValid =
    stepIdx === 0 ? step1Valid : stepIdx === 1 ? step2Valid : step3Valid;

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return produits;
    const q = productSearch.toLowerCase();
    return produits.filter(
      (p) =>
        p.nom.toLowerCase().includes(q) || p.marque.toLowerCase().includes(q)
    );
  }, [productSearch, produits]);

  async function handleSubmit() {
    if (!selectedProductId || !selectedProduct) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          lotNumber: numero,
          manufactureDate: dateFab,
          expiryDate: datePerm,
          ingredients,
          weight: poids,
          manufacturingLocation: lieuFab,
          transformationLocation: lieuTrans,
          salesCountries: Array.from(paysVente),
          quantity: qrCount,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec de la création du lot");
      }
      const created = await res.json();
      setCreatedLotId(created.id);

      if (qrCount > 0) {
        try {
          await fetch("/api/qr-codes/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lotId: created.id,
              quantity: Math.min(100, qrCount),
              options: {
                includeLotNumber: optLot,
                includeProductName: optNom,
              },
            }),
          });
        } catch (qrErr) {
          console.error("[LotCreatePage] QR generation failed:", qrErr);
        }
      }

      toast.success(`Lot ${numero} créé avec succès`);
      refresh();
      setDone(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Garde-fou : aucun produit ────────────────────────────────────────
  if (!done && produits.length === 0) {
    return (
      <div>
        <button
          onClick={() => setPage("lots")}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6B7280] transition-colors hover:text-[#022150]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux lots
        </button>
        <EmptyState
          icon={<Package className="h-12 w-12 text-[#9CA3AF]" />}
          title="Aucun produit disponible"
          subtitle="Vous devez d'abord créer un produit avant de pouvoir générer un lot de QR codes."
          action={
            <GradientButton onClick={() => setPage("produits")}>
              <Plus className="h-4 w-4" />
              Créer un produit
            </GradientButton>
          }
        />
      </div>
    );
  }

  // ── Écran de succès (pleine page) ────────────────────────────────────
  if (done) {
    return (
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-10 text-center shadow-[0_8px_32px_rgba(2,33,80,0.06)]"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#D1FAE5]"
          >
            <Check className="h-8 w-8 text-[#065F46]" />
          </motion.div>
          <h2 className="font-display text-[22px] font-bold text-[#111827]">
            Lot créé avec succès !
          </h2>
          <p className="mt-1 text-[14px] text-[#6B7280]">
            Le lot a été créé et les QR codes sont en cours de génération.
          </p>

          <div className="mx-auto mt-6 max-w-md rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-left">
            <div className="grid grid-cols-2 gap-y-2 text-[13px]">
              <span className="text-[#6B7280]">Numéro de lot</span>
              <span className="text-right font-mono font-medium text-[#022150]">
                {numero}
              </span>
              <span className="text-[#6B7280]">Produit</span>
              <span className="text-right font-medium text-[#111827]">
                {selectedProduct?.nom || "Produit"}
              </span>
              <span className="text-[#6B7280]">QR codes générés</span>
              <span className="text-right font-medium text-[#111827]">
                {formatNombre(qrCount)}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {createdLotId && (
              <GradientButton onClick={() => openDetail("lot-detail", createdLotId)}>
                <Eye className="h-4 w-4" />
                Voir le lot
              </GradientButton>
            )}
            <OutlineButton onClick={() => setPage("lots")}>
              <ArrowLeft className="h-4 w-4" />
              Retour aux lots
            </OutlineButton>
            <OutlineButton onClick={reset}>
              <Plus className="h-4 w-4" />
              Créer un autre lot
            </OutlineButton>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Wizard pleine page ────────────────────────────────────────────────
  return (
    <div className="pb-2">
      <button
        onClick={() => setPage("lots")}
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6B7280] transition-colors hover:text-[#022150]"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux lots
      </button>
      <PageHeaderLocal
        title="Créer un nouveau lot"
        subtitle="Générez une série de QR codes traçables pour une production"
      />

      <Stepper current={stepIdx} onStepClick={(i) => { if (i < stepIdx) { setDirection(-1); setStepIdx(i); } }} />

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={stepIdx}
          custom={direction}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22 }}
        >
          {/* ── ÉTAPE 1 : Produit ─────────────────────────────────────── */}
          {stepIdx === 0 && (
            <div className="mt-5">
              <SectionTitle
                step={1}
                title="Quel produit concerne ce lot ?"
                description="Sélectionnez le produit dans votre catalogue — la création d'un lot se fait toujours pour un produit existant."
              />
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Rechercher un produit par nom ou marque…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-white pl-9 pr-3 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#022150] focus:outline-none focus:ring-2 focus:ring-[#022150]/10"
                />
              </div>
              {filteredProducts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-8 text-center text-[14px] text-[#6B7280]">
                  Aucun produit ne correspond à « {productSearch} »
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      selected={p.id === selectedProductId}
                      onSelect={() => setSelectedProductId(p.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ÉTAPE 2 : Informations du lot ─────────────────────────── */}
          {stepIdx === 1 && (
            <div className="mt-5">
              <SectionTitle
                step={2}
                title="Informations du lot"
                description={`Production du produit « ${selectedProduct?.nom ?? ""} »`}
              />

              {prefilledKeys.length > 0 && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-[13px] text-[#065F46]">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <strong>Champs pré-remplis depuis la fiche produit :</strong>{" "}
                    {prefilledKeys.join(", ")}. Vous pouvez les ajuster si
                    nécessaire — plus besoin de les ressaisir.
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Numéro de lot" required>
                    <div className="flex gap-2">
                      <input
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        className="h-10 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 font-mono text-[14px] focus:border-[#022150] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={genererNumero}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[12px] font-medium text-[#374151] hover:bg-[#F9FAFB]"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Générer
                      </button>
                    </div>
                  </Field>
                  <Field
                    label="Poids / Contenance"
                    hint={prefilledKeys.includes("Poids / Contenance") ? "Repris du produit" : undefined}
                  >
                    <input
                      value={poids}
                      onChange={(e) => setPoids(e.target.value)}
                      placeholder="ex. 500ml, 250g…"
                      className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] focus:border-[#022150] focus:outline-none"
                    />
                  </Field>
                  <Field label="Date de fabrication" required>
                    <input
                      type="date"
                      value={dateFab}
                      onChange={(e) => setDateFab(e.target.value)}
                      className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] focus:border-[#022150] focus:outline-none"
                    />
                  </Field>
                  <Field
                    label="Date de péremption"
                    required
                    hint={
                      productTemplate
                        ? `Auto-calculée (${templateShelfLifeLabel(productTemplate)})`
                        : `Dans ${Math.ceil((new Date(datePerm).getTime() - new Date(dateFab).getTime()) / 86400000)} jours`
                    }
                  >
                    <input
                      type="date"
                      value={datePerm}
                      onChange={(e) => setDatePerm(e.target.value)}
                      className={
                        productTemplate
                          ? "h-10 w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-[14px] focus:border-emerald-500 focus:outline-none"
                          : "h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] focus:border-[#022150] focus:outline-none"
                      }
                    />
                  </Field>
                </div>

                <Field
                  label="Ingrédients"
                  required
                  hint={prefilledKeys.includes("Ingrédients") ? "Repris du produit" : undefined}
                >
                  <textarea
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    placeholder="Eau, sucre, bissap, citron..."
                    rows={3}
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] focus:border-[#022150] focus:outline-none"
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Lieu de fabrication" required>
                    <input
                      value={lieuFab}
                      onChange={(e) => setLieuFab(e.target.value)}
                      placeholder="Dakar, Sénégal"
                      className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] focus:border-[#022150] focus:outline-none"
                    />
                  </Field>
                  <Field label="Lieu de transformation">
                    <input
                      value={lieuIdentique ? lieuFab : lieuTrans}
                      onChange={(e) => setLieuTrans(e.target.value)}
                      disabled={lieuIdentique}
                      placeholder="Dakar, Sénégal"
                      className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] focus:border-[#022150] focus:outline-none disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF]"
                    />
                  </Field>
                </div>
                <label className="-mt-2 flex cursor-pointer items-center gap-2 text-[13px] text-[#374151]">
                  <input
                    type="checkbox"
                    checked={lieuIdentique}
                    onChange={(e) => {
                      setLieuIdentique(e.target.checked);
                      if (e.target.checked) setLieuTrans(lieuFab);
                    }}
                    className="h-4 w-4 rounded border-[#D1D5DB] text-[#022150] focus:ring-[#022150]"
                  />
                  Identique au lieu de fabrication
                </label>

                <Field label="Pays de vente" required>
                  <div className="mb-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPaysVente(new Set(PAYS_VENTE))}
                      className="text-[12px] font-medium text-[#022150] hover:underline"
                    >
                      Tout sélectionner
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaysVente(new Set())}
                      className="text-[12px] font-medium text-[#6B7280] hover:underline"
                    >
                      Tout désélectionner
                    </button>
                    <span className="ml-auto text-[12px] text-[#6B7280]">
                      {paysVente.size} / {PAYS_VENTE.length} sélectionnés
                    </span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "CEDEAO (Afrique de l'Ouest)", pays: PAYS_CEDEAO },
                      { label: "International", pays: PAYS_INTERNATIONAUX },
                    ].map((group) => (
                      <div key={group.label}>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                          {group.label}
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {group.pays.map((p) => (
                            <label
                              key={p}
                              className="flex cursor-pointer items-center gap-2 text-[13px] text-[#374151]"
                            >
                              <input
                                type="checkbox"
                                checked={paysVente.has(p)}
                                onChange={() => togglePays(p)}
                                className="h-4 w-4 rounded border-[#D1D5DB] text-[#022150] focus:ring-[#022150]"
                              />
                              {p}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Field>

                <Field label="Notes internes">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes internes (non visibles par les consommateurs)…"
                    rows={2}
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[14px] focus:border-[#022150] focus:outline-none"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* ── ÉTAPE 3 : QR codes ────────────────────────────────────── */}
          {stepIdx === 2 && (
            <div className="mt-5">
              <SectionTitle
                step={3}
                title="Génération des QR codes"
                description="Configurez la série d'étiquettes à produire pour ce lot."
              />
              <div className="space-y-5">
                <Field
                  label="Nombre de QR codes"
                  required
                  hint={`Quota restant : ${formatNombre(quotaRestant)} QR codes`}
                >
                  <input
                    type="number"
                    min={1}
                    value={qrCount}
                    onChange={(e) =>
                      setQrCount(Math.max(1, parseInt(e.target.value, 10) || 0))
                    }
                    className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[14px] focus:border-[#022150] focus:outline-none"
                  />
                </Field>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-[13px] font-semibold text-[#374151]">
                        Taille
                      </p>
                      <div className="flex gap-2">
                        {[
                          { v: "petit", l: "Petit (2cm)" },
                          { v: "moyen", l: "Moyen (3cm)" },
                          { v: "grand", l: "Grand (5cm)" },
                        ].map((o) => (
                          <button
                            key={o.v}
                            type="button"
                            onClick={() =>
                              setQrTaille(o.v as "petit" | "moyen" | "grand")
                            }
                            className={`flex-1 rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors ${
                              qrTaille === o.v
                                ? "border-[#022150] bg-[#F0F4F9] text-[#022150]"
                                : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
                            }`}
                          >
                            {o.l}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[13px] font-semibold text-[#374151]">
                        Format
                      </p>
                      <div className="flex gap-2">
                        {["png", "pdf", "svg"].map((f) => {
                          const checked = formats.has(f);
                          return (
                            <label
                              key={f}
                              className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[12px] font-medium uppercase transition-colors ${
                                checked
                                  ? "border-[#022150] bg-[#F0F4F9] text-[#022150]"
                                  : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFormat(f)}
                                className="h-3.5 w-3.5 rounded border-[#D1D5DB] text-[#022150] focus:ring-[#022150]"
                              />
                              {f}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[13px] font-semibold text-[#374151]">
                        Options impression
                      </p>
                      <div className="space-y-2 rounded-lg border border-[#E5E7EB] p-3">
                        <CheckOption label="Inclure numéro de lot" checked={optLot} onChange={setOptLot} />
                        <CheckOption label="Inclure nom produit" checked={optNom} onChange={setOptNom} />
                        <CheckOption label="Inclure logo marque" checked={optLogo} onChange={setOptLogo} />
                        <CheckOption label="Marges de découpe" checked={optMarges} onChange={setOptMarges} />
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[13px] text-[#374151]">
                            Étiquettes / page
                          </span>
                          <select
                            value={etiquettesPage}
                            onChange={(e) =>
                              setEtiquettesPage(parseInt(e.target.value, 10))
                            }
                            className="h-8 rounded-md border border-[#E5E7EB] bg-white px-2 text-[13px] focus:border-[#022150] focus:outline-none"
                          >
                            {[10, 20, 30, 40].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[13px] font-semibold text-[#374151]">
                        Couleur QR
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={qrCouleur}
                          onChange={(e) => setQrCouleur(e.target.value)}
                          className="h-10 w-14 cursor-pointer rounded-lg border border-[#E5E7EB] bg-white p-1"
                        />
                        <span
                          className="inline-flex h-10 items-center rounded-lg border border-[#E5E7EB] px-3 font-mono text-[13px] uppercase text-[#374151]"
                          style={{ backgroundColor: `${qrCouleur}10` }}
                        >
                          {qrCouleur}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Aperçu */}
                  <div>
                    <p className="mb-2 text-[13px] font-semibold text-[#374151]">
                      Aperçu
                    </p>
                    <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-5">
                      <div className="mx-auto mb-3 max-w-[180px] rounded-lg border border-[#E5E7EB] bg-white p-3">
                        <QRPreview color={qrCouleur} />
                        <div className="mt-2 border-t border-[#F3F4F6] pt-2 text-center">
                          <p className="text-[11px] font-semibold text-[#111827]">
                            {selectedProduct?.nom || "Produit"}
                          </p>
                          {optLot && (
                            <p className="font-mono text-[10px] text-[#6B7280]">
                              {numero}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white p-3 text-center">
                        <p className="text-[12px] text-[#6B7280]">
                          {qrCount} QR codes ·{" "}
                          {Array.from(formats).join(", ").toUpperCase()} · ~
                          {tailleMo} MB
                        </p>
                        <p className="mt-1 text-[12px] font-medium text-[#374151]">
                          Quota restant après : {formatNombre(quotaApres)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Barre d'actions (sticky) ─────────────────────────────────── */}
      <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-3 border-t border-[#F3F4F6] bg-white/95 px-1 py-4 backdrop-blur">
        <div>
          {stepIdx > 0 && (
            <OutlineButton
              onClick={() => {
                setDirection(-1);
                setStepIdx((s) => Math.max(0, s - 1));
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Précédent
            </OutlineButton>
          )}
        </div>
        <div className="flex items-center gap-2">
          <OutlineButton onClick={() => setPage("lots")}>Annuler</OutlineButton>
          {stepIdx < 2 && (
            <GradientButton
              disabled={!currentValid}
              onClick={() => {
                setDirection(1);
                setStepIdx((s) => Math.min(2, s + 1));
              }}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </GradientButton>
          )}
          {stepIdx === 2 && (
            <GradientButton disabled={!step3Valid || submitting} onClick={handleSubmit}>
              <Tag className="h-4 w-4" />
              {submitting
                ? "Création en cours…"
                : "Créer le lot et générer QR codes"}
            </GradientButton>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function PageHeaderLocal({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-[24px] font-bold text-[#111827]">{title}</h1>
      <p className="mt-0.5 text-[14px] text-[#6B7280]">{subtitle}</p>
    </div>
  );
}

function SectionTitle({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#022150] text-[13px] font-bold text-white">
        {step}
      </span>
      <div>
        <h2 className="font-display text-[17px] font-bold text-[#111827]">{title}</h2>
        <p className="mt-0.5 text-[13px] text-[#6B7280]">{description}</p>
      </div>
    </div>
  );
}

function Stepper({
  current,
  onStepClick,
}: {
  current: number;
  onStepClick: (idx: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white px-6 py-5 shadow-[0_2px_12px_rgba(2,33,80,0.04)]">
      {/* Desktop — horizontal stable */}
      <div className="hidden items-start sm:flex">
        {STEPS.map((step, idx) => {
          const isDone = idx < current;
          const isActive = idx === current;
          return (
            <div key={step.id} className="flex flex-1 items-start last:flex-none">
              <button
                type="button"
                disabled={idx >= current}
                onClick={() => onStepClick(idx)}
                className={`group flex flex-col items-center gap-1.5 ${
                  idx < current ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold transition-colors ${
                    isDone
                      ? "bg-[#10B981] text-white"
                      : isActive
                        ? "bg-[#022150] text-white ring-4 ring-[#022150]/10"
                        : "bg-[#E5E7EB] text-[#6B7280]"
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                </span>
                <span
                  className={`whitespace-nowrap text-[13px] font-semibold ${
                    isActive || isDone ? "text-[#111827]" : "text-[#9CA3AF]"
                  }`}
                >
                  {step.label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className="mx-3 mt-[17px] h-0.5 flex-1 rounded-full bg-[#E5E7EB]">
                  <div
                    className="h-full rounded-full bg-[#10B981]"
                    style={{ width: idx < current ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Mobile — compact */}
      <div className="sm:hidden">
        <p className="text-[13px] font-semibold text-[#111827]">
          Étape {current + 1} sur {STEPS.length}
        </p>
        <p className="mt-0.5 text-[13px] text-[#6B7280]">
          {STEPS[current]?.label}
        </p>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E7EB]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#022150] to-[#10B981] transition-all duration-300"
            style={{ width: `${((current + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  selected,
  onSelect,
}: {
  product: Product;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
        selected
          ? "border-[#022150] bg-[#F0F4F9] ring-2 ring-[#022150]/20"
          : "border-[#E5E7EB] bg-white hover:border-[#C7D2E3] hover:bg-[#F9FAFB]"
      }`}
    >
      <ProductImage
        src={product.photo}
        alt={product.nom}
        icon={product.categorieIcon}
        className="h-11 w-11 shrink-0 rounded-lg object-cover"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-[#111827]">
          {product.nom}
        </span>
        <span className="block truncate text-[12px] text-[#6B7280]">
          {product.marque} · {product.categorie}
          {product.poids ? ` · ${product.poids}` : ""}
        </span>
      </span>
      {selected && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#022150]">
          <Check className="h-3.5 w-3.5 text-white" />
        </span>
      )}
    </button>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[14px] font-medium text-[#374151]">
          {label}
          {required && <span className="text-[#EF4444]"> *</span>}
        </label>
        {hint && <span className="text-[12px] text-[#6B7280]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function CheckOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#374151]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-[#D1D5DB] text-[#022150] focus:ring-[#022150]"
      />
      {label}
    </label>
  );
}

function QRPreview({ color }: { color: string }) {
  const N = 11;
  const cells: boolean[] = [];
  for (let i = 0; i < N * N; i++) {
    const r = Math.floor(i / N);
    const c = i % N;
    const inCorner =
      (r < 3 && c < 3) || (r < 3 && c >= N - 3) || (r >= N - 3 && c < 3);
    if (inCorner) {
      const rr = r < 3 ? r : r - (N - 3);
      const cc = c < 3 ? c : c - (N - 3);
      cells.push(rr === 1 && cc === 1);
    } else {
      cells.push((r * 7 + c * 13 + ((r * c) % 5)) % 3 === 0);
    }
  }
  return (
    <div
      className="grid w-full gap-0"
      style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}
    >
      {cells.map((on, i) => (
        <div
          key={i}
          className="aspect-square"
          style={{ backgroundColor: on ? color : "white" }}
        />
      ))}
    </div>
  );
}
