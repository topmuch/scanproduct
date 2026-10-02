"use client";

import { useState, useEffect, useRef } from "react";
import {
  Settings,
  Mail,
  CreditCard,
  Shield,
  Webhook,
  Palette,
  Wrench,
  Upload,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Copy,
  Check,
  Save,
  Download,
  Trash2,
  RefreshCw,
  Database,
  FileDown,
  Pencil,
  ExternalLink,
  Loader2,
  Globe,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageContainer,
  Card,
  CardHeader,
  Badge,
  SectionTitle,
  Button,
} from "@/components/admin/ui";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Logo } from "@/components/landing/Logo";
import { useAdminNav } from "@/lib/admin-store";
import { cn } from "@/lib/utils";

/* ============================================================
 * Types & constants
 * ========================================================== */

type SectionKey =
  | "general"
  | "seo"
  | "email"
  | "payment"
  | "security"
  | "api"
  | "appearance"
  | "maintenance";

const SECTIONS: {
  key: SectionKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "general", label: "Général", icon: Settings },
  { key: "seo", label: "SEO & Référencement", icon: Globe },
  { key: "email", label: "Email & Notifications", icon: Mail },
  { key: "payment", label: "Paiement", icon: CreditCard },
  { key: "security", label: "Sécurité", icon: Shield },
  { key: "api", label: "API & Intégrations", icon: Webhook },
  { key: "appearance", label: "Apparence", icon: Palette },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
];

const SECTION_TITLES: Record<SectionKey, string> = {
  general: "Paramètres généraux",
  seo: "SEO & Référencement",
  email: "Email & Notifications",
  payment: "Configuration des paiements",
  security: "Paramètres de sécurité",
  api: "API & Intégrations",
  appearance: "Apparence",
  maintenance: "Maintenance & Sauvegardes",
};

/* ============================================================
 * Shared field primitives
 * ========================================================== */

const inputClass =
  "h-10 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] transition-colors focus:border-[#022150] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#022150]/10";

const textareaClass =
  "min-h-[88px] w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] transition-colors focus:border-[#022150] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#022150]/10";

const selectTriggerClass =
  "h-10 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[14px] font-normal text-[#111827] shadow-none transition-colors focus:border-[#022150] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#022150]/10 data-[size=default]:h-10";

function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-[14px] font-medium text-[#374151]">{label}</label>
      {children}
      {hint && <p className="text-[12px] text-[#6B7280]">{hint}</p>}
    </div>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>
  );
}

function PasswordInput({
  defaultValue,
  value,
  onChange,
  placeholder,
  className,
  testId,
}: {
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
}) {
  const [show, setShow] = useState(false);
  const controlled = typeof value === "string" && typeof onChange === "function";
  return (
    <div className={cn("relative", className)}>
      <input
        type={show ? "text" : "password"}
        value={controlled ? value : undefined}
        defaultValue={controlled ? undefined : defaultValue}
        placeholder={placeholder}
        data-testid={testId}
        onChange={
          controlled
            ? (e) => (onChange as (v: string) => void)(e.target.value)
            : undefined
        }
        className={cn(inputClass, "pr-10")}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition-colors hover:text-[#374151]"
        aria-label={show ? "Masquer" : "Afficher"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function CopyButton({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard
            .writeText(value)
            .then(() => {
              setCopied(true);
              toast.success("Copié dans le presse-papier");
              setTimeout(() => setCopied(false), 1500);
            })
            .catch(() => toast.error("Impossible de copier"));
        }
      }}
    >
      {copied ? (
        <Check className="h-4 w-4 text-[#10B981]" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {label ?? "Copier"}
    </Button>
  );
}

function ReadOnlyField({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-10 w-full items-center rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] px-3 text-[14px] font-medium text-[#374151]",
        className
      )}
    >
      <span className="truncate font-mono text-[13px]">{value}</span>
    </div>
  );
}

function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-3 border-t border-[#F3F4F6] px-5 py-4",
        className
      )}
    >
      {children}
    </div>
  );
}

const switchClass = "data-[state=checked]:bg-[#022150]";

/* ============================================================
 * Settings sub-menu
 * ========================================================== */

