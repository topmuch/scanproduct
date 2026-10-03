// ============================================================================
// product-templates — Bibliothèque de produits types (auto-complétion)
// ============================================================================
// Base de connaissances embarquée : chaque template décrit un produit type
// (cosmétique artisanal ou agroalimentaire local) avec sa durée de
// conservation, ses conseils d'utilisation, ses précautions d'emploi, ses
// ingrédients typiques et ses conditions de stockage adaptées au climat
// sénégalais (chaleur + humidité).
//
// Utilisée par :
//   - SmartProductSelector (composant commun classique + artisan)
//   - /api/product-templates (recherche serveur)
//   - LotCreatePage (auto-calcul de la date de péremption)
//
// Les conseils sont rédigés pour des petits producteurs sénégalais :
// formulations simples, vocabulaire accessible, climat tropical.
// ============================================================================

export type ProductTemplateCategory = "cosmetique" | "agroalimentaire";

export interface ProductTemplate {
  /** Identifiant unique (kebab-case) — persisté sur Product/PreActivatedLot. */
  id: string;
  /** Nom du produit type affiché à l'utilisateur. */
  name: string;
  category: ProductTemplateCategory;
  /** Désignation courte préremplie (modifiable) — description vendeuse
   *  affichée sous le nom du produit sur la page publique. */
  designation: string;
  /** Durée de conservation en mois (entier). Si la durée est < 1 mois,
   *  renseigner shelfLifeDays et laisser 0. */
  shelfLifeMonths: number;
  /** Durée fine en jours — prime sur shelfLifeMonths quand défini (ex. pain : 7 j). */
  shelfLifeDays?: number;
  usageTips: string[];
  precautions: string[];
  typicalIngredients: string[];
  storageConditions: string;
  allergens?: string[];
  /** Emoji représentatif. */
  icon: string;
}

