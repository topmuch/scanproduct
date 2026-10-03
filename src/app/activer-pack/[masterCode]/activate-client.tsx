"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Plus,
  Trash2,
  QrCode,
  Layers,
  Sparkles,
  ArrowLeft,
  Package,
  Check,
  Camera,
  CalendarDays,
  FlaskConical,
  User,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import PhotoPicker from "@/components/product/artisan/PhotoPicker";
import {
  SmartProductSelector,
} from "@/components/SmartProductSelector";
import {
  getProductTemplateById,
  templateShelfLifeLabel,
  type ProductTemplate,
} from "@/lib/product-templates";
import {
  calculateExpirationDate,
} from "@/lib/expiration-calculator";

/**
 * Client d'activation — DEUX MODES coexistants (choix de l'artisan) :
 *
 * MODE 1 « simple »  : tout le pack (ou le restant) d'un coup — 1 formulaire,
 *                      produits identiques. Ultra simple.
 * MODE 2 « flexible »: répartition des QR codes par produit — un formulaire
 *                      par groupe (ex. 100 karité + 50 lavande + 50 miel).
 *
 * Les deux modes passent par POST /api/artisan/activate-groups (transaction,
 * répartition déterministe des étiquettes, statut partial/activated).
 */

export type PackInfo = {
  status: string;
  quantity: number;
  activatedCount: number;
  remaining: number;
  groups: Array<{ productName: string; count: number }>;
};

/** Produit déjà activé sur ce pack — sert de modèle de préremplissage. */
export type PreviousProduct = {
  productName: string;
  productDesignation: string;
  contenance: string;
  ingredients: string;
  manufacturingDate: string; // yyyy-mm-dd
  expirationDate: string; // yyyy-mm-dd
  productPrice: string;
  artisanBio: string;
  usageTips: string;
  precautions: string; // lignes séparées par \n
  storageConditions: string;
  templateId: string;
  count: number; // nb d'étiquettes déjà activées pour ce produit
};

/**
 * MÉMOIRE D'ACTIVATION — quand l'artisan revient activer la suite d'un pack
 * partiellement activé, on lui repropose automatiquement ce qu'il avait
 * déjà rempli (marque, WhatsApp, réseaux, et les produits déjà activés).
 */
export type PreviousInfo = {
  artisanName: string;
  contactPhone: string;
  contactEmail: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  products: PreviousProduct[];
};

type Mode = "simple" | "flexible";

/** Champs produit d'un groupe (mode flexible). */
type GroupForm = {
  count: string;
  photo: File | null;
  productName: string;
  productDesignation: string;
  contenance: string;
  ingredients: string;
  manufacturingDate: string;
  expirationDate: string;
  productPrice: string;
  artisanBio: string;
  usageTips: string;
  // Auto-complétion intelligente
  template: ProductTemplate | null;
  precautions: string;
  storageConditions: string;
};

/** Identité + réseaux + galerie + logo — communs à tous les produits du pack. */
type SharedForm = {
  artisanName: string;
  contactPhone: string;
  contactEmail: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  galleryPhotos: File[];
  logo: File | null;
};

type SuccessState = {
  activated: number;
  activatedTotal: number;
  quantity: number;
  remaining: number;
  fullyActivated: boolean;
  firstCode: string;
};

const inputCls =
  "w-full rounded-xl border-2 border-gray-200 px-4 py-3 outline-none transition-colors focus:border-amber-500";
const labelCls = "mb-2 block text-sm font-semibold text-gray-700";

const emptyGroup = (): GroupForm => ({
  count: "",
  photo: null,
  productName: "",
  productDesignation: "",
  contenance: "",
  ingredients: "",
  manufacturingDate: "",
  expirationDate: "",
  productPrice: "",
  artisanBio: "",
  usageTips: "",
  template: null,
  precautions: "",
  storageConditions: "",
});

async function uploadPhoto(file: File, masterCode: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("masterCode", masterCode);
  const res = await fetch("/api/artisan/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Échec de l'upload d'une photo");
  return data.url as string;
}

/** Date ISO (yyyy-mm-dd) → format long français (« 12 avril 2026 »). */
function formatFrDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Groupe produit envoyé à l'API activate-groups. */
type ApiGroup = {
  count: number;
  productData: {
    productName: string;
    productDesignation: string;
    contenance: string;
    ingredients: string;
    manufacturingDate: string;
    expirationDate: string;
    photoUrl: string;
    productPrice: string;
    artisanBio: string;
    usageTips: string;
    templateId: string;
    precautions: string;
    storageConditions: string;
  };
};

/**
 * Calcule la péremption depuis la fabrication + un template (si présent).
 * Retourne "" si une des données manque — l'utilisateur saisit alors à la main.
 */
function calcExp(mfg: string, template: ProductTemplate | null): string {
  if (!mfg || !template) return "";
  const d = calculateExpirationDate(
    new Date(`${mfg}T00:00:00`),
    template.shelfLifeMonths,
    template.shelfLifeDays,
  );
  return d.toISOString().split("T")[0];
}

/**
 * ONBOARDING (mode simple) — les étapes guidées de l'activation.
 * UNE question par écran, dans l'ordre demandé par les artisans :
 * marque + WhatsApp → nom du produit → ingrédients → fraîcheur → photos →
 * vendre → récapitulatif. Une barre de progression, validation à l'avance :
 * l'artisan remplit tous les champs sans se tromper.
 */
const SIMPLE_STEPS = [
  {
    label: "Marque",
    title: "Votre marque",
    icon: User,
    hint: "Le nom que vos clients verront et votre numéro WhatsApp.",
  },
  {
    label: "Produit",
    title: "Le nom du produit",
    icon: Package,
    hint: "Comment s'appelle votre produit ? L'assistant peut vous aider.",
  },
  {
    label: "Ingrédients",
    title: "Vos ingrédients",
    icon: FlaskConical,
    hint: "Tapez votre recette réelle — jamais inventée pour vous.",
  },
  {
    label: "Fraîcheur",
    title: "Fraîcheur & dates",
    icon: CalendarDays,
    hint: "Date de fabrication → la péremption se calcule automatiquement.",
  },
  {
    label: "Photos",
    title: "Photos & logo",
    icon: Camera,
    hint: "Photo du produit, logo de votre marque et votre atelier.",
  },
  {
    label: "Vendre",
    title: "Pour mieux vendre",
    icon: Sparkles,
    hint: "Réseaux sociaux, histoire, conseils… Tout est optionnel ici.",
  },
  {
    label: "Confirmer",
    title: "Tout est prêt ?",
    icon: ClipboardCheck,
    hint: "Vérifiez vos infos, puis lancez l'activation.",
  },
];

/**
 * ONBOARDING (mode flexible) — même parcours guidé que le mode simple,
 * adapté à la répartition par produits : UNE question par écran, et à
 * l'intérieur d'un même sujet, UNE carte par produit. L'artisan avance
 * étape par étape sans jamais affronter le formulaire complet d'un coup.
 */
const FLEX_STEPS = [
  {
    label: "Marque",
    title: "Votre marque",
    icon: User,
    hint: "Commun à tous vos produits — le nom que vos clients verront.",
  },
  {
    label: "Produits",
    title: "Vos produits",
    icon: Layers,
    hint: "Un nom par produit et le nombre d'étiquettes pour chacun.",
  },
  {
    label: "Ingrédients",
    title: "Vos ingrédients",
    icon: FlaskConical,
    hint: "La recette réelle de chaque produit — jamais inventée pour vous.",
  },
  {
    label: "Fraîcheur",
    title: "Fraîcheur & dates",
    icon: CalendarDays,
    hint: "Contenance et dates de chaque produit — la péremption se calcule.",
  },
  {
    label: "Photos",
    title: "Photos & logo",
    icon: Camera,
    hint: "Logo, atelier, photos produit… Tout est optionnel ici.",
  },
  {
    label: "Confirmer",
    title: "Tout est prêt ?",
    icon: ClipboardCheck,
    hint: "Vérifiez la répartition, puis lancez l'activation.",
  },
];

