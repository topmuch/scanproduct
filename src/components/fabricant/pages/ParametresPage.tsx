"use client";

import { useState, useRef, useCallback, useEffect, type ComponentType, type ReactNode } from "react";
import {
  Building2,
  Image as ImageIcon,
  Mail,
  Shield,
  Bell,
  Plug,
  Database,
  Check,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  Trash2,
  Download,
  Smartphone,
  Globe,
  ChevronDown,
  Upload,
  Loader2,
  AlertCircle,
  Camera,
} from "lucide-react";
import {
  PageHeader,
  SectionCard,
  GradientButton,
  OutlineButton,
  PillFilter,
} from "@/components/fabricant/ui";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { useFabricantData } from "../FabricantDataProvider";
import { useFabricantNav, type SettingsSection } from "@/lib/fabricant-store";
import { getScanUrl } from "@/lib/qr-utils";
import { cn } from "@/lib/utils";

// Sessions & login journal — no model in the schema yet. We render a
// "Bientôt disponible" note where they were shown.
const SESSIONS: {
  id: string;
  appareil: string;
  localisation: string;
  ip: string;
  derniereActivite: string;
  actuelle: boolean;
}[] = [];

const JOURNAL_CONNEXION: {
  id: string;
  date: string;
  appareil: string;
  localisation: string;
  ip: string;
  status: string;
}[] = [];

// ============================================================================
// Shared constants
// ============================================================================

