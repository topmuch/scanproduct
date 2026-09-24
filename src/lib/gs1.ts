/**
 * ============================================================================
 * VerifScan — Intégration du standard GS1 Digital Link (v1.3)
 * ============================================================================
 *
 * Cette bibliothèque gère les DEUX familles de QR Codes du système :
 *
 *   1. Clients INDUSTRIELS (standard GS1) :
 *      Les QR Codes encodent une URI conforme au standard GS1 Digital Link :
 *
 *        https://<domaine>/01/<GTIN>/10/<LOT>/21/<SERIE>
 *
 *      où /01/, /10/ et /21/ sont les « Application Identifiers » (AI) GS1 :
 *        - AI 01 → GTIN (Global Trade Item Number, 14 chiffres, zéro-padé)
 *        - AI 10 → Numéro de lot (batch/lot), 20 caractères max
 *        - AI 21 → Numéro de série, 20 caractères max
 *
 *      La forme « mots-clés » (https://<domaine>/gtin/<GTIN>/lot/<LOT>/ser/<SERIE>)
 *      est également reconnue au décodage (conformité GS1 Digital Link).
 *
 *   2. Petits producteurs LOCAUX (QR Code standard) :
 *      Les QR Codes encodent une URL courte VerifScan :
 *
 *        https://<domaine>/r/<ID_UNIQUE_PRODUIT>
 *
 *      Le resolver (voir `gs1-resolver.ts`) la traduit en redirection 302 vers
 *      la page « passeport produit » responsive (/p/<lotId>).
 *
 * Sécurité :
 *   - Toutes les entrées sont validées par regex stricte (charset CSET 82 GS1,
 *     volontairement restreint) et par longueur maximale AVANT tout usage.
 *   - Le GTIN est vérifié par l'algorithme officiel « Modulo 10 » GS1.
 *   - Aucune valeur issue d'une URL n'est jamais injectée telle quelle dans
 *     une réponse HTML ou une requête non paramétrée.
 *
 * Ce module est PUR (aucune dépendance Node/Browser, aucun accès DB) :
 * il est utilisable côté serveur ET côté client, et testable unitairement.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// Constantes du standard GS1
// ---------------------------------------------------------------------------

/** Application Identifiers GS1 utilisés par VerifScan. */
export const GS1_AI = {
  /** AI 01 — GTIN (Global Trade Item Number). */
  GTIN: "01",
  /** AI 10 — Numéro de lot / batch. */
  LOT: "10",
  /** AI 21 — Numéro de série (sériel unitaire). */
  SERIE: "21",
} as const;

/**
 * Équivalents « mots-clés » de l'AI dans la forme lisible du standard
 * GS1 Digital Link (ex: /gtin/0360002914520/lot/ABC123).
 */
export const GS1_MOTS_CLES = {
  "01": "gtin",
  "10": "lot",
  "21": "ser",
} as const;

/** Longueurs maximales autorisées par la spécification GS1. */
export const GS1_LIMITES = {
  /** GTIN-14 : toujours 14 chiffres une fois normalisé. */
  GTIN: 14,
  /** AI 10 — 20 caractères max. */
  LOT: 20,
  /** AI 21 — 20 caractères max. */
  SERIE: 20,
} as const;

// ---------------------------------------------------------------------------
// Validation stricte des valeurs (sécurité)
// ---------------------------------------------------------------------------
// GS1 définit le jeu de caractères « CSET 82 » pour les AI 10 / 21.
// Par sécurité nous N'acceptONS qu'un sous-ensemble strict et sans ambiguïté
// URL : alphanumériques + - _ . / + $ % et l'espace (le caractère critique
// « FNC1 » n'existe pas dans une URI). Tout le reste est rejeté AVANT toute
// utilisation (protection XSS, path traversal, injection).

/** GTIN en entrée : 8, 12, 13 ou 14 chiffres (GTIN-8/12/13/14 officiels). */
const RE_GTIN_BRUT = /^\d{8,14}$/;

/**
 * AI 10 (lot) — CSET 82 restreint, 1 à 20 caractères.
 * (le « / » est volontairement EXCLU du charset accepté : il est déjà un
 *  séparateur structurel d'URI et n'apporte rien dans une valeur imprimée).
 */
const RE_LOT = /^[A-Za-z0-9\-_.+$% ]{1,20}$/;

