"use client";

import { Lock, Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "./Logo";

const COLUMNS = [
  {
    title: "Produit",
    links: ["Produits", "Fonctionnalités", "Tarifs", "Marketplace B2B"],
  },
  {
    title: "Entreprise",
    links: ["À propos", "Contact", "Blog", "Carrières"],
  },
  {
    title: "Légal",
    links: ["Mentions légales", "CGU", "Politique de confidentialité", "Cookies"],
  },
];

const SOCIALS = [
  { icon: Facebook, label: "Facebook" },
  { icon: Twitter, label: "Twitter" },
  { icon: Linkedin, label: "LinkedIn" },
  { icon: Instagram, label: "Instagram" },
];

export function Footer() {
  return (
    <footer id="contact" className="bg-[#0F172A] text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-5">
          {/* Column 1: brand */}
          <div className="col-span-2 lg:col-span-1">
            <Logo variant="light" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              La vérité au bout du scan. VerifScan offre aux fabricants un passeport numérique pour leurs produits, garantissant traçabilité, authenticité et transparence pour les consommateurs sénégalais et ouest-africains.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
              <Lock className="h-3 w-3" /> Sécurisé par blockchain
            </span>

            <div className="mt-5 flex items-center gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/80 transition-all duration-300 hover:bg-white/20 hover:text-white"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Columns 2-4: link lists */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-base font-semibold text-white">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Column 5: contact */}
          <div className="col-span-2 lg:col-span-1">
            <h3 className="font-display text-base font-semibold text-white">Contact</h3>
            <ul className="mt-4 space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-white/70">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
                <a href="mailto:contact@verifscan.sn" className="hover:text-white">
                  contact@verifscan.sn
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-white/70">
                <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
                <a href="tel:+221338000000" className="hover:text-white">
                  +221 33 800 00 00
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-white/70">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
                Dakar, Sénégal
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-[13px] text-white/50">© 2026 VerifScan. Tous droits réservés.</p>
            <p className="text-[13px] text-white/50">
              Conçu au Sénégal 🇸🇳 · Pour l&apos;Afrique de l&apos;Ouest
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
