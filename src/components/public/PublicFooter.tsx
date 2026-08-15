import Link from "next/link";
import { Logo } from "@/components/landing/Logo";
import { Lock, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";

/**
 * PublicFooter — footer for public pages (/p/[lotId], /produits).
 * Server component.
 */
export function PublicFooter() {
  return (
    <footer className="mt-auto bg-[#0F172A] text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Logo variant="light" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
              La vérité au bout du scan. VerifScan offre aux fabricants un
              passeport numérique pour leurs produits, garantissant traçabilité,
              authenticité et transparence pour les consommateurs.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
              <Lock className="h-3 w-3" /> Sécurisé par blockchain
            </span>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white">Produit</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/produits" className="text-white/70 hover:text-white">
                  Catalogue
                </Link>
              </li>
              <li>
                <Link href="/#fonctionnalites" className="text-white/70 hover:text-white">
                  Fonctionnalités
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Entreprise</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/a-propos" className="text-white/70 hover:text-white">
                  À propos
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-white/70 hover:text-white">
                  Devenir partenaire
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-white/70 hover:text-white">
                  Connexion
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Contact</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-white/50" />
                <a href="mailto:contact@verifscan.sn" className="hover:text-white">
                  contact@verifscan.sn
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-white/50" />
                <a href="tel:+221338000000" className="hover:text-white">
                  +221 33 800 00 00
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-white/50" />
                Dakar, Sénégal
              </li>
            </ul>
            <div className="mt-4 flex gap-2">
              {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                <span
                  key={i}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-[13px] text-white/50">
            © {new Date().getFullYear()} VerifScan. Tous droits réservés.
          </p>
          <div className="flex gap-4 text-[13px] text-white/50">
            <Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link>
            <Link href="/cgu" className="hover:text-white">CGU</Link>
            <Link href="/politique-confidentialite" className="hover:text-white">Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
