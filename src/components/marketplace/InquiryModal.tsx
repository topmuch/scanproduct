"use client";

/**
 * VerifScan — Marketplace B2B Inquiry Modal
 *
 * Public-facing modal that lets distributors send a quote request to a
 * fabricant from the B2B catalog. No account required (the POST endpoint is
 * public + rate-limited by IP).
 *
 * Props:
 *   productId      — target Product id (sent to the API)
 *   productName    — shown in the modal header
 *   fabricantName  — shown in the modal header
 *   trigger        — optional ReactNode used as the DialogTrigger. If omitted,
 *                    a default amber→red gradient CTA button is rendered.
 *
 * On submit:
 *   POST /api/marketplace/inquiries  (public, IP-rate-limited)
 *   - 201 → success state ("Demande envoyée ! Le fabricant vous répondra sous 48h.")
 *   - 4xx → error toast with the server's French message
 *   - network error → generic French error toast
 */

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle2, Mail, Building2, User, Phone, MapPin, Package, Euro, Clock, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRY_OPTIONS = [
  { value: "Sénégal", label: "Sénégal" },
  { value: "Côte d'Ivoire", label: "Côte d'Ivoire" },
  { value: "Mali", label: "Mali" },
  { value: "Burkina Faso", label: "Burkina Faso" },
  { value: "Guinée", label: "Guinée" },
  { value: "Autre", label: "Autre" },
];

const INPUT_CLASS =
  "h-11 w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981]/15 transition-colors";

