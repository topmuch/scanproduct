/**
 * Utilitaires WhatsApp — un seul endroit pour construire les liens wa.me.
 *
 * ⚠️ Contexte bug production (verifscan.com) : le bouton « Commander sur
 * WhatsApp » affichait « Ce destinataire n'est pas sur WhatsApp » alors que
 * le numéro était « bien renseigné ». Cause : un numéro sénégalais saisi au
 * format local (ex. « 78 135 13 94 ») ou avec des zéros parasites après
 * l'indicatif (ex. « +221 0 78 ... ») finit dans le lien wa.me sous une
 * forme que WhatsApp ne reconnaît pas. Ces helpers garantissent un numéro
 * ALWAYS en format international complet : 221 + 9 chiffres, sans 0.
 */

/** Indicatif par défaut (marché : Sénégal). */
export const DEFAULT_CC = "221";

/**
 * Normalise n'importe quelle saisie vers le format international wa.me
 * (chiffres uniquement, SANS « + »).
 *
 * Exemples (CC = 221) :
 *   "+221 78 135 13 94" → "221781351394"
 *   "78 135 13 94"      → "221781351394"
 *   "0781351394"        → "221781351394"
 *   "00221781351394"    → "221781351394"
 *   "221 0781351394"    → "221781351394"   (zéro parasite supprimé)
 *   "+33 6 12 34 56 78" → "33612345678"    (autre indicatif respecté)
 */
export function toWhatsAppDigits(phone: string, cc: string = DEFAULT_CC): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";

  // Préfixe international « 00 » (ex. 00221…) → retiré.
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Déjà préfixé par l'indicatif par défaut : on retire les zéros parasites
  // juste après l'indicatif (ex. « 221 0 78… » — WhatsApp ne reconnaîtrait
  // pas le destinataire).
  if (digits.startsWith(cc)) {
    return cc + digits.slice(cc.length).replace(/^0+/, "");
  }

  // Format local « 0 » + 9 chiffres (marché sénégalais, ex. « 0781351394 »)
  // — testé AVANT la branche « numéro long = autre indicatif » car un
  // numéro de 10 chiffres commençant par 0 serait sinon laissé tel quel.
  if (digits.startsWith("0") && digits.length === 10) {
    return cc + digits.slice(1);
  }

  // Numéro long sans notre indicatif : on suppose que l'indicatif saisi est
  // un autre pays (ex. +33 / +224) → respecté tel quel.
  if (digits.length > 9) return digits;

  // Format local sénégalais : « 0 » optionnel + 9 chiffres.
  if (digits.startsWith("0")) digits = digits.slice(1);
  return cc + digits;
}

/**
 * Vérification de vraisemblance Sénégal : 12 chiffres, indicatif 221,
 * mobile commençant par 7 (70/75/76/77/78). Non bloquant — sert uniquement
 * à afficher un avertissement à l'artisan.
 */
export function isLikelyLocalMobile(intl: string, cc: string = DEFAULT_CC): boolean {
  if (cc !== DEFAULT_CC) return true; // autres pays : pas de règle connue
  return /^2217\d{8}$/.test(intl);
}

/**
 * Formatage lisible : "221781351394" → "+221 78 135 13 94".
 * Groupes Sénégal (2-3-2-2) ; repli générique en tranches de 3.
 */
export function displayIntlPhone(intl: string): string {
  if (!intl) return "";
  const cc = intl.startsWith(DEFAULT_CC) && intl.length === 12 ? DEFAULT_CC : "";
  const rest = cc ? intl.slice(cc.length) : intl;
  let groups: string[];
  if (cc && rest.length === 9) {
    groups = [rest.slice(0, 2), rest.slice(2, 5), rest.slice(5, 7), rest.slice(7, 9)];
  } else {
    groups = rest.match(/.{1,3}/g) ?? [rest];
  }
  return `+${cc ? cc + " " : ""}${groups.join(" ")}`;
}

/**
 * Lien wa.me complet, prêt pour un <a href>. `message` optionnel =
 * texte pré-rempli du chat (URL-encodé ici).
 */
export function buildWhatsAppLink(phone: string, message?: string): string {
  const intl = toWhatsAppDigits(phone);
  if (!intl) return "";
  const base = `https://wa.me/${intl}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Lien de TEST pour l'artisan (dashboard / formulaires) : ouvre le chat
 * avec le numéro normalisé afin qu'il vérifie que la conversation s'ouvre
 * bien sur SON WhatsApp.
 */
export function buildWhatsAppTestLink(phone: string): string {
  return buildWhatsAppLink(
    phone,
    "Test VerifScan — vérification du numéro WhatsApp de la boutique."
  );
}