// ============================================================================
// COSMÉTIQUES (14 templates)
// ============================================================================

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    id: "savon-solide-saponification-a-froid",
    name: "Savon solide (saponification à froid)",
    category: "cosmetique",
    designation: "Savon artisanal saponifié à froid, 100 % naturel, mûri plusieurs semaines",
    shelfLifeMonths: 18,
    usageTips: [
      "Faire mousser le savon sur peau humide",
      "Masser le corps ou le visage en mouvements circulaires",
      "Rincer abondamment à l'eau claire",
      "Laisser sécher le savon entre deux utilisations pour qu'il dure plus longtemps",
      "Utiliser matin et soir pour une peau saine",
    ],
    precautions: [
      "Usage externe uniquement — ne pas avaler",
      "Éviter le contact avec les yeux ; rincer à l'eau claire en cas de contact",
      "Ne pas appliquer sur une plaie ou une peau irritée",
      "Tenir hors de portée des enfants",
    ],
    typicalIngredients: [
      "Huile de coco",
      "Beurre de karité",
      "Huile d'arachide",
      "Soude (hydroxyde de sodium)",
      "Eau pure",
      "Huiles essentielles (lavande, citron…)",
      "Moringa ou neem en poudre",
    ],
    storageConditions:
      "Conserver dans un endroit sec et aéré, à l'abri de la chaleur directe. Au climat sénégalais, poser le savon sur un porte-savon drainé — jamais dans une soucoupe remplie d'eau — et à l'abri du soleil.",
    allergens: ["Huile de coco", "Huile d'arachide", "Huiles essentielles"],
    icon: "🧼",
  },
  {
    id: "savon-liquide",
    name: "Savon liquide",
    category: "cosmetique",
    designation: "Savon liquide artisanal, doux pour la peau, préparé à la main",
    shelfLifeMonths: 6,
    usageTips: [
      "Verser une petite quantité sur main ou éponge humide",
      "Faire mousser puis rincer à l'eau claire",
      "Utiliser pour les mains, le corps ou la vaisselle délicate selon la formule",
      "Refermer le flacon après chaque usage",
    ],
    precautions: [
      "Usage externe uniquement",
      "Éviter le contact avec les yeux ; rincer abondamment en cas de contact",
      "Ne pas diluer avec de l'eau non potable (risque de contamination)",
      "Cesser l'utilisation en cas d'irritation cutanée",
    ],
    typicalIngredients: [
      "Base lavante (savon noir liquide ou tensioactif doux)",
      "Huile de coco",
      "Glycérine végétale",
      "Eau pure bouillie",
      "Huile essentielle d'eucalyptus",
      "Sel épaississant",
    ],
    storageConditions:
      "Conserver le flacon bien fermé, à l'abri du soleil et de la chaleur. En saison des pluies, éviter les pièces humides qui favorisent la moisissure. Utiliser dans les 6 mois après fabrication.",
    allergens: ["Huile de coco", "Huiles essentielles"],
    icon: "🧴",
  },
  {
    id: "gommage-corporel-sec",
    name: "Gommage corporel sec (sucre + huile)",
    category: "cosmetique",
    designation: "Gommage corporel sec 100 % naturel, exfoliant à base de sucre et d'huiles",
    shelfLifeMonths: 12,
    usageTips: [
      "Appliquer sur peau humide, sous la douche",
      "Masser en mouvements circulaires du bas vers le haut",
      "Insister sur coudes, genoux et talons",
      "Rincer à l'eau tiède puis sécher doucement",
      "Utiliser 1 à 2 fois par semaine maximum",
    ],
    precautions: [
      "Ne pas utiliser sur peau lésée, brûlée ou irritée",
      "Éviter le visage et les parties intimes (grains trop abrasifs)",
      "Bien refermer le pot : l'eau qui entre fait fondre le sucre",
      "Cesser en cas de rougeur persistante",
    ],
    typicalIngredients: [
      "Sucre blanc ou roux",
      "Huile de coco",
      "Miel",
      "Huile d'amande douce",
      "Citron (zeste ou jus)",
      "Vanille ou poudre de gingembre",
    ],
    storageConditions:
      "Conserver le pot hermétiquement fermé dans un endroit sec et frais, à l'abri du soleil. La chaleur sénégalaise peut faire fondre l'huile :placer le pot dans un cellier ou le bas du réfrigérateur si la texture se sépare.",
    allergens: ["Huile de coco", "Miel", "Huile d'amande douce"],
    icon: "🧽",
  },
  {
    id: "gommage-corporel-humide",
    name: "Gommage corporel humide (avec eau)",
    category: "cosmetique",
    designation: "Gommage corporel humide frais, sans conservateur, préparé à la main",
    shelfLifeMonths: 3,
    usageTips: [
      "Appliquer une noisette sur peau humide",
      "Masser doucement en cercles pendant 1 à 2 minutes",
      "Rincer abondamment à l'eau tiède",
      "Utiliser une à deux fois par semaine",
      "Toujours prélever avec une spatule ou une main propre et sèche",
    ],
    precautions: [
      "Produit frais sans conservateur : utiliser rapidement après ouverture",
      "Ne pas introduire d'eau dans le pot (risque bactérien élevé)",
      "Ne pas utiliser sur peau lésée ou après épilation",
      "Conserver au réfrigérateur et jeter si odeur inhabituelle",
    ],
    typicalIngredients: [
      "Sucre fin",
      "Purée de papaye ou de mangue",
      "Yaourt naturel",
      "Huile de coco",
      "Miel",
      "Jus de citron frais",
    ],
    storageConditions:
      "OBLIGATOIRE au réfrigérateur (4–8 °C) : la présence d'eau et de fruits frais rend le produit périssable, surtout avec la chaleur de Dakar ou de Thiès. À consommer dans le mois, à jeter au moindre changement d'odeur ou de couleur.",
    allergens: ["Yaourt (lait)", "Miel"],
    icon: "🧽",
  },
  {
    id: "gel-douche",
    name: "Gel douche",
    category: "cosmetique",
    designation: "Gel douche artisanal doux, nettoyant naturel pour un usage quotidien",
    shelfLifeMonths: 6,
    usageTips: [
      "Appliquer une noisette sur éponge ou gant de toilette humide",
      "Faire mousser sur tout le corps",
      "Rincer abondamment à l'eau claire",
      "Utiliser quotidiennement sous la douche",
      "Refermer le flacon après chaque usage",
    ],
    precautions: [
      "Usage externe uniquement",
      "Éviter le contact avec les yeux ; rincer à l'eau claire en cas de contact",
      "Ne pas utiliser sur peau irritée ou brûlée par le soleil",
      "Tenir hors de portée des enfants",
    ],
    typicalIngredients: [
      "Base lavante douce",
      "Pulpe d'aloe vera",
      "Glycérine végétale",
      "Huile essentielle de citron ou de karité",
      "Eau pure",
      "Sel de guélandais (épaississant naturel)",
    ],
    storageConditions:
      "Conserver à température ambiante, à l'abri du soleil et des fortes chaleurs (pas dans la voiture ni près d'une fenêtre exposée). Bien refermer pour éviter l'entrée d'eau de la douche.",
    allergens: ["Huiles essentielles"],
    icon: "🚿",
  },
  {
    id: "lait-corporel",
    name: "Lait corporel",
    category: "cosmetique",
    designation: "Lait corporel hydratant artisanal, pénètre vite et nourrit la peau",
    shelfLifeMonths: 6,
    usageTips: [
      "Appliquer sur peau propre et sèche, idéalement après la douche",
      "Masser jusqu'à pénétration complète",
      "Insister sur les zones sèches : coudes, genoux, talons",
      "Utiliser matin et soir pour une hydratation continue",
    ],
    precautions: [
      "Usage externe uniquement",
      "Ne pas appliquer sur peau lésée ou irritée",
      "Agiter avant emploi si la formule se sépare naturellement",
      "Cesser l'utilisation en cas de réaction allergique",
    ],
    typicalIngredients: [
      "Lait de coco",
      "Beurre de karité",
      "Huile de baobab",
      "Glycérine végétale",
      "Eau florale de rose",
      "Émulsifiant végétal",
      "Vitamine E (conservateur naturel)",
    ],
    storageConditions:
      "Conserver dans un endroit frais et sec, à l'abri de la lumière directe. Au-delà de 35 °C ambiants (saison chaude), placer au réfrigérateur pour éviter le rancissement des huiles et le déphasage de l'émulsion.",
    allergens: ["Lait de coco", "Huile de baobab"],
    icon: "🧴",
  },
  {
    id: "creme-visage",
    name: "Crème visage",
    category: "cosmetique",
    designation: "Crème visage nourrissante artisanale, pour une peau douce et protégée",
    shelfLifeMonths: 6,
    usageTips: [
      "Nettoyer le visage avant application",
      "Prélever une petite quantité au doigt propre",
      "Appliquer en effleurages doux sur le visage et le cou",
      "Utiliser matin et/ou soir",
      "Attendre quelques minutes avant de se maquiller",
    ],
    precautions: [
      "Usage externe — éviter le contour des yeux",
      "Faire un test au pli du coude 24 h avant la première utilisation",
      "Ne pas appliquer sur acné inflammatoire sans avis",
      "Conserver au frais une fois ouverte et utiliser dans les 6 mois",
    ],
    typicalIngredients: [
      "Beurre de karité",
      "Huile de moringa",
      "Aloe vera",
      "Glycérine végétale",
      "Cire d'abeille",
      "Eau de rose",
      "Vitamine E",
    ],
    storageConditions:
      "Conserver au frais (réfrigérateur recommandé au climat sénégalais) et à l'abri de la lumière. Toujours prélever avec un doigt ou une spatule propre : l'eau et la sueur introduites dans le pot accélèrent la contamination.",
    allergens: ["Cire d'abeille", "Huile de moringa"],
    icon: "🧴",
  },
  {
    id: "beurre-karite-pur",
    name: "Beurre de karité pur",
    category: "cosmetique",
    designation: "Beurre de karité brut 100 % pur, non raffiné, préparé à la main",
    shelfLifeMonths: 24,
    usageTips: [
      "Chauffer une petite quantité entre les paumes pour la faire fondre",
      "Appliquer sur peau sèche : corps, mains, pieds, coudes",
      "Utiliser sur les cheveux en masque avant le shampoing",
      "Appliquer sur les lèvres gercées et les cicatrices légères",
      "Utiliser matin et soir, ou après chaque douche",
    ],
    precautions: [
      "Usage externe uniquement",
      "Le beurre granule naturellement avec la chaleur — ce n'est pas un défaut",
      "Éviter la zone du visage pour les peaux grasses",
      "Vérifier l'absence de rancidité (odeur aigre) avant usage",
    ],
    typicalIngredients: [
      "Beurre de karité brut 100 % non raffiné",
      "(Aucun autre ingrédient — produit pur)",
    ],
    storageConditions:
      "Conserver dans un pot hermétique, dans un endroit frais et sec, à l'abri de la lumière. Le karité fond au-delà de 30 °C : le placer au réfrigérateur pendant la saison chaude ne l'abîme pas et prolonge sa durée de vie jusqu'à 24 mois.",
    icon: "🫙",
  },
  {
    id: "huile-massage",
    name: "Huile de massage",
    category: "cosmetique",
    designation: "Huile de massage artisanale, aux huiles végétales naturelles",
    shelfLifeMonths: 12,
    usageTips: [
      "Chauffer légèrement l'huile entre les mains avant application",
      "Masser en mouvements lents et circulaires",
      "Utiliser après le bain pour une meilleure absorption",
      "Pour bébé : appliquer 30 min avant le bain, en effleurages très doux",
      "Brosser ou peigner ensuite les cheveux imprégnés d'huile",
    ],
    precautions: [
      "Usage externe uniquement",
      "Ne pas utiliser sur peau lésée ou brûlure",
      "Tester sur une petite zone avant la première utilisation",
      "Rincer la peau à l'eau savonneuse après un massage prolongé",
      "Éviter tout contact avec les yeux",
    ],
    typicalIngredients: [
      "Huile de coco vierge",
      "Huile de sésame",
      "Huile de neem",
      "Huile essentielle de ylang-ylang",
      "Gousse de vanille",
      "Vitamine E",
    ],
    storageConditions:
      "Conserver dans un flacon ambré ou opaque, bien fermé, à l'abri de la lumière et de la chaleur. Les huiles rancissent vite au climat tropical : ne pas stocker près d'une cuisinière et utiliser dans les 12 mois.",
    allergens: ["Huile de sésame", "Huile de coco", "Huiles essentielles"],
    icon: "💆",
  },
  {
    id: "eau-florale-hydrolat",
    name: "Eau florale / Hydrolat",
    category: "cosmetique",
    designation: "Eau florale artisanale distillée, tonique naturelle pour le visage",
    shelfLifeMonths: 12,
    usageTips: [
      "Vaporiser sur le visage propre comme tonique",
      "Appliquer matin et soir avant la crème",
      "Utiliser pour apaiser les rougeurs et les coups de chaleur",
      "Brumiser les cheveux pour les rafraîchir et les parfumer",
      "Imbiber une compresse pour un soin apaisant des yeux",
    ],
    precautions: [
      "Usage externe uniquement",
      "Conserver au réfrigérateur après ouverture et utiliser dans les 3 mois",
      "Jeter si le liquide devient trouble ou sent l'aigre",
      "Ne pas utiliser si allergie à la plante d'origine",
    ],
    typicalIngredients: [
      "Distillat de fleurs (rose, jasmin, géranium)",
      "Eau distillée",
      "(Sans conservateur — distillation pure)",
    ],
    storageConditions:
      "Conserver au réfrigérateur après ouverture, dans son flacon spray bien fermé, à l'abri de la lumière. La chaleur sénégalaise accélère la fermentation : 12 mois non ouvert, 3 mois après ouverture.",
    icon: "🌸",
  },
  {
    id: "baume-levres",
    name: "Baume à lèvres",
    category: "cosmetique",
    designation: "Baume à lèvres nourrissant artisanal, au karité et cire naturelle",
    shelfLifeMonths: 18,
    usageTips: [
      "Appliquer sur les lèvres propres et sèches",
      "Renouveler plusieurs fois par jour, surtout après manger",
      "Utiliser avant de s'exposer au soleil ou au vent",
      "Appliquer en couche épaisse la nuit comme masque réparateur",
    ],
    precautions: [
      "Usage externe — réservé aux lèvres",
      "Ne pas partager le stick (hygiène)",
      "Cesser si irritation ou bouton de fièvre",
      "Tenir à l'abri de la chaleur : le baume fond au soleil",
    ],
    typicalIngredients: [
      "Beurre de karité",
      "Cire d'abeille",
      "Huile de coco",
      "Miel",
      "Huile de baobab",
      "Vitamine E",
    ],
    storageConditions:
      "Conserver à l'abri du soleil et de la chaleur — ne pas laisser dans une poche ou une voiture au soleil (le stick fond). Un tiroir frais suffit ; jusqu'à 18 mois de conservation.",
    allergens: ["Cire d'abeille", "Miel", "Huile de coco"],
    icon: "💄",
  },
  {
    id: "serum-huileux",
    name: "Sérum huileux",
    category: "cosmetique",
    designation: "Sérum huileux concentré artisanal, éclat et nutrition intense",
    shelfLifeMonths: 12,
    usageTips: [
      "Appliquer 3 à 5 gouttes sur peau propre et légèrement humide",
      "Presser doucement les gouttes sur le visage (ne pas frotter)",
      "Utiliser le soir avant la crème hydratante",
      "Masser le reste sur le cou et le décolleté",
    ],
    precautions: [
      "Usage externe uniquement",
      "Éviter le contour immédiat des yeux",
      "Faire un test d'allergie 24 h avant la première application",
      "Ne pas s'exposer au soleil juste après (certaines huiles photosensibilisent)",
    ],
    typicalIngredients: [
      "Huile de baobab",
      "Huile de moringa",
      "Huile de nigelle",
      "Vitamine E",
      "Huile essentielle de carotte",
    ],
    storageConditions:
      "Conserver dans le flacon ambré d'origine, bien bouché, à l'abri de la lumière et de la chaleur. Un placard fermé à l'abri de la cuisine convient ; utiliser dans les 12 mois.",
    allergens: ["Huile de nigelle", "Huiles essentielles"],
    icon: "🧴",
  },
  {
    id: "masque-argile-poudre",
    name: "Masque argile (poudre)",
    category: "cosmetique",
    designation: "Masque à l'argile en poudre, à préparer soi-même, 100 % minéral",
    shelfLifeMonths: 24,
    usageTips: [
      "Mélanger 2 cuillères de poudre avec de l'eau florale ou de l'eau pure",
      "Appliquer une couche fine sur visage propre",
      "Laisser poser 10 minutes sans laisser sécher complètement",
      "Rincer à l'eau tiède puis appliquer une crème hydratante",
      "Utiliser 1 fois par semaine",
    ],
    precautions: [
      "Usage externe uniquement",
      "Préparer juste avant usage : ne pas stocker la pâte",
      "Ne pas utiliser sur peau très sèche ou irritée sans hydratation après",
      "Éviter le contour des yeux",
    ],
    typicalIngredients: [
      "Argile verte ou blanche (kaolin)",
      "Poudre de neem",
      "Poudre de moringa",
      "Poudre de curcuma",
      "Rhassoul",
    ],
    storageConditions:
      "Conserver la poudre dans un bocal hermétique, au sec et à l'abri de la lumière. Ne jamais introduire d'eau ou d'outil humide dans le bocal — l'humidité de l'air de la saison des pluies suffit à la dégrader : bien refermer après chaque usage.",
    icon: "🎭",
  },
  {
    id: "masque-argile-prepare",
    name: "Masque argile (préparé)",
    category: "cosmetique",
    designation: "Masque à l'argile préparé, frais et sans conservateur, à utiliser sous 30 jours",
    shelfLifeMonths: 0,
    shelfLifeDays: 30,
    usageTips: [
      "Appliquer une couche fine sur visage nettoyé",
      "Laisser poser 10 minutes maximum",
      "Rincer à l'eau tiède en massant doucement",
      "Hydrater immédiatement après le rinçage",
    ],
    precautions: [
      "Produit frais sans conservateur : utiliser dans le mois",
      "Conserver impérativement au réfrigérateur",
      "Jeter au moindre changement d'odeur ou de couleur",
      "Ne pas partager le pot (hygiène)",
    ],
    typicalIngredients: [
      "Argile verte",
      "Eau florale de rose",
      "Yaourt nature",
      "Miel",
      "Quelques gouttes d'huile de baobab",
    ],
    storageConditions:
      "OBLIGATOIRE au réfrigérateur (4–8 °C), pot hermétiquement fermé. Durée de vie 30 jours maximum une fois préparé — la chaleur et l'humidité du Sénégal multiplient le risque bactérien.",
    allergens: ["Yaourt (lait)", "Miel"],
    icon: "🎭",
  },
];

