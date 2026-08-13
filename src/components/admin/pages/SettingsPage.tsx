"use client";

import { useState } from "react";
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
  { key: "email", label: "Email & Notifications", icon: Mail },
  { key: "payment", label: "Paiement", icon: CreditCard },
  { key: "security", label: "Sécurité", icon: Shield },
  { key: "api", label: "API & Intégrations", icon: Webhook },
  { key: "appearance", label: "Apparence", icon: Palette },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
];

const SECTION_TITLES: Record<SectionKey, string> = {
  general: "Paramètres généraux",
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
  "h-10 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] transition-colors focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10";

const textareaClass =
  "min-h-[88px] w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] transition-colors focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10";

const selectTriggerClass =
  "h-10 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[14px] font-normal text-[#111827] shadow-none transition-colors focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 data-[size=default]:h-10";

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
  className,
}: {
  defaultValue?: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className={cn("relative", className)}>
      <input
        type={show ? "text" : "password"}
        defaultValue={defaultValue}
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

const switchClass = "data-[state=checked]:bg-[#2563EB]";

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
                ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
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
  return (
    <Card>
      <CardHeader
        title="Paramètres généraux"
        subtitle="Informations de base de la plateforme"
      />
      <div className="space-y-6 p-5">
        <FormRow>
          <Field label="Nom de la plateforme">
            <input className={inputClass} defaultValue="VerifScan" />
          </Field>
          <Field label="Slogan">
            <input
              className={inputClass}
              defaultValue="La vérité au bout du scan"
            />
          </Field>
        </FormRow>

        <Field label="Logo" hint="Formats: PNG, SVG — taille maximum 2 MB">
          <div className="rounded-lg border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white">
                <Logo showText={false} />
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

        <Field label="Favicon" hint="32×32 px — PNG ou ICO">
          <div className="inline-flex items-center gap-3 rounded-lg border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#E5E7EB] bg-white">
              <span className="font-display text-[14px] font-bold text-[#2563EB]">
                V
              </span>
            </div>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4" /> Changer
            </Button>
          </div>
        </Field>

        <FormRow>
          <Field label="URL du site">
            <input className={inputClass} defaultValue="https://verifscan.sn" />
          </Field>
          <Field label="Email de contact">
            <input
              className={inputClass}
              defaultValue="contact@verifscan.sn"
            />
          </Field>
        </FormRow>

        <FormRow>
          <Field label="Téléphone">
            <input className={inputClass} defaultValue="+221 77 123 45 67" />
          </Field>
          <Field label="Fuseau horaire">
            <Select defaultValue="Africa/Dakar">
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Dakar">Africa/Dakar (GMT)</SelectItem>
                <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">
                  America/New_York (EST)
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FormRow>

        <FormRow>
          <Field label="Langue par défaut">
            <Select defaultValue="fr">
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
              defaultValue="Dakar, Sénégal"
            />
          </Field>
        </FormRow>
      </div>
      <CardFooter>
        <Button
          onClick={() => toast.success("Paramètres généraux enregistrés")}
        >
          <Save className="h-4 w-4" /> Enregistrer les modifications
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
  { id: "signup", label: "Nouvelle inscription", default: true },
  { id: "payment", label: "Nouveau paiement", default: true },
  { id: "ticket", label: "Ticket support", default: true },
  { id: "security", label: "Alerte sécurité", default: true },
  { id: "quota", label: "Quota dépassé", default: true },
];

function EmailSection() {
  const [encryption, setEncryption] = useState("tls");
  const [notifs, setNotifs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ADMIN_NOTIFS.map((n) => [n.id, n.default]))
  );

  return (
    <div className="space-y-6">
      {/* SMTP */}
      <Card>
        <CardHeader
          title="Configuration SMTP"
          subtitle="Serveur d'envoi d'emails transactionnels"
        />
        <div className="space-y-5 p-5">
          <FormRow>
            <Field label="Serveur SMTP">
              <input
                className={inputClass}
                defaultValue="smtp.gmail.com"
              />
            </Field>
            <Field label="Port">
              <input className={inputClass} defaultValue="587" />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Utilisateur">
              <input
                className={inputClass}
                defaultValue="noreply@verifscan.sn"
              />
            </Field>
            <Field label="Mot de passe">
              <PasswordInput defaultValue="***************" />
            </Field>
          </FormRow>
          <Field label="Chiffrement">
            <RadioGroup
              value={encryption}
              onValueChange={setEncryption}
              className="flex flex-wrap gap-5 pt-1"
            >
              {[
                { v: "tls", l: "TLS" },
                { v: "ssl", l: "SSL" },
                { v: "none", l: "Aucun" },
              ].map((o) => (
                <label
                  key={o.v}
                  className="inline-flex cursor-pointer items-center gap-2 text-[14px] text-[#374151]"
                >
                  <RadioGroupItem value={o.v} />
                  {o.l}
                </label>
              ))}
            </RadioGroup>
          </Field>
        </div>
        <CardFooter className="justify-between">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#065F46]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D1FAE5] text-[10px]">
              ✅
            </span>
            Connexion réussie
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => toast.success("Test SMTP — Connexion réussie")}
            >
              <RefreshCw className="h-4 w-4" /> Tester la connexion
            </Button>
            <Button onClick={() => toast.success("Configuration SMTP enregistrée")}>
              <Save className="h-4 w-4" /> Enregistrer
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader
          title="Templates d'emails"
          subtitle="Personnalisez les emails envoyés aux utilisateurs"
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

      {/* Admin notifications */}
      <Card>
        <CardHeader
          title="Notifications administrateur"
          subtitle="Alertes reçues par email"
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
                  checked={notifs[n.id]}
                  onCheckedChange={(v) =>
                    setNotifs((prev) => ({ ...prev, [n.id]: v }))
                  }
                  aria-label={n.label}
                />
              </label>
            ))}
          </div>
          <Field
            label="Email destinataire"
            className="max-w-md"
          >
            <input className={inputClass} defaultValue="admin@verifscan.sn" />
          </Field>
        </div>
        <CardFooter>
          <Button
            onClick={() => toast.success("Notifications enregistrées")}
          >
            <Save className="h-4 w-4" /> Enregistrer
          </Button>
        </CardFooter>
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
      webhook: "https://api.verifscan.sn/webhooks/cinetpay",
    },
    stripe: {
      enabled: false,
      connected: false,
      mode: "test",
      webhook: "https://api.verifscan.sn/webhooks/stripe",
    },
    orange: {
      enabled: true,
      connected: true,
      mode: "production",
      webhook: "https://api.verifscan.sn/webhooks/orange-money",
    },
    wave: {
      enabled: false,
      connected: false,
      mode: "test",
      webhook: "https://api.verifscan.sn/webhooks/wave",
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
                    <span className={p.enabled ? "text-[#2563EB]" : "text-[#9CA3AF]"}>
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
                    className="data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB]"
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
              defaultValue={"https://verifscan.sn\nhttps://admin.verifscan.sn\nhttps://app.verifscan.sn"}
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
                    className="data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB]"
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
 * Section: API & Integrations
 * ========================================================== */

const WEBHOOKS = [
  {
    id: "wh_1",
    url: "https://erp.example.com/hooks/verifscan",
    events: "product.created, product.updated",
  },
  {
    id: "wh_2",
    url: "https://billing.example.com/verifscan",
    events: "payment.received, subscription.expired",
  },
];

function ApiSection() {
  const [apiKey] = useState("sk_live_4f2c8d9a1b7e3f6c5d8a2b9e4f7c1d8a");
  const maskedKey = `${apiKey.slice(0, 12)}${"•".repeat(16)}`;

  return (
    <Card>
      <CardHeader
        title="API & Intégrations"
        subtitle="Clés, webhooks et documentation"
      />
      <div className="space-y-6 p-5">
        <Field label="API publique — base URL">
          <div className="flex gap-2">
            <ReadOnlyField value="https://api.verifscan.sn/v1" />
            <CopyButton value="https://api.verifscan.sn/v1" label="" />
          </div>
        </Field>

        <Field label="Clé API" hint="Utilisée pour authentifier les requêtes API">
          <div className="flex flex-wrap gap-2">
            <ReadOnlyField value={maskedKey} className="flex-1 min-w-[220px]" />
            <Button
              variant="outline"
              onClick={() =>
                toast.success("Nouvelle clé API générée", {
                  description: "L'ancienne clé ne fonctionnera plus.",
                })
              }
            >
              <KeyRound className="h-4 w-4" /> Régénérer
            </Button>
          </div>
        </Field>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[14px] font-medium text-[#374151]">Webhooks</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Ajout d'un nouveau webhook")}
            >
              <Plus className="h-4 w-4" /> Ajouter un webhook
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-left text-[12px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  <th className="px-4 py-2.5">URL</th>
                  <th className="px-4 py-2.5">Événements</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {WEBHOOKS.map((w) => (
                  <tr key={w.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-4 py-3">
                      <span className="block max-w-[280px] truncate font-mono text-[13px] text-[#111827]">
                        {w.url}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-[#6B7280]">
                        {w.events}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => toast.info("Édition du webhook")}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                          aria-label="Éditer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.error("Webhook supprimé")}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#FEE2E2] hover:text-[#EF4444]"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
          <div>
            <p className="text-[14px] font-medium text-[#111827]">
              Documentation API
            </p>
            <p className="text-[12px] text-[#6B7280]">
              Référence complète, exemples cURL et SDK
            </p>
          </div>
          <a
            href="https://docs.verifscan.sn"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-4 text-[14px] font-semibold text-[#2563EB] transition-colors hover:bg-[#EFF6FF]"
          >
            Voir la docs <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </Card>
  );
}

/* ============================================================
 * Section: Appearance
 * ========================================================== */

const COLOR_SWATCHES = [
  "#2563EB",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
];

function AppearanceSection() {
  const [theme, setTheme] = useState("light");
  const [primary, setPrimary] = useState("#2563EB");

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
                    ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
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
                    ? "ring-2 ring-offset-2 ring-[#2563EB] ring-offset-white"
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
                <Logo showText={false} />
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
              <span className={maintenance ? "text-[#2563EB]" : "text-[#9CA3AF]"}>
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
            <Database className="h-5 w-5 text-[#2563EB]" />
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
