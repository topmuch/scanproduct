"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CONTACT_INFO = [
  {
    icon: Mail,
    label: "Email",
    value: "contact@verifscan.com",
    href: "mailto:contact@verifscan.com",
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    icon: Phone,
    label: "Téléphone",
    value: "+221 78 485 88 22",
    href: "tel:+2217848588226",
    color: "#10B981",
    bg: "#ECFDF5",
  },
  {
    icon: MapPin,
    label: "Adresse",
    value: "Dakar, Sénégal",
    href: null,
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
];

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    };

    try {
      // Simulate API call — in production, this would POST to /api/contact
      await new Promise((resolve) => setTimeout(resolve, 1200));
      console.log("Contact form submitted:", data);
      setSent(true);
      toast.success("Message envoyé ! Nous vous répondrons sous 24h.");
      (e.target as HTMLFormElement).reset();
    } catch {
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
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
                    className="block truncate text-[15px] font-semibold text-[#111827] transition-colors hover:text-[#2563EB]"
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

        {/* Google Map embed */}
        <div className="mt-6 overflow-hidden rounded-xl border border-[#F3F4F6] shadow-sm">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d30874.3476!2d-17.4677!3d14.7167!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTTCsDQzJzAwLjAiTiAxN8KwMjgnMDUuMiJX!5e0!3m2!1sfr!2ssn!4v1700000000000!5m2!1sfr!2ssn"
            width="100%"
            height="240"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Carte — Dakar, Sénégal"
          />
        </div>
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
                className="mt-6 rounded-lg border border-[#2563EB] px-5 py-2.5 text-sm font-semibold text-[#2563EB] transition-colors hover:bg-[#EFF6FF]"
              >
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-[15px] text-[#111827] outline-none transition-all placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
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
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-[15px] text-[#111827] outline-none transition-all placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
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
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-[15px] text-[#111827] outline-none transition-all placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
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
                    className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-[15px] text-[#111827] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
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
                  className="w-full resize-none rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-[15px] text-[#111827] outline-none transition-all placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#10B981] px-6 py-3 text-[15px] font-semibold text-white shadow-md shadow-[#2563EB]/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2563EB]/40 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 sm:w-auto"
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
