"use client";

/**
 * Aide contextuelle affichée SOUS les champs « Numéro WhatsApp »
 * (wizard d'activation, édition produit, vente de pack par l'admin).
 *
 * Résout le cas production : l'artisan saisit « 78 135 13 94 », le lien
 * wa.me/221781351394 est correctement construit, MAIS la ligne saisie
 * n'est pas celle enregistrée sur WhatsApp → l'acheteur voit « Ce
 * destinataire n'est pas sur WhatsApp ». Cette aide montre :
 *   1. le numéro EXACT que les clients vont appeler (normalisé) ;
 *   2. un bouton « Tester » qui ouvre ce chat — si WhatsApp affiche
 *      « destinataire introuvable », l'artisan sait immédiatement que le
 *      numéro à corriger est celui de SA ligne WhatsApp ;
 *   3. un avertissement si le format ne ressemble pas à un mobile
 *      sénégalais (9 chiffres après +221, commençant par 7).
 */

import {
  buildWhatsAppTestLink,
  displayIntlPhone,
  isLikelyLocalMobile,
  toWhatsAppDigits,
} from "@/lib/whatsapp";

export function WhatsAppFieldHint({ phone }: { phone: string }) {
  const intl = toWhatsAppDigits(phone);

  if (!intl || intl.length < 8) {
    return (
      <p className="mt-1 text-xs text-gray-500">
        Vos clients pourront vous contacter directement sur WhatsApp.
      </p>
    );
  }

  const suspicious = !isLikelyLocalMobile(intl);

  return (
    <div
      data-testid="wa-field-hint"
      className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-xs"
    >
      <p className="font-semibold text-emerald-900">
        ✅ Vos clients ouvriront ce chat :{" "}
        <span className="font-mono">+{displayIntlPhone(intl).replace(/^\+/, "")}</span>
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-emerald-800/80">
        Vérifiez que ce numéro est bien celui enregistré sur WhatsApp (WhatsApp
        → Réglages → votre profil → Téléphone).
      </p>
      <a
        href={buildWhatsAppTestLink(phone)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700"
      >
        Tester sur WhatsApp ↗
      </a>
      {suspicious && (
        <p className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-medium leading-snug text-amber-800">
          ⚠️ Ce numéro ne ressemble pas à un mobile sénégalais (format attendu :
          9 chiffres commençant par 7, ex. 77 123 45 67). S'il est correct,
          ignorez ce message.
        </p>
      )}
    </div>
  );
}