export default function ActivatePackClient({
  masterCode,
  initialPackInfo,
  initialMode,
  previousInfo = null,
}: {
  masterCode: string;
  initialPackInfo: PackInfo;
  initialMode: Mode | null;
  /** Infos déjà saisies lors d'une activation précédente du même pack. */
  previousInfo?: PreviousInfo | null;
}) {
  const router = useRouter();
  const [packInfo, setPackInfo] = useState<PackInfo>(initialPackInfo);
  const [mode, setMode] = useState<Mode | null>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SuccessState | null>(null);

  // ── MÉMOIRE D'ACTIVATION : données de la première activation ──
  const prevProduct = previousInfo?.products?.[0] ?? null;

  // ── MODE 1 : formulaire unique (toutes étiquettes encore inactives) ──
  // Prérempli avec les infos déjà saisies lors d'une activation précédente.
  const [simple, setSimple] = useState(() => ({
    photo: null as File | null,
    galleryPhotos: [] as File[],
    productName: prevProduct?.productName ?? "",
    productDesignation: prevProduct?.productDesignation ?? "",
    contenance: prevProduct?.contenance ?? "",
    ingredients: prevProduct?.ingredients ?? "",
    manufacturingDate: prevProduct?.manufacturingDate ?? "",
    expirationDate: prevProduct?.expirationDate ?? "",
    artisanName: previousInfo?.artisanName ?? "",
    contactPhone: previousInfo?.contactPhone ?? "",
    contactEmail: previousInfo?.contactEmail ?? "",
    instagramUrl: previousInfo?.instagramUrl ?? "",
    facebookUrl: previousInfo?.facebookUrl ?? "",
    tiktokUrl: previousInfo?.tiktokUrl ?? "",
    productPrice: prevProduct?.productPrice ?? "",
    artisanBio: prevProduct?.artisanBio ?? "",
    usageTips: prevProduct?.usageTips ?? "",
    // Identité visuelle de la marque (logo affiché sur la page produit)
    logo: null as File | null,
    // Auto-complétion intelligente
    template: getProductTemplateById(prevProduct?.templateId),
    precautions: prevProduct?.precautions ?? "",
    storageConditions: prevProduct?.storageConditions ?? "",
  }));
  const setS = (patch: Partial<typeof simple>) => setSimple((f) => ({ ...f, ...patch }));

  // ── MODE 2 : groupes produits + infos communes (préremplies si 1re passe) ──
  const [groups, setGroups] = useState<GroupForm[]>([emptyGroup()]);
  const [shared, setShared] = useState<SharedForm>(() => ({
    artisanName: previousInfo?.artisanName ?? "",
    contactPhone: previousInfo?.contactPhone ?? "",
    contactEmail: previousInfo?.contactEmail ?? "",
    instagramUrl: previousInfo?.instagramUrl ?? "",
    facebookUrl: previousInfo?.facebookUrl ?? "",
    tiktokUrl: previousInfo?.tiktokUrl ?? "",
    galleryPhotos: [],
    logo: null,
  }));
  const setG = (i: number, patch: Partial<GroupForm>) =>
    setGroups((gs) => gs.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  const setSh = (patch: Partial<SharedForm>) => setShared((f) => ({ ...f, ...patch }));

  const allocated = groups.reduce((s, g) => s + (parseInt(g.count, 10) || 0), 0);
  const overflow = allocated > packInfo.remaining;

  const isPartial = packInfo.activatedCount > 0;
  const targetCount = packInfo.remaining; // Mode 1 : tout le restant d'un coup

  // ── ONBOARDING (mode simple) : étape courante + validation par étape ──
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState("");

  const validateStep = (s: number): string => {
    switch (s) {
      case 0: // Marque
        if (simple.artisanName.trim().length < 2)
          return "Indiquez le nom de votre marque (2 caractères minimum).";
        if (simple.contactPhone.trim().length < 7)
          return "Indiquez un numéro WhatsApp / téléphone valide.";
        return "";
      case 1: // Produit
        if (simple.productName.trim().length < 2)
          return "Indiquez le nom de votre produit (2 caractères minimum).";
        if (!simple.contenance.trim())
          return "Indiquez la contenance (ex : 250g, 100ml).";
        return "";
      case 2: // Ingrédients
        if (simple.ingredients.trim().length < 2)
          return "Tapez vos ingrédients réels — c'est votre recette, elle n'est jamais inventée pour vous.";
        return "";
      case 3: // Fraîcheur
        if (!simple.manufacturingDate) return "Indiquez la date de fabrication.";
        if (!simple.expirationDate) return "Indiquez la date de péremption.";
        return "";
      default:
        return "";
    }
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError("");
    setStep((v) => Math.min(v + 1, SIMPLE_STEPS.length - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStepError("");
    setStep((v) => Math.max(v - 1, 0));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── ONBOARDING (mode flexible) : mêmes principes, étapes adaptées ──
  const [flexStep, setFlexStep] = useState(0);

  const validateFlexStep = (s: number): string => {
    switch (s) {
      case 0: // Marque (commun)
        if (shared.artisanName.trim().length < 2)
          return "Indiquez le nom de votre marque (2 caractères minimum).";
        if (shared.contactPhone.trim().length < 7)
          return "Indiquez un numéro WhatsApp / téléphone valide.";
        return "";
      case 1: // Produits (répartition)
        if (groups.some((g) => g.productName.trim().length < 2))
          return "Donnez un nom (2 caractères minimum) à chaque produit.";
        if (groups.some((g) => !Number.isInteger(parseInt(g.count, 10)) || parseInt(g.count, 10) < 1))
          return "Chaque produit doit avoir au moins 1 étiquette.";
        if (groups.length < 1)
          return "Ajoutez au moins un produit.";
        if (overflow)
          return `Vous avez réparti ${allocated} étiquettes mais il n'en reste que ${packInfo.remaining} — réduisez les quantités.`;
        return "";
      case 2: // Ingrédients par produit
        if (groups.some((g) => g.ingredients.trim().length < 2))
          return "Tapez les ingrédients réels de chaque produit — c'est votre recette.";
        return "";
      case 3: // Fraîcheur & détails par produit
        if (groups.some((g) => !g.contenance.trim()))
          return "Indiquez la contenance de chaque produit (ex : 250g, 100ml).";
        if (groups.some((g) => !g.manufacturingDate))
          return "Indiquez la date de fabrication de chaque produit.";
        if (groups.some((g) => !g.expirationDate))
          return "Indiquez la date de péremption de chaque produit.";
        return "";
      default:
        return "";
    }
  };

  const flexGoNext = () => {
    const err = validateFlexStep(flexStep);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError("");
    setFlexStep((v) => Math.min(v + 1, FLEX_STEPS.length - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const flexGoBack = () => {
    setStepError("");
    setFlexStep((v) => Math.max(v - 1, 0));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Ligne du récapitulatif — libellé, valeur, bouton Modifier → étape. */
  const recapRow = (label: string, value: string, onEdit: () => void) => (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
          {label}
        </p>
        <p className="break-words text-xs font-bold text-stone-700">{value || "—"}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex-shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-amber-600 transition-colors hover:bg-amber-50"
      >
        Modifier
      </button>
    </div>
  );

  // ── Soumission (les 2 modes passent par activate-groups) ────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let payloadGroups: ApiGroup[] = [];

      if (mode === "simple") {
        // Photo produit + logo + galerie atelier (logo non bloquant)
        const photoUrl = simple.photo ? await uploadPhoto(simple.photo, masterCode) : "";
        let logoUrl = "";
        if (simple.logo) {
          try {
            logoUrl = await uploadPhoto(simple.logo, masterCode);
          } catch {
            /* logo raté → non bloquant, la page produit reste valide */
          }
        }
        const galleryUrls: string[] = [];
        for (const gp of simple.galleryPhotos.slice(0, 3)) {
          try {
            galleryUrls.push(await uploadPhoto(gp, masterCode));
          } catch {
            /* photo d'atelier ratée → non bloquant */
          }
        }
        payloadGroups = [
          {
            count: targetCount,
            productData: {
              productName: simple.productName,
              productDesignation: simple.productDesignation,
              contenance: simple.contenance,
              ingredients: simple.ingredients,
              manufacturingDate: simple.manufacturingDate,
              expirationDate: simple.expirationDate,
              photoUrl,
              productPrice: simple.productPrice,
              artisanBio: simple.artisanBio,
              usageTips: simple.usageTips,
              // Auto-complétion intelligente
              templateId: simple.template?.id ?? "",
              precautions: simple.precautions,
              storageConditions: simple.storageConditions,
            },
          },
        ];
        // Identité + réseaux + galerie + logo communs (envoyés tels quels à l'API)
        const sharedPayload = {
          artisanName: simple.artisanName,
          contactPhone: simple.contactPhone,
          contactEmail: simple.contactEmail,
          instagramUrl: simple.instagramUrl,
          facebookUrl: simple.facebookUrl,
          tiktokUrl: simple.tiktokUrl,
          artisanPhotos: galleryUrls,
          logoUrl,
        };
        const res = await fetch("/api/artisan/activate-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ masterCode, groups: payloadGroups, shared: sharedPayload }),
        });
        await handleResponse(res);
        return;
      }

      // MODE 2 — flexible : uploads photos par groupe + galerie commune
      const apiGroups: ApiGroup[] = [];
      for (const g of groups) {
        const count = parseInt(g.count, 10);
        if (!Number.isInteger(count) || count < 1) {
          throw new Error("Chaque produit doit avoir un nombre de QR codes (au moins 1).");
        }
        const photoUrl = g.photo ? await uploadPhoto(g.photo, masterCode) : "";
        apiGroups.push({
          count,
          productData: {
            productName: g.productName,
            productDesignation: g.productDesignation,
            contenance: g.contenance,
            ingredients: g.ingredients,
            manufacturingDate: g.manufacturingDate,
            expirationDate: g.expirationDate,
            photoUrl,
            productPrice: g.productPrice,
            artisanBio: g.artisanBio,
            usageTips: g.usageTips,
            // Auto-complétion intelligente
            templateId: g.template?.id ?? "",
            precautions: g.precautions,
            storageConditions: g.storageConditions,
          },
        });
      }
      const galleryUrls: string[] = [];
      for (const gp of shared.galleryPhotos.slice(0, 3)) {
        try {
          galleryUrls.push(await uploadPhoto(gp, masterCode));
        } catch {
          /* non bloquant */
        }
      }
      let sharedLogoUrl = "";
      if (shared.logo) {
        try {
          sharedLogoUrl = await uploadPhoto(shared.logo, masterCode);
        } catch {
          /* logo raté → non bloquant */
        }
      }
      const res = await fetch("/api/artisan/activate-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterCode,
          groups: apiGroups,
          shared: {
            artisanName: shared.artisanName,
            contactPhone: shared.contactPhone,
            contactEmail: shared.contactEmail,
            instagramUrl: shared.instagramUrl,
            facebookUrl: shared.facebookUrl,
            tiktokUrl: shared.tiktokUrl,
            artisanPhotos: galleryUrls,
            logoUrl: sharedLogoUrl,
          },
        }),
      });
      await handleResponse(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (res: Response) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erreur pendant l'activation");
    const s: SuccessState = {
      activated: data.activated ?? 0,
      activatedTotal: data.activatedTotal ?? 0,
      quantity: data.quantity ?? packInfo.quantity,
      remaining: data.remaining ?? 0,
      fullyActivated: Boolean(data.fullyActivated),
      firstCode: typeof data.firstCode === "string" ? data.firstCode : "",
    };
    // Met à jour la progression locale (barre + groupes affichés)
    const applied: Array<{ productName: string; count: number }> = Array.isArray(data.groups)
      ? data.groups
      : [];
    const map = new Map(packInfo.groups.map((g) => [g.productName, g.count]));
    for (const g of applied) map.set(g.productName, (map.get(g.productName) ?? 0) + g.count);
    setPackInfo((p) => ({
      ...p,
      activatedCount: s.activatedTotal,
      remaining: s.remaining,
      groups: [...map.entries()].map(([productName, count]) => ({ productName, count })),
    }));
    setSuccess(s);
  };

  const progressPct =
    packInfo.quantity > 0
      ? Math.min(Math.round((packInfo.activatedCount / packInfo.quantity) * 100), 100)
      : 0;

  // ── Écran de SUCCÈS ─────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-green-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {success.activated} QR codes activés !
          </h1>
          <p className="mb-6 text-gray-600">
            <strong>
              {success.activatedTotal}/{success.quantity}
            </strong>{" "}
            QR codes de votre pack sont maintenant visibles par vos clients.
          </p>

          {/* Progression du pack */}
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-emerald-800">
              <span>
                {success.activatedTotal}/{success.quantity} activés
              </span>
              <span>
                {success.remaining} restant{success.remaining > 1 ? "s" : ""}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                style={{
                  width: `${
                    success.quantity > 0
                      ? Math.min(Math.round((success.activatedTotal / success.quantity) * 100), 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            {!success.fullyActivated && (
              <p className="mt-3 text-xs text-emerald-700">
                Il vous reste {success.remaining} QR codes : rescannez votre QR
                Maître quand vous serez prêt pour activer la suite.
              </p>
            )}
          </div>

          {success.fullyActivated ? (
            <button
              onClick={() => router.push(success.firstCode ? `/a/${success.firstCode}` : "/")}
              className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
            >
              Voir le produit activé
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => {
                  setSuccess(null);
                  setMode(null);
                }}
                data-testid="continue-activation"
                className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
              >
                Activer la suite maintenant
              </button>
              <button
                onClick={() => router.push(success.firstCode ? `/a/${success.firstCode}` : "/")}
                className="w-full rounded-xl border-2 border-gray-200 bg-white py-3 font-semibold text-gray-700 hover:border-gray-300"
              >
                Voir le produit activé
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Écran de CHOIX du mode (mode === null) ──────────────────────────────
  if (mode === null) {
    return (
      <div className="min-h-screen bg-amber-50 p-4">
        <div className="mx-auto max-w-md pt-8">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-block rounded-full bg-amber-200 px-4 py-1 text-xs font-bold text-amber-800">
              ACTIVEZ VOTRE PACK
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Activez votre pack</h1>
            <p className="mt-2 text-sm font-semibold text-gray-600">
              Choisissez la façon d&apos;activer vos étiquettes.
            </p>
            {masterCode && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-sm">
                <QrCode className="h-4 w-4 text-amber-600" />
                <span className="font-mono text-xs font-bold text-gray-700">
                  {masterCode}
                </span>
              </div>
            )}
          </div>

          {/* Progression si pack déjà partiellement activé */}
          {isPartial && (
            <div className="mb-5 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-800">
                  {packInfo.activatedCount}/{packInfo.quantity} QR codes activés
                </span>
                <span className="text-emerald-600">
                  {packInfo.remaining} restant{packInfo.remaining > 1 ? "s" : ""}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {packInfo.groups.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {packInfo.groups.map((g) => (
                    <span
                      key={g.productName}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-emerald-200"
                    >
                      <Package className="h-3 w-3 text-emerald-500" />
                      {g.productName} · {g.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OPTION 1 — tout d'un coup */}
          <button
            onClick={() => setMode("simple")}
            data-testid="choose-simple"
            className="mb-3 block w-full rounded-2xl border-2 border-emerald-200 bg-white p-5 text-left shadow-sm transition-all hover:border-emerald-400 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow">
                <Sparkles className="h-6 w-6 text-white" />
              </span>
              <div>
                <p className="text-base font-extrabold text-gray-900">
                  ✅ Tout le {isPartial ? "restant" : "pack"} d&apos;un coup
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Mêmes infos pour les {targetCount} produits — un seul
                  formulaire, ultra simple et rapide.
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-600">
                  Idéal si votre pack contient un seul produit
                </p>
              </div>
            </div>
          </button>

          {/* OPTION 2 — par produits différents */}
          <button
            onClick={() => setMode("flexible")}
            data-testid="choose-flexible"
            className="block w-full rounded-2xl border-2 border-amber-200 bg-white p-5 text-left shadow-sm transition-all hover:border-amber-400 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 shadow">
                <Layers className="h-6 w-6 text-white" />
              </span>
              <div>
                <p className="text-base font-extrabold text-gray-900">
                  ✏️ Activer par produits différents
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Répartissez vos {packInfo.remaining} QR codes : ex. 100
                  karité + 50 lavande + 50 miel — un formulaire par produit.
                </p>
                <p className="mt-1 text-xs font-semibold text-amber-600">
                  Idéal si votre pack contient plusieurs produits
                </p>
              </div>
            </div>
          </button>

          <p className="mt-4 text-center text-xs text-gray-500">
            ⏱ 2 minutes · guidé étape par étape · aucun compte nécessaire
          </p>
        </div>
      </div>
    );
  }

  // ── FORMULAIRES (mode simple / flexible) ────────────────────────────────
  return (
    <div className="min-h-screen bg-amber-50 p-4">
      <div className="mx-auto max-w-md pb-16 pt-4">
        <button
          onClick={() => setMode(null)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Changer de mode d&apos;activation
        </button>

        <div className="mb-6 pt-2 text-center">
          <div className="mb-3 inline-block rounded-full bg-amber-200 px-4 py-1 text-xs font-bold text-amber-800">
            {mode === "simple" ? "ACTIVATION EN MASSE" : "ACTIVATION PAR PRODUITS"}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === "simple"
              ? `Activez ${targetCount} produits d'un coup`
              : "Répartissez vos QR codes par produit"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {mode === "simple"
              ? "Remplissez ces infos une seule fois — elles s'appliquent à toutes les étiquettes restantes."
              : `Le parcours guidé, un sujet par écran. Total à répartir : ${packInfo.remaining} QR codes.`}
          </p>
          {masterCode && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-sm">
              <QrCode className="h-4 w-4 text-amber-600" />
              <span className="font-mono text-xs font-bold text-gray-700">
                {masterCode}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "simple" ? (
            /* ═══════════ MODE 1 — ONBOARDING GUIDÉ (7 étapes, 1 question par écran) ═══════════ */
            <>
              {/* ── Barre de progression de l'onboarding ── */}
              <div className="sticky top-2 z-10 rounded-2xl border border-amber-200 bg-white/95 p-4 shadow-md backdrop-blur">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                    {(() => {
                      const StepIcon = SIMPLE_STEPS[step].icon;
                      return <StepIcon className="h-4 w-4 text-amber-500" />;
                    })()}
                    {SIMPLE_STEPS[step].title}
                  </p>
                  <p className="flex-shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                    {step + 1}/{SIMPLE_STEPS.length}
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-amber-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
                    style={{ width: `${((step + 1) / SIMPLE_STEPS.length) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-snug text-gray-500">
                  {SIMPLE_STEPS[step].hint}
                </p>
                <div className="mt-3 flex items-stretch justify-between gap-1">
                  {SIMPLE_STEPS.map((s, i) => {
                    const StepPillIcon = s.icon;
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => {
                          if (i < step) {
                            setStep(i);
                            setStepError("");
                          }
                        }}
                        aria-label={`Étape ${i + 1} : ${s.label}`}
                        className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1 transition-colors ${
                          i === step
                            ? "text-amber-600"
                            : i < step
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-gray-300"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                            i === step
                              ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                              : i < step
                                ? "border-emerald-400 bg-emerald-50"
                                : "border-gray-200 bg-white"
                          }`}
                        >
                          {i < step ? <Check className="h-3.5 w-3.5" /> : <StepPillIcon className="h-3.5 w-3.5" />}
                        </span>
                        <span className="text-[9px] font-bold leading-none">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {stepError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  {stepError}
                </div>
              )}

              {/* ═══ ÉTAPE 1/7 — VOTRE MARQUE ═══ */}
              {step === 0 && (
                <>
              {previousInfo && (
                <div
                  data-testid="memory-banner"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"
                >
                  ↩ On a repris vos informations déjà saisies pour ce pack —
                  modifiez si besoin.
                </div>
              )}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                Ces informations s&apos;appliqueront aux{" "}
                <strong>{targetCount} QR codes</strong> encore inactifs de
                votre pack.
              </div>

              <div>
                <label className={labelCls} htmlFor="artisanName">
                  Nom de votre marque *
                </label>
                <input
                  id="artisanName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="Ex : Aïssata Cosmétiques"
                  value={simple.artisanName}
                  onChange={(e) => setS({ artisanName: e.target.value })}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-500">
                  C&apos;est le nom affiché à vos clients sur la page produit.
                </p>
              </div>

              <div>
                <label className={labelCls} htmlFor="contactPhone">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                    Numéro WhatsApp *
                  </span>
                </label>
                <input
                  id="contactPhone"
                  type="tel"
                  required
                  minLength={7}
                  maxLength={30}
                  inputMode="tel"
                  placeholder="Ex : 77 123 45 67"
                  value={simple.contactPhone}
                  onChange={(e) => setS({ contactPhone: e.target.value })}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Vos clients pourront vous contacter directement sur WhatsApp.
                </p>
              </div>

              <div>
                <label className={labelCls} htmlFor="contactEmail">
                  Email (optionnel)
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  maxLength={120}
                  placeholder="Ex : aissata@gmail.com"
                  value={simple.contactEmail}
                  onChange={(e) => setS({ contactEmail: e.target.value })}
                  className={inputCls}
                />
              </div>
                </>
              )}

              {/* ═══ ÉTAPE 2/7 — LE NOM DU PRODUIT ═══ */}
              {step === 1 && (
                <>
              {/* ── Assistant intelligent : remplit tout automatiquement ── */}
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800">
                  <Sparkles className="h-4 w-4" /> Assistant intelligent
                </p>
                <SmartProductSelector
                  onTemplateSelect={(template) => {
                    // Désignation : préremplie (modifiable) si le champ est vide.
                    // Ingrédients : préremplissage ÉDITABLE pour l'agroalimentaire
                    // uniquement (retour utilisateur — pour le cosmétique, la
                    // recette appartient à l'artisan qui la tape lui-même).
                    setS({
                      template,
                      productName: simple.productName || template.name,
                      productDesignation: simple.productDesignation || template.designation,
                      ...(template.category === "agroalimentaire" &&
                      !simple.ingredients.trim()
                        ? { ingredients: template.typicalIngredients.join("\n") }
                        : {}),
                      usageTips: template.usageTips.slice(0, 3).join("\n"),
                      precautions: template.precautions.join("\n"),
                      storageConditions: template.storageConditions,
                      expirationDate:
                        simple.manufacturingDate
                          ? calcExp(simple.manufacturingDate, template)
                          : simple.expirationDate,
                    });
                  }}
                  onClear={() => {
                    setS({ template: null, precautions: "", storageConditions: "" });
                  }}
                  selectedTemplate={simple.template}
                  compact
                />
              </div>

              <div>
                <label className={labelCls} htmlFor="productName">
                  Nom du produit *
                </label>
                <input
                  id="productName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="Ex : Savon au karité pur"
                  value={simple.productName}
                  onChange={(e) => setS({ productName: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls} htmlFor="productDesignation">
                  Désignation du produit (optionnel)
                </label>
                <textarea
                  id="productDesignation"
                  rows={2}
                  maxLength={300}
                  placeholder="Ex : Beurre de karité brut 100 % naturel, préparé à la main"
                  value={simple.productDesignation}
                  onChange={(e) => setS({ productDesignation: e.target.value })}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div>
                <label className={labelCls} htmlFor="contenance">
                  Contenance *
                </label>
                <input
                  id="contenance"
                  type="text"
                  required
                  maxLength={40}
                  placeholder="Ex : 250g, 100ml"
                  value={simple.contenance}
                  onChange={(e) => setS({ contenance: e.target.value })}
                  className={inputCls}
                />
              </div>
                </>
              )}

              {/* ═══ ÉTAPE 3/7 — VOS INGRÉDIENTS ═══ */}
              {step === 2 && (
                <>
              <div>
                <label className={labelCls} htmlFor="ingredients">
                  Ingrédients * <span className="font-normal text-gray-500">— votre recette réelle</span>
                </label>
                <textarea
                  id="ingredients"
                  required
                  rows={5}
                  maxLength={2000}
                  placeholder="Tapez vos ingrédients réels, ex : Beurre de karité 500g, huile de coco, soude…"
                  value={simple.ingredients}
                  onChange={(e) => setS({ ingredients: e.target.value })}
                  className={`${inputCls} resize-none`}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Un ingrédient par ligne si vous préférez — vos clients
                  verront exactement ce que vous tapez ici.
                </p>
                {simple.template?.category === "agroalimentaire" &&
                  simple.ingredients.trim() && (
                    <p
                      data-testid="ingredients-prefill-note"
                      className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-emerald-700"
                    >
                      <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0" />
                      Suggestion préremplie à partir du produit type — adaptez à
                      votre recette réelle.
                    </p>
                  )}
              </div>
                </>
              )}

              {/* ═══ ÉTAPE 4/7 — FRAÎCHEUR & DATES ═══ */}
              {step === 3 && (
                <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="manufacturingDate">
                    Fabrication *
                  </label>
                  <input
                    id="manufacturingDate"
                    type="date"
                    required
                    value={simple.manufacturingDate}
                    onChange={(e) => {
                      // Auto-calcul de la péremption si un produit type est
                      // sélectionné (durée de conservation connue).
                      setS({
                        manufacturingDate: e.target.value,
                        ...(simple.template
                          ? { expirationDate: calcExp(e.target.value, simple.template) }
                          : {}),
                      });
                    }}
                    className={`${inputCls} px-3`}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="expirationDate">
                    Péremption *
                  </label>
                  <input
                    id="expirationDate"
                    type="date"
                    required
                    value={simple.expirationDate}
                    onChange={(e) => setS({ expirationDate: e.target.value })}
                    className={`${inputCls} px-3 ${
                      simple.template && simple.expirationDate
                        ? "border-emerald-300 bg-emerald-50"
                        : ""
                    }`}
                  />
                  {simple.template && simple.expirationDate && (
                    <p className="mt-1 text-xs text-emerald-700">
                      Auto-calculée ({templateShelfLifeLabel(simple.template)})
                    </p>
                  )}
                </div>
              </div>

              {/* Aperçu de la fraîcheur (mise en valeur de la péremption) */}
              {simple.expirationDate && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                      Vos clients verront
                    </p>
                    <p className="text-sm font-bold text-emerald-800">
                      À utiliser avant le {formatFrDate(simple.expirationDate)}
                    </p>
                  </div>
                </div>
              )}
                </>
              )}

              {/* ═══ ÉTAPE 5/7 — PHOTOS & LOGO ═══ */}
              {step === 4 && (
                <>
              <div>
                <PhotoPicker
                  label="Photo du produit"
                  helpText="Prenez-la sur fond clair et bien nette, ou choisissez-la dans votre galerie."
                  maxCount={1}
                  files={simple.photo ? [simple.photo] : []}
                  onChange={(files) => setS({ photo: files[0] ?? null })}
                />
              </div>

              {/* ── Logo de la marque (demande utilisateur) ── */}
              <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                <p className="mb-1 flex items-center gap-2 text-sm font-bold text-violet-800">
                  🏷️ Votre logo (optionnel)
                </p>
                <p className="mb-3 text-xs text-violet-600/80">
                  Il s&apos;affichera sur la page produit, à côté de votre nom d&apos;artisan — vos clients reconnaîtront votre marque instantanément.
                </p>
                <PhotoPicker
                  label="Logo de votre marque"
                  helpText="De préférence carré, sur fond uni."
                  maxCount={1}
                  files={simple.logo ? [simple.logo] : []}
                  onChange={(files) => setS({ logo: files[0] ?? null })}
                />
              </div>

              <PhotoPicker
                label="Photos de votre atelier (jusqu'à 3, optionnel)"
                helpText="Montrez votre savoir-faire : fabrication, matière première, finition."
                maxCount={3}
                multiple
                files={simple.galleryPhotos}
                onChange={(files) => setS({ galleryPhotos: files })}
              />
                </>
              )}

              {/* ═══ ÉTAPE 6/7 — POUR MIEUX VENDRE ═══ */}
              {step === 5 && (
                <>
              <div className="rounded-xl border border-pink-200 bg-pink-50 p-4">
                <p className="mb-3 text-sm font-bold text-pink-800">
                  📱 Vos réseaux sociaux (optionnel)
                </p>
                <div className="space-y-3">
                  <input
                    id="instagramUrl"
                    type="url"
                    maxLength={200}
                    placeholder="Instagram : https://instagram.com/…"
                    value={simple.instagramUrl}
                    onChange={(e) => setS({ instagramUrl: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    id="facebookUrl"
                    type="url"
                    maxLength={200}
                    placeholder="Facebook : https://facebook.com/…"
                    value={simple.facebookUrl}
                    onChange={(e) => setS({ facebookUrl: e.target.value })}
                    className={inputCls}
                  />
                  <input
                    id="tiktokUrl"
                    type="url"
                    maxLength={200}
                    placeholder="TikTok : https://tiktok.com/@…"
                    value={simple.tiktokUrl}
                    onChange={(e) => setS({ tiktokUrl: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="mb-3 text-sm font-bold text-amber-800">
                  ✨ Pour mieux vendre (optionnel)
                </p>
                <div className="space-y-3">
                  <textarea
                    id="artisanBio"
                    rows={3}
                    maxLength={1200}
                    placeholder="Votre histoire…"
                    value={simple.artisanBio}
                    onChange={(e) => setS({ artisanBio: e.target.value })}
                    className={`${inputCls} resize-none`}
                  />
                  <textarea
                    id="usageTips"
                    rows={3}
                    maxLength={800}
                    placeholder={"Conseils d'utilisation (un par ligne)"}
                    value={simple.usageTips}
                    onChange={(e) => setS({ usageTips: e.target.value })}
                    className={`${inputCls} resize-none`}
                  />
                  <textarea
                    id="simplePrecautions"
                    rows={3}
                    maxLength={800}
                    placeholder={"Précautions d'emploi (une par ligne)"}
                    value={simple.precautions}
                    onChange={(e) => setS({ precautions: e.target.value })}
                    className={`${inputCls} resize-none`}
                  />
                  <textarea
                    id="simpleStorage"
                    rows={2}
                    maxLength={500}
                    placeholder={"Conditions de conservation (ex : à l'abri de la chaleur)"}
                    value={simple.storageConditions}
                    onChange={(e) => setS({ storageConditions: e.target.value })}
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls} htmlFor="productPrice">
                  💰 Prix affiché aux clients (optionnel)
                </label>
                <input
                  id="productPrice"
                  type="text"
                  maxLength={40}
                  placeholder="Ex : 5 000 FCFA le pot"
                  value={simple.productPrice}
                  onChange={(e) => setS({ productPrice: e.target.value })}
                  className={inputCls}
                />
              </div>
                </>
              )}

              {/* ═══ ÉTAPE 7/7 — RÉCAPITULATIF & ACTIVATION ═══ */}
              {step === 6 && (
                <>
                  <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                    <p className="mb-1 flex items-center gap-2 text-sm font-extrabold text-gray-900">
                      <ClipboardCheck className="h-4 w-4 text-emerald-600" /> Récapitulatif
                    </p>
                    <p className="mb-4 text-xs text-gray-500">
                      Une erreur ? Touchez « Modifier » sur la ligne concernée.
                    </p>
                    <div className="space-y-2">
                      {recapRow(
                        "Marque & WhatsApp",
                        `${simple.artisanName} · ${simple.contactPhone}`,
                        () => setStep(0),
                      )}
                      {recapRow(
                        "Produit",
                        `${simple.productName}${simple.contenance ? ` · ${simple.contenance}` : ""}`,
                        () => setStep(1),
                      )}
                      {recapRow(
                        "Ingrédients",
                        simple.ingredients.length > 70
                          ? `${simple.ingredients.slice(0, 70)}…`
                          : simple.ingredients,
                        () => setStep(2),
                      )}
                      {recapRow("Fabrication", formatFrDate(simple.manufacturingDate), () => setStep(3))}
                      {recapRow("À utiliser avant", formatFrDate(simple.expirationDate), () => setStep(3))}
                      {recapRow(
                        "Photo du produit",
                        simple.photo ? simple.photo.name : "Non fournie",
                        () => setStep(4),
                      )}
                      {recapRow("Logo", simple.logo ? simple.logo.name : "Aucun", () => setStep(4))}
                      {simple.productPrice &&
                        recapRow("Prix", simple.productPrice, () => setStep(5))}
                      {recapRow(
                        "Conseils",
                        `${simple.usageTips.split("\n").filter((t) => t.trim()).length} conseil(s)`,
                        () => setStep(5),
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    data-testid="activation-submit"
                    className="mt-2 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-4 text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
                  >
                    {loading
                      ? "Activation en cours…"
                      : `✨ Activer mes ${targetCount} produits`}
                  </button>
                </>
              )}

              {/* ── Navigation de l'onboarding ── */}
              <div className="flex gap-2">
                {step === 0 ? (
                  <button
                    type="button"
                    onClick={() => setMode(null)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-sm font-bold text-gray-600 hover:border-gray-300"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Modes
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-gray-700 hover:border-gray-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour
                  </button>
                )}
                {step < SIMPLE_STEPS.length - 1 && (
                  <button
                    type="button"
                    onClick={goNext}
                    data-testid="wizard-next"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3.5 text-base font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.99]"
                  >
                    Continuer
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>
            </>
          ) : (
            /* ═══════════ MODE 2 — groupes produits ═══════════ */
            <>
              {/* ── Barre de progression de l'onboarding flexible ── */}
              <div className="sticky top-2 z-10 rounded-2xl border border-amber-200 bg-white/95 p-4 shadow-md backdrop-blur">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                    {(() => {
                      const StepIcon = FLEX_STEPS[flexStep].icon;
                      return <StepIcon className="h-4 w-4 text-amber-500" />;
                    })()}
                    {FLEX_STEPS[flexStep].title}
                  </p>
                  <p className="flex-shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                    {flexStep + 1}/{FLEX_STEPS.length}
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-amber-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
                    style={{ width: `${((flexStep + 1) / FLEX_STEPS.length) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs leading-snug text-gray-500">
                  {FLEX_STEPS[flexStep].hint}
                </p>
                <div className="mt-3 flex items-stretch justify-between gap-1">
                  {FLEX_STEPS.map((s, i) => {
                    const StepPillIcon = s.icon;
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => {
                          if (i < flexStep) {
                            setFlexStep(i);
                            setStepError("");
                          }
                        }}
                        aria-label={`Étape ${i + 1} : ${s.label}`}
                        className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1 transition-colors ${
                          i === flexStep
                            ? "text-amber-600"
                            : i < flexStep
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-gray-300"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                            i === flexStep
                              ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                              : i < flexStep
                                ? "border-emerald-400 bg-emerald-50"
                                : "border-gray-200 bg-white"
                          }`}
                        >
                          {i < flexStep ? <Check className="h-3.5 w-3.5" /> : <StepPillIcon className="h-3.5 w-3.5" />}
                        </span>
                        <span className="text-[9px] font-bold leading-none">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Répartition toujours visible (le cœur du mode flexible) */}
                <div
                  className={`mt-3 flex items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                    overflow ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"
                  }`}
                >
                  <span>
                    Réparti : {allocated}/{packInfo.remaining} étiquettes
                  </span>
                  <span className={overflow ? "text-red-600" : "text-emerald-600"}>
                    {overflow
                      ? `${allocated - packInfo.remaining} de trop !`
                      : `${packInfo.remaining - allocated} restante${packInfo.remaining - allocated > 1 ? "s" : ""}`}
                  </span>
                </div>
              </div>

              {stepError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  {stepError}
                </div>
              )}

              {/* ═══ ÉTAPE 1/6 — VOTRE MARQUE (commun à tous les produits) ═══ */}
              {flexStep === 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  {previousInfo && (
                    <div
                      data-testid="memory-banner"
                      className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"
                    >
                      ↩ On a repris vos informations déjà saisies pour ce pack —
                      modifiez si besoin.
                    </div>
                  )}
                  <p className="mb-1 text-sm font-extrabold text-gray-900">
                    🧑‍🌾 Vos infos d&apos;artisan
                  </p>
                  <p className="mb-3 text-xs text-gray-500">
                    Communes à tous vos produits — affichées sur chaque page.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls} htmlFor="sharedName">
                        Votre nom / Marque *
                      </label>
                      <input
                        id="sharedName"
                        type="text"
                        required
                        minLength={2}
                        maxLength={120}
                        placeholder="Ex : Aïssata Cosmétiques"
                        value={shared.artisanName}
                        onChange={(e) => setSh({ artisanName: e.target.value })}
                        className={inputCls}
                      />
                      <p className="mt-1 text-[11px] text-gray-400">
                        C&apos;est le nom affiché à vos clients sur la page produit.
                      </p>
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="sharedPhone">
                        WhatsApp / Téléphone *
                      </label>
                      <input
                        id="sharedPhone"
                        type="tel"
                        required
                        minLength={7}
                        maxLength={30}
                        placeholder="Ex : 77 123 45 67"
                        value={shared.contactPhone}
                        onChange={(e) => setSh({ contactPhone: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="sharedEmail">
                        Email (optionnel)
                      </label>
                      <input
                        id="sharedEmail"
                        type="email"
                        maxLength={120}
                        value={shared.contactEmail}
                        onChange={(e) => setSh({ contactEmail: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ ÉTAPE 2/6 — VOS PRODUITS (répartition des étiquettes) ═══ */}
              {flexStep === 1 && (
                <>
                  <div
                    className={`rounded-xl border p-3 text-sm shadow-sm ${
                      overflow
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800"
                    }`}
                    data-testid="flex-summary"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>
                        Réparti : {allocated}/{packInfo.remaining} QR codes
                      </span>
                      <span>
                        {overflow
                          ? `${allocated - packInfo.remaining} de trop !`
                          : `Restant après activation : ${packInfo.remaining - allocated}`}
                      </span>
                    </div>
                    {overflow && (
                      <p className="mt-1 text-xs">
                        La somme dépasse les QR codes restants — réduisez les
                        quantités.
                      </p>
                    )}
                  </div>

                  {groups.map((g, i) => (
                    <div
                      key={i}
                      data-testid={`flexible-group-${i}`}
                      className="rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-white">
                            {i + 1}
                          </span>
                          Produit {i + 1}
                        </p>
                        {groups.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setGroups((gs) => gs.filter((_, idx) => idx !== i))
                            }
                            aria-label={`Retirer le produit ${i + 1}`}
                            className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {previousInfo && previousInfo.products.length > 0 && (
                        <div
                          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3"
                          data-testid={`memory-chips-${i}`}
                        >
                          <p className="mb-2 text-[11px] font-bold text-emerald-800">
                            ↩ Reprendre un produit déjà activé sur ce pack :
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {previousInfo.products.map((p, pi) => (
                              <button
                                key={pi}
                                type="button"
                                data-testid={`reprendre-${i}-${pi}`}
                                onClick={() =>
                                  setG(i, {
                                    productName: p.productName,
                                    productDesignation: p.productDesignation,
                                    contenance: p.contenance,
                                    ingredients: p.ingredients,
                                    manufacturingDate: p.manufacturingDate,
                                    expirationDate: p.expirationDate,
                                    productPrice: p.productPrice,
                                    artisanBio: p.artisanBio,
                                    usageTips: p.usageTips,
                                    precautions: p.precautions,
                                    storageConditions: p.storageConditions,
                                    template: getProductTemplateById(
                                      p.templateId || null,
                                    ),
                                  })
                                }
                                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-300 transition-colors hover:bg-emerald-100"
                              >
                                {p.productName} · déjà activé ×{p.count}
                              </button>
                            ))}
                          </div>
                          <p className="mt-2 text-[10px] text-emerald-700/80">
                            Nom, ingrédients, dates et détails repris — vous
                            choisissez juste le nombre d&apos;étiquettes.
                          </p>
                        </div>
                      )}
                      <div className="space-y-3">
                        <div className="rounded-xl bg-amber-50 p-3">
                          <label className={labelCls} htmlFor={`g${i}-count`}>
                            Nombre de QR codes pour ce produit *
                          </label>
                          <input
                            id={`g${i}-count`}
                            data-testid={`group-count-${i}`}
                            type="number"
                            required
                            min={1}
                            max={packInfo.remaining}
                            placeholder={`Ex : ${Math.max(packInfo.remaining - (allocated - (parseInt(g.count, 10) || 0)), 1)}`}
                            value={g.count}
                            onChange={(e) => setG(i, { count: e.target.value })}
                            className={`${inputCls} font-bold`}
                          />
                        </div>
                        <div>
                          <label className={labelCls} htmlFor={`g${i}-name`}>
                            Nom du produit *
                          </label>
                          <input
                            id={`g${i}-name`}
                            data-testid={`group-name-${i}`}
                            type="text"
                            required
                            minLength={2}
                            maxLength={120}
                            placeholder={i === 0 ? "Ex : Savon au karité pur" : "Ex : Savon à la lavande"}
                            value={g.productName}
                            onChange={(e) => setG(i, { productName: e.target.value })}
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {groups.length < 10 && (
                    <button
                      type="button"
                      onClick={() => {
                        const left = packInfo.remaining - allocated;
                        setGroups((gs) => [...gs, { ...emptyGroup(), count: left > 0 ? String(left) : "" }]);
                      }}
                      data-testid="add-group"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 py-3.5 text-sm font-bold text-amber-700 transition-colors hover:border-amber-400 hover:bg-amber-50"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter un autre produit
                    </button>
                  )}
                </>
              )}

              {/* ═══ ÉTAPE 3/6 — INGRÉDIENTS (la recette réelle de chaque produit) ═══ */}
              {flexStep === 2 && (
                <>
                  {groups.map((g, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-sm"
                    >
                      <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-900">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        {g.productName || `Produit ${i + 1}`}
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {g.count} étiquette{parseInt(g.count, 10) > 1 ? "s" : ""}
                        </span>
                      </p>
                      <label className={labelCls} htmlFor={`g${i}-ingredients`}>
                        Ingrédients *
                      </label>
                      <textarea
                        id={`g${i}-ingredients`}
                        data-testid={`group-ingredients-${i}`}
                        required
                        rows={3}
                        maxLength={2000}
                        placeholder="Ex : Beurre de karité, huile de coco…"
                        value={g.ingredients}
                        onChange={(e) => setG(i, { ingredients: e.target.value })}
                        className={`${inputCls} resize-none`}
                      />
                      <p className="mt-1 text-[11px] text-gray-400">
                        Un ingrédient par ligne si vous préférez — vos clients
                        verront exactement ce que vous tapez ici.
                      </p>
                      {g.template?.category === "agroalimentaire" &&
                        g.ingredients.trim() && (
                          <p
                            data-testid={`ingredients-prefill-note-${i}`}
                            className="mt-1.5 flex items-start gap-1.5 text-[11px] font-medium text-emerald-700"
                          >
                            <Sparkles className="mt-0.5 h-3 w-3 flex-shrink-0" />
                            Suggestion préremplie à partir du produit type —
                            adaptez à votre recette réelle.
                          </p>
                        )}
                    </div>
                  ))}
                </>
              )}

              {/* ═══ ÉTAPE 4/6 — FRAÎCHEUR & DÉTAILS (par produit) ═══ */}
              {flexStep === 3 && (
                <>
                  {groups.map((g, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-sm"
                    >
                      <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-900">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        {g.productName || `Produit ${i + 1}`}
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {g.count} étiquette{parseInt(g.count, 10) > 1 ? "s" : ""}
                        </span>
                      </p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls} htmlFor={`g${i}-contenance`}>
                              Contenance *
                            </label>
                            <input
                              id={`g${i}-contenance`}
                              data-testid={`group-contenance-${i}`}
                              type="text"
                              required
                              maxLength={40}
                              placeholder="Ex : 250g"
                              value={g.contenance}
                              onChange={(e) => setG(i, { contenance: e.target.value })}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls} htmlFor={`g${i}-price`}>
                              Prix (optionnel)
                            </label>
                            <input
                              id={`g${i}-price`}
                              data-testid={`group-price-${i}`}
                              type="text"
                              maxLength={40}
                              placeholder="Ex : 5 000 FCFA"
                              value={g.productPrice}
                              onChange={(e) => setG(i, { productPrice: e.target.value })}
                              className={inputCls}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls} htmlFor={`g${i}-mfg`}>
                              Fabrication *
                            </label>
                            <input
                              id={`g${i}-mfg`}
                              data-testid={`group-mfg-${i}`}
                              type="date"
                              required
                              value={g.manufacturingDate}
                              onChange={(e) =>
                                setG(i, {
                                  manufacturingDate: e.target.value,
                                  // Auto-calcul si produit type sélectionné
                                  ...(g.template
                                    ? { expirationDate: calcExp(e.target.value, g.template) }
                                    : {}),
                                })
                              }
                              className={`${inputCls} px-3`}
                            />
                          </div>
                          <div>
                            <label className={labelCls} htmlFor={`g${i}-exp`}>
                              Péremption *
                            </label>
                            <input
                              id={`g${i}-exp`}
                              data-testid={`group-exp-${i}`}
                              type="date"
                              required
                              value={g.expirationDate}
                              onChange={(e) => setG(i, { expirationDate: e.target.value })}
                              className={`${inputCls} px-3 ${
                                g.template && g.expirationDate
                                  ? "border-emerald-300 bg-emerald-50"
                                  : ""
                              }`}
                            />
                            {g.template && g.expirationDate && (
                              <p className="mt-1 text-xs text-emerald-700">
                                Auto-calculée ({templateShelfLifeLabel(g.template)})
                              </p>
                            )}
                          </div>
                        </div>
                        {/* ── Assistant intelligent par produit ── */}
                        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3">
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-amber-800">
                            <Sparkles className="h-3.5 w-3.5" /> Assistant intelligent
                          </p>
                          <SmartProductSelector
                            onTemplateSelect={(template) =>
                              setG(i, {
                                template,
                                productName: g.productName || template.name,
                                productDesignation:
                                  g.productDesignation || template.designation,
                                // Ingrédients : préremplissage ÉDITABLE pour
                                // l'agroalimentaire uniquement — pour le
                                // cosmétique, la recette appartient à
                                // l'artisan (retour utilisateur).
                                ...(template.category === "agroalimentaire" &&
                                !g.ingredients.trim()
                                  ? {
                                      ingredients:
                                        template.typicalIngredients.join(
                                          "\n",
                                        ),
                                    }
                                  : {}),
                                usageTips: template.usageTips.slice(0, 3).join("\n"),
                                precautions: template.precautions.join("\n"),
                                storageConditions: template.storageConditions,
                                expirationDate: g.manufacturingDate
                                  ? calcExp(g.manufacturingDate, template)
                                  : g.expirationDate,
                              })
                            }
                            onClear={() =>
                              setG(i, { template: null, precautions: "", storageConditions: "" })
                            }
                            selectedTemplate={g.template}
                            compact
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* ═══ ÉTAPE 5/6 — PHOTOS & LOGO (tout est optionnel) ═══ */}
              {flexStep === 4 && (
                <>
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="mb-1 text-sm font-extrabold text-gray-900">
                      🧑‍🌾 Identité de votre marque
                    </p>
                    <p className="mb-3 text-xs text-gray-500">
                      Communes à tous vos produits. Tout est optionnel ici.
                    </p>
                    <div className="space-y-3">
                      <PhotoPicker
                        label="Logo de votre marque (optionnel)"
                        helpText="Affiché à côté de votre nom sur toutes les pages produits du pack."
                        maxCount={1}
                        files={shared.logo ? [shared.logo] : []}
                        onChange={(files) => setSh({ logo: files[0] ?? null })}
                      />
                      <PhotoPicker
                        label="Photos de votre atelier (jusqu'à 3)"
                        helpText="Communes à toutes vos pages produits."
                        maxCount={3}
                        multiple
                        files={shared.galleryPhotos}
                        onChange={(files) => setSh({ galleryPhotos: files })}
                      />
                      <input
                        type="url"
                        maxLength={200}
                        placeholder="Instagram (optionnel) : https://instagram.com/…"
                        value={shared.instagramUrl}
                        onChange={(e) => setSh({ instagramUrl: e.target.value })}
                        className={inputCls}
                      />
                      <input
                        type="url"
                        maxLength={200}
                        placeholder="Facebook (optionnel) : https://facebook.com/…"
                        value={shared.facebookUrl}
                        onChange={(e) => setSh({ facebookUrl: e.target.value })}
                        className={inputCls}
                      />
                      <input
                        type="url"
                        maxLength={200}
                        placeholder="TikTok (optionnel) : https://tiktok.com/@…"
                        value={shared.tiktokUrl}
                        onChange={(e) => setSh({ tiktokUrl: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  {groups.map((g, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border-2 border-amber-200 bg-white p-5 shadow-sm"
                    >
                      <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-gray-900">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        {g.productName || `Produit ${i + 1}`}
                      </p>
                      <div className="space-y-3">
                        <PhotoPicker
                          label="Photo du produit"
                          helpText="Caméra ou galerie — propre à ce produit."
                          maxCount={1}
                          files={g.photo ? [g.photo] : []}
                          onChange={(files) => setG(i, { photo: files[0] ?? null })}
                        />
                        <div>
                          <label className={labelCls} htmlFor={`g${i}-designation`}>
                            Désignation (optionnel)
                          </label>
                          <input
                            id={`g${i}-designation`}
                            type="text"
                            maxLength={300}
                            placeholder="Description courte affichée sous le nom"
                            value={g.productDesignation}
                            onChange={(e) => setG(i, { productDesignation: e.target.value })}
                            className={inputCls}
                          />
                        </div>
                        <div>
                          <label className={labelCls} htmlFor={`g${i}-bio`}>
                            Histoire de ce produit (optionnel)
                          </label>
                          <textarea
                            id={`g${i}-bio`}
                            rows={2}
                            maxLength={1200}
                            value={g.artisanBio}
                            onChange={(e) => setG(i, { artisanBio: e.target.value })}
                            className={`${inputCls} resize-none`}
                          />
                        </div>
                        <div>
                          <label className={labelCls} htmlFor={`g${i}-tips`}>
                            Conseils d&apos;utilisation (optionnel, un par ligne)
                          </label>
                          <textarea
                            id={`g${i}-tips`}
                            rows={2}
                            maxLength={800}
                            value={g.usageTips}
                            onChange={(e) => setG(i, { usageTips: e.target.value })}
                            className={`${inputCls} resize-none`}
                          />
                        </div>
                        <div>
                          <label className={labelCls} htmlFor={`g${i}-precautions`}>
                            Précautions d&apos;emploi (optionnel, une par ligne)
                          </label>
                          <textarea
                            id={`g${i}-precautions`}
                            rows={2}
                            maxLength={800}
                            value={g.precautions}
                            onChange={(e) => setG(i, { precautions: e.target.value })}
                            className={`${inputCls} resize-none`}
                          />
                        </div>
                        <div>
                          <label className={labelCls} htmlFor={`g${i}-storage`}>
                            Conservation (optionnel)
                          </label>
                          <textarea
                            id={`g${i}-storage`}
                            rows={2}
                            maxLength={500}
                            placeholder="Ex : à l'abri de la chaleur et de l'humidité"
                            value={g.storageConditions}
                            onChange={(e) => setG(i, { storageConditions: e.target.value })}
                            className={`${inputCls} resize-none`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* ═══ ÉTAPE 6/6 — RÉCAPITULATIF & ACTIVATION ═══ */}
              {flexStep === 5 && (
                <>
                  <div
                    className={`rounded-xl border p-3 text-sm shadow-sm ${
                      overflow
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800"
                    }`}
                    data-testid="flex-summary"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>
                        Réparti : {allocated}/{packInfo.remaining} QR codes
                      </span>
                      <span>
                        {overflow
                          ? `${allocated - packInfo.remaining} de trop !`
                          : `Restant après activation : ${packInfo.remaining - allocated}`}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                    <p className="mb-1 flex items-center gap-2 text-sm font-extrabold text-gray-900">
                      <ClipboardCheck className="h-4 w-4 text-emerald-600" /> Récapitulatif
                    </p>
                    <p className="mb-4 text-xs text-gray-500">
                      Une erreur ? Touchez « Modifier » sur la ligne concernée.
                    </p>
                    <div className="space-y-2">
                      {recapRow("Marque & WhatsApp", `${shared.artisanName} · ${shared.contactPhone}`, () => setFlexStep(0))}
                      {recapRow(
                        "Produits",
                        groups.map((g) => `${g.productName || "?"} × ${g.count || "?"}`).join(" · "),
                        () => setFlexStep(1),
                      )}
                      {recapRow(
                        "Ingrédients",
                        groups.every((g) => g.ingredients)
                          ? groups.length === 1
                            ? groups[0].ingredients.length > 70
                              ? `${groups[0].ingredients.slice(0, 70)}…`
                              : groups[0].ingredients
                            : `${groups.length} recettes saisies`
                          : "—",
                        () => setFlexStep(2),
                      )}
                      {recapRow(
                        "Fabrication",
                        groups.map((g) => formatFrDate(g.manufacturingDate)).join(" · "),
                        () => setFlexStep(3),
                      )}
                      {recapRow(
                        "À utiliser avant",
                        groups.map((g) => formatFrDate(g.expirationDate)).join(" · "),
                        () => setFlexStep(3),
                      )}
                      {recapRow("Logo", shared.logo ? shared.logo.name : "Aucun", () => setFlexStep(4))}
                      {recapRow(
                        "Photos produit",
                        groups.some((g) => g.photo) ? `${groups.filter((g) => g.photo).length}/${groups.length} fournie(s)` : "Aucune",
                        () => setFlexStep(4),
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || allocated < 1 || overflow}
                    data-testid="flexible-submit"
                    className="mt-2 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-4 text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
                  >
                    {loading
                      ? "Activation en cours…"
                      : `✨ Activer mes ${allocated} QR codes`}
                  </button>
                  <p className="text-center text-xs text-gray-500">
                    Les {packInfo.remaining - allocated} QR codes non répartis
                    resteront activables plus tard (re-scannez le QR Maître).
                  </p>
                </>
              )}

              {/* ── Navigation de l'onboarding ── */}
              <div className="flex gap-2">
                {flexStep === 0 ? (
                  <button
                    type="button"
                    onClick={() => setMode(null)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-sm font-bold text-gray-600 hover:border-gray-300"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Modes
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={flexGoBack}
                    className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 bg-white px-5 py-3.5 text-sm font-bold text-gray-700 hover:border-gray-300"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Retour
                  </button>
                )}
                {flexStep < FLEX_STEPS.length - 1 && (
                  <button
                    type="button"
                    onClick={flexGoNext}
                    data-testid="wizard-next"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3.5 text-base font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.99]"
                  >
                    Continuer
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>

            </>
          )}
        </form>
      </div>
    </div>
  );
}