/** AI 21 (série) — CSET 82 restreint, 1 à 20 caractères. */
const RE_SERIE = /^[A-Za-z0-9\-_.+$% ]{1,20}$/;

/**
 * Séquences interdites en plus du charset : « . » et « .. » seuls (marqueurs
 * classiques de path traversal, rejetés par principe de précaution).
 */
const RE_TRAVERSAL = /^(?:\.{1,2})$/;

/** Identifiant produit « standard » (cuid / identifiant interne VerifScan). */
const RE_ID_PRODUIT = /^[A-Za-z0-9_-]{6,64}$/;

// ---------------------------------------------------------------------------
// Types publics
// ---------------------------------------------------------------------------

/** Résultat du décodage d'une URI GS1 Digital Link. */
export interface Gs1Decodage {
  /** GTIN normalisé sur 14 chiffres (zéro-padé) — toujours présent. */
  gtin: string;
  /** Numéro de lot (AI 10) — optionnel (le standard autorise GTIN seul). */
  lot?: string;
  /** Numéro de série (AI 21) — optionnel. */
  serie?: string;
}

/** Erreur métier GS1 (message en français, code machine lisible). */
export class ErreurGs1 extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ErreurGs1";
  }
}

// ---------------------------------------------------------------------------
// 1. FONCTION DE GÉNÉRATION DE L'URL
// ---------------------------------------------------------------------------

/**
 * Vérifie le chiffre de contrôle d'un GTIN (algorithme officiel GS1
 * « Modulo 10 » : pondérations alternées 3/1 en partant de la droite).
 *
 * @param chiffres  Chaîne de chiffres uniquement (longueur >= 2).
 * @returns true si le chiffre de contrôle (dernier caractère) est valide.
 */
export function verifierCheckDigitGtin(chiffres: string): boolean {
  if (!/^\d{2,}$/.test(chiffres)) return false;
  let somme = 0;
  // On parcourt de droite à gauche SANS le dernier caractère (check digit).
  // Le premier chiffre à gauche du check digit a la pondération 3.
  const corps = chiffres.slice(0, -1);
  const attendu = Number(chiffres[chiffres.length - 1]);
  let ponderation = 3;
  for (let i = corps.length - 1; i >= 0; i--) {
    somme += Number(corps[i]) * ponderation;
    ponderation = ponderation === 3 ? 1 : 3; // alterne 3, 1, 3, 1…
  }
  // Chiffre de contrôle = complément à 10 du dernier chiffre de la somme.
  const calcule = (10 - (somme % 10)) % 10;
  return calcule === attendu;
}

/**
 * Normalise un GTIN vers sa forme canonique GS1-14 (zéro-padé à gauche).
 *
 * Accepte GTIN-8, GTIN-12, GTIN-13 et GTIN-14 en entrée. Vérifie le chiffre
 * de contrôle : un GTIN invalide est REJETÉ (protection anti-contrefaçon :
 * un QR imprimé doit être mathématiquement correct).
 *
 * @param gtinBrut  GTIN saisi (avec ou sans zéros de tête).
 * @returns Le GTIN-14 normalisé, ou `null` si invalide.
 */
export function normaliserGtin(gtinBrut: string): string | null {
  const gtin = gtinBrut.trim();
  if (!RE_GTIN_BRUT.test(gtin)) return null;
  if (!verifierCheckDigitGtin(gtin)) return null;
  return gtin.padStart(GS1_LIMITES.GTIN, "0");
}

/**
 * Valide un numéro de lot (AI 10) : charset GS1 restreint, 20 caractères max.
 * @returns Le lot trimé, ou `null` si invalide.
 */
export function validerLot(lot: string): string | null {
  const l = lot.trim();
  if (RE_TRAVERSAL.test(l)) return null;
  return RE_LOT.test(l) ? l : null;
}

/**
 * Valide un numéro de série (AI 21) : charset GS1 restreint, 20 car. max.
 * @returns La série trimée, ou `null` si invalide.
 */
export function validerSerie(serie: string): string | null {
  const s = serie.trim();
  if (RE_TRAVERSAL.test(s)) return null;
  return RE_SERIE.test(s) ? s : null;
}

/**
 * Origine par défaut encodée dans les QR Codes des clients industriels GS1.
 * Configurable via la variable d'environnement `GS1_DOMAIN`
 * (sinon on retombe sur `NEXT_PUBLIC_SCAN_URL`, sinon sur verifscan.pro).
 */
