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
    shelfLifeMonths: 3,
    usageTips: [
      "Bien agiter la bouteille avant de servir (pulpes naturelles)",
      "Servir frais, idéalement entre 6 et 10 °C",
      "Consommer dans les 3 jours après ouverture",
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
      "Conserver au réfrigérateur entre 4 et 8 °C. La chaleur sénégalaise déclenche la fermentation en quelques heures : jamais de stockage à température ambiante après pasteurisation artisanale, et consommer sous 3 mois.",
    allergens: [],
    icon: "🥤",
  },
  {
    id: "confiture-artisanale",
    name: "Confiture artisanale",
    category: "agroalimentaire",
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