export function InquiryModal({
  productId,
  productName,
  fabricantName,
  trigger,
}: {
  productId: string;
  productName: string;
  fabricantName: string;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [deliveryDelay, setDeliveryDelay] = useState("");

  function resetForm() {
    setName("");
    setCompany("");
    setEmail("");
    setPhone("");
    setCountry("");
    setCity("");
    setMessage("");
    setQuantity("");
    setTargetPrice("");
    setDeliveryDelay("");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reset success state shortly after close so a reopen starts fresh.
      setTimeout(() => {
        setSuccess(false);
        resetForm();
      }, 150);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation (server also validates — defense in depth).
    if (!name.trim()) {
      toast.error("Veuillez indiquer votre nom.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Veuillez indiquer un email valide.");
      return;
    }
    if (!message.trim()) {
      toast.error("Veuillez décrire votre besoin dans le message.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/marketplace/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          requesterName: name.trim(),
          requesterCompany: company.trim() || undefined,
          requesterEmail: email.trim(),
          requesterPhone: phone.trim() || undefined,
          requesterCountry: country || undefined,
          requesterCity: city.trim() || undefined,
          message: message.trim(),
          quantity: quantity ? parseInt(quantity, 10) : undefined,
          targetPrice: targetPrice.trim() || undefined,
          deliveryDelay: deliveryDelay.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: undefined }));
        toast.error(
          typeof data?.error === "string"
            ? data.error
            : "Échec de l'envoi de la demande. Réessayez.",
        );
        return;
      }

      // Success — show success state inside the modal.
      setSuccess(true);
      toast.success("Demande envoyée avec succès !");
    } catch {
      toast.error("Connexion impossible. Vérifiez votre réseau.");
    } finally {
      setSubmitting(false);
    }
  }

  const defaultTrigger = (
    <Button
      type="button"
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#F59E0B] to-[#EF4444] px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all hover:shadow-md"
    >
      <Send className="h-4 w-4" />
      Demander un devis
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl overflow-y-auto bg-white p-0 sm:rounded-2xl">
        {/* Emerald accent strip — B2B marketplace branding */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#10B981] to-[#059669]" />

        {success ? (
          <div className="px-6 py-10 sm:px-10">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#D1FAE5]">
                <CheckCircle2 className="h-9 w-9 text-[#10B981]" />
              </div>
              <h2 className="mt-5 font-display text-[22px] font-bold text-[#111827]">
                Demande envoyée !
              </h2>
              <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[#6B7280]">
                Merci pour votre intérêt.{" "}
                <span className="font-semibold text-[#111827]">{fabricantName}</span>{" "}
                recevra votre demande de devis pour{" "}
                <span className="font-semibold text-[#111827]">{productName}</span> et
                vous répondra sous 48h.
              </p>
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#10B981] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#059669]"
              >
                Fermer
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader className="border-b border-[#F3F4F6] px-6 py-5 sm:px-8">
              <DialogTitle className="font-display text-[20px] font-bold text-[#111827]">
                Demande de devis
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] text-[#6B7280]">
                Produit :{" "}
                <span className="font-semibold text-[#111827]">{productName}</span>{" "}
                · Fabricant :{" "}
                <span className="font-semibold text-[#111827]">{fabricantName}</span>
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5 sm:px-8">
              {/* Row 1: Name + Company */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inq-name" className="text-[13px] font-medium text-[#374151]">
                    Nom complet <span className="text-[#EF4444]">*</span>
                  </Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <Input
                      id="inq-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex : Awa Ndiaye"
                      className={`${INPUT_CLASS} pl-9`}
                      required
                      maxLength={120}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inq-company" className="text-[13px] font-medium text-[#374151]">
                    Entreprise
                  </Label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <Input
                      id="inq-company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Ex : Distribution SA"
                      className={`${INPUT_CLASS} pl-9`}
                      maxLength={120}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Email + Phone */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inq-email" className="text-[13px] font-medium text-[#374151]">
                    Email <span className="text-[#EF4444]">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <Input
                      id="inq-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@exemple.com"
                      className={`${INPUT_CLASS} pl-9`}
                      required
                      maxLength={160}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inq-phone" className="text-[13px] font-medium text-[#374151]">
                    Téléphone
                  </Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <Input
                      id="inq-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+221 77 123 45 67"
                      className={`${INPUT_CLASS} pl-9`}
                      maxLength={40}
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Country + City */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inq-country" className="text-[13px] font-medium text-[#374151]">
                    Pays
                  </Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="inq-country" className={`${INPUT_CLASS} w-full pr-9`}>
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#9CA3AF]" />
                        <SelectValue placeholder="Sélectionner" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inq-city" className="text-[13px] font-medium text-[#374151]">
                    Ville
                  </Label>
                  <Input
                    id="inq-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex : Dakar"
                    className={INPUT_CLASS}
                    maxLength={80}
                  />
                </div>
              </div>

              {/* Row 4: Message (textarea) */}
              <div className="space-y-1.5">
                <Label htmlFor="inq-message" className="text-[13px] font-medium text-[#374151]">
                  Message <span className="text-[#EF4444]">*</span>
                </Label>
                <div className="relative">
                  <MessageSquare className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#9CA3AF]" />
                  <Textarea
                    id="inq-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Décrivez votre besoin : produit, conditionnement, marché cible…"
                    className="min-h-[110px] w-full rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] py-2.5 pl-9 pr-3 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#10B981] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981]/15"
                    required
                    maxLength={2000}
                  />
                </div>
              </div>

              {/* Row 5: Quantity + Target price */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inq-qty" className="text-[13px] font-medium text-[#374151]">
                    Quantité souhaitée
                  </Label>
                  <div className="relative">
                    <Package className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <Input
                      id="inq-qty"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Ex : 500"
                      className={`${INPUT_CLASS} pl-9`}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inq-price" className="text-[13px] font-medium text-[#374151]">
                    Prix cible
                  </Label>
                  <div className="relative">
                    <Euro className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                    <Input
                      id="inq-price"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      placeholder="Ex : 500 FCFA/unité"
                      className={`${INPUT_CLASS} pl-9`}
                      maxLength={60}
                    />
                  </div>
                </div>
              </div>

              {/* Row 6: Delivery delay */}
              <div className="space-y-1.5">
                <Label htmlFor="inq-delay" className="text-[13px] font-medium text-[#374151]">
                  Délai de livraison
                </Label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <Input
                    id="inq-delay"
                    value={deliveryDelay}
                    onChange={(e) => setDeliveryDelay(e.target.value)}
                    placeholder="Ex : Sous 2 semaines"
                    className={`${INPUT_CLASS} pl-9`}
                    maxLength={60}
                  />
                </div>
              </div>

              <DialogFooter className="flex flex-col-reverse gap-3 border-t border-[#F3F4F6] pt-5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={submitting}
                  className="rounded-lg border-[#E5E7EB] px-4 py-2.5 text-[14px] font-semibold text-[#374151] hover:bg-[#F9FAFB]"
                >
                  Annuler
                </Button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#F59E0B] to-[#EF4444] px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Envoi en cours…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Envoyer la demande
                    </>
                  )}
                </button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default InquiryModal;