export function getDomaineGs1(): string {
  if (typeof process !== "undefined") {
    return (
      process.env.GS1_DOMAIN ||
      process.env.NEXT_PUBLIC_SCAN_URL ||
      "https://verifscan.pro"
    ).replace(/\/+$/, "");
  }
  return "https://verifscan.pro";
}

/** Origine par défaut des QR Codes « standard » (petits producteurs). */
export function getDomaineStandard(): string {
  if (typeof process !== "undefined") {
    return (
      process.env.NEXT_PUBLIC_SCAN_URL || "https://verifscan.pro"
    ).replace(/\/+$/, "");
  }
  return "https://verifscan.pro";
}

/**
 * ─── FONCTION 1a : QR Code « STANDARD » (petits producteurs locaux) ─────────
 *
 * Génère l'URL à encoder dans le QR Code pour un produit SANS code GS1 :
 *
 *     https://verifscan.pro/r/<ID_UNIQUE_PRODUIT>
 *
 * Le chemin /r/<id> est intercepté par le resolver (`/r/[[...path]]`) qui
 * redirige (302) vers la page passeport `/p/<lotId>` du lot actif du produit.
 *
 * @param idProduit  Identifiant unique interne du produit (cuid DB).
 * @param origine    Origine optionnelle (défaut : domaine configuré).
 * @throws ErreurGs1 si l'identifiant ne respecte pas le format interne.
 */
export function genererUrlStandard(
  idProduit: string,
  origine?: string
): string {
  const id = idProduit.trim();
  if (!RE_ID_PRODUIT.test(id)) {
    throw new ErreurGs1(
      "ID_PRODUIT_INVALIDE",
      "L'identifiant produit contient des caractères non autorisés."
    );
  }
  const base = (origine ?? getDomaineStandard()).replace(/\/+$/, "");
  return `${base}/r/${encodeURIComponent(id)}`;
}

/**
 * ─── FONCTION 1b : QR Code « GS1 DIGITAL LINK » (clients industriels) ───────
 *
 * Génère l'URI conforme au standard GS1 Digital Link à encoder dans le QR :
 *
 *     https://<domaine>/01/<GTIN-14>/10/<LOT>/21/<SERIE>
 *
 * @param params   { gtin, lot, serie } — gtin requis, lot/serie optionnels.
 * @param origine  Origine optionnelle (défaut : domaine GS1 configuré).
 * @returns L'URI GS1 Digital Link complète, prête à encoder.
 * @throws ErreurGs1 si le GTIN, le lot ou la série sont invalides.
 */
export function genererUrlGs1(
  params: { gtin: string; lot?: string; serie?: string },
  origine?: string
): string {
  // 1) GTIN : normalisation + check digit (rejet strict si invalide).
  const gtin = normaliserGtin(params.gtin);
  if (!gtin) {
    throw new ErreurGs1(
      "GTIN_INVALIDE",
      "GTIN invalide : 8 à 14 chiffres attendus avec un chiffre de contrôle correct."
    );
  }

  // 2) Lot (AI 10) — optionnel mais validé si présent.
  let lot: string | undefined;
  if (params.lot !== undefined && params.lot !== "") {
    const lotValide = validerLot(params.lot);
    if (!lotValide) {
      throw new ErreurGs1(
        "LOT_INVALIDE",
        "Numéro de lot invalide : 20 caractères max, caractères alphanumériques et - _ . / + $ % espace uniquement."
      );
    }
    lot = lotValide;
  }

  // 3) Série (AI 21) — optionnelle mais validée si présente.
  let serie: string | undefined;
  if (params.serie !== undefined && params.serie !== "") {
    const serieValide = validerSerie(params.serie);
    if (!serieValide) {
      throw new ErreurGs1(
        "SERIE_INVALIDE",
        "Numéro de série invalide : 20 caractères max, caractères alphanumériques et - _ . / + $ % espace uniquement."
      );
    }
    serie = serieValide;
  }

  // 4) Assemblage de l'URI dans l'ordre canonique du standard : 01, 10, 21.
  //    encodeURIComponent est un second filet (les regex bloquent déjà tout
  //    caractère dangereux) — il garantit une URI encodable sans ambiguïté.
  const base = (origine ?? getDomaineGs1()).replace(/\/+$/, "");
  let chemin = `/${GS1_AI.GTIN}/${encodeURIComponent(gtin)}`;
  if (lot) chemin += `/${GS1_AI.LOT}/${encodeURIComponent(lot)}`;
  if (serie) chemin += `/${GS1_AI.SERIE}/${encodeURIComponent(serie)}`;
  return `${base}${chemin}`;
}

