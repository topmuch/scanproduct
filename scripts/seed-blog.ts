/**
 * Seed du blog — 4 articles fondateurs demandés par le client.
 * Idempotent : upsert par slug (les republications ne dupliquent rien).
 * Usage : bun run scripts/seed-blog.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type SeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: number;
  author: string;
  coverImage: string;
  published: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  content: string;
};

const ARTICLES: SeedPost[] = [
  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "comment-exporter-des-produits-vers-union-europeenne",
    title: "Comment exporter des produits vers l'Union européenne : le guide complet 2026",
    excerpt:
      "Normes sanitaires, certificats, étiquetage, TRACES : découvrez les étapes concrètes pour exporter vos produits alimentaires et cosmétiques vers l'Union européenne — et comment VerifScan simplifie chaque étape.",
    category: "Export",
    readTime: 9,
    author: "Équipe VerifScan",
    coverImage: "/images/industries/fruits-legumes.jpg",
    published: true,
    seoTitle:
      "Exporter vers l'Union européenne : guide complet 2026 (normes, certificats)",
    seoDescription:
      "Guide pratique d'export vers l'UE : réglementation sanitaire, certificats phytosanitaires, étiquetage, TRACES, TVA. Comment VerifScan facilite la conformité et la traçabilité de vos lots.",
    seoKeywords:
      "export union européenne, réglementation UE, certificat phytosanitaire, Global GAP, traçabilité alimentaire, export Afrique vers Europe, étiquetage UE, TRACES",
    content: `L'Union européenne est le premier marché d'importation de produits alimentaires et cosmétiques en provenance d'Afrique de l'Ouest. Mangues du Sénégal, beurre de karité du Burkina Faso, cacao de Côte d'Ivoire, jus de bissap : chaque année, des milliers de conteneurs franchissent les ports de Rotterdam, Anvers ou Marseille. Mais l'UE est aussi l'un des marchés les plus réglementés au monde. Ce guide détaille les étapes concrètes pour exporter vos produits vers l'Union européenne, sans mauvaise surprise.

## 1. Comprendre le cadre réglementaire de l'UE

L'UE applique le principe de précaution : tout produit entrant sur son territoire doit prouver qu'il ne présente aucun risque pour la santé du consommateur. Les textes de référence à connaître sont les suivants :

- **Le règlement (CE) n° 178/2002** : il pose les principes généraux de la sécurité alimentaire et impose la traçabilité à toutes les étapes de la chaîne. C'est le fondement juridique de l'obligation de traçabilité européenne.
- **Le règlement (UE) 2017/625** : il organise les contrôles officiels aux frontières pour les produits d'origine animale et végétale.
- **Le règlement (UE) n° 1169/2011** : il régit l'information du consommateur, donc l'étiquetage obligatoire (ingrédients, allergènes, valeurs nutritionnelles, DLC/DDM).
- **Pour les cosmétiques** : le règlement (CE) n° 1223/2009 impose notamment un responsable légal établi dans l'UE et un dossier d'information produit (PIF).

En pratique, votre importateur européen vérifiera ces points avant même de signer le contrat. Anticiper la conformité est donc un argument commercial, pas une contrainte administrative.

## 2. Identifier le code SH et les droits de douane

Chaque produit possède un **code SH (Système Harmonisé)** qui détermine son traitement douanier. Une mangue fraîche (code 0804.50), une mangue séchée (0813.30) et une mangue congelée (0811.90) ne suivent pas les mêmes circuits. Le code SH détermine :

- Le **taux de droit de douane** applicable (souvent 0 % pour les matières premières agricoles d'origine ACP grâce aux accords régionales),
- Les **documents exigés** à l'importation,
- Les éventuelles **mesures de sauvegarde** ou contingents.

> Conseil : vérifiez votre code SH sur le système TARIC de la Commission européenne. Une erreur de classification est l'une des premières causes de blocage en douane.

## 3. Les certificats obligatoires pour entrer dans l'UE

### Le certificat phytosanitaire (produits végétaux)

Délivré par la Direction de la Protection des Végétaux de votre pays, il atteste que votre lot est exempt de organismes nuisibles de quarantaine. Il est transmis via le système européen **TRACES**, que l'inspecteur frontière vérifie au point d'entrée désigné (PED).

### Le certificat sanitaire (produits d'origine animale)

Miel, produits laitiers, viandes : ils exigent un certificat sanitaire délivré par l'autorité compétente nationale, avec des exigences d'agrément de l'établissement d'origine.

### Les certifications privées, devenues des standards

- **Global GAP** pour les fruits et légumes frais : quasi obligatoire pour entrer dans la grande distribution européenne.
- **BRC / IFS** pour les produits transformés : exigées par la plupart des distributeurs.
- **Bio européen** (règlement 2018/848) : nécessaire pour afficher le label vert eurofeuille.
- **HACCP** : méthode d'analyse des dangers attendue par tous les acheteurs professionnels.

## 4. L'étiquetage : la vitrine réglementaire de votre produit

L'étiquette de votre produit destiné au consommateur européen doit mentionner, en principe dans la ou les langues officielles du pays de vente :

1. La **dénomination** du produit,
2. La **liste des ingrédients** (par ordre décroissant de poids) avec les **allergènes** mis en évidence,
3. La **quantité nette**,
4. La **DLC ou DDM** (durée de conservation),
5. Les **conditions de conservation**,
6. Le **nom et adresse** de l'exploitant établi dans l'UE,
7. Les **valeurs nutritionnelles** (tableau obligatoire),
8. Le **pays d'origine** lorsqu'il est pertinent.

Un défaut d'étiquetage est un motif de refus à l'importation. Et au-delà de la réglementation, un étiquetage transparent est ce que le consommateur vérifie de plus en plus — notamment en scannant un QR code sur l'emballage.

## 5. Organiser la logistique et la chaîne du froid

Le transport vers l'UE dépend de la nature du produit : conteneur frigorifique (reefer) pour les fruits frais, navire standard pour les produits secs, fret aérien pour les produits à forte valeur ou périssables. Les points de vigilance :

- **La température** : chaque rupture de chaîne du froid se voit sur le produit à l'arrivée, et peut justifier un refus.
- **Les délais** : comptez 10 à 21 jours de mer selon l'itinéraire, plus les délais de pré-acheminement et de dédouanement.
- **L'assurance** : l'incoterm retenu (FOB, CIF, DAP…) détermine qui supporte les risques et à partir de quand.
- **Les documents de transport** : connaissement (B/L), liste de colisage, facture commerciale, certificat d'origine (EUR.1 ou déclaration d'origine selon les accords).

## 6. La traçabilité : l'exigence qui change tout

Depuis quelques années, la traçabilité n'est plus seulement une obligation légale : c'est une **exigence commerciale**. Les acheteurs européens demandent à pouvoir retracer un lot en quelques minutes, du champ ou de l'usine jusqu'au magasin. Un rappel produit mal géré peut coûter des centaines de milliers d'euros — et la réputation d'un fournisseur.

C'est précisément le problème que résout **VerifScan** :

- Chaque lot de production reçoit un **QR code unique** collé sur l'emballage,
- Le QR code ouvre une **page passeport numérique** avec : composition, origine, dates de péremption, certificats, allergènes, valeur nutritionnelle,
- L'exportateur et l'importateur consultent **l'historique complet du lot** (contrôles, certifications, température de collecte…),
- En cas de rappel, la liste des lots concernés est identifiée **en une recherche**, pas en trois semaines d'archives papier.

## Conclusion : anticiper, documenter, tracer

Exporter vers l'Union européenne demande de la rigueur : un code SH correct, des certificats à jour, un étiquetage conforme, une logistique maîtrisée. Mais surtout, cela demande de la **transparence documentaire**. Les exportateurs qui réussissent sont ceux qui peuvent prouver, à tout moment, ce que contient leur produit et d'où il vient.

Avec VerifScan, chaque lot de votre production dispose d'un passeport numérique vérifiable par votre importateur comme par le consommateur final. **Créez votre compte gratuit** et préparez votre prochaine expédition vers l'Europe avec une traçabilité de niveau européen.`,
  },

  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "comment-exporter-vers-etats-unis-guide",
    title: "Comment exporter aux États-Unis : démarches, FDA et réglementation",
    excerpt:
      "FDA, FSMA, Prior Notice, Airbill, étiquetage FDA : le marché américain est le plus grand du monde, mais son accès est encadré. Voici le parcours complet pour exporter vos produits vers les USA — et y arriver sereinement.",
    category: "Export",
    readTime: 8,
    author: "Équipe VerifScan",
    coverImage: "/features/feature-export.webp",
    published: true,
    seoTitle: "Exporter aux États-Unis : guide FDA, FSMA et étapes clés 2026",
    seoDescription:
      "Export vers les USA : inscription FDA, Prior Notice, loi FSMA, étiquetage américain, douanes et logistique. Comment VerifScan sécurise la traçabilité de vos lots vers le marché américain.",
    seoKeywords:
      "export états-unis, FDA, FSMA, prior notice, export USA Afrique, réglementation américaine, étiquetage FDA, food facility registration",
    content: `Avec plus de 330 millions de consommateurs et un pouvoir d'achat parmi les plus élevés au monde, les États-Unis représentent une opportunité majeure pour les producteurs africains de produits alimentaires, cosmétiques et artisanaux. Mais l'accès au marché américain obéit à des règles strictes, pilotées principalement par la **FDA** (Food and Drug Administration). Ce guide vous accompagne étape par étape.

## 1. S'enregistrer auprès de la FDA : la porte d'entrée obligatoire

Avant tout envoi de produits alimentaires vers les USA, votre **établissement de transformation** doit être enregistré auprès de la FDA. Cette inscription (Food Facility Registration) est **gratuite** et se fait en ligne. Points clés :

- L'enregistrement doit être **renouvelé tous les deux ans**, les années paires (octobre–décembre),
- Vous devez désigner un **agent américain (US Agent)** si vous n'avez pas de présence physique aux USA — c'est un interlocuteur obligatoire pour la FDA,
- Chaque site de production doit avoir son propre enregistrement.

Pour les cosmétiques, la loi **MoCRA** (Modernization of Cosmetics Regulation Act, 2022) impose désormais également l'enregistrement des établissements et la déclaration des produits.

## 2. Comprendre la loi FSMA : la sécurité dès la source

Le **FSMA** (Food Safety Modernization Act, 2011) a changé la philosophie du contrôle américain : au lieu de réagir aux contaminations, la FDA exige qu'elles soient **prévenues à la source**. Pour un exportateur, cela se traduit concrètement par :

- **Un plan de sécurité alimentaire** écrit, fondé sur l'analyse des dangers (HARPC, cousin américain du HACCP),
- Un **responsable préventif qualifié** (Preventive Controls Qualified Individual) au sein de l'entreprise,
- Des **procédures de vérification des fournisseurs** (FSVP) que votre importateur américain devra appliquer — et donc des documents qu'il vous demandera : analyses de laboratoire, certificats, plans d'hygiène,
- Des registres de production conservés et **consultables rapidement** en cas d'inspection.

> À retenir : un importateur américain sérieux vous demandera vos documents FSMA AVANT le premier container. Préparez-les dès maintenant.

## 3. Le Prior Notice : prévenir la FDA avant l'arrivée

Chaque envoi alimentaire vers les USA doit faire l'objet d'une **Prior Notice** — une déclaration préalable transmise à la FDA avant l'arrivée de la marchandise, avec des délais stricts :

- **Fret aérien** : au moins 4 heures avant l'arrivée,
- **Fret maritime** : au moins 8 heures avant l'accostage,
- **Fret terrestre** : de 1 à 2 heures selon le mode.

La Prior Notice contient l'identification de l'expéditeur, du destinataire, du produit, du pays d'origine et du transporteur. Elle se fait généralement via le système **FDA PNSI** ou par votre transitaire via ACE. Sans Prior Notice valide, la marchandise peut être refusée au port — voire détruite.

## 4. L'étiquetage américain : des règles différentes de l'Europe

L'étiquette destinée au marché américain diffère sensiblement de l'étiquette européenne :

- **La liste des ingrédients** et les informations nutritionnelles suivent le format **FDA** (Nutrition Facts) avec sa typographie et son cadre caractéristiques,
- Les quantités s'expriment en **unités américaines** (oz, lb, fl oz) en plus du système métrique,
- Les allégations nutritionnelles ("low fat", "high fiber"…) sont strictement encadrées,
- Le **pays d'origine** (Country of Origin) doit figurer sur l'étiquette,
- La DLC américaine s'appelle "Best By" ou "Use By" selon les États — la réglementation fédérale reste souple, mais certains États (comme la Californie) imposent leurs règles.

Une erreur d'étiquetage est l'une des premières causes de **refus d'entrée** (Detention Without Physical Examination) constatées par la FDA. Faites relire votre étiquette par un spécialiste avant l'impression.

## 5. Douane, droits et documents d'expédition

Les documents exigés pour un envoi commercial vers les USA :

1. **Facture commerciale** détaillée (valeur, devise, incoterm),
2. **Liste de colisage** (packing list),
3. **Connaissement** (B/L maritime) ou **Air Waybill** (aérien),
4. **Certificat d'origine** le cas échéant,
5. **Arrangement électronique des données** : votre importateur déclare via le système **ACE** de Customs and Border Protection (CBP).

Le **HTS code** américain (équivalent du code SH) détermine les droits de douane. Selon les produits et les programmes commerciaux (AGOA pour certains pays africains), des exonérations sont possibles — vérifiez l'éligibilité de votre produit.

## 6. La traçabilité des lots : votre meilleure protection

Aux États-Unis, la FDA peut exiger un **retrait de produit (recall)** en quelques heures. Le règlement **FSMA 204** (Food Traceability Rule), applicable à partir de 2026, impose en outre un suivi traçable sur la base de **KDE** (Key Data Elements) et **CTE** (Critical Tracking Events) pour une liste de produits à risque. Autrement dit : la traçabilité numérique devient une exigence légale d'entrée sur le marché américain.

C'est exactement ce que fait VerifScan :

- **Un QR code unique par lot** de production, collé sur l'emballage ou l'étiquette d'expédition,
- Un **passeport numérique** consultable en un scan : composition, dates, certificats, analyses,
- Un **historique du lot** complet (événements clés), exportable pour vos clients américains et leurs audits FSVP,
- Une **recherche instantanée** des lots concernés en cas de problème qualité.

Pour un acheteur américain, choisir un fournisseur capable de présenter une traçabilité numérique propre est un signal de fiabilité fort — et souvent un facteur de décision.

## Conclusion : le marché américain se prépare en amont

Exporter aux États-Unis exige de la préparation : enregistrement FDA, conformité FSMA, Prior Notice, étiquetage adapté, documentation douanière. Rien d'insurmontable — à condition d'y penser **avant** le premier conteneur.

Et pour transformer cette conformité en avantage commercial, équipez vos produits d'un passeport numérique VerifScan. **Créez votre compte gratuit** et donnez à vos clients américains la transparence qu'ils attendent.`,
  },

  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "comment-verifscan-aide-les-exportateurs",
    title: "Comment VerifScan aide les exportateurs à vendre à l'international",
    excerpt:
      "Certificats centralisés, QR code par lot, historique traçable, page produit vérifiable par l'acheteur : voici concrètement comment VerifScan accompagne les exportateurs africains, de la production locale aux marchés d'Europe et d'Amérique.",
    category: "Traçabilité",
    readTime: 7,
    author: "Équipe VerifScan",
    coverImage: "/images/industries/cafe-cacao.jpg",
    published: true,
    seoTitle:
      "VerifScan pour les exportateurs : traçabilité QR, certificats et confiance",
    seoDescription:
      "Découvrez comment VerifScan aide les exportateurs : passeport numérique par lot, QR code anti-contrefaçon, certificats digitaux, historique traçable et transparence pour les acheteurs internationaux.",
    seoKeywords:
      "VerifScan exportateurs, traçabilité export, QR code produit, passeport numérique, certificats digitaux, anti-contrefaçon, export Afrique, confiance acheteur",
    content: `Exporter, c'est convaincre un acheteur situé à des milliers de kilomètres qu'un produit qu'il n'a jamais vu, fabriqué par une entreprise qu'il ne connaît pas, respectera les attentes de ses propres clients. Cette confiance, aujourd'hui, se construit avec des **preuves vérifiables**. VerifScan a été conçu exactement pour cela : donner à chaque produit un passeport numérique que n'importe qui — acheteur, douane, distributeur, consommateur — peut vérifier en un scan.

## 1. Un passeport numérique complet pour chaque lot

Sur VerifScan, l'unité de traçabilité est le **lot de production**. Pour chaque lot, l'exportateur rassemble en un seul endroit :

- La **fiche produit** : composition, ingrédients, allergènes, valeurs nutritionnelles,
- Les **dates clés** : production, durabilité (DLC/DDM), contrôle qualité,
- Les **certificats** : phytosanitaire, sanitaire, Global GAP, Bio, HACCP, halal… chaque document est stocké et associé au lot,
- L'**historique des événements** : collecte, transformation, conditionnement, contrôle, expédition,
- Le **score de transparence**, qui mesure la complétude des informations du lot.

Ces informations sont regroupées derrière une **page passeport unique**, accessible par une URL et un QR code. Votre acheteur à Rotterdam ou à New York peut la consulter depuis son téléphone pendant la visite d'usine ou la négociation, sans échange de dossiers PDF éparpillés.

## 2. Un QR code unique par lot : la preuve qui voyage avec le produit

Chaque lot reçoit un **QR code unique**, imprimable directement sur l'étiquette de vos emballages. Ce QR code a trois fonctions :

1. **Prouver l'authenticité** : un QR VerifScan ne pointe pas vers une page générique, mais vers le passeport du lot précis. Un contrefaçon qui copie le visuel ne peut pas copier la page — et un QR copié devient détectable (le même code scanné à des endroits incohérents déclenche une alerte),
2. **Informer le consommateur** : dans le magasin, le client scanne et voit l'origine, la composition, les dates — dans sa langue, sur son téléphone,
3. **Simplifier les contrôles** : douane, autorité sanitaire ou acheteur vérifient le produit en quelques secondes.

## 3. Des certificats digitaux, toujours à jour

Les exportateurs perdent un temps considérable à retrouver et renvoyer des scans de certificats à chaque prospect. Avec VerifScan :

- Les certificats sont **téléversés une fois** et associés aux lots concernés,
- Un **lien de vérification** peut être partagé avec un acheteur qui voit le document dans son contexte (produit, dates, périmètre),
- Les **dates d'expiration** sont visibles : plus d'expédition avec un certificat périmé passé inaperçu,
- Lors d'un audit (FSVP américain, contrôle SIVEP, audit client), tout est présenté depuis une interface claire.

## 4. L'historique du lot : votre dossier d'audit prêt à l'emploi

Chaque action enregistrée sur un lot — réception de matière première, production, contrôle qualité, conditionnement — alimente un **historique horodaté**. En pratique :

- Lors d'une **inspection frontière**, vous présentez l'historique complet du lot en quelques clics,
- Lors d'un **audit client** (grande distribution, importateur), vous montrez la maîtrise de votre processus,
- En cas de **réclamation** ou de rappel, vous identifiez immédiatement les lots concernés et leur destination,
- Pour la règle européenne 178/2002 et la future exigence américaine FSMA 204, vous êtes déjà dans les clous.

## 5. Des statistiques de scans : savoir qui s'intéresse à vos produits

Chaque scan d'un QR code VerifScan est comptabilisé (de manière anonyme et conforme) : nombre de scans, pays, moments. Pour un exportateur, c'est une mine d'informations :

- **Mesurer l'intérêt réel** pour vos produits sur un salon ou un marché,
- **Détecter une anomalie** : un pic de scans dans un pays où vous n'exportez pas est un signal de contrefaçon,
- **Valoriser votre marque** : « notre produit a été scanné 10 000 fois dans 12 pays » est un argument commercial fort.

## 6. Un impact direct sur les ventes

Les acheteurs internationaux classent leurs fournisseurs selon trois critères : la qualité, la fiabilité documentaire et la réactivité. VerifScan agit sur les deux derniers :

- **Dossiers de tendance plus complets** : vos fiches produit et certificats sont accessibles immédiatement,
- **Confiance renforcée** : la transparence affichée réduit les objections et les vérifications fastidieuses,
- **Différenciation** : un QR code passeport sur l'emballage distingue votre produit des concurrents sur le rayon,
- **Accès aux marchés exigeants** : UE (règlement 178/2002) et USA (FSMA 204) durcissent leurs exigences de traçabilité — vous y êtes prêt dès maintenant.

## Conclusion : la traçabilité comme avantage commercial

VerifScan ne remplace pas votre qualité : il la **prouve**. Du lot de production jusqu'au scan du consommateur, chaque étape devient visible, vérifiable et valorisable. Les exportateurs qui l'ont compris transforment une obligation réglementaire en argument de vente.

**Créez votre compte gratuit sur VerifScan** et donnez à vos produits le passeport numérique qui leur ouvrira les marchés internationaux.`,
  },

  // ═══════════════════════════════════════════════════════════════════
  {
    slug: "consommateurs-scannez-le-qrcode-de-vos-produits",
    title: "Consommateurs : scannez le QR code de vos produits pour tout savoir",
    excerpt:
      "Dates de péremption, ingrédients, allergènes, origine, certificats : le QR code VerifScan sur un emballage ouvre le passeport numérique du produit. Voici ce que vous y trouverez — et pourquoi cela change votre façon d'acheter.",
    category: "Consommateurs",
    readTime: 6,
    author: "Équipe VerifScan",
    coverImage: "/features/step-generate-qr.webp",
    published: true,
    seoTitle:
      "Scanner le QR code d'un produit : péremption, ingrédients, origine | VerifScan",
    seoDescription:
      "Que révèle le QR code d'un produit VerifScan ? Dates de péremption, ingrédients, allergènes, certificats, origine : le passeport numérique accessible à tous les consommateurs en un scan.",
    seoKeywords:
      "scanner QR code produit, date de péremption produit, ingrédients produit, allergènes, vérifier authenticité produit, contrefaçon, consommateur traçabilité, passeport numérique",
    content: `Quand vous prenez un produit en main, combien de questions vous viennent ? Est-il encore bon ? Que contient-il vraiment ? D'où vient-il ? Est-il authentique ? Sur l'étiquette, la réponse tient parfois dans une typographie minuscule. Avec VerifScan, la réponse complète tient dans un **QR code** : vous le scannez, et le passeport numérique du produit s'affiche sur votre téléphone. Voici ce que vous y découvrez.

## 1. Les dates de péremption, claires et à jour

La première information que les consommateurs recherchent est la **fraîcheur du produit**. Sur le passeport numérique, vous voyez :

- La **date de durabilité** (DLC « à consommer jusqu'au » ou DDM « à consommer de préférence avant le ») du lot précis que vous avez en main,
- La **date de production** du lot,
- Le **statut du lot** : actif, proche de l'expiration, ou rappelé — l'information vient du fabricant, pas d'une réimpression d'étiquette.

Contrairement à une étiquette imprimée des mois plus tôt, la page passeport reflète l'information **la plus récente** du fabricant. Si un lot est rappelé, c'est la page scannée qui l'annonce — même si le produit est déjà dans votre placard.

## 2. Les ingrédients et allergènes, sans loupe

Les allergies et intolérances concernent des millions de personnes. Sur la page du produit, vous retrouvez :

- La **liste complète des ingrédients**, dans l'ordre,
- Les **allergènes majeurs** (gluten, arachide, lait, œuf, fruits à coque…) mis en évidence,
- Les **valeurs nutritionnelles** par portion ou pour 100 g,
- Des informations utiles selon les produits : origine des ingrédients clés, conditions de conservation, mode d'emploi.

C'est plus lisible qu'une étiquette : le texte est adapté à votre écran, et dans la langue du produit que le fabricant a configurée.

## 3. L'origine et l'histoire du produit

Le passeport numérique raconte aussi d'où vient le produit :

- Le **fabricant** : nom, localisation, présentation,
- Le **lieu de production** ou de collecte,
- Les **certifications** attachées au lot : Bio, HACCP, halal, label qualité, commerce équitable,
- L'**historique visible** : les grandes étapes de la vie du lot, de la production à la mise en rayon.

Pour les produits du terroir et d'export, c'est la garantie d'acheter un vrai produit local — et de le soutenir.

## 4. Vérifier l'authenticité : votre arme contre la contrefaçon

La contrefaçon alimentaire et cosmétique est un fléau : jus faux, huiles diluées, cosmétiques dangereux vendus sous des marques connues. Le QR code VerifScan est un **outil anti-contrefaçon** :

- Chaque **lot réel** possède sa page unique, générée par le fabricant,
- Un produit suspect (QR inexistant, page modifiée, code dupliqué scanné à des centaines de kilomètres d'écart) est **détecté et signalé**,
- Le **nombre de scans** du lot est suivi : une copie du code qui circule anormalement déclenche des alertes côté fabricant.

En scannant avant d'acheter — ou avant de consommer — vous protégez votre santé et vous découragez les faussaires.

## 5. Comment scanner ? C'est très simple

Aucune application n'est nécessaire dans la plupart des cas :

1. **Ouvrez l'appareil photo** de votre téléphone (iPhone ou Android),
2. **Visez le QR code** imprimé sur l'emballage du produit,
3. Touchez la **notification** qui apparaît : la page passeport s'ouvre dans votre navigateur.

La page est **légère** : elle se charge rapidement, même avec une connexion mobile modeste. Vous pouvez y accéder avant l'achat, à la maison, ou au moment de consommer.

## 6. Ce que votre scan change, côté fabricant

Chaque scan anonyme est comptabilisé pour le fabricant : il sait combien de consommateurs ont consulté son produit, et quand. Ce retour direct :

- Encourage les producteurs à **maintenir la qualité**, puisque leur transparence est récompensée,
- Les aide à **détecter la contrefaçon** de leurs produits,
- Renforce la **relation de confiance** entre une marque et ses clients — une confiance vérifiable, pas seulement promise.

## Conclusion : la transparence est dans votre poche

Scanner le QR code d'un produit VerifScan, c'est passer de « je crois ce que dit l'étiquette » à « je vérifie ce que dit le fabricant ». Dates de péremption fiables, ingrédients clairs, allergènes visibles, origine réelle, authenticité prouvée : toutes ces informations vous suivent désormais dans votre poche.

La prochaine fois que vous verrez le QR code VerifScan sur un emballage, **scannez-le** — et découvrez la vérité au bout du scan.`,
  },
];

async function main() {
  console.log("🌱 Seed du blog — 4 articles fondateurs…\n");

  for (const a of ARTICLES) {
    const existing = await db.post.findUnique({ where: { slug: a.slug } });
    if (existing) {
      // Mise à jour du contenu, en préservant publishedAt (stabilité SEO)
      await db.post.update({
        where: { slug: a.slug },
        data: {
          title: a.title,
          excerpt: a.excerpt,
          content: a.content,
          category: a.category,
          readTime: a.readTime,
          coverImage: a.coverImage,
          seoTitle: a.seoTitle,
          seoDescription: a.seoDescription,
          seoKeywords: a.seoKeywords,
          published: true,
          publishedAt: existing.publishedAt ?? new Date(),
        },
      });
      console.log(`  ↻ mis à jour : ${a.slug}`);
    } else {
      await db.post.create({
        data: {
          slug: a.slug,
          title: a.title,
          excerpt: a.excerpt,
          content: a.content,
          category: a.category,
          readTime: a.readTime,
          author: a.author,
          coverImage: a.coverImage,
          published: a.published,
          publishedAt: a.published ? new Date() : null,
          seoTitle: a.seoTitle,
          seoDescription: a.seoDescription,
          seoKeywords: a.seoKeywords,
        },
      });
      console.log(`  ✔ créé : ${a.slug}`);
    }
  }

  const total = await db.post.count();
  console.log(`\n✅ Blog seedé — ${total} article(s) au total.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed blog échoué:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
