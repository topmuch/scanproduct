"use client";

import * as React from "react";
import { Mail, Send } from "lucide-react";

/**
 * NewsletterBanner — Nest-style newsletter section with green menthe background.
 *
 * Simple email capture (no backend integration — just visual + toast).
 * If you want real email storage, wire up a POST /api/newsletter endpoint.
 */
export function NewsletterBanner() {
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    // Visual feedback only — no API yet.
    setSubmitted(true);
    setTimeout(() => {
      setEmail("");
      setSubmitted(false);
    }, 3000);
  };

  return (
    <section
      id="newsletter"
      className="bg-white py-10 sm:py-12"
      aria-labelledby="newsletter-title"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E8F5E9] via-[#F1F8E9] to-[#E8F5E9] p-6 sm:p-10 lg:p-12">
          {/* Decorative circles */}
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#3BB77E]/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-[#3BB77E]/10"
            aria-hidden
          />

          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#2E7D32] backdrop-blur">
              <Mail className="h-3 w-3" aria-hidden />
              Newsletter
            </span>
            <h2
              id="newsletter-title"
              className="mt-4 font-display text-[24px] font-bold leading-tight text-[#1A1A1A] sm:text-[32px]"
            >
              Recevez les nouveautés VerifScan
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[14px] text-[#5A5A5A]">
              Nouveaux produits, alertes de rappel, conseils de traçabilité —
              directement dans votre boîte mail. Sans spam.
            </p>

            <form
              onSubmit={onSubmit}
              className="mx-auto mt-6 flex max-w-md flex-col items-center gap-2 sm:flex-row"
            >
              <div className="relative w-full">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A7A7A]"
                  aria-hidden
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Votre adresse email"
                  className="h-12 w-full rounded-lg border border-[#E0E0E0] bg-white pl-10 pr-4 text-[14px] text-[#1A1A1A] placeholder:text-[#9E9E9E] focus:border-[#3BB77E] focus:outline-none focus:ring-2 focus:ring-[#3BB77E]/20"
                  aria-label="Adresse email"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-12 flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-[#3BB77E] px-6 text-[14px] font-bold text-white transition-all hover:bg-[#2E7D32] active:scale-[0.98]"
              >
                {submitted ? (
                  <>✓ Inscrit !</>
                ) : (
                  <>
                    S&apos;abonner
                    <Send className="h-4 w-4" aria-hidden />
                  </>
                )}
              </button>
            </form>

            <p className="mt-3 text-[11px] text-[#7A7A7A]">
              En vous inscrivant, vous acceptez de recevoir des emails de VerifScan.
              Vous pouvez vous désabonner à tout moment.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