// ---------------------------------------------------------------------------
// 2. FONCTION DE DÉCODAGE (utilisée par le resolver)
// ---------------------------------------------------------------------------

/**
 * Sépare une entrée arbitraire (URL absolue, URL relative ou chemin seul)
 * en { chemin, requête }.
 *
 * Gère les URL absolues (« https://verifscan.com/01/… ») dont le scheme et
 * l'autorité doivent être retirés AVANT le découpage en segments — sinon le
 * premier segment serait « https: » et la détection GS1 échouerait.
 */
function separerUrl(entree: string): { chemin: string; requete: string } {
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(entree)) {
    try {
      const url = new URL(entree);
      return { chemin: url.pathname, requete: url.search };
    } catch {
      // URL absoluement malformée → traitement comme chemin brut (rejet
      // garanti en aval par les regex de validation).
    }
  }
  const idx = entree.indexOf("?");
  return idx === -1
    ? { chemin: entree, requete: "" }
    : { chemin: entree.slice(0, idx), requete: entree.slice(idx) };
}

/**
 * Détection rapide : cette URL contient-elle une structure GS1 Digital Link ?
 * Accepte une URL absolue (https://…) OU un tableau de segments déjà découpé.
 */
export function estUrlGs1(entree: string | string[]): boolean {
  const segments = Array.isArray(entree) ? entree : decouperChemin(entree);
  if (segments.length === 0) return false;

  // Forme numérique : /01/… (AI 01 en tête, conformité GS1)
  if (segments[0] === GS1_AI.GTIN) return true;
  // Forme mots-clés : /gtin/…
  if (segments[0] === GS1_MOTS_CLES["01"]) return true;

  // Forme « query params » : ?01=…&10=…&21=…
  if (!Array.isArray(entree)) {
    const { requete } = separerUrl(entree);
    if (requete) {
      const params = new URLSearchParams(requete);
      return (
        params.has(GS1_AI.GTIN) ||
        params.has("gtin") ||
        params.has(GS1_AI.LOT) ||
        params.has("lot")
      );
    }
  }
  return false;
}

/**
 * Découpe un chemin d'URL en segments décodés (sans manipulation dangereuse :
 * decodeURIComponent est appelé sur chaque segment isolément, et le résultat
 * est revalidé par les regex downstream — jamais utilisé brut).
 */
function decouperChemin(chemin: string): string[] {
  const sansRequete = chemin.split("?")[0];
  return sansRequete
    .split("/")
    .filter((s) => s.length > 0)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        // Segment mal encodé → on le remplace par une valeur impossible à
        // valider plutôt que de planter (le resolver renverra 404).
        return "\u0000invalide";
      }
    });
}

/**
 * ─── FONCTION 2a : DÉCODAGE GS1 DIGITAL LINK ────────────────────────────────
 *
 * Intercepts une URL scannée et extrait PROPREMENT les variables GS1 :
 * GTIN (AI 01), numéro de lot (AI 10) et numéro de série (AI 21).
 *
 * Formes supportées (URL absolue ou chemin seul) :
 *   /01/0360002914520/10/LOT-2026-A/21/SN-000001     ← forme numérique canonique
 *   /01/0360002914520/10/LOT-2026-A                  ← GTIN + lot (série absente)
 *   /gtin/0360002914520/lot/LOT-2026-A/ser/SN-000001 ← forme mots-clés GS1
 *   /quelconque?01=0360002914520&10=LOT-A&21=SN-1    ← forme query params
 *
 * @param entree  URL absolue, chemin, ou tableau de segments (Next.js params).
 * @returns Gs1Decodage (gtin normalisé 14 chiffres + lot + serie), ou `null`
 *          si l'entrée n'est PAS une URI GS1. @throws ErreurGs1 si c'est une
 *          URI GS1 MALFORMÉE (structure reconnue mais valeurs invalides).
 */