// ============================================================================
// AGROALIMENTAIRE (10 templates)
// ============================================================================

export const AGROALIMENTAIRE_TEMPLATES: ProductTemplate[] = [
  {
    id: "jus-fruits-frais",
    name: "Jus de fruits frais",
    category: "agroalimentaire",
    designation: "Jus de fruits frais artisanal, sans conservateur, pressé du jour",
    shelfLifeMonths: 0,
    shelfLifeDays: 3,
    usageTips: [
      "Bien agiter la bouteille avant de servir (pulpes naturelles)",
      "Servir frais, idéalement entre 6 et 10 °C",
      "Consommer dans les 3 jours : jus frais sans conservateur",
      "Ne pas laisser la bouteille ouverte à température ambiante",
    ],
    precautions: [
      "Gonflement du bouchon ou gaz = fermentation : ne pas consommer",
      "Jeter si le goût devient alcoolisé ou piquant",
      "Conserver au froid dès l'achat, chaîne du froid obligatoire",
      "Ne pas donner aux nourrissons sans avis médical (fruits acides)",
    ],
    typicalIngredients: [
      "Mangue / bissap / bouye fraîche (80 % minimum)",
      "Eau potable",
      "Sucre de canne (dosage selon fruit)",
      "Jus de citron (antioxydant naturel)",
      "Menthe fraîche (option)",
    ],
    storageConditions:
      "Conserver au réfrigérateur entre 4 et 8 °C. La chaleur sénégalaise déclenche la fermentation en quelques heures : jamais de stockage à température ambiante. Jus frais sans conservateur : 2 à 3 jours maximum au réfrigérateur.",
    allergens: [],
    icon: "🥤",
  },
  {
    id: "confiture-artisanale",
    name: "Confiture artisanale",
    category: "agroalimentaire",
    designation: "Confiture artisanale au fruit, cuite au sucre de canne, préparée à la main",
    shelfLifeMonths: 12,
    usageTips: [
      "Bien mélanger avant utilisation (les fruits se déposent)",
      "Toujours prélever avec une cuillère propre et sèche",
      "Refermer hermétiquement après chaque usage",
      "Conserver au réfrigérateur après ouverture",
      "Accompagner le pain, les crêpes ou le yaourt",
    ],
    precautions: [
      "Ne pas consommer si le couvercle est bombé ou si de la moisissure apparaît",
      "Une cuillère mouillée introduit de l'eau : risque de fermentation",
      "Vérifier l'intégrité du scellé avant l'achat",
      "Contient du sucre : consommation modérée pour les diabétiques",
    ],
    typicalIngredients: [
      "Mangue / papaye / papayer (fruits frais)",
      "Sucre de canne",
      "Jus de citron (gélification)",
      "Gingembre râpé (option)",
      "Vanille (option)",
    ],
    storageConditions:
      "Conserver le pot dans un endroit sec, frais et à l'abri de la lumière avant ouverture. Après ouverture : réfrigérateur obligatoire au climat sénégalais, consommation sous 1 mois. Stérilisation correcte = 12 mois de conservation.",
    allergens: [],
    icon: "🍯",
  },
  {
    id: "miel-naturel",
    name: "Miel naturel",
    category: "agroalimentaire",
    designation: "Miel pur 100 % naturel, récolté et mis en pot à la main, non chauffé",
    shelfLifeMonths: 24,
    usageTips: [
      "Une cuillère à café le matin à jeun ou dans une boisson tiède (pas bouillante)",
      "Utiliser comme édulcorant naturel dans le thé, le lait ou les yaourts",
      "Appliquer en usage externe sur petites plaies ou brûlures légères",
      "Cristallisation naturelle = preuve d'authenticité : chauffer doucement au bain-marie (< 40 °C) pour le liquéfier",
    ],
    precautions: [
      "Ne pas donner aux enfants de moins de 1 an",
      "Ne jamais chauffer le miel au micro-ondes à haute puissance (perte des bienfaits)",
      "Ne pas utiliser d'ustensile humide : l'eau favorise la fermentation",
      "Diabétiques : consommer avec modération et avis médical",
    ],
    typicalIngredients: [
      "Miel pur 100 % (non chauffé, non filtré industriellement)",
      "(Aucun autre ingrédient — produit brut)",
    ],
    storageConditions:
      "Conserver dans un bocal hermétique en verre, à température ambiante, à l'abri de la lumière et de l'humidité. Le miel ne se périme pas vraiment : 24 mois de garantie en garde artisanale. Éviter le réfrigérateur qui accélère la cristallisation.",
    allergens: ["Produit de la ruche (risque allergique)"],
    icon: "🍯",
  },
  {
    id: "melange-epices",
    name: "Mélange d'épices",
    category: "agroalimentaire",
    designation: "Mélange d'épices artisanal, moulu à la main, sans arôme ajouté",
    shelfLifeMonths: 12,
    usageTips: [
      "Doser 1 à 2 cuillères à café par plat pour 4 personnes",
      "Ajouter en début de cuisson dans l'huile pour libérer les arômes",
      "Utiliser pour mariner viandes et poissons 30 min avant cuisson",
      "Saupoudrer en fin de cuisson pour un goût plus prononcé",
    ],
    precautions: [
      "Conserver au sec : une cuillère humide forme des grumeaux moisis",
      "Refermer hermétiquement après chaque usage",
      "Vérifier la liste des ingrédients en cas d'allergie (arachide, sésame parfois ajoutés)",
      "L'humidité de la saison des pluies colle les épices : ajouter quelques grains de riz dans le bocal",
    ],
    typicalIngredients: [
      "Piment séché",
      "Gingembre moulu",
      "Ail en poudre",
      "Poivre noir",
      "Cumin",
      "Coriandre",
      "Cube d'arachide ou bouillon (selon mélange)",
    ],
    storageConditions:
      "Conserver dans des bocaux hermétiques, au sec, à l'abri de la lumière et de la chaleur. Éviter au-dessus de la cuisinière (vapeur). 12 mois de pleine puissance aromatique ; au-delà, les épices perdent en goût sans danger.",
    allergens: ["Arachide (selon mélange)", "Sésame (selon mélange)"],
    icon: "🌶️",
  },
  {
    id: "huile-alimentaire",
    name: "Huile alimentaire (pressée à froid)",
    category: "agroalimentaire",
    designation: "Huile alimentaire pressée à froid, 100 % pure, sans additif",
    shelfLifeMonths: 12,
    usageTips: [
      "Utiliser pour l'assaisonnement à froid (salades, plats finis)",
      "Pour la cuisson douce : ne pas dépasser le point de fumée",
      "Agiter légèrement avant emploi si dépôt naturel",
      "Refermer soigneusement pour éviter l'oxydation",
    ],
    precautions: [
      "Jeter si odeur de rance ou goût piquant persistant",
      "Ne pas réutiliser pour friture multiple",
      "Conserver loin de la chaleur : l'huile rancit vite en climat tropical",
      "Tenir hors de portée des enfants (flacon verre)",
    ],
    typicalIngredients: [
      "Huile d'arachide pressée à froid",
      "Huile de sésame",
      "Huile de baobab",
      "(100 % pur jus — sans additif)",
    ],
    storageConditions:
      "Conserver dans le flacon ambré ou opaque d'origine, bien fermé, dans un placard frais à l'abri de la lumière. Au-delà de 30 °C ambiants, privilégier un stockage au cellier ou au bas du réfrigérateur (l'huile peut figer : la sortir 10 min avant usage).",
    allergens: ["Arachide", "Sésame"],
    icon: "🫒",
  },
  {
    id: "fruits-secs",
    name: "Fruits secs (mangue, banane)",
    category: "agroalimentaire",
    designation: "Fruits secs artisanaux, séchés au soleil, sans sucre ajouté",
    shelfLifeMonths: 6,
    usageTips: [
      "À croquer en collation saine à tout moment de la journée",
      "Réhydrater 15 min dans de l'eau tiède pour les pâtisseries",
      "Tremper dans le yaourt ou la bouillie pour les enfants",
      "Bien refermer le sachet après chaque ouverture",
    ],
    precautions: [
      "Vérifier l'absence de moisissure blanche ou verdâtre avant consommation",
      "Refermer hermétiquement : l'humidité ramollit et contamine les fruits",
      "Sulfites possibles selon séchage — vérifier l'étiquette pour les asthmatiques",
      "Consommer modérément : sucre concentré naturel",
    ],
    typicalIngredients: [
      "Mangues fraîches",
      "Bananes fraîches",
      "Ananas (selon production)",
      "(Sans sucre ajouté — séchage solaire ou déshydrateur)",
    ],
    storageConditions:
      "Conserver dans un sachet hermétique ou bocal fermé, au sec et à l'abri de la lumière. La saison des pluies (humidité > 70 %) ramollit les fruits et favorise les moisissures : ajouter un sachet absorbant ou consommer plus vite. 6 mois dans de bonnes conditions.",
    allergens: [],
    icon: "🥭",
  },
  {
    id: "pate-arachide",
    name: "Pâte d'arachide",
    category: "agroalimentaire",
    designation: "Pâte d'arachide artisanale, arachides grillées moulues, sans huile ajoutée",
    shelfLifeMonths: 6,
    usageTips: [
      "Bien mélanger l'huile qui remonte à la surface avant utilisation",
      "Utiliser comme base de sauces (mafé, soupes, légumes)",
      "Tartiner sur le pain ou diluer dans la bouillie",
      "Conserver une cuillère propre et sèche dans le pot",
    ],
    precautions: [
      "ALLERGÈNE MAJEUR : arachide — danger pour les personnes allergiques",
      "Ne pas consommer si goût amer ou rance (huile oxydée)",
      "Moisissure visible = jeter tout le pot (aflatoxines)",
      "Refermer après usage : l'air fait rancir les huiles",
    ],
    typicalIngredients: [
      "Arachides grillées 100 %",
      "Sel (version salée)",
      "Sucre léger (version sucrée, option)",
      "(Sans huile ajoutée — mouture artisanale)",
    ],
    storageConditions:
      "Conserver dans un pot hermétique, dans un endroit sec et frais à l'abri de la lumière. Au climat sénégalais, la chaleur fait remonter l'huile naturellement (mélanger avant usage). Au-delà de 6 mois, risque de rancissement : privilégier le réfrigérateur en saison chaude.",
    allergens: ["Arachide"],
    icon: "🥜",
  },
  {
    id: "sauce-pimentee",
    name: "Sauce pimentée",
    category: "agroalimentaire",
    designation: "Sauce pimentée artisanale, préparée à la main avec des piments frais",
    shelfLifeMonths: 6,
    usageTips: [
      "Secouer avant usage pour homogénéiser",
      "Doser en petites quantités : produit très concentré",
      "Accompagner le poisson, le riz, les brochettes ou le thiéboudienne",
      "Conserver au réfrigérateur après ouverture",
    ],
    precautions: [
      "Éviter le contact avec les yeux et les mains (port de gants conseillé au service)",
      "Ne pas en donner aux jeunes enfants",
      "Cesser en cas de brûlure d'estomac importante",
      "Ne pas consommer si le couvercle gondole (fermentation)",
    ],
    typicalIngredients: [
      "Piments frais (habanero, scotch bonnet)",
      "Ail",
      "Gingembre",
      "Huile d'arachide",
      "Vinaigre (conservateur naturel)",
      "Sel",
      "Cube (option)",
    ],
    storageConditions:
      "Conserver au réfrigérateur après ouverture (4–8 °C). Avant ouverture : endroit sec et frais à l'abri de la lumière. Le vinaigre et le sel conservent naturellement, mais la chaleur accélère la perte de piquant et la fermentation : 6 mois maximum.",
    allergens: ["Arachide (huile)", "Poisson (cube, selon recette)"],
    icon: "🌶️",
  },
  {
    id: "pain-artisanal",
    name: "Pain artisanal (7 jours)",
    category: "agroalimentaire",
    designation: "Pain artisanal cuit au four, sans conservateur, farine et levain naturel",
    shelfLifeMonths: 0,
    shelfLifeDays: 7,
    usageTips: [
      "Consommer de préférence dans les 48 h pour un pain optimal",
      "Réchauffer 5 min au four à 160 °C pour retrouver le croustillant",
      "Trancher et congeler ce qui ne sera pas mangé sous 2 jours",
      "Conserver dans un sac en papier ou en tissu (jamais plastique fermé au chaud)",
    ],
    precautions: [
      "Moisissure visible = jeter tout le pain (spores invisibles partout)",
      "Ne pas laisser dans un emballage plastique fermé à la chaleur",
      "Contient du gluten — précaution pour les intolérants",
      "Pain sans conservateur : il rassit 3 fois plus vite que le pain industriel",
    ],
    typicalIngredients: [
      "Farine de blé (ou mix sarrasin/teff)",
      "Levain naturel ou levure boulangère",
      "Eau",
      "Sel",
      "Graines de sésame (option)",
    ],
    storageConditions:
      "Conserver à température ambiante dans un sac en papier ou une boîte à pain aérée, à l'abri de l'humidité. Durée de vie : 7 jours maximum — 3 jours en saison chaude sans climatisation. La congélation dès l'achat prolonge jusqu'à 1 mois.",
    allergens: ["Gluten (blé)", "Sésame (option)"],
    icon: "🍞",
  },
  {
    id: "fromage-frais",
    name: "Fromage frais",
    category: "agroalimentaire",
    designation: "Fromage frais artisanal, au lait entier, sans conservateur",
    shelfLifeMonths: 1,
    usageTips: [
      "Conserver au réfrigérateur dès la fabrication ou l'achat",
      "Sortir 10 min avant dégustation pour les arômes",
      "Consommer dans la semaine pour une fraîcheur optimale",
      "Égoutter l'eau du coffret avant de servir",
    ],
    precautions: [
      "Chaîne du froid obligatoire : risque sanitaire élevé en cas de rupture",
      "Jeter si odeur aigre prononcée ou liquide trouble",
      "Femmes enceintes : fromage au lait cru — précaution d'usage",
      "Ne pas reposer un morceau entamé dans l'eau de l'égouttage",
    ],
    typicalIngredients: [
      "Lait frais entier (vache ou chèvre)",
      "Ferments lactiques ou présure",
      "Sel",
      "(Sans conservateur)",
    ],
    storageConditions:
      "RÉFRIGÉRATEUR OBLIGATOIRE (4 °C maximum), dans son coffret fermé ou un bol couvert. Au climat sénégalais, une seule heure hors froid suffit à altérer le produit. 1 mois de conservation ; 5 à 7 jours après ouverture.",
    allergens: ["Lait (lactose, protéines laitières)"],
    icon: "🧀",
  },
  // ── Catalogue local sénégalais 🇸🇳 ──────────────────────────────────────
  {
    id: "jus-bissap",
    name: "Jus de bissap (hibiscus)",
    category: "agroalimentaire",
    designation:
      "Jus de bissap artisanal frais, infusion d'hibiscus 100 % naturelle, sans conservateur",
    shelfLifeMonths: 0,
    shelfLifeDays: 3,
    usageTips: [
      "Servir bien frais, avec ou sans glaçons",
      "Agiter avant de servir (dépôt naturel des fleurs)",
      "Accompagner les plats gras ou servir en boisson de bienvenue",
      "Consommer dans les 3 jours après fabrication",
    ],
    precautions: [
      "Sans conservateur : garder au réfrigérateur en permanence",
      "Goût alcoolisé ou bouchon qui gonfle = fermentation : jeter",
      "Teneur en sucre : modérer pour les diabétiques",
      "Ne pas laisser plus de 2 h à température ambiante",
    ],
    typicalIngredients: [
      "Fleurs d'hibiscus (bissap) séchées",
      "Eau potable",
      "Sucre de canne",
      "Menthe fraîche (option)",
      "Vanille ou gingembre (option)",
    ],
    storageConditions:
      "RÉFRIGÉRATEUR OBLIGATOIRE (4–8 °C) en bouteilles propres et fermées. Le bissap frais sans conservateur se garde 2 à 3 jours au froid ; au-delà, la fermentation démarre (goût piquant, gaz).",
    allergens: [],
    icon: "🌺",
  },
  {
    id: "jus-gingembre",
    name: "Jus de gingembre (gnamakoudji)",
    category: "agroalimentaire",
    designation:
      "Gnamakoudji artisanal, jus de gingembre frais pressé, piquant et naturel",
    shelfLifeMonths: 0,
    shelfLifeDays: 3,
    usageTips: [
      "Servir très frais — boisson énergisante naturelle",
      "Doser selon le goût : le gingembre maison est fort",
      "Idéal en digestif ou pour soulager les nausées",
      "Consommer dans les 3 jours",
    ],
    precautions: [
      "Piquant prononcé : prudence pour les enfants et estomacs sensibles",
      "Garder au réfrigérateur en permanence (sans conservateur)",
      "Pulpe qui se dépose = normal, agiter avant de servir",
      "Fermentation (gaz, goût acide) : ne pas consommer",
    ],
    typicalIngredients: [
      "Gingembre frais pressé",
      "Eau potable",
      "Jus de citron",
      "Sucre de canne ou miel",
      "Vanille (option)",
    ],
    storageConditions:
      "RÉFRIGÉRATEUR OBLIGATOIRE (4–8 °C), bouteille bien fermée. Le gnamakoudji frais se conserve 2 à 3 jours au froid ; le gingembre est naturellement antibactérien mais la boisson fermente vite à la chaleur.",
    allergens: [],
    icon: "🫚",
  },
  {
    id: "jus-bouye",
    name: "Jus de bouye (baobab)",
    category: "agroalimentaire",
    designation:
      "Jus de bouye artisanal, pulpe de baobab fraîche, onctueux et 100 % naturel",
    shelfLifeMonths: 0,
    shelfLifeDays: 3,
    usageTips: [
      "Servir bien frais et agiter avant de servir",
      "Boisson riche en vitamine C, idéale au petit-déjeuner",
      "Diluer au lait frais pour un dèguè rapide",
      "Consommer dans les 3 jours",
    ],
    precautions: [
      "Texture épaisse naturelle : allonger d'eau ou de lait si besoin",
      "Garder au réfrigérateur en permanence (sans conservateur)",
      "Goût acide marqué = fermentation : jeter",
      "Ne pas congeler en bouteille verre (éclatement)",
    ],
    typicalIngredients: [
      "Pulpe de baobab (bouye) fraîche",
      "Eau potable",
      "Lait frais ou en poudre (option)",
      "Sucre de canne",
      "Vanille (option)",
    ],
    storageConditions:
      "RÉFRIGÉRATEUR OBLIGATOIRE (4–8 °C). La pulpe de baobab fraîche fermenté très vite à la chaleur : 2 à 3 jours maximum au froid, bouteille bien fermée.",
    allergens: [],
    icon: "🌳",
  },
  {
    id: "jus-tamarin",
    name: "Jus de tamarin (dakhar)",
    category: "agroalimentaire",
    designation:
      "Jus de dakhar artisanal, tamarin frais infusé, acidulé et rafraîchissant",
    shelfLifeMonths: 0,
    shelfLifeDays: 3,
    usageTips: [
      "Servir frais en boisson de fin de repas (aide à la digestion)",
      "Agiter avant de servir (dépôt de pulpe naturel)",
      "Doser le sucre selon l'acidité du tamarin",
      "Consommer dans les 3 jours",
    ],
    precautions: [
      "Acidité élevée : modérer pour les estomacs sensibles",
      "Garder au réfrigérateur en permanence (sans conservateur)",
      "Fermentation (gaz, mousse) : ne pas consommer",
      "Ne pas laisser la bouteille ouverte à la chaleur",
    ],
    typicalIngredients: [
      "Pulpe de tamarin (dakhar)",
      "Eau potable",
      "Sucre de canne",
      "Menthe fraîche (option)",
    ],
    storageConditions:
      "RÉFRIGÉRATEUR OBLIGATOIRE (4–8 °C), bouteille fermée. Le jus de tamarin frais se garde 2 à 3 jours au froid ; son acidité retarde mais n'empêche pas la fermentation à la chaleur.",
    allergens: [],
    icon: "🫘",
  },
  {
    id: "thiakry-degue",
    name: "Thiakry / Dèguè",
    category: "agroalimentaire",
    designation:
      "Thiakry artisanal, couscous de mil au lait caillé, dessert sénégalais traditionnel",
    shelfLifeMonths: 0,
    shelfLifeDays: 5,
    usageTips: [
      "Servir frais en dessert ou au petit-déjeuner",
      "Parsemer de noix de coco râpée ou de raisins secs avant de servir",
      "Mélanger avant de servir (le mil se dépose)",
      "Consommer dans les 5 jours (produit frais laitier)",
    ],
    precautions: [
      "Produit laitier frais : chaîne du froid obligatoire",
      "Jeter si odeur aigre ou séparation du lait",
      "Contient du lait : allergène majeur",
      "Ne pas laisser plus d'1 h à température ambiante",
    ],
    typicalIngredients: [
      "Couscous de mil (soul)",
      "Lait caillé ou yaourt nature",
      "Lait frais",
      "Sucre",
      "Noix de coco râpée, raisins secs (option)",
    ],
    storageConditions:
      "RÉFRIGÉRATEUR OBLIGATOIRE (4 °C max), pot fermé. Dessert à base de lait frais sans conservateur : 5 jours maximum au froid, à consommer rapidement après ouverture.",
    allergens: ["Lait", "Noix de coco"],
    icon: "🥣",
  },
  {
    id: "gari",
    name: "Gari (semoule de manioc)",
    category: "agroalimentaire",
    designation:
      "Gari artisanal, semoule de manioc torréfiée, croquante et prête à l'emploi",
    shelfLifeMonths: 6,
    usageTips: [
      "Se déguste trempé dans l'eau, le lait ou saupoudré sur le thiakry",
      "Préparer en bouillie instantanée avec de l'eau tiède",
      "Saupoudrer sur les desserts pour le croquant",
      "Bien refermer le sachet après usage (craint l'humidité)",
    ],
    precautions: [
      "L'humidité fait moisir le gari : cuillère toujours sèche",
      "Vérifier l'absence de moisissure ou d'odeur rance",
      "Refermer hermétiquement après chaque usage",
      "Consommer dans les 6 mois pour un goût optimal",
    ],
    typicalIngredients: [
      "Manioc frais râpé",
      "Huile de palme (version jaune, option)",
      "(100 % manioc — torréfié artisanal)",
    ],
    storageConditions:
      "Conserver dans un sachet hermétique ou bocal fermé, au sec et à l'abri de la lumière. Le gari craint l'humidité de la saison des pluies : 6 mois dans de bonnes conditions.",
    allergens: [],
    icon: "🌾",
  },
  {
    id: "attieke-frais",
    name: "Attiéké frais",
    category: "agroalimentaire",
    designation:
      "Attiéké frais artisanal, semoule de manioc fermentée, accompagnement traditionnel",
    shelfLifeMonths: 0,
    shelfLifeDays: 5,
    usageTips: [
      "Réchauffer 3–5 min à la vapeur ou au micro-ondes avant de servir",
      "Accompagner le poisson braisé, le poulet yassa ou les grillades",
      "Égrainer à la fourchette après réchauffage",
      "Consommer dans les 5 jours (produit frais fermenté)",
    ],
    precautions: [
      "Produit frais fermenté : garder au réfrigérateur",
      "Odeur ammoniaquée ou moisissure : jeter",
      "Réchauffer à cœur avant consommation",
      "Ne pas recongeler après décongélation",
    ],
    typicalIngredients: [
      "Manioc fermenté râpé",
      "Sel (léger)",
      "(100 % manioc — fermentation traditionnelle)",
    ],
    storageConditions:
      "RÉFRIGÉRATEUR OBLIGATOIRE (4 °C max) dans son sachet fermé. L'attiéké frais se garde 4 à 5 jours au froid ; à température ambiante, il aigrit en quelques heures.",
    allergens: [],
    icon: "🍚",
  },
  {
    id: "fonio-precuit",
    name: "Fonio précuit",
    category: "agroalimentaire",
    designation:
      "Fonio précuit artisanal, céréale locale fine, cuisson rapide 100 % naturelle",
    shelfLifeMonths: 12,
    usageTips: [
      "Cuisson rapide : 10–15 min à la vapeur ou en casserole",
      "Servir en couscous, en salade ou en bouillie",
      "Rincer rapidement avant cuisson",
      "Céréale sans gluten : idéale pour les intolérants",
    ],
    precautions: [
      "Conserver au sec : une cuillère humide forme des grumeaux moisis",
      "Refermer hermétiquement après usage",
      "Vérifier l'absence de petits insectes de stockage",
      "Consommer dans les 12 mois",
    ],
    typicalIngredients: [
      "Fonio décortiqué et précuit à la vapeur",
      "(100 % fonio — sans additif)",
    ],
    storageConditions:
      "Conserver dans un bocal ou sachet hermétique, au sec, à l'abri de la lumière et des insectes. 12 mois de conservation dans de bonnes conditions.",
    allergens: [],
    icon: "🌾",
  },
  {
    id: "noix-cajou-grillees",
    name: "Noix de cajou grillées",
    category: "agroalimentaire",
    designation:
      "Noix de cajou grillées artisanales, salées à la poêle, récolte locale de Casamance",
    shelfLifeMonths: 6,
    usageTips: [
      "À croquer en collation énergétique",
      "Parsemer sur les salades ou le riz sauté",
      "Griller à sec 5 min pour raviver le croquant",
      "Bien refermer le sachet après usage",
    ],
    precautions: [
      "ALLERGÈNE MAJEUR : fruits à coque (anacarde)",
      "Goût rance = huiles oxydées : ne pas consommer",
      "L'humidité ramollit les noix : refermer soigneusement",
      "Moisissure visible : jeter tout le sachet",
    ],
    typicalIngredients: [
      "Noix de cajou grillées",
      "Sel (version salée)",
      "(Sans huile ajoutée — grillage à la poêle)",
    ],
    storageConditions:
      "Conserver dans un sachet hermétique, au sec et à l'abri de la lumière. Les huiles naturelles de l'anacarde rancissent à la chaleur : 6 mois au sec, au frais de préférence en saison chaude.",
    allergens: ["Fruits à coque (anacarde)"],
    icon: "🥜",
  },
  {
    id: "plantain-chips",
    name: "Chips de plantain",
    category: "agroalimentaire",
    designation:
      "Chips de plantain artisanales, tranchées fines et frites à la main, croustillantes",
    shelfLifeMonths: 2,
    usageTips: [
      "À croquer à l'apéritif ou en accompagnement",
      "Conserver dans un sachet bien fermé pour garder le croustillant",
      "Passer au four 5 min à 150 °C pour raviver le croustillant",
      "Consommer dans les 2 mois",
    ],
    precautions: [
      "L'humidité ramollit les chips : refermer après chaque ouverture",
      "Odeur de friture rance : ne pas consommer",
      "Frites dans l'huile : teneur en matière grasse à modérer",
      "Vérifier l'absence de moisissure en saison des pluies",
    ],
    typicalIngredients: [
      "Bananes plantains vertes",
      "Huile de friture (arachide)",
      "Sel fin",
    ],
    storageConditions:
      "Conserver dans un sachet hermétique au sec, à l'abri de la lumière. 2 mois de croustillant ; en saison humide, consommer plus vite (les chips ramollissent).",
    allergens: ["Arachide (huile de friture)"],
    icon: "🍌",
  },
  {
    id: "netetou-soumbala",
    name: "Nététou / Soumbala",
    category: "agroalimentaire",
    designation:
      "Nététou artisanal, graines de néré fermentées, condiment traditionnel riche en goût",
    shelfLifeMonths: 12,
    usageTips: [
      "Écraser quelques boules dans la sauce pour l'umami traditionnel",
      "Base du soupe kandia et des sauces feuilles",
      "Doser petit : le goût est très concentré",
      "Rincer rapidement avant emploi si surface salée",
    ],
    precautions: [
      "Condiment fermenté salé : modérer pour l'hypertension",
      "Conserver au sec : l'humidité relance la fermentation",
      "Moisissure de couleur inhabituelle : jeter",
      "Goût ammoniaqué trop fort = produit trop vieux",
    ],
    typicalIngredients: [
      "Graines de néré (nététou) fermentées et séchées",
      "Sel",
      "(Fermentation traditionnelle, sans additif)",
    ],
    storageConditions:
      "Conserver dans un bocal hermétique ou sachet bien fermé, au sec et à l'abri de la lumière. 12 mois de conservation ; le netétou durcit avec le temps sans danger (réhydrater avant usage).",
    allergens: [],
    icon: "🫛",
  },
  // ── Tables de conservation — produits frais / secs des artisans ────────
  {
    id: "oeufs-frais",
    name: "Œufs fermiers frais",
    category: "agroalimentaire",
    designation:
      "Œufs fermiers frais de la journée, poules élevées en liberté, calibre moyen",
    shelfLifeMonths: 0,
    shelfLifeDays: 21,
    usageTips: [
      "Consommer cuits ou utilisés en pâtisserie",
      "Ne pas laver avant stockage (la cuticule naturelle protège)",
      "Sortir du réfrigérateur 15 min avant cuisson",
      "Casser dans un récipient séparé avant d'ajouter à la recette",
    ],
    precautions: [
      "Œuf qui flotte dans l'eau = plus frais : jeter",
      "Ne jamais consommer d'œuf fêlé ou sale à l'intérieur",
      "Garder au frais : 2 à 3 semaines à température ambiante fraîche, plus longtemps au réfrigérateur",
      "Femmes enceintes : œufs bien cuits uniquement",
    ],
    typicalIngredients: [
      "Œufs frais de poules fermières",
      "(Produit brut — aucun additif)",
    ],
    storageConditions:
      "Conserver pointe vers le bas, à l'abri de la chaleur. Température ambiante fraîche : 2 à 3 semaines ; réfrigérateur : 4 à 5 semaines. Au climat sénégalais, privilégier la vente rapide.",
    allergens: ["Œuf"],
    icon: "🥚",
  },
  {
    id: "yaourt-lait-caille",
    name: "Lait caillé / Yaourt artisanal",
    category: "agroalimentaire",
    designation:
      "Lait caillé artisanal, fermenté à la main au lait frais, onctueux et légèrement acidulé",
    shelfLifeMonths: 0,
    shelfLifeDays: 7,
    usageTips: [
      "Servir frais, nature ou sucré au miel",
      "Base du thiakry, des smoothies ou des sauces",
      "Bien mélanger avant de servir",
      "Consommer dans la semaine (produit vivant)",
    ],
    precautions: [
      "Chaîne du froid obligatoire dès la fabrication",
      "Séparation du petit-lait = normal, mélanger ; odeur aigre forte = jeter",
      "Gonflement du pot ou mousse = fermentation anormale : jeter",
      "Ne jamais laisser plus d'1 h hors du réfrigérateur",
    ],
    typicalIngredients: [
      "Lait frais entier",
      "Ferments lactiques naturels (semence du lait caillé précédent)",
      "Sucre ou miel (version sucrée, option)",
    ],
    storageConditions:
      "RÉFRIGÉRATEUR OBLIGATOIRE (4 °C max), pot fermé. Produit vivant sans conservateur : 7 jours au froid ; plus le temps passe, plus le goût devient acide.",
    allergens: ["Lait (lactose, protéines laitières)"],
    icon: "🥛",
  },
  {
    id: "beurre-frais",
    name: "Beurre frais (baratte)",
    category: "agroalimentaire",
    designation:
      "Beurre frais baratté à la main, au lait de vache, doux et fondant",
    shelfLifeMonths: 0,
    shelfLifeDays: 21,
    usageTips: [
      "Sortir 10 min avant usage pour l'étaler facilement",
      "Idéal sur le pain chaud, dans les bouillies et pâtisseries",
      "Beurre clarifié (débou) pour la cuisson longue",
      "Consommer dans les 3 semaines",
    ],
    precautions: [
      "Chaîne du froid obligatoire : le beurre fond et rancit à la chaleur",
      "Odeur fromagère forte ou couleur déraisonnable : jeter",
      "Ne pas remettre de beurre utilisé dans le pot d'origine",
      "Tenir à l'écart des aliments odorants (le beurre capte les odeurs)",
    ],
    typicalIngredients: [
      "Crème de lait frais entier",
      "Sel fin (version salée)",
      "(Barattage artisanal — sans colorant ni arôme)",
    ],
    storageConditions:
      "RÉFRIGÉRATEUR OBLIGATOIRE (4 °C max), dans son pot fermé ou papier alimentaire. 3 semaines au froid ; en saison chaude, consommer plus vite ou conserver une partie au congélateur.",
    allergens: ["Lait (lactose, protéines laitières)"],
    icon: "🧈",
  },
  {
    id: "poisson-frais",
    name: "Poisson frais",
    category: "agroalimentaire",
    designation:
      "Poisson frais du jour, pêche locale, nettoyé et préparé à la main",
    shelfLifeMonths: 0,
    shelfLifeDays: 2,
    usageTips: [
      "Consommer le jour même ou le lendemain maximum",
      "Cuire à cœur : braisé, frit ou en sauce",
      "Mariner au citron 15 min avant cuisson (thiof, capitaine)",
      "Nettoyer à l'eau vinaigrée avant préparation",
    ],
    precautions: [
      "Poisson très périssable : chaîne du froid stricte",
      "Odeur ammoniaquée, œil terne ou chair molle : jeter",
      "Ne jamais recongeler un poisson décongelé",
      "Femmes enceintes : limiter les gros poissons prédateurs",
    ],
    typicalIngredients: [
      "Poisson frais local (thiof, capitaine, sardinade…)",
      "(Produit brut — aucun additif)",
    ],
    storageConditions:
      "RÉFRIGÉRATEUR (0–4 °C) dans un récipient couvert, sur lit de glaçons si possible : 1 à 2 jours maximum. Congélateur (-18 °C) : 3 à 6 mois. Au climat sénégalais, vendre le jour même.",
    allergens: ["Poisson"],
    icon: "🐟",
  },
  {
    id: "guedj-poisson-seche",
    name: "Guedj / Poisson fumé-séché",
    category: "agroalimentaire",
    designation:
      "Guedj artisanal, poisson salé-fumé-séché à la main, goût intense traditionnel",
    shelfLifeMonths: 12,
    usageTips: [
      "Rincer et réhydrater 10 min avant de l'ajouter aux sauces",
      "Base du thiéboudienne, soupes et sauces blanches",
      "Émietter dans le riz au poisson pour l'umami",
      "Doser : le guedj sale fortement le plat",
    ],
    precautions: [
      "Produit salé : modérer pour l'hypertension",
      "Moisissure inhabituelle ou vers de stockage : trier ou jeter",
      "Conserver au sec : l'humidité relance la fermentation",
      "Vérifier l'intégrité de l'emballage à l'achat",
    ],
    typicalIngredients: [
      "Poisson frais (sardinade, thiof, mulet…)",
      "Gros sel",
      "(Salage + fumage + séchage traditionnels)",
    ],
    storageConditions:
      "Conserver dans un lieu sec et aéré, à l'abri des insectes, dans un sac ou bocal hermétique. 12 mois de conservation ; au-delà, le goût s'affadit sans danger s'il reste sec.",
    allergens: ["Poisson"],
    icon: "🐠",
  },
  {
    id: "biscuits-secs-maison",
    name: "Biscuits secs maison",
    category: "agroalimentaire",
    designation:
      "Biscuits secs faits maison, croquants et peu sucrés, cuits au four",
    shelfLifeMonths: 0,
    shelfLifeDays: 21,
    usageTips: [
      "À croquer au petit-déjeuner ou au goûter avec le thé",
      "Tremper dans le café ou le lait (ils restent croquants)",
      "Conserver dans une boîte en métal pour le croustillant",
      "Consommer dans les 3 semaines",
    ],
    precautions: [
      "Ramollissement = humidité : passer au four 5 min à 150 °C",
      "Moisissure visible : jeter tout le lot",
      "Contient du gluten (selon recette) : prudence intolérants",
      "Peut contenir des traces d'arachide (atelier polyvalent)",
    ],
    typicalIngredients: [
      "Farine de blé",
      "Sucre",
      "Beurre ou huile",
      "Œufs",
      "Arôme vanille ou citron",
    ],
    storageConditions:
      "Conserver dans une boîte hermétique au sec, à l'abri de la lumière. 2 à 3 semaines de croustillant ; en saison humide, refermer soigneusement après chaque ouverture.",
    allergens: ["Gluten (blé)", "Œuf", "Lait (beurre)"],
    icon: "🍪",
  },
  {
    id: "patisserie-fraiche",
    name: "Pâtisserie fraîche",
    category: "agroalimentaire",
    designation:
      "Pâtisserie fraîche artisanale, préparée du jour, sans conservateur",
    shelfLifeMonths: 0,
    shelfLifeDays: 2,
    usageTips: [
      "Consommer le jour même pour un goût optimal",
      "Garder au frais jusqu'au service",
      "Sortir 10 min avant dégustation pour les arômes",
      "Idéal pour les événements : commander pour le jour J",
    ],
    precautions: [
      "Contient souvent crème et œufs crus : très périssable",
      "Chaîne du froid obligatoire (0–4 °C)",
      "Ne pas consommer au-delà de 48 h",
      "Ne pas exposer au soleil (vente sur marché : glacière conseillée)",
    ],
    typicalIngredients: [
      "Farine de blé",
      "Œufs frais",
      "Beurre frais",
      "Crème pâtissière ou fruits (selon recette)",
      "Sucre",
    ],
    storageConditions:
      "RÉFRIGÉRATEUR OBLIGATOIRE (0–4 °C), dans une boîte fermée. 24 à 48 h maximum — les pâtisseries à la crème ne se conservent pas plus d'un jour au climat tropical.",
    allergens: ["Gluten (blé)", "Œuf", "Lait", "Fruits à coque (selon recette)"],
    icon: "🍰",
  },
  {
    id: "farine-mil",
    name: "Farine de mil (locale)",
    category: "agroalimentaire",
    designation:
      "Farine de mil artisanale, moulue à la pierre, céréale locale 100 % naturelle",
    shelfLifeMonths: 8,
    usageTips: [
      "Base des bouillies (sow, lane), du thiéboudienne de mil ou du soul",
      "Tamiser avant usage pour un mélange homogène",
      "Cuisson 10–15 min en remuant",
      "Bien refermer le sachet après usage",
    ],
    precautions: [
      "L'humidité fait moisir la farine : cuillère sèche obligatoire",
      "Odeur de moisi ou grumeaux durs : jeter",
      "Vérifier l'absence d'insectes de stockage",
      "Consommer dans les 8 mois (farine complète = plus fragile)",
    ],
    typicalIngredients: [
      "Grains de mil décortiqués",
      "(Mouture artisanale — 100 % mil)",
    ],
    storageConditions:
      "Conserver dans un bocal ou sachet hermétique, au sec et à l'abri de la lumière. Farine moulue sur grain entier : 8 mois ; en saison des pluies, consommer plus vite ou garder au frais.",
    allergens: [],
    icon: "🌾",
  },
  {
    id: "couscous-mil",
    name: "Couscous de mil",
    category: "agroalimentaire",
    designation:
      "Couscous de mil artisanal, roulé à la main et séché au soleil, traditionnel",
    shelfLifeMonths: 12,
    usageTips: [
      "Cuire à la vapeur 20–30 min (double cuisson traditionnelle)",
      "Servir avec la sauce viande ou poisson",
      "Base du thiakry en version dessert",
      "Grains qui collent : séparer à la fourchette après cuisson",
    ],
    precautions: [
      "Conserver au sec : l'humidité forme des blocs moisis",
      "Vérifier l'absence d'insectes de stockage",
      "Refermer hermétiquement après usage",
      "Consommer dans les 12 mois",
    ],
    typicalIngredients: [
      "Semoule de mil",
      "Eau (roulage)",
      "(Roulage à la main — séchage solaire)",
    ],
    storageConditions:
      "Conserver dans un sachet hermétique, au sec et à l'abri de la lumière. 12 mois de conservation ; bien sécher les grains après fabrication pour éviter les moisissures en saison humide.",
    allergens: [],
    icon: "🥣",
  },
  {
    id: "riz-local",
    name: "Riz local décortiqué",
    category: "agroalimentaire",
    designation:
      "Riz local du fleuve décortiqué artisanal, grains entiers, sans traitement chimique",
    shelfLifeMonths: 24,
    usageTips: [
      "Rincer 2–3 fois à l'eau claire avant cuisson",
      "Cuisson 18–20 min à l'étuvée, plus long pour le riz de vallée",
      "Idéal pour le thiéboudienne (absorbe bien la sauce)",
      "Trier les petits débris avant cuisson",
    ],
    precautions: [
      "Conserver au sec : l'humidité fait germer puis moisir le grain",
      "Vérifier l'absence d'insectes de stockage (charançons)",
      "Refermer hermétiquement après usage",
      "Grains noirs ou odeur de moisi : trier ou jeter",
    ],
    typicalIngredients: [
      "Riz paddy décortiqué",
      "(Décorticage artisanal — sans traitement chimique)",
    ],
    storageConditions:
      "Conserver dans un sac ou bocal hermétique, au sec, à l'abri de la lumière et des insectes. 24 mois de conservation ; ajouter quelques gousses d'ail ou feuilles de neem contre les charançons.",
    allergens: [],
    icon: "🍚",
  },
];