function SettingsNav({
  active,
  onSelect,
}: {
  active: SectionKey;
  onSelect: (k: SectionKey) => void;
}) {
  return (
    <nav
      aria-label="Sections des paramètres"
      className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0"
    >
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const isActive = active === s.key;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelect(s.key)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2.5 rounded-lg border-l-[3px] px-4 text-[14px] font-medium transition-colors lg:w-full",
              isActive
                ? "border-[#022150] bg-[#F0F4F9] text-[#022150]"
                : "border-transparent text-[#374151] hover:bg-[#F9FAFB]"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ============================================================
 * Section: General
 * ========================================================== */

function GeneralSection() {
  // ── Favicon upload state ──────────────────────────────────────────
  // The favicon is a dynamic site-wide asset: the superadmin uploads a new
  // image, it gets saved to UPLOAD_DIR/site/favicon.<ext>, and the URL is
  // stored in the Setting table. layout.tsx's generateMetadata() reads
  // this URL and emits the correct <link rel="icon"> tags.
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [favError, setFavError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Design QR officiel (badge plateforme) ──────────────────────
  // Image importée par le superadmin : devient le fond des badges QR de
  // tous les fabricants SANS design personnel (voir /api/admin/settings/
  // qr-badge-template). null → badge jaune « LABEL VERIFSCAN » par défaut.
  const [qrBadgeUrl, setQrBadgeUrl] = useState<string | null>(null);
  const [qrBadgeUploading, setQrBadgeUploading] = useState(false);
  const [qrBadgeError, setQrBadgeError] = useState<string | null>(null);
  const qrBadgeInputRef = useRef<HTMLInputElement>(null);

  // ── Persisted general settings (GET/PUT /api/admin/settings) ──────
  // Fields are CONTROLLED and backed by the Setting table — the save
  // button performs a real PUT (this used to be a mock toast-only button).
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch the current favicon URL + persisted settings on mount.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/settings/favicon")
      .then((r) => (r.ok ? r.json() : { url: null }))
      .then((data) => {
        if (!cancelled && data?.url) setFaviconUrl(data.url);
      })
      .catch(() => {
        /* non-fatal — default placeholder is shown */
      });
    fetch("/api/admin/settings/qr-badge-template")
      .then((r) => (r.ok ? r.json() : { url: null }))
      .then((data) => {
        if (!cancelled) setQrBadgeUrl(data?.url ?? null);
      })
      .catch(() => {
        /* non-fatal */
      });
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : { settings: {} }))
      .then((data) => {
        if (!cancelled) setValues(data.settings ?? {});
      })
      .catch(() => {
        /* non-fatal — defaults are shown */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setField(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteName: values.siteName ?? "",
          siteSlogan: values.siteSlogan ?? "",
          siteUrl: values.siteUrl ?? "",
          contactEmail: values.contactEmail ?? "",
          contactPhone: values.contactPhone ?? "",
          timezone: values.timezone ?? "",
          defaultLanguage: values.defaultLanguage ?? "",
          siteAddress: values.siteAddress ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Échec de l'enregistrement.");
      }
      setValues(data.settings ?? values);
      toast.success("Paramètres généraux enregistrés");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erreur lors de l'enregistrement.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFavError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/settings/favicon", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Échec de l'upload du favicon.");
      }
      setFaviconUrl(data.url);
      toast.success("Favicon mis à jour avec succès");
      // Hard reload so the browser picks up the new <link rel="icon"> from
      // generateMetadata(). A soft refresh often serves a cached favicon.
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur lors de l'upload.";
      setFavError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleQrBadgeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setQrBadgeError(null);
    setQrBadgeUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/settings/qr-badge-template", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Échec de l'import du design officiel.");
      }
      setQrBadgeUrl(data.url);
      toast.success("Design QR officiel importé", {
        description:
          "Appliqué à tous les fabricants qui n'ont pas importé leur propre design.",
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur lors de l'upload.";
      setQrBadgeError(msg);
      toast.error(msg);
    } finally {
      setQrBadgeUploading(false);
      if (qrBadgeInputRef.current) qrBadgeInputRef.current.value = "";
    }
  }

  async function handleQrBadgeReset() {
    setQrBadgeError(null);
    setQrBadgeUploading(true);
    try {
      const res = await fetch("/api/admin/settings/qr-badge-template", {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Échec de la suppression.");
      }
      setQrBadgeUrl(null);
      toast.success("Design officiel retiré", {
        description: "Retour au badge jaune « LABEL VERIFSCAN ».",
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur lors de la suppression.";
      setQrBadgeError(msg);
      toast.error(msg);
    } finally {
      setQrBadgeUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Paramètres généraux"
        subtitle="Informations de base de la plateforme"
      />
      <div className="space-y-6 p-5">
        <FormRow>
          <Field label="Nom de la plateforme">
            <input
              className={inputClass}
              data-testid="general-site-name"
              value={values.siteName ?? ""}
              onChange={(e) => setField("siteName", e.target.value)}
            />
          </Field>
          <Field label="Slogan">
            <input
              className={inputClass}
              value={values.siteSlogan ?? ""}
              onChange={(e) => setField("siteSlogan", e.target.value)}
            />
          </Field>
        </FormRow>

        <Field label="Logo" hint="Formats: PNG, SVG — taille maximum 2 MB">
          <div className="rounded-lg border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white">
                <Logo size="sm" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-[#111827]">
                  Logo actuel
                </p>
                <p className="mt-0.5 text-[12px] text-[#6B7280]">
                  Glissez-déposez un nouveau fichier ou cliquez pour téléverser
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Upload className="h-4 w-4" /> Changer le logo
                </Button>
              </div>
            </div>
          </div>
        </Field>

        <Field
          label="Favicon"
          hint="32×32 px recommandé — PNG, ICO, SVG, WebP (2 MB max)"
        >
          {/* Hidden file input — triggered by the "Changer" button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/x-icon,image/svg+xml,image/webp,image/jpeg,image/gif,.ico"
            onChange={handleFaviconChange}
            className="hidden"
          />
          <div className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:flex-row sm:items-center">
            {/* Favicon preview — shows the actual current favicon */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
              {faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt="Favicon actuel"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    // If the custom favicon fails to load, hide the img so
                    // the letter fallback (via CSS) shows instead.
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="font-display text-[18px] font-bold text-[#022150]">
                  V
                </span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#111827]">
                {faviconUrl
                  ? "Favicon personnalisé actif"
                  : "Favicon par défaut (lettre V)"}
              </p>
              <p className="mt-0.5 text-[12px] text-[#6B7280]">
                {uploading
                  ? "Upload en cours…"
                  : "Cliquez sur « Changer » pour téléverser un nouveau favicon"}
              </p>
              {favError && (
                <p className="mt-1 text-[12px] font-medium text-[#EF4444]">
                  {favError}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Upload…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Changer
                </>
              )}
            </Button>
          </div>
        </Field>

        <Field
          label="Design QR officiel"
          hint="Image carrée recommandée — PNG, JPG, WebP (5 MB max). Le QR est composé au centre sur fond blanc."
        >
          <input
            ref={qrBadgeInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleQrBadgeChange}
            className="hidden"
          />
          <div className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
              {qrBadgeUrl ? (
                <img
                  src={qrBadgeUrl}
                  alt="Design QR officiel"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="font-display text-[11px] font-bold text-[#022150]">
                  QR
                </span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#111827]">
                {qrBadgeUrl
                  ? "Design QR officiel actif"
                  : "Badge jaune « LABEL VERIFSCAN » par défaut"}
              </p>
              <p className="mt-0.5 text-[12px] text-[#6B7280]">
                {qrBadgeUploading
                  ? "Upload en cours…"
                  : "S'applique aux fabricants sans design personnel — ils peuvent importer le leur dans leurs Paramètres."}
              </p>
              {qrBadgeError && (
                <p className="mt-1 text-[12px] font-medium text-[#EF4444]">
                  {qrBadgeError}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={qrBadgeUploading}
                onClick={() => qrBadgeInputRef.current?.click()}
              >
                {qrBadgeUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Upload…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Importer
                  </>
                )}
              </Button>
              {qrBadgeUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={qrBadgeUploading}
                  onClick={handleQrBadgeReset}
                  className="text-[#EF4444] hover:bg-[#FEF2F2]"
                >
                  <Trash2 className="h-4 w-4" /> Retirer
                </Button>
              )}
            </div>
          </div>
        </Field>

        <FormRow>
          <Field
            label="URL du site"
            hint="Domaine canonique utilisé pour le SEO (canonical, sitemap, hreflang)"
          >
            <input
              className={inputClass}
              data-testid="general-site-url"
              placeholder="https://verifscan.com"
              value={values.siteUrl ?? ""}
              onChange={(e) => setField("siteUrl", e.target.value)}
            />
          </Field>
          <Field label="Email de contact">
            <input
              className={inputClass}
              type="email"
              value={values.contactEmail ?? ""}
              onChange={(e) => setField("contactEmail", e.target.value)}
            />
          </Field>
        </FormRow>

        <FormRow>
          <Field label="Téléphone">
            <input
              className={inputClass}
              value={values.contactPhone ?? ""}
              onChange={(e) => setField("contactPhone", e.target.value)}
            />
          </Field>
          <Field label="Fuseau horaire">
            <Select
              value={values.timezone || "Africa/Dakar"}
              onValueChange={(v) => setField("timezone", v)}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Dakar">Africa/Dakar (GMT)</SelectItem>
                <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                <SelectItem value="Europe/Brussels">Europe/Brussels (CET)</SelectItem>
                <SelectItem value="Europe/Zurich">Europe/Zurich (CET)</SelectItem>
                <SelectItem value="America/Toronto">America/Toronto (EST)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FormRow>

        <FormRow>
          <Field label="Langue par défaut">
            <Select
              value={values.defaultLanguage || "fr"}
              onValueChange={(v) => setField("defaultLanguage", v)}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">Anglais</SelectItem>
                <SelectItem value="wo">Wolof</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Adresse">
            <textarea
              className={textareaClass}
              value={values.siteAddress ?? ""}
              onChange={(e) => setField("siteAddress", e.target.value)}
            />
          </Field>
        </FormRow>
      </div>
      <CardFooter>
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          data-testid="general-save"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Enregistrer les modifications
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ============================================================
 * Section: SEO & Référencement
 * ========================================================== */

function SeoSection() {
  // ── Persisted SEO settings (GET/PUT /api/admin/settings) ──────────
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── OpenGraph image upload ────────────────────────────────────────
  const [ogUploading, setOgUploading] = useState(false);
  const [ogError, setOgError] = useState<string | null>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : { settings: {} }))
      .then((data) => {
        if (!cancelled) setValues(data.settings ?? {});
      })
      .catch(() => {
        /* non-fatal — defaults are shown */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setField(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          seoTitle: values.seoTitle ?? "",
          seoDescription: values.seoDescription ?? "",
          seoKeywords: values.seoKeywords ?? "",
          googleVerification: values.googleVerification ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Échec de l'enregistrement.");
      }
      setValues(data.settings ?? values);
      toast.success("Paramètres SEO enregistrés");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erreur lors de l'enregistrement.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleOgImageChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setOgError(null);
    setOgUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/settings/og-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(
          data.error || "Échec de l'upload de l'image OpenGraph.",
        );
      }
      setValues((v) => ({ ...v, ogImageUrl: data.url }));
      toast.success("Image OpenGraph mise à jour");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur lors de l'upload.";
      setOgError(msg);
      toast.error(msg);
    } finally {
      setOgUploading(false);
      if (ogInputRef.current) ogInputRef.current.value = "";
    }
  }

  // ── Google snippet preview values ─────────────────────────────────
  const siteUrl =
    values.siteUrl?.trim() || "https://verifscan.com";
  const previewTitle =
    values.seoTitle?.trim() ||
    "VerifScan — Passeport numérique produit | Traçabilité alimentaire & cosmétique, anti-contrefaçon par QR code";
  const previewDesc =
    values.seoDescription?.trim() ||
    "VerifScan est le passeport numérique de vos produits alimentaires et cosmétiques : un QR code unique qui garantit l'authenticité, assure la traçabilité du lot et protège votre marque contre la contrefaçon et la fraude.";

  return (
    <Card>
      <CardHeader
        title="SEO & Référencement"
        subtitle="Optimisez la visibilité de VerifScan sur Google, Bing et les réseaux sociaux"
      />
      <div className="space-y-6 p-5">
        {/* ── Aperçu Google ─────────────────────────────────────── */}
        <Field
          label="Aperçu du résultat Google"
          hint="Exemple de rendu approximatif — le titre et la description peuvent être tronqués par Google."
        >
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F0F4F9]">
                <span className="text-[11px] font-bold text-[#022150]">V</span>
              </div>
              <div className="leading-tight">
                <p className="text-[12px] text-[#202124]">
                  {siteUrl.replace(/^https?:\/\//, "")}
                </p>
                <p className="text-[11px] text-[#4D5156]">
                  https://{siteUrl.replace(/^https?:\/\//, "")}
                </p>
              </div>
            </div>
            <p className="mt-1.5 truncate text-[18px] leading-snug text-[#1A0DAB]">
              {previewTitle}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#4D5156]">
              {previewDesc}
            </p>
          </div>
        </Field>

        <Field
          label="Titre SEO (balise title par défaut)"
          hint="Recommandé : 50–60 caractères pour éviter la troncature. Peut inclure la marque et les mots-clés principaux."
        >
          <input
            className={inputClass}
            data-testid="seo-input-title"
            placeholder="VerifScan — Passeport numérique produit | Anti-contrefaçon QR"
            maxLength={120}
            value={values.seoTitle ?? ""}
            onChange={(e) => setField("seoTitle", e.target.value)}
          />
          <p
            className={cn(
              "text-[12px]",
              (values.seoTitle ?? "").length > 60
                ? "text-[#F59E0B]"
                : "text-[#6B7280]",
            )}
          >
            {(values.seoTitle ?? "").length} / 120 caractères
          </p>
        </Field>

        <Field
          label="Meta description"
          hint="Recommandé : 140–160 caractères. Affichée sous le titre dans les résultats de recherche."
        >
          <textarea
            className={textareaClass}
            data-testid="seo-input-description"
            placeholder="VerifScan est le passeport numérique de vos produits : QR code unique, authenticité garantie, traçabilité complète, protection anti-contrefaçon…"
            maxLength={320}
            value={values.seoDescription ?? ""}
            onChange={(e) => setField("seoDescription", e.target.value)}
          />
          <p
            className={cn(
              "text-[12px]",
              (values.seoDescription ?? "").length > 160
                ? "text-[#F59E0B]"
                : "text-[#6B7280]",
            )}
          >
            {(values.seoDescription ?? "").length} / 320 caractères
          </p>
        </Field>

        <Field
          label="Mots-clés"
          hint="Séparés par des virgules. Marchés visés : Sénégal, France, Belgique, Suisse, Canada (ex : traçabilité QR code, anti-contrefaçon France)."
        >
          <textarea
            className={textareaClass}
            data-testid="seo-input-keywords"
            placeholder="passeport numérique produit, QR code traçabilité, anti-contrefaçon, traçabilité alimentaire France, cosmétique authentique Belgique…"
            value={values.seoKeywords ?? ""}
            onChange={(e) => setField("seoKeywords", e.target.value)}
          />
        </Field>

        {/* ── Image OpenGraph ───────────────────────────────────── */}
        <Field
          label="Image de partage (OpenGraph / Twitter)"
          hint="1200×630 px recommandé — PNG, JPG, WebP, GIF (5 MB max). Affichée lors des partages sur Facebook, X/LinkedIn, WhatsApp…"
        >
          <input
            ref={ogInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleOgImageChange}
            className="hidden"
            data-testid="seo-upload-og"
          />
          <div className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-4 sm:flex-row sm:items-center">
            <div className="flex h-[63px] w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
              {values.ogImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values.ogImageUrl}
                  alt="Image OpenGraph actuelle"
                  className="h-full w-full object-cover"
                  data-testid="seo-og-preview"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              ) : (
                <span className="text-[11px] text-[#9CA3AF]">1200×630</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#111827]">
                {values.ogImageUrl
                  ? "Image OpenGraph personnalisée active"
                  : "Image OpenGraph par défaut (/og-image.png)"}
              </p>
              <p className="mt-0.5 text-[12px] text-[#6B7280]">
                {ogUploading
                  ? "Upload en cours…"
                  : "Cliquez sur « Changer » pour téléverser une nouvelle image"}
              </p>
              {ogError && (
                <p className="mt-1 text-[12px] font-medium text-[#EF4444]">
                  {ogError}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={ogUploading}
              onClick={() => ogInputRef.current?.click()}
              data-testid="seo-og-change"
            >
              {ogUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Upload…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> Changer
                </>
              )}
            </Button>
          </div>
        </Field>

        {/* ── Google Search Console ─────────────────────────────── */}
        <Field
          label="Code de vérification Google Search Console"
          hint="Collez le code fourni par la Search Console (contenu du meta google-site-verification). Ajoutez aussi verifscan.com comme propriété « Domaine »."
        >
          <input
            className={inputClass}
            data-testid="seo-input-gsc"
            placeholder="Ex : google-site-verification=abc123def456…"
            value={values.googleVerification ?? ""}
            onChange={(e) => setField("googleVerification", e.target.value)}
          />
        </Field>

        <div className="rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" />
            <div className="text-[13px] leading-relaxed text-[#1E40AF]">
              <p className="font-medium">
                Référencement multilingue automatique
              </p>
              <p className="mt-1 text-[#3B82F6]">
                VerifScan déclare automatiquement les balises hreflang
                (fr-FR, fr-BE, fr-CH, fr-CA, fr-SN) et les données structurées
                zoneServed pour la France, la Belgique, la Suisse, le Canada et
                le Sénégal. Déclarez le domaine dans la Google Search Console et
                soumettez https://{siteUrl.replace(/^https?:\/\//, "")}
                /sitemap.xml pour démarrer l'indexation.
              </p>
            </div>
          </div>
        </div>
      </div>
      <CardFooter>
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          data-testid="seo-save"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Enregistrer les modifications
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ============================================================
 * Section: Email & Notifications
 * ========================================================== */

const EMAIL_TEMPLATES = [
  {
    id: "signup",
    name: "Inscription",
    subject: "Bienvenue sur VerifScan — validez votre email",
  },
  {
    id: "welcome",
    name: "Bienvenue",
    subject: "Votre compte VerifScan est prêt 🎉",
  },
  {
    id: "reset",
    name: "Réinitialisation mot de passe",
    subject: "Réinitialisez votre mot de passe VerifScan",
  },
  {
    id: "payment",
    name: "Notification paiement",
    subject: "Confirmation de votre paiement VerifScan",
  },
  {
    id: "weekly",
    name: "Rapport hebdomadaire",
    subject: "Votre rapport hebdomadaire VerifScan",
  },
];

const ADMIN_NOTIFS = [
  { id: "notifSignup", label: "Nouvelle inscription", testId: "notif-toggle-signup" },
  { id: "notifPayment", label: "Nouveau paiement", testId: "notif-toggle-payment" },
  { id: "notifTicket", label: "Ticket support", testId: "notif-toggle-ticket" },
  { id: "notifSecurity", label: "Alerte sécurité", testId: "notif-toggle-security" },
  { id: "notifQuota", label: "Quota dépassé", testId: "notif-toggle-quota" },
];

type SmtpTestState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

function EmailSection() {
  // ── Persisted SMTP + notification settings (GET/PUT /api/admin/settings) ──
  // Fields are CONTROLLED and backed by the Setting table. Saving performs a
  // real PUT (this section used to be a mock toast-only UI) and "Tester la
  // connexion" performs a REAL SMTP handshake via /api/admin/test-smtp.
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testState, setTestState] = useState<SmtpTestState>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : { settings: {} }))
      .then((data) => {
        if (!cancelled) setValues(data.settings ?? {});
      })
      .catch(() => {
        /* non-fatal — defaults are shown */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setField(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  /** Effective boolean for a "true"/"false" toggle (default: true). */
  function toggleOn(key: string): boolean {
    return values[key] !== "false";
  }

  /**
   * SSL switch for SMTP — explicit saved value wins; when never saved
   * (empty/undefined) auto-detect from the port convention: 465 = SSL direct,
   * anything else (587/25/2525) = STARTTLS. Matches the backend buildConfig
   * fallback, so the UI no longer forces secure=true on a 587 port (which
   * caused OpenSSL "wrong version number").
   */
  function secureOn(): boolean {
    const v = (values.smtpSecure ?? "").trim();
    if (v === "true") return true;
    if (v === "false") return false;
    const port = (values.smtpPort ?? "").trim();
    return port === "465" || port === "2465";
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          smtpHost: values.smtpHost ?? "",
          smtpPort: values.smtpPort ?? "",
          smtpUser: values.smtpUser ?? "",
          smtpPass: values.smtpPass ?? "",
          smtpSecure: secureOn() ? "true" : "false",
          smtpFrom: values.smtpFrom ?? "",
          notifSignup: toggleOn("notifSignup") ? "true" : "false",
          notifPayment: toggleOn("notifPayment") ? "true" : "false",
          notifTicket: toggleOn("notifTicket") ? "true" : "false",
          notifSecurity: toggleOn("notifSecurity") ? "true" : "false",
          notifQuota: toggleOn("notifQuota") ? "true" : "false",
          notifEmailRecipient: values.notifEmailRecipient ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Échec de l'enregistrement.");
      }
      setValues((v) => ({ ...v, ...(data.settings ?? {}) }));
      setTestState({ kind: "idle" });
      toast.success("Configuration email enregistrée");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erreur lors de l'enregistrement.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTestState({ kind: "loading" });
    const requestedSecure = secureOn();
    try {
      const hasFormConfig =
        (values.smtpHost ?? "").trim() !== "" &&
        (values.smtpUser ?? "").trim() !== "" &&
        (values.smtpPass ?? "").trim() !== "";
      const res = await fetch("/api/admin/test-smtp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // Ad-hoc test of the FORM values when they are complete — the
          // superadmin can validate before saving. Server falls back to the
          // effective config otherwise.
          ...(hasFormConfig
            ? {
                host: values.smtpHost,
                port: values.smtpPort ? Number(values.smtpPort) : undefined,
                user: values.smtpUser,
                pass: values.smtpPass,
                secure: requestedSecure,
                from: values.smtpFrom || undefined,
              }
            : {}),
          to: values.notifEmailRecipient || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            "Le test SMTP a échoué — vérifiez la configuration du serveur.",
        );
      }
      // The server may have auto-corrected the encryption mode (SSL vs
      // STARTTLS mismatch) — reflect the working mode in the form and tell
      // the user to save it.
      const usedSecure: boolean =
        typeof data.secureUsed === "boolean" ? data.secureUsed : requestedSecure;
      if (usedSecure !== requestedSecure) {
        setField("smtpSecure", usedSecure ? "true" : "false");
      }
      const base: string =
        data.message || "Connexion SMTP validée — email de test envoyé.";
      const message =
        usedSecure !== requestedSecure
          ? `${base} (mode corrigé automatiquement : ${usedSecure ? "SSL direct" : "STARTTLS"} — enregistrez pour conserver)`
          : base;
      setTestState({ kind: "ok", message });
      toast.success(message);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erreur inconnue pendant le test SMTP.";
      setTestState({ kind: "error", message: msg });
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-6">
      {/* SMTP */}
      <Card>
        <CardHeader
          title="Configuration SMTP"
          subtitle="Serveur d'envoi d'emails transactionnels — utilisé par les notifications, la validation d'email et les alertes"
        />
        <div className="space-y-5 p-5">
          <FormRow>
            <Field
              label="Serveur SMTP"
              hint="Ex. smtp.gmail.com, smtp.hostinger.com, mail.verifscan.com"
            >
              <input
                className={inputClass}
                data-testid="email-smtp-host"
                placeholder="smtp.gmail.com"
                value={values.smtpHost ?? ""}
                onChange={(e) => setField("smtpHost", e.target.value)}
              />
            </Field>
            <Field
              label="Port"
              hint="587 (STARTTLS), 465 (SSL) — le commutateur s'ajuste automatiquement"
            >
              <input
                className={inputClass}
                data-testid="email-smtp-port"
                placeholder="587"
                value={values.smtpPort ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setField("smtpPort", v);
                  // Auto-adjust the encryption switch to the port convention
                  // (same behavior as mail clients: 465 = SSL, 587 = STARTTLS).
                  if (v === "465" || v === "2465") setField("smtpSecure", "true");
                  else if (v === "587" || v === "25" || v === "2525")
                    setField("smtpSecure", "false");
                }}
              />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Utilisateur" hint="Adresse du compte d'envoi">
              <input
                className={inputClass}
                data-testid="email-smtp-user"
                placeholder="noreply@verifscan.com"
                value={values.smtpUser ?? ""}
                onChange={(e) => setField("smtpUser", e.target.value)}
              />
            </Field>
            <Field label="Mot de passe">
              <PasswordInput
                value={values.smtpPass ?? ""}
                onChange={(v) => setField("smtpPass", v)}
                placeholder="••••••••••"
                testId="email-smtp-pass"
              />
            </Field>
          </FormRow>
          <FormRow>
            <Field
              label="Expéditeur (From)"
              hint="Format : Nom <adresse@domaine>"
            >
              <input
                className={inputClass}
                data-testid="email-from"
                placeholder="VerifScan <no-reply@verifscan.com>"
                value={values.smtpFrom ?? ""}
                onChange={(e) => setField("smtpFrom", e.target.value)}
              />
            </Field>
            <Field label="Chiffrement">
              <div className="flex h-10 items-center gap-3">
                <Switch
                  className={switchClass}
                  checked={secureOn()}
                  onCheckedChange={(v) => setField("smtpSecure", v ? "true" : "false")}
                  aria-label="Chiffrement SSL direct"
                />
                <span className="text-[13px] text-[#374151]">
                  SSL direct (port 465) — désactivé : STARTTLS (port 587). En cas d'erreur, VerifScan détecte le bon mode automatiquement.
                </span>
              </div>
            </Field>
          </FormRow>
        </div>
        <CardFooter className="justify-between">
          {/* Real test status — the old "✅ Connexion réussie" was hardcoded */}
          <div className="flex items-center gap-2 text-[13px] font-medium">
            {testState.kind === "idle" && (
              <span className="text-[#6B7280]">
                Testez la connexion après enregistrement
              </span>
            )}
            {testState.kind === "loading" && (
              <span className="inline-flex items-center gap-2 text-[#022150]">
                <Loader2 className="h-4 w-4 animate-spin" /> Test en cours…
              </span>
            )}
            {testState.kind === "ok" && (
              <span
                className="inline-flex items-center gap-2 text-[#065F46]"
                data-testid="smtp-test-ok"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D1FAE5]">
                  <Check className="h-3 w-3" />
                </span>
                {testState.message}
              </span>
            )}
            {testState.kind === "error" && (
              <span
                className="inline-flex items-center gap-2 text-[#B91C1C]"
                data-testid="smtp-test-error"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FEE2E2] text-[10px]">
                  !
                </span>
                {testState.message}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={loading || saving || testState.kind === "loading"}
              data-testid="email-test"
            >
              <RefreshCw className="h-4 w-4" /> Tester la connexion
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              data-testid="email-save"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Enregistrer
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Admin notifications */}
      <Card>
        <CardHeader
          title="Notifications administrateur"
          subtitle="Alertes internes (cloche admin) + emails au destinataire ci-dessous"
        />
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ADMIN_NOTIFS.map((n) => (
              <label
                key={n.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3"
              >
                <span className="text-[14px] font-medium text-[#374151]">
                  {n.label}
                </span>
                <Switch
                  className={switchClass}
                  checked={toggleOn(n.id)}
                  onCheckedChange={(v) => setField(n.id, v ? "true" : "false")}
                  aria-label={n.label}
                  data-testid={n.testId}
                />
              </label>
            ))}
          </div>
          <Field
            label="Email destinataire"
            hint="Les notifications admin partent vers cette adresse (vide : premier compte SuperAdmin)"
            className="max-w-md"
          >
            <input
              className={inputClass}
              type="email"
              data-testid="notif-recipient"
              placeholder="admin@verifscan.com"
              value={values.notifEmailRecipient ?? ""}
              onChange={(e) => setField("notifEmailRecipient", e.target.value)}
            />
          </Field>
        </div>
        <CardFooter>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            data-testid="notif-save"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Enregistrer
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader
          title="Templates d'emails"
          subtitle="Aperçu des emails automatiques envoyés par la plateforme"
        />
        <div className="divide-y divide-[#F3F4F6]">
          {EMAIL_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5"
            >
              <div className="w-full shrink-0 sm:w-[220px]">
                <p className="text-[14px] font-semibold text-[#111827]">
                  {tpl.name}
                </p>
              </div>
              <input
                className={cn(inputClass, "flex-1")}
                defaultValue={tpl.subject}
              />
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info(`Édition du template « ${tpl.name} »`)}
                >
                  <Pencil className="h-4 w-4" /> Éditer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toast.info(`Aperçu du template « ${tpl.name} »`)}
                >
                  <Eye className="h-4 w-4" /> Preview
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
 * Section: Payment
 * ========================================================== */

type ProviderKey = "cinetpay" | "stripe" | "orange" | "wave";

type ProviderState = {
  enabled: boolean;
  connected: boolean;
  mode: "test" | "production";
  webhook: string;
};

const PROVIDER_LABELS: Record<ProviderKey, string> = {
  cinetpay: "CinetPay",
  stripe: "Stripe",
  orange: "Orange Money",
  wave: "Wave",
};

function PaymentSection() {
  const [providers, setProviders] = useState<Record<ProviderKey, ProviderState>>({
    cinetpay: {
      enabled: true,
      connected: true,
      mode: "test",
      webhook: "https://api.verifscan.com/webhooks/cinetpay",
    },
    stripe: {
      enabled: false,
      connected: false,
      mode: "test",
      webhook: "https://api.verifscan.com/webhooks/stripe",
    },
    orange: {
      enabled: true,
      connected: true,
      mode: "production",
      webhook: "https://api.verifscan.com/webhooks/orange-money",
    },
    wave: {
      enabled: false,
      connected: false,
      mode: "test",
      webhook: "https://api.verifscan.com/webhooks/wave",
    },
  });

  function update(key: ProviderKey, patch: Partial<ProviderState>) {
    setProviders((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  return (
    <div className="space-y-6">
      {(Object.keys(PROVIDER_LABELS) as ProviderKey[]).map((key) => {
        const p = providers[key];
        return (
          <Card key={key}>
            <CardHeader
              title={PROVIDER_LABELS[key]}
              action={
                <div className="flex items-center gap-3">
                  {p.connected ? (
                    <Badge color="green">✅ Connecté</Badge>
                  ) : (
                    <Badge color="gray">❌ Non configuré</Badge>
                  )}
                  <label className="flex items-center gap-2 text-[13px] font-medium text-[#374151]">
                    <span className={p.enabled ? "text-[#022150]" : "text-[#9CA3AF]"}>
                      {p.enabled ? "Activé" : "Désactivé"}
                    </span>
                    <Switch
                      className={switchClass}
                      checked={p.enabled}
                      onCheckedChange={(v) => update(key, { enabled: v })}
                      aria-label={`Activer ${PROVIDER_LABELS[key]}`}
                    />
                  </label>
                </div>
              }
            />
            {p.enabled && (
              <div className="space-y-5 p-5">
                <FormRow>
                  <Field label="API Key">
                    <PasswordInput defaultValue="sk_live_******************" />
                  </Field>
                  <Field label="Mode">
                    <RadioGroup
                      value={p.mode}
                      onValueChange={(v) =>
                        update(key, { mode: v as "test" | "production" })
                      }
                      className="flex gap-6 pt-2.5"
                    >
                      <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] text-[#374151]">
                        <RadioGroupItem value="test" /> Test
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] text-[#374151]">
                        <RadioGroupItem value="production" /> Production
                      </label>
                    </RadioGroup>
                  </Field>
                </FormRow>
                <Field label="Webhook URL" hint="URL à configurer côté fournisseur">
                  <div className="flex gap-2">
                    <ReadOnlyField value={p.webhook} />
                    <CopyButton value={p.webhook} label="" />
                  </div>
                </Field>
              </div>
            )}
            {p.enabled && (
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.success(
                      `${PROVIDER_LABELS[key]} — Connexion réussie`
                    )
                  }
                >
                  <RefreshCw className="h-4 w-4" /> Tester la connexion
                </Button>
              </CardFooter>
            )}
          </Card>
        );
      })}
      <div className="flex justify-end">
        <Button
          onClick={() => toast.success("Toutes les configurations enregistrées")}
        >
          <Save className="h-4 w-4" /> Enregistrer toutes les configurations
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
 * Section: Security
 * ========================================================== */

function SecuritySection() {
  const [twoFA, setTwoFA] = useState(true);
  const [complexity, setComplexity] = useState({
    upper: true,
    lower: true,
    digit: true,
    special: false,
  });
  const [methods, setMethods] = useState({
    GET: true,
    POST: true,
    PUT: true,
    DELETE: true,
    PATCH: false,
  });

  return (
    <div className="space-y-6">
      {/* Authentication */}
      <Card>
        <CardHeader title="Authentification" subtitle="Sessions et 2FA" />
        <div className="space-y-5 p-5">
          <FormRow>
            <Field label="Durée de session">
              <input className={inputClass} defaultValue="24 heures" />
            </Field>
            <Field label="Refresh token">
              <input className={inputClass} defaultValue="7 jours" />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Tentatives login max">
              <input className={inputClass} defaultValue="5" type="number" />
            </Field>
            <Field label="2FA obligatoire (administrateurs)">
              <label className="flex h-10 items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4">
                <Switch
                  className={switchClass}
                  checked={twoFA}
                  onCheckedChange={setTwoFA}
                  aria-label="2FA obligatoire"
                />
                <span className="text-[14px] font-medium text-[#374151]">
                  {twoFA ? "Activée" : "Désactivée"}
                </span>
              </label>
            </Field>
          </FormRow>
        </div>
      </Card>

      {/* Passwords */}
      <Card>
        <CardHeader title="Mots de passe" subtitle="Règles de complexité" />
        <div className="space-y-5 p-5">
          <FormRow>
            <Field label="Longueur minimum">
              <input className={inputClass} defaultValue="8" type="number" />
            </Field>
            <Field label="Historique">
              <input
                className={inputClass}
                defaultValue="5 derniers"
              />
            </Field>
          </FormRow>
          <Field label="Complexité requise">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { k: "upper", l: "Majuscule" },
                { k: "lower", l: "Minuscule" },
                { k: "digit", l: "Chiffre" },
                { k: "special", l: "Caractère spécial" },
              ].map((c) => (
                <label
                  key={c.k}
                  className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5"
                >
                  <Checkbox
                    checked={complexity[c.k as keyof typeof complexity]}
                    onCheckedChange={(v) =>
                      setComplexity((prev) => ({
                        ...prev,
                        [c.k]: v === true,
                      }))
                    }
                    className="data-[state=checked]:bg-[#022150] data-[state=checked]:border-[#022150]"
                  />
                  <span className="text-[13px] font-medium text-[#374151]">
                    {c.l}
                  </span>
                </label>
              ))}
            </div>
          </Field>
          <Field
            label="Expiration (jours)"
            hint="0 = jamais"
            className="max-w-xs"
          >
            <input className={inputClass} defaultValue="90" type="number" />
          </Field>
        </div>
      </Card>

      {/* Rate limiting & CORS */}
      <Card>
        <CardHeader
          title="Rate limiting & CORS"
          subtitle="Protection API et partage de ressources"
        />
        <div className="space-y-5 p-5">
          <FormRow>
            <Field label="API" hint="Requêtes par minute / IP">
              <input className={inputClass} defaultValue="1000" type="number" />
            </Field>
            <Field label="Login" hint="Tentatives / 15 min / IP">
              <input className={inputClass} defaultValue="5" type="number" />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Upload" hint="Fichiers / min / utilisateur">
              <input className={inputClass} defaultValue="10" type="number" />
            </Field>
            <div className="hidden sm:block" />
          </FormRow>
          <Field
            label="CORS — origines autorisées"
            hint="Une origine par ligne"
          >
            <textarea
              className={textareaClass}
              defaultValue={"https://verifscan.com\nhttps://admin.verifscan.com\nhttps://app.verifscan.com"}
            />
          </Field>
          <Field label="Méthodes autorisées">
            <div className="flex flex-wrap gap-3">
              {(["GET", "POST", "PUT", "DELETE", "PATCH"] as const).map((m) => (
                <label
                  key={m}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2"
                >
                  <Checkbox
                    checked={methods[m]}
                    onCheckedChange={(v) =>
                      setMethods((prev) => ({ ...prev, [m]: v === true }))
                    }
                    className="data-[state=checked]:bg-[#022150] data-[state=checked]:border-[#022150]"
                  />
                  <span className="font-mono text-[13px] font-semibold text-[#374151]">
                    {m}
                  </span>
                </label>
              ))}
            </div>
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => toast.success("Paramètres de sécurité enregistrés")}>
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
 * Section: API & Integrations — RÉELLE
 * Clés API (générées en DB, hashées SHA-256, affichées une fois)
 * + webhooks sortants signés HMAC (lib/webhooks.ts).
 * Endpoints backend : /api/admin/api-keys, /api/admin/webhooks,
 * /api/v1/verify/[code] (public, auth Bearer).
 * ========================================================== */

const API_V1_EVENTS: { id: string; label: string }[] = [
  { id: "scan.verified", label: "Scan vérifié (QR authentique scanné)" },
  { id: "user.registered", label: "Nouvelle inscription fabricant" },
  { id: "report.created", label: "Signalement contrefaçon / ticket" },
  { id: "plan.activated", label: "Activation d'un abonnement" },
];

type ApiKeyRow = {
  id: string;
  name: string;
  masked: string;
  active: boolean;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  createdAt: string;
  revokedAt: string | null;
};

type WebhookRow = {
  id: string;
  url: string;
  events: string[];
  secretMasked: string;
  active: boolean;
  createdAt: string;
};

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

function ApiSection() {
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Génération de clé
  const [keyName, setKeyName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");

  // Webhook : formulaire d'ajout
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [whUrl, setWhUrl] = useState("");
  const [whEvents, setWhEvents] = useState<string[]>(["scan.verified"]);
  const [whCreating, setWhCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [newSecretUrl, setNewSecretUrl] = useState("");

  // Résultat du test d'un webhook (par id)
  const [testResult, setTestResult] = useState<
    Record<string, { ok: boolean; detail: string }>
  >({});

  // Confirmations en 2 temps (révocation / suppression)
  const [armed, setArmed] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [kRes, wRes] = await Promise.all([
        fetch("/api/admin/api-keys", { cache: "no-store" }),
        fetch("/api/admin/webhooks", { cache: "no-store" }),
      ]);
      if (kRes.ok) {
        const data = await kRes.json();
        setKeys(data.keys ?? []);
      } else {
        setKeys([]);
      }
      if (wRes.ok) {
        const data = await wRes.json();
        setWebhooks(data.webhooks ?? []);
      } else {
        setWebhooks([]);
      }
    } catch {
      setKeys([]);
      setWebhooks([]);
      toast.error("Impossible de charger les clés et webhooks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateKey = async () => {
    const name = keyName.trim();
    if (name.length < 2) {
      toast.error("Donnez un libellé à la clé (min. 2 caractères)");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Génération impossible");
        return;
      }
      setNewKey(data.key.key);
      setNewKeyName(data.key.name);
      setKeyName("");
      toast.success("Clé générée — copiez-la maintenant");
      await loadData();
    } catch {
      toast.error("Erreur réseau pendant la génération");
    } finally {
      setGenerating(false);
    }
  };

  const revokeKey = async (id: string, name: string) => {
    if (armed !== id) {
      setArmed(id);
      setTimeout(() => setArmed((a) => (a === id ? null : a)), 4000);
      return;
    }
    setArmed(null);
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Révocation impossible");
        return;
      }
      toast.success(`Clé « ${name} » révoquée`);
      await loadData();
    } catch {
      toast.error("Erreur réseau pendant la révocation");
    }
  };

  const toggleWebhookForm = () => {
    setShowWebhookForm((s) => !s);
    setWhUrl("");
    setWhEvents(["scan.verified"]);
  };

  const createWebhook = async () => {
    setWhCreating(true);
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: whUrl.trim(), events: whEvents }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Création impossible");
        return;
      }
      setNewSecret(data.secret);
      setNewSecretUrl(data.webhook?.url ?? "");
      setShowWebhookForm(false);
      toast.success("Webhook créé — copiez le secret maintenant");
      await loadData();
    } catch {
      toast.error("Erreur réseau pendant la création");
    } finally {
      setWhCreating(false);
    }
  };

  const patchWebhook = async (
    id: string,
    body: Record<string, unknown>,
    successMsg: string
  ) => {
    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Modification impossible");
        return;
      }
      if (data.secret) {
        setNewSecret(data.secret);
        setNewSecretUrl(data.webhook?.url ?? "");
        toast.success("Nouveau secret généré — copiez-le maintenant");
      } else {
        toast.success(successMsg);
      }
      await loadData();
    } catch {
      toast.error("Erreur réseau");
    }
  };

  const deleteWebhook = async (id: string, url: string) => {
    if (armed !== id) {
      setArmed(id);
      setTimeout(() => setArmed((a) => (a === id ? null : a)), 4000);
      return;
    }
    setArmed(null);
    try {
      const res = await fetch(`/api/admin/webhooks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Suppression impossible");
        return;
      }
      toast.success(`Webhook ${url} supprimé`);
      await loadData();
    } catch {
      toast.error("Erreur réseau pendant la suppression");
    }
  };

  const testWebhook = async (id: string) => {
    setTestResult((t) => ({ ...t, [id]: { ok: true, detail: "envoi…" } }));
    try {
      const res = await fetch(`/api/admin/webhooks/${id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok && res.status !== 404) {
        setTestResult((t) => ({
          ...t,
          [id]: { ok: false, detail: data.error ?? "échec" },
        }));
        return;
      }
      setTestResult((t) => ({
        ...t,
        [id]: {
          ok: Boolean(data.ok),
          detail: data.ok
            ? `livré (HTTP ${data.status})`
            : (data.error ?? `échec (HTTP ${data.status ?? "—"})`),
        },
      }));
    } catch {
      setTestResult((t) => ({
        ...t,
        [id]: { ok: false, detail: "erreur réseau" },
      }));
    }
  };

  const apiBaseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v1`
      : "/api/v1";

  const curlExample = `curl -H "Authorization: Bearer sk_live_VOTRE_CLE" \\
  ${apiBaseUrl}/verify/MASTER-XXXXXX-P01`;

  return (
    <Card>
      <CardHeader
        title="API & Intégrations"
        subtitle="Clés, webhooks et endpoint public de vérification"
      />
      <div className="space-y-8 p-5">
        {/* ── Endpoint public ─────────────────────────────────────────── */}
        <Field
          label="API publique v1 — base URL"
          hint="Authentifiez chaque requête avec la clé : en-tête Authorization: Bearer <clé> ou X-API-Key: <clé>."
        >
          <div className="flex gap-2">
            <ReadOnlyField value={`${apiBaseUrl}/verify/[code]`} />
            <CopyButton value={`${apiBaseUrl}/verify/[code]`} label="" />
          </div>
        </Field>

        {/* ── Clés API ────────────────────────────────────────────────── */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[14px] font-medium text-[#374151]">Clés API</p>
          </div>

          <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <Field
              label="Libellé de la nouvelle clé"
              className="min-w-[200px] flex-1"
            >
              <input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Ex. Intégration e-commerce"
                maxLength={60}
                data-testid="api-key-name"
                className={inputClass}
              />
            </Field>
            <Button
              onClick={generateKey}
              disabled={generating || keyName.trim().length < 2}
              data-testid="api-generate"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Générer une clé
            </Button>
          </div>

          {newKey && (
            <div
              className="mb-4 rounded-lg border border-[#10B981] bg-[#ECFDF5] p-4"
              data-testid="api-key-result"
            >
              <p className="mb-1 text-[13px] font-semibold text-[#065F46]">
                Clé « {newKeyName} » générée — copiez-la MAINTENANT, elle ne
                sera plus jamais affichée :
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code
                  className="flex-1 min-w-[240px] break-all rounded-md bg-white px-3 py-2 font-mono text-[13px] text-[#065F46]"
                  data-testid="api-key-value"
                >
                  {newKey}
                </code>
                <CopyButton value={newKey} label="Copier la clé" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewKey(null)}
                  data-testid="api-key-result-close"
                >
                  J'ai copié — masquer
                </Button>
              </div>
            </div>
          )}

          <div
            className="overflow-hidden rounded-lg border border-[#E5E7EB]"
            data-testid="api-keys-table"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-left text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  <th className="px-4 py-2.5">Libellé</th>
                  <th className="px-4 py-2.5">Clé</th>
                  <th className="px-4 py-2.5">Créée le</th>
                  <th className="px-4 py-2.5">Dernier usage</th>
                  <th className="px-4 py-2.5">Statut</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {loading || keys === null ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#9CA3AF]" />
                    </td>
                  </tr>
                ) : keys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <p className="text-[13px] text-[#6B7280]">
                        Aucune clé API. Donnez un libellé ci-dessus puis
                        cliquez sur « Générer une clé ».
                      </p>
                    </td>
                  </tr>
                ) : (
                  keys.map((k) => (
                    <tr key={k.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-4 py-3 text-[13px] font-medium text-[#111827]">
                        {k.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[12px] text-[#374151]">
                          {k.masked}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#6B7280]">
                        {fmtDate(k.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#6B7280]">
                        {k.lastUsedAt ? fmtDate(k.lastUsedAt) : "jamais"}
                      </td>
                      <td className="px-4 py-3">
                        {k.active ? (
                          <Badge color="green">Active</Badge>
                        ) : (
                          <Badge color="red">Révoquée</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {k.active && (
                          <button
                            type="button"
                            onClick={() => revokeKey(k.id, k.name)}
                            data-testid={`api-revoke-${k.id}`}
                            className={cn(
                              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold transition-colors",
                              armed === k.id
                                ? "bg-[#EF4444] text-white"
                                : "text-[#EF4444] hover:bg-[#FEE2E2]"
                            )}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {armed === k.id ? "Confirmer ?" : "Révoquer"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px] text-[#6B7280]">
            La clé complète n'est affichée qu'une seule fois à la génération —
            seuls le préfixe et la date de dernier usage sont conservés côté
            VerifScan (empreinte SHA-256).
          </p>
        </div>

        {/* ── Webhooks ────────────────────────────────────────────────── */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[14px] font-medium text-[#374151]">Webhooks</p>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleWebhookForm}
              data-testid="webhook-toggle-form"
            >
              {showWebhookForm ? (
                "Annuler"
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Ajouter un webhook
                </>
              )}
            </Button>
          </div>

          {showWebhookForm && (
            <div
              className="mb-4 space-y-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4"
              data-testid="webhook-form"
            >
              <Field
                label="URL de destination"
                hint="Le payload JSON est signé HMAC-SHA256 : en-tête X-VerifScan-Signature: sha256=<hmac du corps avec votre secret>."
              >
                <input
                  value={whUrl}
                  onChange={(e) => setWhUrl(e.target.value)}
                  placeholder="https://votre-app.com/api/verifscan"
                  data-testid="webhook-url"
                  className={inputClass}
                />
              </Field>
              <Field label="Événements à recevoir">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {API_V1_EVENTS.map((ev) => (
                    <label
                      key={ev.id}
                      className="flex cursor-pointer items-center gap-2 text-[13px] text-[#374151]"
                    >
                      <Checkbox
                        checked={whEvents.includes(ev.id)}
                        onCheckedChange={(c) =>
                          setWhEvents((prev) =>
                            c
                              ? [...prev, ev.id]
                              : prev.filter((e) => e !== ev.id)
                          )
                        }
                        data-testid={`webhook-event-${ev.id}`}
                      />
                      {ev.label}
                    </label>
                  ))}
                </div>
              </Field>
              <div className="flex justify-end">
                <Button
                  onClick={createWebhook}
                  disabled={whCreating || !whUrl.trim() || whEvents.length === 0}
                  data-testid="webhook-create"
                >
                  {whCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Webhook className="h-4 w-4" />
                  )}
                  Créer le webhook
                </Button>
              </div>
            </div>
          )}

          {newSecret && (
            <div
              className="mb-4 rounded-lg border border-[#10B981] bg-[#ECFDF5] p-4"
              data-testid="webhook-secret-result"
            >
              <p className="mb-1 text-[13px] font-semibold text-[#065F46]">
                Secret du webhook {newSecretUrl} — copiez-le MAINTENANT, il ne
                sera plus jamais affiché :
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code
                  className="flex-1 min-w-[240px] break-all rounded-md bg-white px-3 py-2 font-mono text-[13px] text-[#065F46]"
                  data-testid="webhook-secret-value"
                >
                  {newSecret}
                </code>
                <CopyButton value={newSecret} label="Copier le secret" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewSecret(null)}
                >
                  J'ai copié — masquer
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-[#E5E7EB]" data-testid="webhooks-table">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-left text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  <th className="px-4 py-2.5">URL</th>
                  <th className="px-4 py-2.5">Événements</th>
                  <th className="px-4 py-2.5">Actif</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {loading || webhooks === null ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#9CA3AF]" />
                    </td>
                  </tr>
                ) : webhooks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <p className="text-[13px] text-[#6B7280]">
                        Aucun webhook configuré. Cliquez sur « Ajouter un
                        webhook » pour recevoir les événements sur votre
                        système.
                      </p>
                    </td>
                  </tr>
                ) : (
                  webhooks.map((w) => (
                    <tr key={w.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-4 py-3">
                        <span className="block max-w-[280px] truncate font-mono text-[13px] text-[#111827]">
                          {w.url}
                        </span>
                        <span className="font-mono text-[11px] text-[#9CA3AF]">
                          {w.secretMasked}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {w.events.map((e) => (
                            <Badge key={e} color="gray">
                              {e}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={w.active}
                          onCheckedChange={(c) =>
                            patchWebhook(
                              w.id,
                              { active: c },
                              c ? "Webhook activé" : "Webhook désactivé"
                            )
                          }
                          className={switchClass}
                          data-testid={`webhook-active-${w.id}`}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1">
                          {testResult[w.id] && (
                            <span
                              className={cn(
                                "mr-1 text-[11px] font-medium",
                                testResult[w.id].ok
                                  ? "text-[#10B981]"
                                  : "text-[#EF4444]"
                              )}
                              data-testid={`webhook-test-result-${w.id}`}
                            >
                              {testResult[w.id].ok ? "✓" : "✗"}{" "}
                              {testResult[w.id].detail}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => testWebhook(w.id)}
                            data-testid={`webhook-test-${w.id}`}
                            className="flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-[#022150] hover:bg-[#F0F4F9]"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Tester
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              patchWebhook(
                                w.id,
                                { regenerateSecret: true },
                                ""
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F0F4F9] hover:text-[#022150]"
                            aria-label="Régénérer le secret"
                            title="Régénérer le secret"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteWebhook(w.id, w.url)}
                            data-testid={`webhook-delete-${w.id}`}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                              armed === w.id
                                ? "bg-[#EF4444] text-white"
                                : "text-[#6B7280] hover:bg-[#FEE2E2] hover:text-[#EF4444]"
                            )}
                            aria-label={
                              armed === w.id
                                ? "Confirmer la suppression"
                                : "Supprimer"
                            }
                            title={
                              armed === w.id ? "Confirmer ?" : "Supprimer"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Exemple d'appel ─────────────────────────────────────────── */}
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-[#111827]">
                Vérifier un produit via l'API
              </p>
              <p className="text-[12px] text-[#6B7280]">
                GET /api/v1/verify/[code] — renvoie valid: true/false, le
                produit et ses statistiques de scans.
              </p>
            </div>
            <CopyButton value={curlExample} label="Copier l'exemple" />
          </div>
          <pre
            className="overflow-x-auto rounded-md bg-[#022150] px-4 py-3 font-mono text-[12px] leading-relaxed text-[#E5E7EB]"
            data-testid="api-curl-example"
          >
            {curlExample}
          </pre>
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
 * Section: Appearance
 * ========================================================== */

const COLOR_SWATCHES = [
  "#022150",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
];

function AppearanceSection() {
  const [theme, setTheme] = useState("light");
  const [primary, setPrimary] = useState("#022150");

  return (
    <Card>
      <CardHeader
        title="Apparence"
        subtitle="Thème, couleurs et écrans de marque"
      />
      <div className="space-y-6 p-5">
        <Field label="Thème">
          <RadioGroup
            value={theme}
            onValueChange={setTheme}
            className="flex flex-wrap gap-5"
          >
            {[
              { v: "light", l: "Clair" },
              { v: "dark", l: "Sombre" },
              { v: "system", l: "Système" },
            ].map((o) => (
              <label
                key={o.v}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-[14px] font-medium transition-colors",
                  theme === o.v
                    ? "border-[#022150] bg-[#F0F4F9] text-[#022150]"
                    : "border-[#E5E7EB] bg-[#F9FAFB] text-[#374151] hover:bg-white"
                )}
              >
                <RadioGroupItem value={o.v} />
                {o.l}
              </label>
            ))}
          </RadioGroup>
        </Field>

        <Field label="Couleur primaire">
          <div className="flex flex-wrap items-center gap-3">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPrimary(c)}
                aria-label={`Couleur ${c}`}
                className={cn(
                  "relative h-9 w-9 rounded-full transition-transform hover:scale-110",
                  primary === c
                    ? "ring-2 ring-offset-2 ring-[#022150] ring-offset-white"
                    : "ring-1 ring-black/5"
                )}
                style={{ backgroundColor: c }}
              >
                {primary === c && (
                  <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                )}
              </button>
            ))}
            <span className="ml-2 font-mono text-[13px] text-[#6B7280]">
              {primary}
            </span>
          </div>
        </Field>

        <Field label="Logo de la page de connexion" hint="PNG ou SVG — max 2 MB">
          <div className="rounded-lg border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white">
                <Logo size="sm" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-medium text-[#111827]">
                  Logo actuel
                </p>
                <p className="mt-0.5 text-[12px] text-[#6B7280]">
                  Affiché en haut du formulaire de connexion
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Upload className="h-4 w-4" /> Changer le logo
                </Button>
              </div>
            </div>
          </div>
        </Field>

        <Field label="Texte de bienvenue">
          <textarea
            className={textareaClass}
            defaultValue="Bienvenue sur VerifScan. Connectez-vous à votre espace pour gérer vos produits, vos QR codes et votre traçabilité."
          />
        </Field>
      </div>
      <CardFooter>
        <Button onClick={() => toast.success("Apparence enregistrée")}>
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ============================================================
 * Section: Maintenance
 * ========================================================== */

function MaintenanceSection() {
  const [maintenance, setMaintenance] = useState(false);
  const [logLevel, setLogLevel] = useState("INFO");

  return (
    <div className="space-y-6">
      {/* Maintenance mode */}
      <Card>
        <CardHeader
          title="Mode maintenance"
          subtitle="Affiche une page de maintenance aux visiteurs"
          action={
            <label className="flex items-center gap-2 text-[13px] font-medium text-[#374151]">
              <span className={maintenance ? "text-[#022150]" : "text-[#9CA3AF]"}>
                {maintenance ? "Activé" : "Désactivé"}
              </span>
              <Switch
                className={switchClass}
                checked={maintenance}
                onCheckedChange={setMaintenance}
                aria-label="Mode maintenance"
              />
            </label>
          }
        />
        <div className="space-y-5 p-5">
          <Field label="Message affiché">
            <textarea
              className={textareaClass}
              defaultValue="VerifScan est actuellement en maintenance. Nous revenons très vite !"
            />
          </Field>
          <Field label="IP autorisées" hint="Séparées par des virgules">
            <input
              className={inputClass}
              defaultValue="192.168.1.1, 10.0.0.1"
            />
          </Field>
        </div>
      </Card>

      {/* Backups */}
      <Card>
        <CardHeader
          title="Sauvegardes"
          subtitle="Sauvegardes automatiques de la base de données"
        />
        <div className="space-y-5 p-5">
          <FormRow>
            <Field label="Fréquence">
              <Select defaultValue="daily">
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidienne</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuelle</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Heure">
              <input className={inputClass} defaultValue="02:00" type="time" />
            </Field>
          </FormRow>
          <Field
            label="Rétention (jours)"
            className="max-w-xs"
          >
            <input className={inputClass} defaultValue="30" type="number" />
          </Field>

          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
            <Database className="h-5 w-5 text-[#022150]" />
            <div className="flex-1">
              <p className="text-[14px] font-medium text-[#111827]">
                Dernière sauvegarde — 26 juillet 2026 à 02:00
              </p>
              <p className="text-[12px] text-[#6B7280]">Taille : 2.3 GB</p>
            </div>
            <Badge color="green">✅ Réussie</Badge>
          </div>
        </div>
        <CardFooter>
          <Button variant="outline">
            <Download className="h-4 w-4" /> Télécharger la dernière sauvegarde
          </Button>
          <Button
            onClick={() => toast.success("Sauvegarde lancée")}
          >
            <Database className="h-4 w-4" /> Sauvegarder maintenant
          </Button>
        </CardFooter>
      </Card>

      {/* Cache & Logs */}
      <Card>
        <CardHeader
          title="Cache & Logs"
          subtitle="Gestion du cache et des journaux système"
        />
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
            <div className="flex-1">
              <p className="text-[14px] font-medium text-[#111827]">
                Cache : 156 MB
              </p>
              <p className="text-[12px] text-[#6B7280]">
                Inclut les QR codes générés, les assets et les réponses API
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Cache vidé")}
            >
              <Trash2 className="h-4 w-4" /> Vider le cache
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Régénération des QR codes lancée")}
            >
              <RefreshCw className="h-4 w-4" /> Régénérer les QR codes
            </Button>
          </div>

          <div className="border-t border-[#F3F4F6] pt-5">
            <p className="mb-3 text-[14px] font-semibold text-[#111827]">
              Logs système
            </p>
            <FormRow>
              <Field label="Niveau">
                <RadioGroup
                  value={logLevel}
                  onValueChange={setLogLevel}
                  className="flex gap-5 pt-2"
                >
                  {["INFO", "WARNING", "ERROR"].map((lvl) => (
                    <label
                      key={lvl}
                      className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium text-[#374151]"
                    >
                      <RadioGroupItem value={lvl} /> {lvl}
                    </label>
                  ))}
                </RadioGroup>
              </Field>
              <Field label="Rétention (jours)">
                <input className={inputClass} defaultValue="90" type="number" />
              </Field>
            </FormRow>
          </div>
        </div>
        <CardFooter>
          <Button variant="outline">
            <FileDown className="h-4 w-4" /> Télécharger les logs
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/* ============================================================
 * Main page
 * ========================================================== */

export function SettingsPage() {
  const { settingsSection, setSettingsSection } = useAdminNav();
  const active = (settingsSection as SectionKey) || "general";

  return (
    <PageContainer>
      <SectionTitle
        title="Paramètres"
        subtitle="Configurez votre plateforme VerifScan"
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-[240px] lg:shrink-0">
          <Card className="p-3">
            <SettingsNav
              active={active}
              onSelect={(k) => setSettingsSection(k)}
            />
          </Card>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-2">
            <h3 className="font-display text-[18px] font-semibold text-[#111827]">
              {SECTION_TITLES[active]}
            </h3>
          </div>
          {active === "general" && <GeneralSection />}
          {active === "seo" && <SeoSection />}
          {active === "email" && <EmailSection />}
          {active === "payment" && <PaymentSection />}
          {active === "security" && <SecuritySection />}
          {active === "api" && <ApiSection />}
          {active === "appearance" && <AppearanceSection />}
          {active === "maintenance" && <MaintenanceSection />}
        </main>
      </div>
    </PageContainer>
  );
}
