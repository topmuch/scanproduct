"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Navigation, Send, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  VERIFSCAN_DIRECTIONS_URL,
  VERIFSCAN_EMAIL,
  VERIFSCAN_PHONE_DISPLAY,
  VERIFSCAN_PHONE_TEL,
} from "@/lib/contact";

const CONTACT_INFO = [
  {
    icon: Mail,
    label: "Email",
    value: VERIFSCAN_EMAIL,
    href: `mailto:${VERIFSCAN_EMAIL}`,
    color: "#022150",
    bg: "#F0F4F9",
  },
  {
    icon: Phone,
    label: "Téléphone",
    value: VERIFSCAN_PHONE_DISPLAY,
    href: VERIFSCAN_PHONE_TEL,
    color: "#10B981",
    bg: "#ECFDF5",
  },
  {
    icon: MapPin,
    label: "Adresse",
    value: "Lot n°13, Ouest Foire — Dakar, Sénégal",
    href: VERIFSCAN_DIRECTIONS_URL,
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
  {
    icon: Clock,
    label: "Horaires",
    value: "Lun – Ven : 9h – 18h · Sam : 9h – 13h",
    href: null,
    color: "#0EA5E9",
    bg: "#F0F9FF",
  },
];

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      subject: formData.get("subject"),
      message: formData.get("message"),
      // Honeypot anti-bot : champ caché, rempli uniquement par les bots →
      // l'API répond un faux succès sans stocker ni notifier.
      website: formData.get("website"),
    };

    try {
      // POST réel vers /api/contact : stockage en base (onglet SuperAdmin
      // « Messages ») + notification email à contact@verifscan.com.
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        let msg = "Erreur lors de l'envoi. Veuillez réessayer.";
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {
          /* corps non JSON — message par défaut */
        }
        throw new Error(msg);
      }
      setSent(true);
      toast.success("Message envoyé ! Nous vous répondrons sous 24h.");
      form.reset();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'envoi. Veuillez réessayer.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-5">
      {/* Left: contact info */}
      <div className="lg:col-span-2">
        <h2 className="font-display text-2xl font-bold text-[#111827]">
          Restons en contact
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[#6B7280]">
          Une question sur VerifScan ? Vous souhaitez devenir partenaire ou
          demander une démo ? Notre équipe vous répond sous 24 heures.
        </p>

        <div className="mt-8 space-y-4">
          {CONTACT_INFO.map((info) => (
            <div
              key={info.label}
              className="flex items-start gap-4 rounded-xl border border-[#F3F4F6] bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: info.bg }}
              >
                <info.icon
                  className="h-5 w-5"
                  style={{ color: info.color }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                  {info.label}
                </p>
                {info.href ? (
                  <a
                    href={info.href}
                    target={info.href?.startsWith("http") ? "_blank" : undefined}
                    rel={info.href?.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="block text-[15px] font-semibold text-[#111827] transition-colors hover:text-[#022150]"
                  >
                    {info.value}
                  </a>
                ) : (
                  <p className="text-[15px] font-semibold text-[#111827]">
                    {info.value}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA carte — la grande carte interactive est dans la section
            « Nous trouver » de la page, on évite deux iframes Google. */}
        <a
          href={VERIFSCAN_DIRECTIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#022150] to-[#10B981] px-5 py-3.5 text-[15px] font-semibold text-white shadow-md shadow-[#022150]/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <Navigation className="h-4 w-4" />
          Ouvrir l&apos;itinéraire dans Google Maps
        </a>
      </div>

      {/* Right: form */}
      <div className="lg:col-span-3">
        <div className="rounded-2xl border border-[#F3F4F6] bg-white p-6 shadow-sm sm:p-8">
          {sent ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF5]">
                <CheckCircle2 className="h-8 w-8 text-[#10B981]" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-[#111827]">
                Message envoyé !
              </h3>
              <p className="mt-2 max-w-sm text-[15px] text-[#6B7280]">
                Merci de nous avoir contactés. Notre équipe vous répondra sous
                24 heures à l&apos;adresse email indiquée.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-6 rounded-lg border border-[#022150] px-5 py-2.5 text-sm font-semibold text-[#022150] transition-colors hover:bg-[#F0F4F9]"
              >
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Honeypot anti-bot — hors écran, ignoré par les humains avec
                  lecteur d'écran (aria-hidden + tabIndex -1 + autocomplete off). */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="website">Ne pas remplir ce champ</label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  defaultValue=""
                />
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-[#111827]">
                  Envoyez-nous un message
                </h2>
                <p className="mt-1.5 text-sm text-[#6B7280]">
                  Remplissez le formulaire ci-dessous, nous vous répondons
                  rapidement.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1.5 block text-sm font-semibold text-[#374151]"
                  >
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    placeholder="Ex: Awa Diop"
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-[15px] text-[#111827] outline-none transition-all placeholder:text-[#9CA3AF] focus:border-[#022150] focus:ring-2 focus:ring-[#022150]/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-semibold text-[#374151]"
                  >
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="vous@exemple.com"
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-[15px] text-[#111827] outline-none transition-all placeholder:text-[#9CA3AF] focus:border-[#022150] focus:ring-2 focus:ring-[#022150]/20"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1.5 block text-sm font-semibold text-[#374151]"
                  >
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder="+221 ..."
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-[15px] text-[#111827] outline-none transition-all placeholder:text-[#9CA3AF] focus:border-[#022150] focus:ring-2 focus:ring-[#022150]/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="subject"
                    className="mb-1.5 block text-sm font-semibold text-[#374151]"
                  >
                    Sujet <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-[15px] text-[#111827] outline-none transition-all focus:border-[#022150] focus:ring-2 focus:ring-[#022150]/20"
                  >
                    <option value="" disabled>
                      Choisir un sujet...
                    </option>
                    <option value="demo">Demander une démo</option>
                    <option value="partner">Devenir partenaire</option>
                    <option value="support">Support technique</option>
                    <option value="press">Presse / Médias</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-1.5 block text-sm font-semibold text-[#374151]"
                >
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  placeholder="Décrivez votre demande en quelques lignes..."
                  className="w-full resize-none rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-[15px] text-[#111827] outline-none transition-all placeholder:text-[#9CA3AF] focus:border-[#022150] focus:ring-2 focus:ring-[#022150]/20"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#022150] to-[#10B981] px-6 py-3 text-[15px] font-semibold text-white shadow-md shadow-[#022150]/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#022150]/40 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Envoyer le message
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