// ============================================================================
// Aggrégats + helpers
// ============================================================================

/** Tous les templates confondus (cosmétique + agroalimentaire). */
export const ALL_PRODUCT_TEMPLATES: ProductTemplate[] = [
  ...PRODUCT_TEMPLATES,
  ...AGROALIMENTAIRE_TEMPLATES,
];

/** Recherche un template par identifiant (null si inconnu). */
export function getProductTemplateById(
  id: string | null | undefined,
): ProductTemplate | null {
  if (!id) return null;
  return ALL_PRODUCT_TEMPLATES.find((t) => t.id === id) ?? null;
}

/** Libellé lisible de la durée de conservation (« 18 mois », « 7 jours »). */
export function templateShelfLifeLabel(t: ProductTemplate): string {
  if (t.shelfLifeDays && t.shelfLifeDays > 0) {
    return `${t.shelfLifeDays} jour${t.shelfLifeDays > 1 ? "s" : ""}`;
  }
  if (t.shelfLifeMonths <= 1) return "1 mois";
  return `${t.shelfLifeMonths} mois`;
}

/** Durée de conservation totale en jours (pour les calculs fins). */
export function templateShelfLifeDays(t: ProductTemplate): number {
  if (t.shelfLifeDays && t.shelfLifeDays > 0) return t.shelfLifeDays;
  return t.shelfLifeMonths * 30;
}