const NAV_ITEMS: {
  id: SettingsSection;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { id: "entreprise", label: "Informations entreprise", icon: Building2 },
  { id: "logo", label: "Logo et marque", icon: ImageIcon },
  { id: "contact", label: "Contact", icon: Mail },
  { id: "securite", label: "Sécurité", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Intégrations", icon: Plug },
  { id: "donnees", label: "Données et confidentialité", icon: Database },
];

const SECTEURS = ["Agroalimentaire", "Boissons", "Boulangerie", "Cosmétiques", "Autre"];
const REGIONS = ["Dakar", "Thiès", "Saint-Louis", "Kaolack", "Ziguinchor", "Diourbel", "Tambacounda", "Matam", "Kolda", "Sédhiou", "Kaffrine", "Louga", "Fatick"];
const PAYS = ["Sénégal", "Mali", "Côte d'Ivoire", "Gambie", "Mauritanie", "Burkina Faso", "Guinée", "Bénin", "Togo"];

const inputClass =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10 transition-colors";

// ============================================================================
// Reusable field primitives
// ============================================================================

function Field({
  label,
  required,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-[#374151]">
        {label} {required && <span className="text-[#EF4444]">*</span>}
      </label>
      {children}
      {helper && <p className="mt-1 text-[12px] text-[#6B7280]">{helper}</p>}
    </div>
  );
}

function SelectInput({
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className={cn("relative", className)}>
      <select {...props} className={cn(inputClass, "appearance-none pr-9")}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30",
        checked ? "bg-[#2563EB]" : "bg-[#D1D5DB]"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-[20px] font-semibold text-[#111827]">{children}</h2>;
}

function SaveRow({ children }: { children: ReactNode }) {
  return <div className="flex justify-end">{children}</div>;
}

function Badge({
  bg,
  text,
  label,
}: {
  bg: string;
  text: string;
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}

// ============================================================================
// Upload + color helpers
// ============================================================================

function UploadZone({
  onUploaded,
  currentUrl,
  label = "votre logo",
}: {
  onUploaded?: (url: string) => void;
  currentUrl?: string;
  label?: string;
}) {
  const [imageUrl, setImageUrl] = useState<string>(currentUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Veuillez sélectionner un fichier image.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"].includes(file.type)) {
      setError("Format non supporté. Utilisez PNG, JPG, SVG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Le fichier dépasse 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Échec de l'upload.");
        return;
      }
      setImageUrl(data.url);
      onUploaded?.(data.url);
    } catch {
      setError("Erreur réseau lors de l'upload.");
    } finally {
      setUploading(false);
    }
  }, [onUploaded]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="hidden"
      />
      {imageUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          <img
            src={imageUrl}
            alt="Logo"
            className="mx-auto h-[160px] w-full max-w-[300px] object-contain bg-[#F9FAFB]"
          />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2.5 py-1.5 text-[12px] font-medium text-[#374151] shadow-sm hover:bg-white disabled:opacity-60"
            >
              <Camera className="h-3.5 w-3.5" /> Changer
            </button>
            <button
              type="button"
              onClick={() => {
                setImageUrl("");
                setError(null);
                onUploaded?.("");
              }}
              className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2.5 py-1.5 text-[12px] font-medium text-[#EF4444] shadow-sm hover:bg-white"
            >
              <X className="h-3.5 w-3.5" /> Retirer
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          disabled={uploading}
          className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors disabled:cursor-not-allowed ${
            dragActive
              ? "border-[#2563EB] bg-[#EFF6FF]"
              : "border-[#D1D5DB] bg-[#F9FAFB] hover:border-[#2563EB] hover:bg-[#EFF6FF]/50"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#2563EB]" />
              <p className="text-[14px] font-medium text-[#2563EB]">Upload en cours…</p>
            </>
          ) : (
            <>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#2563EB] shadow-sm">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-[14px] font-medium text-[#374151]">
                Glissez-déposez {label} ici
              </p>
              <p className="mt-1 text-[12px] text-[#6B7280]">ou cliquez pour parcourir</p>
              <p className="mt-3 text-[11px] text-[#9CA3AF]">PNG, JPG, SVG, WebP (max 5MB)</p>
            </>
          )}
        </button>
      )}
      {error && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-2 text-[12px] text-[#B91C1C]">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function LogoPreview({ initials }: { initials: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full border-2 border-[#E5E7EB] bg-gradient-to-br from-[#2563EB] to-[#10B981] font-display text-[36px] font-bold text-white">
        {initials}
      </div>
      <p className="text-[12px] text-[#6B7280]">Logo actuel</p>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] font-medium text-[#374151]">{label}</p>
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-full border border-[#E5E7EB]"
          style={{ backgroundColor: value }}
          aria-hidden
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-28 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 font-mono text-sm text-[#111827] focus:border-[#2563EB] focus:outline-none"
        />
        <div
          className="h-8 w-16 rounded-lg border border-[#E5E7EB]"
          style={{ backgroundColor: value }}
          aria-hidden
        />
      </div>
    </div>
  );
}

// ============================================================================
// Password strength
// ============================================================================

function computePasswordStrength(pw: string) {
  const checks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;
  let label = "";
  let level = 0;
  if (pw.length === 0) {
    label = "—";
    level = 0;
  } else if (score <= 1) {
    label = "Faible";
    level = 1;
  } else if (score === 2) {
    label = "Moyen";
    level = 2;
  } else if (score === 3) {
    label = "Fort";
    level = 3;
  } else {
    label = "Très fort";
    level = 4;
  }
  return { checks, score, label, level };
}

const STRENGTH_COLORS = ["#E5E7EB", "#EF4444", "#F59E0B", "#EAB308", "#10B981"];

function PasswordStrengthBar({ pw }: { pw: string }) {
  const { label, level } = computePasswordStrength(pw);
  return (
    <div>
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ backgroundColor: i <= level ? STRENGTH_COLORS[level] : "#E5E7EB" }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[12px] text-[#6B7280]">
        Force du mot de passe :{" "}
        <span className="font-medium" style={{ color: pw.length ? STRENGTH_COLORS[level] : "#6B7280" }}>
          {label}
        </span>
      </p>
    </div>
  );
}

function RequirementRow({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      {met ? (
        <Check className="h-3.5 w-3.5 text-[#10B981]" />
      ) : (
        <X className="h-3.5 w-3.5 text-[#9CA3AF]" />
      )}
      <span className={met ? "text-[#374151]" : "text-[#9CA3AF]"}>{label}</span>
    </div>
  );
}

// ============================================================================
// Section: Entreprise
// ============================================================================

const SOCIALS = [
  { id: "fb", label: "Facebook", placeholder: "https://facebook.com/monentreprise", badge: "f", color: "#1877F2" },
  { id: "ig", label: "Instagram", placeholder: "https://instagram.com/monentreprise", badge: "i", color: "#E1306C" },
  { id: "li", label: "LinkedIn", placeholder: "https://linkedin.com/company/monentreprise", badge: "in", color: "#0A66C2" },
  { id: "tw", label: "Twitter", placeholder: "https://twitter.com/monentreprise", badge: "X", color: "#111827" },
];

function EntrepriseSection() {
  const { data } = useFabricantData();
  const profile = data.profile;
  const [description, setDescription] = useState(profile.description ?? "");
  return (
    <div className="space-y-6">
      <SectionTitle>Informations entreprise</SectionTitle>

      <SectionCard>
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nom de l'entreprise" required>
              <input className={inputClass} defaultValue={profile.companyName} />
            </Field>
            <Field label="Secteur d'activité">
              <SelectInput defaultValue={profile.sector ?? "Agroalimentaire"}>
                {SECTEURS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              className={cn(inputClass, "min-h-[100px] resize-y")}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Décrivez votre entreprise en quelques mots…"
            />
            <p className="mt-1 text-right text-[12px] text-[#6B7280]">{description.length}/500</p>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Année de création">
              <input className={inputClass} type="number" placeholder="2015" defaultValue={profile.yearFounded ?? ""} />
            </Field>
            <Field label="Site web">
              <input className={inputClass} placeholder="https://www.monentreprise.sn" defaultValue={profile.website ?? ""} />
            </Field>
          </div>

          <Field label="Réseaux sociaux">
            <div className="grid gap-3 sm:grid-cols-2">
              {SOCIALS.map((s) => (
                <div key={s.id} className="relative">
                  <span
                    className="pointer-events-none absolute left-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.badge}
                  </span>
                  <input
                    className={cn(inputClass, "pl-10")}
                    placeholder={s.placeholder}
                    defaultValue={
                      s.id === "fb" ? profile.facebook ?? "" :
                      s.id === "ig" ? profile.instagram ?? "" :
                      s.id === "li" ? profile.linkedin ?? "" :
                      ""
                    }
                    aria-label={s.label}
                  />
                </div>
              ))}
            </div>
          </Field>

          <Field label="Numéro d'identification fiscale">
            <input className={inputClass} placeholder="SN123456789" defaultValue={profile.taxId ?? ""} />
          </Field>
        </div>
      </SectionCard>

      <SaveRow>
        <GradientButton>Enregistrer</GradientButton>
      </SaveRow>
    </div>
  );
}

// ============================================================================
// Section: Logo et marque
// ============================================================================

function LogoSection() {
  const { data } = useFabricantData();
  const profile = data.profile;
  const [primary, setPrimary] = useState(profile.brandColor);
  const [secondary, setSecondary] = useState("#10B981");
  // Lifted state so the preview alongside the upload zone stays in sync with
  // what the user just uploaded (the /api/upload endpoint returns
  // { url: "/uploads/<uuid>.<ext>" }).
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl ?? "");
  const [qrLogoUrl, setQrLogoUrl] = useState("");

  return (
    <div className="space-y-6">
      <SectionTitle>Logo et marque</SectionTitle>

      <SectionCard title="Logo entreprise">
        <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <UploadZone
            label="votre logo entreprise"
            currentUrl={logoUrl}
            onUploaded={setLogoUrl}
          />
          {logoUrl ? (
            <div className="flex flex-col items-center gap-2">
              <img
                src={logoUrl}
                alt="Logo entreprise"
                className="h-[120px] w-[120px] rounded-full border-2 border-[#E5E7EB] bg-[#F9FAFB] object-contain"
              />
              <p className="text-[12px] text-[#6B7280]">Logo actuel</p>
            </div>
          ) : (
            <LogoPreview initials={profile.logo} />
          )}
        </div>
        <ul className="mt-5 space-y-1.5 border-t border-[#F3F4F6] pt-4 text-[12px] text-[#6B7280]">
          <li className="flex items-center gap-2"><span className="text-[#9CA3AF]">•</span> Dimensions recommandées : 400×400px</li>
          <li className="flex items-center gap-2"><span className="text-[#9CA3AF]">•</span> Fond transparent recommandé</li>
          <li className="flex items-center gap-2"><span className="text-[#9CA3AF]">•</span> Format SVG optimal pour la netteté</li>
        </ul>
      </SectionCard>

      <SectionCard title="Logo pour QR codes">
        <div className="grid items-start gap-6 sm:grid-cols-2">
          <div>
            <UploadZone
              label="votre logo QR codes"
              currentUrl={qrLogoUrl}
              onUploaded={setQrLogoUrl}
            />
            <p className="mt-3 text-[13px] text-[#6B7280]">
              Ce logo apparaîtra au centre de vos QR codes.
            </p>
          </div>

          {/* Live QR code preview — shows the uploaded logo embedded in the
              center via qrcode.react's imageSettings. When no logo is set,
              the QR code is shown plain so the user can still preview it. */}
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
              <QRCodeCanvas
                value={getScanUrl("preview")}
                size={160}
                level="H"
                marginSize={1}
                fgColor="#0F172A"
                bgColor="#FFFFFF"
                imageSettings={
                  qrLogoUrl
                    ? {
                        src: qrLogoUrl,
                        height: 24,
                        width: 24,
                        excavate: true,
                      }
                    : undefined
                }
              />
            </div>
            <p className="text-[12px] text-[#6B7280]">
              {qrLogoUrl ? "Aperçu QR avec logo" : "Aperçu QR (sans logo)"}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Couleurs de marque">
        <div className="space-y-4">
          <ColorField label="Couleur principale" value={primary} onChange={setPrimary} />
          <ColorField label="Couleur secondaire" value={secondary} onChange={setSecondary} />
        </div>
      </SectionCard>

      <SectionCard title="Nom de la marque">
        <Field
          label="Nom de la marque"
          helper="Utilisé sur vos pages produits et QR codes."
        >
          <input className={inputClass} defaultValue={profile.companyName} />
        </Field>
      </SectionCard>

      <SaveRow>
        <GradientButton>Enregistrer</GradientButton>
      </SaveRow>
    </div>
  );
}

// ============================================================================
// Section: Contact
// ============================================================================

function ContactSection() {
  return (
    <div className="space-y-6">
      <SectionTitle>Contact</SectionTitle>

      <SectionCard>
        <div className="space-y-5">
          <Field
            label="Email de contact"
            required
            helper="Visible sur vos pages produits."
          >
            <input className={inputClass} type="email" defaultValue="contact@monentreprise.sn" />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Téléphone" required>
              <div className="flex">
                <span className="inline-flex items-center gap-1.5 rounded-l-lg border border-r-0 border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-sm text-[#374151]">
                  <span>🇸🇳</span>
                  <span>+221</span>
                </span>
                <input
                  className={cn(inputClass, "rounded-l-none")}
                  defaultValue="77 123 45 67"
                />
              </div>
            </Field>
            <Field
              label="WhatsApp"
              helper="Numéro WhatsApp pour le bouton contact."
            >
              <input className={inputClass} placeholder="77 123 45 67" />
            </Field>
          </div>

          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <p className="mb-3 text-[13px] font-semibold text-[#374151]">Adresse physique</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rue">
                <input className={inputClass} placeholder="Avenue Cheikh Anta Diop" />
              </Field>
              <Field label="Ville">
                <input className={inputClass} placeholder="Dakar" />
              </Field>
              <Field label="Région">
                <SelectInput defaultValue="Dakar">
                  {REGIONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Pays">
                <SelectInput defaultValue="Sénégal">
                  {PAYS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Code postal">
                <input className={inputClass} placeholder="00000" />
              </Field>
            </div>
          </div>

          <Field label="Horaires d'ouverture">
            <input
              className={inputClass}
              placeholder="Lun-Ven : 8h-18h, Sam : 9h-13h"
            />
          </Field>
        </div>
      </SectionCard>

      <SaveRow>
        <GradientButton>Enregistrer</GradientButton>
      </SaveRow>
    </div>
  );
}

// ============================================================================
// Section: Sécurité
// ============================================================================

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputClass, "pr-10")}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#2563EB]"
        aria-label={show ? "Masquer" : "Afficher"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SecuriteSection() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [journalRange, setJournalRange] = useState<"7j" | "30j" | "90j">("7j");

  const { checks } = computePasswordStrength(newPw);
  const confirmMatch =
    confirmPw.length === 0 ? null : confirmPw === newPw;

  return (
    <div className="space-y-6">
      <SectionTitle>Sécurité</SectionTitle>

      {/* Changer le mot de passe */}
      <SectionCard title="Changer le mot de passe">
        <div className="space-y-4">
          <Field label="Mot de passe actuel" required>
            <PasswordInput
              value={currentPw}
              onChange={setCurrentPw}
              placeholder="••••••••"
            />
          </Field>

          <Field label="Nouveau mot de passe" required>
            <PasswordInput
              value={newPw}
              onChange={setNewPw}
              placeholder="••••••••"
            />
          </Field>
          <PasswordStrengthBar pw={newPw} />

          <div className="grid gap-1.5 rounded-lg bg-[#F9FAFB] p-3 sm:grid-cols-2">
            <RequirementRow met={checks.length} label="Min. 8 caractères" />
            <RequirementRow met={checks.upper} label="1 majuscule" />
            <RequirementRow met={checks.lower} label="1 minuscule" />
            <RequirementRow met={checks.number} label="1 chiffre" />
            <RequirementRow met={checks.special} label="1 caractère spécial" />
          </div>

          <Field label="Confirmer le mot de passe" required>
            <PasswordInput
              value={confirmPw}
              onChange={setConfirmPw}
              placeholder="••••••••"
            />
          </Field>
          {confirmMatch !== null && (
            <p
              className={cn(
                "text-[12px] font-medium",
                confirmMatch ? "text-[#10B981]" : "text-[#EF4444]"
              )}
            >
              {confirmMatch
                ? "✓ Les mots de passe correspondent"
                : "✗ Les mots de passe ne correspondent pas"}
            </p>
          )}

          <SaveRow>
            <GradientButton>Changer le mot de passe</GradientButton>
          </SaveRow>
        </div>
      </SectionCard>

      {/* 2FA */}
      <SectionCard title="Authentification à deux facteurs (2FA)">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge bg="#F3F4F6" text="#6B7280" label="Désactivée" />
            </div>
            <p className="text-[13px] text-[#6B7280]">
              Renforcez la sécurité de votre compte avec une seconde étape de vérification (SMS ou app d'authentification).
            </p>
            <ul className="space-y-1 pt-1">
              <li className="flex items-center gap-2 text-[13px] text-[#374151]">
                <Check className="h-4 w-4 text-[#10B981]" /> Protection contre les accès non autorisés
              </li>
              <li className="flex items-center gap-2 text-[13px] text-[#374151]">
                <Check className="h-4 w-4 text-[#10B981]" /> Code à usage unique à chaque connexion
              </li>
              <li className="flex items-center gap-2 text-[13px] text-[#374151]">
                <Check className="h-4 w-4 text-[#10B981]" /> Notification immédiate en cas de tentative
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <GradientButton>Activer la 2FA</GradientButton>
        </div>
      </SectionCard>

      {/* Appareils connectés */}
      <SectionCard
        title="Appareils connectés"
        action={
          <OutlineButton className="border-[#FEE2E2] text-[#EF4444] hover:bg-[#FEF2F2]">
            Déconnecter toutes les autres sessions
          </OutlineButton>
        }
      >
        <div className="space-y-3">
          {SESSIONS.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-8 text-center text-[13px] text-[#6B7280]">
              Sessions actives — bientôt disponible.
            </p>
          ) : (
            SESSIONS.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#111827]">{s.appareil}</p>
                  <p className="text-[12px] text-[#6B7280]">
                    {s.localisation} · <span className="font-mono">{s.ip}</span> · {s.derniereActivite}
                  </p>
                </div>
              </div>
              {s.actuelle ? (
                <Badge bg="#D1FAE5" text="#065F46" label="Session actuelle" />
              ) : (
                <OutlineButton className="border-[#FEE2E2] text-[#EF4444] hover:bg-[#FEF2F2]">
                  Déconnecter
                </OutlineButton>
              )}
            </div>
            ))
          )}
        </div>
      </SectionCard>

      {/* Journal de connexion */}
      <SectionCard
        title="Journal de connexion"
        action={
          <PillFilter
            options={[
              { value: "7j", label: "7 jours" },
              { value: "30j", label: "30 jours" },
              { value: "90j", label: "90 jours" },
            ]}
            value={journalRange}
            onChange={setJournalRange}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#F3F4F6] text-[12px] uppercase text-[#6B7280]">
                <th className="py-2 pr-3 font-medium">Date / heure</th>
                <th className="py-2 pr-3 font-medium">Appareil</th>
                <th className="py-2 pr-3 font-medium">Localisation</th>
                <th className="py-2 pr-3 font-medium">IP</th>
                <th className="py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {JOURNAL_CONNEXION.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[13px] text-[#6B7280]">
                    Journal de connexion — bientôt disponible.
                  </td>
                </tr>
              ) : (
                JOURNAL_CONNEXION.map((j) => (
                  <tr key={j.id} className="border-b border-[#F3F4F6] last:border-0">
                    <td className="py-3 pr-3 text-[#374151]">{j.date}</td>
                    <td className="py-3 pr-3 text-[#374151]">{j.appareil}</td>
                    <td className="py-3 pr-3 text-[#6B7280]">{j.localisation}</td>
                    <td className="py-3 pr-3 font-mono text-[12px] text-[#6B7280]">{j.ip}</td>
                    <td className="py-3">
                      {j.status === "reussi" ? (
                        <span className="inline-flex items-center gap-1 text-[#065F46]">
                          <Check className="h-3.5 w-3.5" /> Réussi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#991B1B]">
                          <X className="h-3.5 w-3.5" /> Échoué
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

// ============================================================================
// Section: Notifications
// ----------------------------------------------------------------------------
// Real preferences UI — backed by /api/notifications/preferences.
// Reads master toggles (pushEnabled / emailEnabled / smsEnabled) and the
// per-type channel overrides (prefs[type].{in_app,email,sms}).
// Auto-saves with a 500ms debounce + a manual "Enregistrer" button at the
// bottom (for UX parity with the other sections).
// ============================================================================

type NotificationPrefType =
  | "lot_recall"
  | "quota_warning"
  | "quota_exceeded"
  | "new_scan"
  | "weekly_report"
  | "system"
  | "ticket_update"
  | "subscription";

type ChannelPrefs = { in_app: boolean; email: boolean; sms: boolean };

const PREF_TYPE_ROWS: { key: NotificationPrefType; label: string }[] = [
  { key: "lot_recall", label: "Lot rappelé" },
  { key: "quota_warning", label: "Alerte quota (80%)" },
  { key: "quota_exceeded", label: "Quota atteint (100%)" },
  { key: "new_scan", label: "Nouveau scan" },
  { key: "weekly_report", label: "Rapport hebdomadaire" },
  { key: "system", label: "Système" },
  { key: "ticket_update", label: "Mise à jour ticket" },
  { key: "subscription", label: "Abonnement" },
];

const DEFAULT_CHANNEL_PREFS: Record<NotificationPrefType, ChannelPrefs> = {
  lot_recall: { in_app: true, email: true, sms: false },
  quota_warning: { in_app: true, email: true, sms: false },
  quota_exceeded: { in_app: true, email: true, sms: false },
  new_scan: { in_app: true, email: false, sms: false },
  weekly_report: { in_app: true, email: true, sms: false },
  system: { in_app: true, email: true, sms: false },
  ticket_update: { in_app: true, email: true, sms: false },
  subscription: { in_app: true, email: true, sms: false },
};

type NotifPrefsState = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  prefs: Record<NotificationPrefType, ChannelPrefs>;
};

function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotifPrefsState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialLoadRef = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----- Initial fetch ----------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notifications/preferences", { cache: "no-store" });
        if (!res.ok) {
          toast.error("Impossible de charger vos préférences");
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        const incoming: Record<NotificationPrefType, ChannelPrefs> = { ...DEFAULT_CHANNEL_PREFS };
        for (const row of PREF_TYPE_ROWS) {
          const p = json.prefs?.[row.key];
          incoming[row.key] = {
            in_app: typeof p?.in_app === "boolean" ? p.in_app : DEFAULT_CHANNEL_PREFS[row.key].in_app,
            email: typeof p?.email === "boolean" ? p.email : DEFAULT_CHANNEL_PREFS[row.key].email,
            sms: typeof p?.sms === "boolean" ? p.sms : DEFAULT_CHANNEL_PREFS[row.key].sms,
          };
        }
        setPrefs({
          pushEnabled: typeof json.pushEnabled === "boolean" ? json.pushEnabled : true,
          emailEnabled: typeof json.emailEnabled === "boolean" ? json.emailEnabled : true,
          smsEnabled: typeof json.smsEnabled === "boolean" ? json.smsEnabled : false,
          prefs: incoming,
        });
      } catch {
        toast.error("Erreur réseau lors du chargement");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ----- Debounced auto-save ---------------------------------------------

  const persistPrefs = useCallback(async (next: NotifPrefsState) => {
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pushEnabled: next.pushEnabled,
          emailEnabled: next.emailEnabled,
          smsEnabled: next.smsEnabled,
          prefs: next.prefs,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Préférences enregistrées");
    } catch {
      toast.error("Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (!loaded || !prefs) return;
    // Skip the very first run (right after the initial fetch hydrated state).
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persistPrefs(prefs);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [prefs, loaded, persistPrefs]);

  // ----- Handlers ---------------------------------------------------------

  const updateChannel = (
    key: NotificationPrefType,
    channel: "in_app" | "email" | "sms",
    value: boolean,
  ) => {
    if (!prefs) return;
    setPrefs({
      ...prefs,
      prefs: {
        ...prefs.prefs,
        [key]: { ...prefs.prefs[key], [channel]: value },
      },
    });
  };

  const updateGlobal = (
    key: "pushEnabled" | "emailEnabled" | "smsEnabled",
    value: boolean,
  ) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: value });
  };

  const handleManualSave = () => {
    if (!prefs) return;
    // Flush any pending debounced save immediately.
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    persistPrefs(prefs);
  };

  // ----- Render -----------------------------------------------------------

  if (!loaded || !prefs) {
    return (
      <div className="space-y-6">
        <SectionTitle>Notifications</SectionTitle>
        <SectionCard title="Préférences de notification" subtitle="Choisissez comment vous souhaitez être informé">
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle>Notifications</SectionTitle>

      <SectionCard
        title="Préférences de notification"
        subtitle="Choisissez comment vous souhaitez être informé"
        action={
          saving ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-[#6B7280]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Enregistrement...
            </span>
          ) : null
        }
      >
        <div className="space-y-6">
          {/* Global master toggles */}
          <div className="grid gap-3 sm:grid-cols-3">
            <GlobalToggleCard
              icon={<Globe className="h-4 w-4" />}
              iconColor="#2563EB"
              iconBg="#EFF6FF"
              label="Notifications in-app"
              description="Afficher les notifications dans la barre de navigation."
              checked={prefs.pushEnabled}
              onCheckedChange={(v) => updateGlobal("pushEnabled", v)}
            />
            <GlobalToggleCard
              icon={<Mail className="h-4 w-4" />}
              iconColor="#10B981"
              iconBg="#D1FAE5"
              label="Notifications par email"
              description="Recevoir un email pour chaque notification déclenchée."
              checked={prefs.emailEnabled}
              onCheckedChange={(v) => updateGlobal("emailEnabled", v)}
            />
            <GlobalToggleCard
              icon={<Smartphone className="h-4 w-4" />}
              iconColor="#F59E0B"
              iconBg="#FEF3C7"
              label="Notifications par SMS"
              description="SMS pour les alertes critiques."
              checked={prefs.smsEnabled}
              onCheckedChange={(v) => updateGlobal("smsEnabled", v)}
              disabled
              badge="Bientôt disponible"
            />
          </div>

          {/* Per-type table */}
          <div>
            <p className="mb-2 text-[13px] font-semibold text-[#374151] dark:text-white/80">
              Préférences par type de notification
            </p>
            <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] dark:border-white/10">
              <table className="w-full min-w-[480px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#F9FAFB] dark:bg-white/5">
                    <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-white/60">
                      Type de notification
                    </th>
                    <th className="px-4 py-3 text-center text-[12px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-white/60">
                      In-app
                    </th>
                    <th className="px-4 py-3 text-center text-[12px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-white/60">
                      Email
                    </th>
                    <th className="px-4 py-3 text-center text-[12px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-white/60">
                      SMS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PREF_TYPE_ROWS.map((row, idx) => {
                    const p = prefs.prefs[row.key];
                    return (
                      <tr
                        key={row.key}
                        className={cn(
                          "border-t border-[#F3F4F6] dark:border-white/5",
                          idx % 2 === 1 && "bg-[#FAFAFA] dark:bg-white/[0.02]",
                        )}
                      >
                        <td className="px-4 py-3 text-[13px] font-medium text-[#111827] dark:text-white">
                          {row.label}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <Switch
                              checked={p.in_app && prefs.pushEnabled}
                              onCheckedChange={(v) => updateChannel(row.key, "in_app", v)}
                              disabled={!prefs.pushEnabled}
                              aria-label={`${row.label} - In-app`}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <Switch
                              checked={p.email && prefs.emailEnabled}
                              onCheckedChange={(v) => updateChannel(row.key, "email", v)}
                              disabled={!prefs.emailEnabled}
                              aria-label={`${row.label} - Email`}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <Switch
                              checked={p.sms && prefs.smsEnabled}
                              onCheckedChange={(v) => updateChannel(row.key, "sms", v)}
                              disabled
                              aria-label={`${row.label} - SMS`}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12px] text-[#9CA3AF]">
              💡 Les notifications sont toujours créées dans la base. Les préférences contrôlent seulement les canaux de diffusion.
            </p>
          </div>
        </div>
      </SectionCard>

      <SaveRow>
        <GradientButton onClick={handleManualSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Enregistrer les préférences
        </GradientButton>
      </SaveRow>
    </div>
  );
}

function GlobalToggleCard({
  icon,
  iconColor,
  iconBg,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  badge,
}: {
  icon: ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-3 rounded-lg border p-4 transition-colors",
        disabled
          ? "border-[#E5E7EB] bg-[#F9FAFB] dark:border-white/10 dark:bg-white/5"
          : "border-[#E5E7EB] bg-white dark:border-white/10 dark:bg-white/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-label={label} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-[#111827] dark:text-white">{label}</p>
          {badge && (
            <span className="rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-semibold text-[#92400E]">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12px] text-[#6B7280] dark:text-white/60">{description}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Section: Intégrations
// ============================================================================

type Integration = {
  id: string;
  emoji: string;
  name: string;
  category: string;
  description: string;
  connected: boolean;
};

const INTEGRATIONS: Integration[] = [
  {
    id: "cloudinary",
    emoji: "🖼️",
    name: "Cloudinary",
    category: "Images",
    description: "Hébergement et optimisation automatique des photos de produits.",
    connected: true,
  },
  {
    id: "orange-money",
    emoji: "🟠",
    name: "Orange Money API",
    category: "Paiements",
    description: "Encaissement des abonnements via Orange Money.",
    connected: true,
  },
  {
    id: "wave",
    emoji: "🌊",
    name: "Wave API",
    category: "Paiements",
    description: "Encaissement des abonnements via Wave.",
    connected: false,
  },
  {
    id: "slack",
    emoji: "💬",
    name: "Slack",
    category: "Notifications",
    description: "Recevez les alertes critiques sur votre canal Slack.",
    connected: false,
  },
];

function IntegrationsSection() {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [toast, setToast] = useState<string | null>(null);

  const toggleConnection = (id: string) => {
    setIntegrations((prev) => {
      const updated = prev.map((it) =>
        it.id === id ? { ...it, connected: !it.connected } : it
      );
      const it = updated.find((i) => i.id === id);
      if (it) {
        setToast(
          it.connected
            ? `✅ ${it.name} connecté avec succès`
            : `⚠️ ${it.name} déconnecté`
        );
      }
      return updated;
    });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6">
      <SectionTitle>Intégrations</SectionTitle>

      {toast && (
        <div className="fixed left-1/2 top-5 z-[60] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-xl border border-[#10B981]/30 bg-white px-4 py-2.5 text-[13px] font-semibold text-[#065F46] shadow-lg">
            {toast}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((it) => (
          <SectionCard key={it.id}>
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F9FAFB] text-[24px]">
                  {it.emoji}
                </div>
                {it.connected ? (
                  <Badge bg="#D1FAE5" text="#065F46" label="Connecté" />
                ) : (
                  <Badge bg="#F3F4F6" text="#6B7280" label="Non connecté" />
                )}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#111827]">{it.name}</p>
                <p className="text-[12px] text-[#6B7280]">{it.category}</p>
              </div>
              <p className="text-[13px] text-[#6B7280]">{it.description}</p>
              <div className="pt-1">
                {it.connected ? (
                  <OutlineButton className="w-full" onClick={() => toggleConnection(it.id)}>
                    Déconnecter
                  </OutlineButton>
                ) : (
                  <GradientButton className="w-full" onClick={() => toggleConnection(it.id)}>
                    Connecter
                  </GradientButton>
                )}
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Section: Données et confidentialité
// ============================================================================

function DonneesSection() {
  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    shareStats: true,
    cookies: false,
  });

  return (
    <div className="space-y-6">
      <SectionTitle>Données et confidentialité</SectionTitle>

      {/* Vos données */}
      <SectionCard title="Vos données">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-medium text-[#111827]">Exporter mes données</p>
              <p className="text-[12px] text-[#6B7280]">
                Téléchargez l'ensemble des données de votre compte.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <OutlineButton>
                <Download className="h-4 w-4" /> Exporter en JSON
              </OutlineButton>
              <OutlineButton>
                <Download className="h-4 w-4" /> Exporter en CSV
              </OutlineButton>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F3F4F6] pt-4">
            <div>
              <p className="text-[14px] font-medium text-[#111827]">Télécharger toutes les factures</p>
              <p className="text-[12px] text-[#6B7280]">
                Archive ZIP de l'ensemble de vos factures.
              </p>
            </div>
            <OutlineButton>
              <Download className="h-4 w-4" /> Télécharger
            </OutlineButton>
          </div>
        </div>
      </SectionCard>

      {/* Confidentialité */}
      <SectionCard title="Confidentialité">
        <div className="space-y-1">
          {[
            {
              key: "publicProfile",
              label: "Profil public visible",
              desc: "Votre page fabricant est accessible publiquement.",
            },
            {
              key: "shareStats",
              label: "Partager statistiques anonymisées",
              desc: "Aidez-nous à améliorer VerifScan (aucune donnée personnelle).",
            },
            {
              key: "cookies",
              label: "Cookies analytics",
              desc: "Autoriser les cookies de mesure d'audience.",
            },
          ].map((item, idx, arr) => (
            <div
              key={item.key}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 py-3",
                idx !== arr.length - 1 && "border-b border-[#F3F4F6]"
              )}
            >
              <div>
                <p className="text-[14px] font-medium text-[#111827]">{item.label}</p>
                <p className="text-[12px] text-[#6B7280]">{item.desc}</p>
              </div>
              <Toggle
                checked={privacy[item.key as keyof typeof privacy]}
                onChange={(v) =>
                  setPrivacy((prev) => ({ ...prev, [item.key]: v }))
                }
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Zone de danger */}
      <section className="rounded-xl border-2 border-[#FEE2E2] bg-white">
        <div className="flex items-start gap-3 border-b border-[#FEE2E2] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FEE2E2] text-[#EF4444]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-[16px] font-semibold text-[#EF4444]">
              Zone de danger
            </h3>
            <p className="mt-0.5 text-[13px] text-[#6B7280]">
              Ces actions sont irréversibles. Procédez avec prudence.
            </p>
          </div>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-[#EF4444]">Supprimer le compte</p>
              <p className="text-[12px] text-[#6B7280]">
                Cette action est irréversible. Tous vos produits, lots et QR codes seront supprimés.
              </p>
            </div>
            <OutlineButton className="border-[#FEE2E2] bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEE2E2]">
              <Trash2 className="h-4 w-4" /> Supprimer définitivement
            </OutlineButton>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// Main page
// ============================================================================

export function ParametresPage() {
  const { settingsSection, setSettingsSection } = useFabricantNav();

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Gérez votre compte et votre entreprise" />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav className="flex gap-2 overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white p-3 lg:flex-col">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.id === settingsSection;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSettingsSection(item.id)}
                  className={cn(
                    "flex h-11 shrink-0 items-center gap-2.5 rounded-lg border-l-[3px] px-4 text-[14px] font-medium transition-colors",
                    active
                      ? "border-l-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
                      : "border-l-transparent text-[#6B7280] hover:bg-[#F9FAFB]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap lg:whitespace-normal">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Active section content */}
        <div>
          {settingsSection === "entreprise" && <EntrepriseSection />}
          {settingsSection === "logo" && <LogoSection />}
          {settingsSection === "contact" && <ContactSection />}
          {settingsSection === "securite" && <SecuriteSection />}
          {settingsSection === "notifications" && <NotificationsSection />}
          {settingsSection === "integrations" && <IntegrationsSection />}
          {settingsSection === "donnees" && <DonneesSection />}
        </div>
      </div>
    </div>
  );
}