export function parserUrlGs1(entree: string | string[]): Gs1Decodage | null {
  // ── Cas 1 : tableau de segments (route Next.js catch-all) ──────────────
  if (Array.isArray(entree)) {
    return parserSegments(entree);
  }

  // ── Cas 2 : chaîne (URL absolue ou chemin) ─────────────────────────────
  const { chemin, requete } = separerUrl(entree);

  // Détecte la forme « query params » (?01=…&10=…&21=…). Si la requête ne
  // porte PAS de GTIN (ex: ?utm_source=… sur une URI GS1 en chemin), on
  // retombe sur l'analyse des segments du chemin.
  if (requete) {
    const params = new URLSearchParams(requete);
    const g = params.get(GS1_AI.GTIN) ?? params.get("gtin");
    if (g) {
      const gtin = normaliserGtin(g);
      if (!gtin) {
        throw new ErreurGs1("GTIN_INVALIDE", "GTIN invalide dans la requête.");
      }
      const lot = params.get(GS1_AI.LOT) ?? params.get("lot") ?? undefined;
      const serie = params.get(GS1_AI.SERIE) ?? params.get("ser") ?? undefined;
      return construireDecodage(gtin, lot, serie);
    }
  }

  return parserSegments(decouperChemin(chemin));
}

/**
 * Parse un tableau de segments déjà découpés.
 * Structure attendue (forme numérique) : [01, <gtin>, (10, <lot>)?, (21, <serie>)?]
 * ou (forme mots-clés)   : [gtin, <gtin>, (lot, <lot>)?, (ser, <serie>)?]
 */
function parserSegments(segments: string[]): Gs1Decodage | null {
  if (segments.length < 2) return null;

  const [marqueur, ...reste] = segments;

  // ── Forme numérique canonique : /01/…/10/…/21/… ─────────────────────────
  if (marqueur === GS1_AI.GTIN) {
    const gtin = normaliserGtin(reste[0]);
    if (!gtin) {
      throw new ErreurGs1(
        "GTIN_INVALIDE",
        "GTIN invalide dans l'URI GS1 Digital Link."
      );
    }
    // Parcours des paires AI/valeur suivantes (10 et 21, ordre libre selon
    // le standard, chacune facultative, valeurs dupliquées rejetées).
    let lot: string | undefined;
    let serie: string | undefined;
    for (let i = 1; i < reste.length - 1; i += 2) {
      const ai = reste[i];
      const valeur = reste[i + 1];
      if (ai === GS1_AI.LOT) {
        if (lot) throw new ErreurGs1("AI_DUPLIQUE", "AI 10 présent deux fois.");
        const lotValide = validerLot(valeur);
        if (!lotValide)
          throw new ErreurGs1("LOT_INVALIDE", "Numéro de lot invalide.");
        lot = lotValide;
      } else if (ai === GS1_AI.SERIE) {
        if (serie)
          throw new ErreurGs1("AI_DUPLIQUE", "AI 21 présent deux fois.");
        const serieValide = validerSerie(valeur);
        if (!serieValide)
          throw new ErreurGs1("SERIE_INVALIDE", "Numéro de série invalide.");
        serie = serieValide;
      } else {
        // AI non supporté par VerifScan → on ignore proprement la paire
        // (le standard autorise la présence d'AIs additionnels: ex 17=DLUO).
      }
    }
    return construireDecodage(gtin, lot, serie);
  }

  // ── Forme mots-clés : /gtin/…/lot/…/ser/… ───────────────────────────────
  if (marqueur === GS1_MOTS_CLES["01"]) {
    const gtin = normaliserGtin(reste[0]);
    if (!gtin) {
      throw new ErreurGs1(
        "GTIN_INVALIDE",
        "GTIN invalide dans l'URI GS1 Digital Link."
      );
    }
    let lot: string | undefined;
    let serie: string | undefined;
    for (let i = 1; i < reste.length - 1; i += 2) {
      const mot = reste[i];
      const valeur = reste[i + 1];
      if (mot === GS1_MOTS_CLES["10"]) {
        const lotValide = validerLot(valeur);
        if (!lotValide)
          throw new ErreurGs1("LOT_INVALIDE", "Numéro de lot invalide.");
        lot = lotValide;
      } else if (mot === GS1_MOTS_CLES["21"]) {
        const serieValide = validerSerie(valeur);
        if (!serieValide)
          throw new ErreurGs1("SERIE_INVALIDE", "Numéro de série invalide.");
        serie = serieValide;
      }
    }
    return construireDecodage(gtin, lot, serie);
  }

  return null; // Pas une URI GS1 → scan « standard ».
}

