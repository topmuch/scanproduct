"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Loader2, Check } from "lucide-react";

type NewsletterSignupProps = {
  /** Placeholder text for the email input */
  placeholder?: string;
  /** Button label */
  buttonLabel?: string;
  /** Success toast message */
  successMessage?: string;
  /** Optional id for the input (useful for label accessibility) */
  id?: string;
};

/**
 * NewsletterSignup — small client-side email capture form.
 * On submit it shows a Sonner success toast. No backend call: this is
 * a "coming soon" placeholder.
 */
export function NewsletterSignup({
  placeholder = "vous@exemple.com",
  buttonLabel = "S'abonner",
  successMessage = "Merci ! Vous recevrez nos prochaines actualités par email.",
  id,
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!isValid) {
      toast.error("Adresse email invalide", {
        description: "Veuillez saisir une adresse email valide.",
      });
      return;
    }
    setLoading(true);
    // Simulate a network request (no backend on this coming-soon page)
    setTimeout(() => {
      setLoading(false);
      setEmail("");
      toast.success("Inscription confirmée", {
        description: successMessage,
        icon: <Check className="h-4 w-4" />,
      });
    }, 600);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-2 sm:flex-row"
      noValidate
    >
      <div className="relative flex-1">
        <Mail
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]"
        />
        <input
          id={id}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border border-[#E5E7EB] bg-white pl-10 pr-3 text-sm text-[#111827] shadow-sm outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8] disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          buttonLabel
        )}
      </button>
    </form>
  );
}