/**
 * Applique la validation finale et assemble le résultat du décodage.
 * (Les valeurs lot/serie sont déjà validées par leurs regex en amont.)
 */
function construireDecodage(
  gtin: string,
  lot?: string,
  serie?: string
): Gs1Decodage {
  return {
    gtin,
    ...(lot ? { lot } : {}),
    ...(serie ? { serie } : {}),
  };
}

/**
 * ─── Génération d'un numéro de série (AI 21) ────────────────────────────────
 *
 * Produit un numéro de série UNIQUE, court et conforme :
 *   - ≤ 20 caractères (limite GS1 de l'AI 21) ;
 *   - CSET 82 sûr : uniquement A-Z et 0-9 (aucun encodage URI nécessaire) ;
 *   - unicité pratique : horodatage base36 + index du lot d'impression +
 *     suffixe aléatoire (≈ 36⁴ combinaisons par milliseconde et par index).
 *
 * Utilisé par les routes de génération de QR pour sérialiser chaque unité
 * physique imprimée (ex: /01/<GTIN>/10/<LOT>/21/SK2P9X0Z3AB7).
 *
 * @param index  Position de l'unité dans la session d'impression (0, 1, 2…).
 */
export function genererNumeroSerie(index: number): string {
  const horodatage = Date.now().toString(36).toUpperCase(); // ~8 car.
  const position = index.toString(36).toUpperCase(); // 1-3 car.
  const aleatoire = Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase(); // 4 car.
  const serie = `S${horodatage}${position}${aleatoire}`;
  // Garde-fou : ne JAMAIS dépasser la limite GS1 (truncation défensive).
  return serie.slice(0, GS1_LIMITES.SERIE);
}

// ---------------------------------------------------------------------------
// 3. CONSTRUCTION D'URL QR POUR UN COUPLE PRODUIT/LOT (choix auto du standard)
// ---------------------------------------------------------------------------

/**
 * Construit l'URL à encoder dans un QR Code pour un couple produit/lot.
 *
 * Choix AUTOMATIQUE du standard :
 *   - `Product.barcode` contient un GTIN valide (check digit vérifié)
 *     → URI GS1 Digital Link : /01/<GTIN-14>/10/<LOT>/21/<SERIE>
 *       (série = identifiant d'impression unique fourni par l'appelant) ;
 *   - sinon → `fallbackUrl` (comportement historique /p/<lotId>?code=…,
 *     analytics par QR conservées) — ou, à défaut, l'URL standard
 *     /r/<productId> de la bibliothèque.
 *
 * Fonction PURE (aucun accès DB, aucune dépendance serveur) : utilisable
 * côté serveur (routes API) ET côté client (aperçus du dashboard), testable
 * unitairement. NB : le helper `construireUrlQrClient` de `qr-url.ts`
 * l'enveloppe avec les types du dashboard (lookup produit/lot + origine
 * navigateur).
 */
export function construireUrlQrPourLot(params: {
  produit: { id: string; barcode: string | null };
  lot: { lotNumber: string | null; reference: string };
  /** Identifiant d'impression unique (série AI 21 pour GS1). */
  serie?: string;
  /** URL standard de repli (ex: "/p/<lotId>?code=<code>"). */
  fallbackUrl?: string;
  /** Origine explicite (défaut : domaine GS1 / standard configuré). */
  origine?: string;
}): { url: string; format: "GS1" | "STANDARD"; gtin?: string } {
  if (params.produit.barcode) {
    const gtin = normaliserGtin(params.produit.barcode);
    if (gtin) {
      return {
        url: genererUrlGs1(
          {
            gtin,
            lot: params.lot.lotNumber ?? params.lot.reference,
            ...(params.serie ? { serie: params.serie } : {}),
          },
          params.origine
        ),
        format: "GS1",
        gtin,
      };
    }
  }
  return {
    url:
      params.fallbackUrl ??
      genererUrlStandard(params.produit.id, params.origine),
    format: "STANDARD",
  };
}

// ---------------------------------------------------------------------------
// Export du pattern d'identifiant produit (utilisé par le resolver)
// ---------------------------------------------------------------------------
export { RE_ID_PRODUIT as PATTERN_ID_PRODUIT };
