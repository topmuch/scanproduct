/**
 * VerifScan — Database seed script
 *
 * Creates:
 *   1. A SUPERADMIN user
 *   2. A demo FABRICANT user (Sarine Bio Cosmétiques) + a second fabricant
 *   3. Categories
 *   4. Products with full details (brand, weight, image, category)
 *   5. Lots with full traceability data (ingredients, allergens, locations, etc.)
 *   6. Lot history events (timeline)
 *   7. QR codes for each lot
 *   8. Certifications for fabricants and lots
 *   9. Reviews for products/lots
 *  10. Scan records for analytics
 *
 * Usage:  bun run db:seed   (after bun run db:push)
 * Idempotent: re-running updates existing users in place.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo(days: number): Date {
  return daysFromNow(-days);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@verifscan.sn")
    .toLowerCase()
    .trim();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin123!2025";

  const fabricantEmail = "sarine@biocosmetique.sn";
  const fabricantPassword = "Demo1234!";

  console.log("🌱 Seeding VerifScan database…");

  // ---- 1. SuperAdmin ----
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: {
      password: adminHash,
      role: "SUPERADMIN",
      status: "ACTIVE",
      name: "Administrateur VerifScan",
    },
    create: {
      email: adminEmail,
      name: "Administrateur VerifScan",
      password: adminHash,
      role: "SUPERADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`   ✓ SUPERADMIN  ${admin.email}`);

  // ---- 2. Fabricants ----
  const fabricantHash = await bcrypt.hash(fabricantPassword, 10);
  const sarine = await db.user.upsert({
    where: { email: fabricantEmail },
    update: {
      password: fabricantHash,
      role: "FABRICANT",
      status: "ACTIVE",
      name: "Sarine Bio",
      companyName: "Sarine Bio Cosmétiques",
      phone: "+221 77 123 45 67",
      whatsapp: "+221 77 123 45 67",
      website: "https://sarine-bio.sn",
      description:
        "Sarine Bio Cosmétiques fabrique des produits cosmétiques naturels à base d'ingrédients biologiques sénégalais depuis 2018.",
      city: "Dakar",
      country: "Sénégal",
      address: "Almadies, Dakar, Sénégal",
      points: 1250,
      isVerified: true,
      verifiedAt: daysAgo(120),
      brandColor: "#10B981",
      sector: "Cosmétique",
      yearFounded: 2018,
      facebook: "sarinebio",
      instagram: "sarine_bio",
    },
    create: {
      email: fabricantEmail,
      name: "Sarine Bio",
      password: fabricantHash,
      role: "FABRICANT",
      status: "ACTIVE",
      companyName: "Sarine Bio Cosmétiques",
      phone: "+221 77 123 45 67",
      whatsapp: "+221 77 123 45 67",
      website: "https://sarine-bio.sn",
      description:
        "Sarine Bio Cosmétiques fabrique des produits cosmétiques naturels à base d'ingrédients biologiques sénégalais depuis 2018.",
      city: "Dakar",
      country: "Sénégal",
      address: "Almadies, Dakar, Sénégal",
      points: 1250,
      isVerified: true,
      verifiedAt: daysAgo(120),
      brandColor: "#10B981",
      sector: "Cosmétique",
      yearFounded: 2018,
      facebook: "sarinebio",
      instagram: "sarine_bio",
    },
  });
  console.log(`   ✓ FABRICANT  ${sarine.email}`);

  const terangaHash = await bcrypt.hash("Demo1234!", 10);
  const teranga = await db.user.upsert({
    where: { email: "contact@teranga-foods.sn" },
    update: {
      password: terangaHash,
      role: "FABRICANT",
      status: "ACTIVE",
      name: "Mamadou Diop",
      companyName: "Teranga Foods",
      phone: "+221 33 825 67 89",
      whatsapp: "+221 77 987 65 43",
      website: "https://teranga-foods.sn",
      description:
        "Teranga Foods est une entreprise agro-alimentaire spécialisée dans la transformation de céréales locales.",
      city: "Thiès",
      country: "Sénégal",
      address: "Zone Industrielle, Thiès, Sénégal",
      points: 980,
      isVerified: true,
      verifiedAt: daysAgo(200),
      brandColor: "#F59E0B",
      sector: "Agro-alimentaire",
      yearFounded: 2015,
    },
    create: {
      email: "contact@teranga-foods.sn",
      name: "Mamadou Diop",
      password: terangaHash,
      role: "FABRICANT",
      status: "ACTIVE",
      companyName: "Teranga Foods",
      phone: "+221 33 825 67 89",
      whatsapp: "+221 77 987 65 43",
      website: "https://teranga-foods.sn",
      description:
        "Teranga Foods est une entreprise agro-alimentaire spécialisée dans la transformation de céréales locales.",
      city: "Thiès",
      country: "Sénégal",
      address: "Zone Industrielle, Thiès, Sénégal",
      points: 980,
      isVerified: true,
      verifiedAt: daysAgo(200),
      brandColor: "#F59E0B",
      sector: "Agro-alimentaire",
      yearFounded: 2015,
    },
  });
  console.log(`   ✓ FABRICANT  ${teranga.email}`);

  // ---- 3. Categories ----
  const categoriesData = [
    { name: "Cosmétiques", slug: "cosmetiques", emoji: "🧴", icon: "Sparkles", order: 1 },
    { name: "Agro-alimentaire", slug: "agro-alimentaire", emoji: "🌾", icon: "Wheat", order: 2 },
    { name: "Boissons", slug: "boissons", emoji: "🥤", icon: "CupSoda", order: 3 },
    { name: "Hygiène", slug: "hygiene", emoji: "🧼", icon: "Droplets", order: 4 },
    { name: "Épicerie", slug: "epicerie", emoji: "🥫", icon: "ShoppingBasket", order: 5 },
    { name: "Textile", slug: "textile", emoji: "🧵", icon: "Shirt", order: 6 },
  ];

  const categories: Record<string, { id: string }> = {};
  for (const c of categoriesData) {
    const cat = await db.category.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
    categories[c.slug] = cat;
  }
  console.log(`   ✓ ${categoriesData.length} catégories`);

  // ---- 4. Certifications for fabricants ----
  const certsData = [
    { fabricantId: sarine.id, name: "Bio Ecocert", issuer: "Ecocert", certificateNumber: "BIO-2024-0142", issueDate: daysAgo(300), expirationDate: daysFromNow(65), isActive: true },
    { fabricantId: sarine.id, name: "Halal", issuer: "ISI Halal", certificateNumber: "HL-2023-8891", issueDate: daysAgo(400), expirationDate: daysFromNow(30), isActive: true },
    { fabricantId: sarine.id, name: "Made in Senegal", issuer: "APIX", certificateNumber: "MIS-2022-554", issueDate: daysAgo(500), isActive: true },
    { fabricantId: teranga.id, name: "ISO 22000", issuer: "Bureau Veritas", certificateNumber: "ISO22-2024-771", issueDate: daysAgo(250), expirationDate: daysFromNow(115), isActive: true },
    { fabricantId: teranga.id, name: "HACCP", issuer: "SGS", certificateNumber: "HAC-2023-3340", issueDate: daysAgo(350), expirationDate: daysFromNow(15), isActive: true },
  ];
  for (const cert of certsData) {
    const existing = await db.certification.findFirst({
      where: { fabricantId: cert.fabricantId, name: cert.name },
    });
    if (!existing) {
      await db.certification.create({ data: cert });
    }
  }
  console.log(`   ✓ ${certsData.length} certifications fabricant`);

  // ---- 5. Products ----
  type ProductSeed = {
    name: string;
    brand: string;
    description: string;
    category: string;
    categoryId: string;
    weight: string;
    imageUrl: string;
    fabricantId: string;
    isFeatured: boolean;
    lot: {
      reference: string;
      lotNumber: string;
      quantity: number;
      manufactureDate: Date;
      expiryDate: Date;
      ingredients: string;
      manufacturingLocation: string;
      transformationLocation: string;
      salesCountries: string;
      allergens: string;
      nutritionalInfo: string;
      warnings: string;
      status: string;
      blockchainHash: string;
      isVerified: boolean;
      verifiedAt: Date;
      transparencyScore: number;
    };
    history: { type: string; title: string; description: string; location: string; date: Date; time: string }[];
    lotCerts: { name: string; issuer: string }[];
    reviews: { authorName: string; rating: number; comment: string; isApproved: boolean; isVerified: boolean; createdAt: Date }[];
  };

  const products: ProductSeed[] = [
    {
      name: "Huile de Baobab Bio 250ml",
      brand: "Sarine Bio",
      description:
        "Huile végétale pure de baobab, pressée à froid à partir de graines récoltées au Sénégal. Riche en vitamines A, D, E et F, elle nourrit et régénère la peau en profondeur. Idéale pour les soins des cheveux, du visage et du corps.",
      category: "Cosmétiques",
      categoryId: categories["cosmetiques"].id,
      weight: "250 ml",
      imageUrl: "/products/huile-baobab.png",
      fabricantId: sarine.id,
      isFeatured: true,
      lot: {
        reference: "LOT-SAR-2025-001",
        lotNumber: "SAR-BAO-250-001",
        quantity: 500,
        manufactureDate: daysAgo(30),
        expiryDate: daysFromNow(335),
        ingredients:
          "100% huile de baobab (Adansonia digitata) pressée à froid. Sans additifs, sans conservateurs, sans parfum de synthèse.",
        manufacturingLocation: "Atelier Sarine Bio, Almadies, Dakar, Sénégal",
        transformationLocation: "Atelier Sarine Bio, Almadies, Dakar, Sénégal",
        salesCountries: '["Sénégal", "Côte d\'Ivoire", "Mali", "France"]',
        allergens: "[]",
        nutritionalInfo:
          '{"calories":"900 kcal/100ml","proteins":"0g","carbs":"0g","fats":"100g","saturatedFats":"25g","omega3":"0.2g","omega6":"30g","omega9":"35g","vitaminE":"150mg"}',
        warnings: '["Usage externe uniquement", "Tenir à l\'écart de la chaleur", "Conserver à température ambiante"]',
        status: "ACTIVE",
        blockchainHash: "0x7a3f8b2c9e1d4f5a6b8c0d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a",
        isVerified: true,
        verifiedAt: daysAgo(28),
        transparencyScore: 92,
      },
      history: [
        { type: "fabrication", title: "Récolte des graines de baobab", description: "Récolte manuelle dans la région de Tambacounda par 12 producteurs partenaires.", location: "Tambacounda, Sénégal", date: daysAgo(45), time: "08:00" },
        { type: "fabrication", title: "Pressage à froid", description: "Extraction de l'huile par pressage mécanique à froid (T<40°C) pour préserver les nutriments.", location: "Atelier Sarine Bio, Dakar", date: daysAgo(30), time: "10:00" },
        { type: "controle", title: "Contrôle qualité en laboratoire", description: "Analyse microbiologique et chromatographique. Conformité aux normes ISO 22000 vérifiée.", location: "Laboratoire LNSE, Dakar", date: daysAgo(29), time: "14:00" },
        { type: "controle", title: "Mise en bouteille et étiquetage", description: "Conditionnement en flacons verre de 250ml avec étiquetage individuel des lots.", location: "Atelier Sarine Bio, Dakar", date: daysAgo(28), time: "09:00" },
        { type: "marche", title: "Mise sur le marché", description: "Distribution auprès de 45 points de vente au Sénégal et export vers 3 pays CEDEAO.", location: "Dakar, Sénégal", date: daysAgo(25), time: "11:00" },
        { type: "actif", title: "Lot actif et commercialisé", description: "Produit en vente. Aucun incident signalé.", location: "Sénégal & CEDEAO", date: daysAgo(25), time: "11:00" },
      ],
      lotCerts: [
        { name: "Bio Ecocert", issuer: "Ecocert" },
        { name: "Sans cruauté animale", issuer: "PETA" },
      ],
      reviews: [
        { authorName: "Awa Ndiaye", rating: 5, comment: "Huile exceptionnelle, ma peau est transformée ! Livraison rapide et produit conforme à la description.", isApproved: true, isVerified: true, createdAt: daysAgo(10) },
        { authorName: "Fatou Sarr", rating: 5, comment: "Je l'utilise pour mes cheveux et le résultat est bluffant. Merci Sarine Bio !", isApproved: true, isVerified: true, createdAt: daysAgo(15) },
        { authorName: "Khadija Ba", rating: 4, comment: "Très bon produit, juste un peu cher mais la qualité est au rendez-vous.", isApproved: true, isVerified: false, createdAt: daysAgo(20) },
      ],
    },
    {
      name: "Beurre de Karité Brut 200g",
      brand: "Sarine Bio",
      description:
        "Beurre de karité brut non raffiné, 100% pur et naturel. Récolté et transformé par une coopérative de femmes au Sénégal. Idéal pour hydrater, nourrir et protéger la peau et les cheveux.",
      category: "Cosmétiques",
      categoryId: categories["cosmetiques"].id,
      weight: "200 g",
      imageUrl: "/products/beurre-karite.png",
      fabricantId: sarine.id,
      isFeatured: true,
      lot: {
        reference: "LOT-SAR-2025-002",
        lotNumber: "SAR-KAR-200-002",
        quantity: 800,
        manufactureDate: daysAgo(20),
        expiryDate: daysFromNow(345),
        ingredients:
          "100% beurre de karité (Butyrospermum parkii) brut non raffiné. Origine Sénégal. Sans additifs.",
        manufacturingLocation: "Coopérative de Kolobane, Sénégal",
        transformationLocation: "Atelier Sarine Bio, Almadies, Dakar",
        salesCountries: '["Sénégal", "Mali", "Burkina Faso"]',
        allergens: "[]",
        nutritionalInfo: '{"calories":"N/A","fats":"100g","saturatedFats":"45g","unsaponifiables":"8%"}',
        warnings: '["Usage externe", "Peut se solidifier sous 25°C", "Conserver à l\'abri de la lumière"]',
        status: "ACTIVE",
        blockchainHash: "0x8b4f9c3d0e2a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
        isVerified: true,
        verifiedAt: daysAgo(18),
        transparencyScore: 85,
      },
      history: [
        { type: "fabrication", title: "Récolte des noix de karité", description: "Récolte par la coopérative féminine de Kolobane (45 membres).", location: "Kolobane, Sénégal", date: daysAgo(60), time: "07:00" },
        { type: "fabrication", title: "Transformation traditionnelle", description: "Broyage, torréfaction et barattage selon la méthode traditionnelle.", location: "Kolobane, Sénégal", date: daysAgo(25), time: "09:00" },
        { type: "controle", title: "Contrôle qualité", description: "Test de pureté et d'hydratation. Taux d'insaponifiables: 8%.", location: "Laboratoire LNSE, Dakar", date: daysAgo(21), time: "13:00" },
        { type: "marche", title: "Conditionnement", description: "Mise en pots de 200g avec étiquetage du lot.", location: "Atelier Sarine Bio, Dakar", date: daysAgo(20), time: "10:00" },
        { type: "actif", title: "Lot actif", description: "En vente dans 30 points de vente.", location: "Sénégal", date: daysAgo(18), time: "10:00" },
      ],
      lotCerts: [
        { name: "Commerce équitable", issuer: "Fair Trade Africa" },
        { name: "Bio Ecocert", issuer: "Ecocert" },
      ],
      reviews: [
        { authorName: "Mariama Diallo", rating: 5, comment: "Le meilleur beurre de karité que j'ai utilisé ! Texture parfaite et odeur naturelle.", isApproved: true, isVerified: true, createdAt: daysAgo(5) },
        { authorName: "Aissatou Fall", rating: 4, comment: "Très bon produit, j'aurais aimé un pot plus grand.", isApproved: true, isVerified: false, createdAt: daysAgo(12) },
      ],
    },
    {
      name: "Savon Noir Africain 150g",
      brand: "Sarine Bio",
      description:
        "Savon noir africain traditionnel à base de beurre de karité, d'huile de palme et de cendre de cacao. Nettoie en douceur, exfolie et nourrit la peau. Fabriqué selon une recette ancestrale.",
      category: "Hygiène",
      categoryId: categories["hygiene"].id,
      weight: "150 g",
      imageUrl: "/products/savon-noir.png",
      fabricantId: sarine.id,
      isFeatured: false,
      lot: {
        reference: "LOT-SAR-2025-003",
        lotNumber: "SAR-SAV-150-003",
        quantity: 1200,
        manufactureDate: daysAgo(15),
        expiryDate: daysFromNow(700),
        ingredients:
          "Beurre de karité (Butyrospermum parkii), huile de palme (Elaeis guineensis), huile de coco (Cocos nucifera), cendre de cacao (Theobroma cacao), hydroxyde de sodium. Sans parfum de synthèse.",
        manufacturingLocation: "Atelier Sarine Bio, Almadies, Dakar",
        transformationLocation: "Atelier Sarine Bio, Almadies, Dakar",
        salesCountries: '["Sénégal"]',
        allergens: "[]",
        nutritionalInfo: "{}",
        warnings: '["Usage externe uniquement", "Éviter le contact avec les yeux", "Conserver au sec"]',
        status: "ACTIVE",
        blockchainHash: "0x9c5a0d4e1f3b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e",
        isVerified: true,
        verifiedAt: daysAgo(13),
        transparencyScore: 78,
      },
      history: [
        { type: "fabrication", title: "Préparation de la pâte", description: "Mélange des huiles et de la cendre selon la recette traditionnelle.", location: "Atelier Sarine Bio, Dakar", date: daysAgo(18), time: "08:00" },
        { type: "fabrication", title: "Saponification à froid", description: "Cuisson lente et moulage manuel.", location: "Atelier Sarine Bio, Dakar", date: daysAgo(16), time: "10:00" },
        { type: "controle", title: "Test de pH et dureté", description: "pH: 9.5 — conforme. Séchage de 4 semaines.", location: "Atelier Sarine Bio, Dakar", date: daysAgo(15), time: "14:00" },
        { type: "marche", title: "Mise en vente", description: "Distribution dans 50 boutiques.", location: "Dakar, Sénégal", date: daysAgo(13), time: "09:00" },
        { type: "actif", title: "Lot actif", description: "En vente active.", location: "Sénégal", date: daysAgo(13), time: "09:00" },
      ],
      lotCerts: [{ name: "Vegan", issuer: "Vegan Society" }],
      reviews: [
        { authorName: "Oumy Sy", rating: 5, comment: "Savon parfait pour ma peau sensible, je recommande !", isApproved: true, isVerified: true, createdAt: daysAgo(3) },
      ],
    },
    {
      name: "Couscous de Mil Bio 1kg",
      brand: "Teranga Foods",
      description:
        "Couscous de mil biologique, roulé à la main selon la tradition sénégalaise. Riche en fibres et en nutriments, sans gluten. Idéal pour les plats traditionnels ou une alimentation saine.",
      category: "Agro-alimentaire",
      categoryId: categories["agro-alimentaire"].id,
      weight: "1 kg",
      imageUrl: "/products/couscous-mil.png",
      fabricantId: teranga.id,
      isFeatured: true,
      lot: {
        reference: "LOT-TER-2025-001",
        lotNumber: "TER-MIL-1KG-001",
        quantity: 1000,
        manufactureDate: daysAgo(10),
        expiryDate: daysFromNow(355),
        ingredients:
          "100% semoule de mil (Pennisetum glaucum) biologique. Origine Sénégal. Sans additifs, sans conservateurs.",
        manufacturingLocation: "Zone Industrielle, Thiès, Sénégal",
        transformationLocation: "Zone Industrielle, Thiès, Sénégal",
        salesCountries: '["Sénégal", "France", "États-Unis", "Canada"]',
        allergens: '["Peut contenir des traces de gluten"]',
        nutritionalInfo:
          '{"calories":"378 kcal/100g","proteins":"11g","carbs":"73g","fats":"4g","fibers":"8g","iron":"3mg","magnesium":"114mg"}',
        warnings: '["À conserver au sec", "Bien refermer après ouverture"]',
        status: "ACTIVE",
        blockchainHash: "0xad6b1e5f2c3d4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
        isVerified: true,
        verifiedAt: daysAgo(8),
        transparencyScore: 95,
      },
      history: [
        { type: "fabrication", title: "Récolte du mil", description: "Récolte biologique certifiée dans la région de Kaolack.", location: "Kaolack, Sénégal", date: daysAgo(90), time: "06:00" },
        { type: "fabrication", title: "Nettoyage et décorticage", description: "Nettoyage mécanique et décorticage du mil.", location: "Zone Industrielle, Thiès", date: daysAgo(15), time: "08:00" },
        { type: "fabrication", title: "Roulage et cuisson", description: "Roulage à la main et cuisson vapeur selon la tradition.", location: "Zone Industrielle, Thiès", date: daysAgo(11), time: "09:00" },
        { type: "controle", title: "Contrôle qualité et certifs", description: "Analyse microbiologique conforme. Certification Bio vérifiée.", location: "Laboratoire SGS, Dakar", date: daysAgo(9), time: "11:00" },
        { type: "marche", title: "Conditionnement 1kg", description: "Emballage sous vide en sachets de 1kg avec QR code.", location: "Zone Industrielle, Thiès", date: daysAgo(10), time: "14:00" },
        { type: "marche", title: "Export France & USA", description: "Expédition de 200 cartons vers la France et les États-Unis.", location: "Port de Dakar", date: daysAgo(7), time: "16:00" },
        { type: "actif", title: "Lot actif", description: "En vente locale et export.", location: "International", date: daysAgo(8), time: "14:00" },
      ],
      lotCerts: [
        { name: "Bio Ecocert", issuer: "Ecocert" },
        { name: "Sans gluten", issuer: "AFDIAG" },
        { name: "Commerce équitable", issuer: "Fair Trade Africa" },
      ],
      reviews: [
        { authorName: "Cheikh Mbacké", rating: 5, comment: "Le meilleur couscous de mil du marché ! Texture parfaite et goût authentique.", isApproved: true, isVerified: true, createdAt: daysAgo(4) },
        { authorName: "Sophie Martin", rating: 5, comment: "Enfin du vrai couscous de mil bio en France. Livraison rapide depuis le Sénégal.", isApproved: true, isVerified: true, createdAt: daysAgo(2) },
        { authorName: "Ibrahima Sow", rating: 4, comment: "Très bon produit, emballage de qualité.", isApproved: true, isVerified: false, createdAt: daysAgo(6) },
      ],
    },
    {
      name: "Jus de Bissap Bio 1L",
      brand: "Teranga Foods",
      description:
        "Jus de bissap (hibiscus) biologique, sans sucre ajouté. Boisson traditionnelle sénégalaise riche en antioxydants et vitamine C. Pasteurisé pour une conservation optimale.",
      category: "Boissons",
      categoryId: categories["boissons"].id,
      weight: "1 L",
      imageUrl: "/products/jus-bissap.png",
      fabricantId: teranga.id,
      isFeatured: false,
      lot: {
        reference: "LOT-TER-2025-002",
        lotNumber: "TER-BIS-1L-002",
        quantity: 600,
        manufactureDate: daysAgo(7),
        expiryDate: daysFromNow(83),
        ingredients:
          "Eau, fleurs d'hibiscus (Hibiscus sabdariffa) biologiques 15%, sucre de canne biologique 5%, jus de citron naturel. Sans conservateurs, sans colorants.",
        manufacturingLocation: "Zone Industrielle, Thiès, Sénégal",
        transformationLocation: "Zone Industrielle, Thiès, Sénégal",
        salesCountries: '["Sénégal", "Côte d\'Ivoire"]',
        allergens: "[]",
        nutritionalInfo:
          '{"calories":"42 kcal/100ml","proteins":"0.3g","carbs":"10g","sugars":"8g","fats":"0g","vitaminC":"12mg"}',
        warnings: '["À conserver au frais après ouverture", "À consommer dans 3 jours après ouverture", "Agiter avant usage"]',
        status: "ACTIVE",
        blockchainHash: "0xbe7c2f6a3d4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1",
        isVerified: true,
        verifiedAt: daysAgo(5),
        transparencyScore: 88,
      },
      history: [
        { type: "fabrication", title: "Récolte des fleurs d'hibiscus", description: "Récolte biologique dans la région de Touba.", location: "Touba, Sénégal", date: daysAgo(30), time: "07:00" },
        { type: "fabrication", title: "Infusion et pressage", description: "Infusion à chaud des fleurs, filtration et ajout de sucre de canne.", location: "Zone Industrielle, Thiès", date: daysAgo(8), time: "10:00" },
        { type: "controle", title: "Pasteurisation", description: "Pasteurisation à 85°C pendant 15 minutes.", location: "Zone Industrielle, Thiès", date: daysAgo(7), time: "13:00" },
        { type: "controle", title: "Contrôle qualité", description: "Test microbiologique et pH. Conforme aux normes.", location: "Laboratoire SGS, Dakar", date: daysAgo(6), time: "15:00" },
        { type: "marche", title: "Conditionnement", description: "Emballage en bouteilles PET de 1L.", location: "Zone Industrielle, Thiès", date: daysAgo(7), time: "16:00" },
        { type: "actif", title: "Lot actif", description: "En vente dans 60 boutiques.", location: "Sénégal & CEDEAO", date: daysAgo(5), time: "09:00" },
      ],
      lotCerts: [{ name: "Bio Ecocert", issuer: "Ecocert" }],
      reviews: [
        { authorName: "Aminata Gueye", rating: 5, comment: "Délicieux et naturel ! Le goût du vrai bissap.", isApproved: true, isVerified: true, createdAt: daysAgo(2) },
        { authorName: "Pape Diouf", rating: 4, comment: "Très bon jus, juste un peu sucré à mon goût.", isApproved: true, isVerified: false, createdAt: daysAgo(4) },
      ],
    },
    {
      name: "Poudre de Moringa 100g",
      brand: "Sarine Bio",
      description:
        "Poudre de moringa biologique, issue de feuilles séchées et moulues. Super-aliment riche en protéines, fer, calcium et antioxydants. À ajouter aux smoothies, soupes et plats.",
      category: "Agro-alimentaire",
      categoryId: categories["agro-alimentaire"].id,
      weight: "100 g",
      imageUrl: "/products/poudre-moringa.png",
      fabricantId: sarine.id,
      isFeatured: false,
      lot: {
        reference: "LOT-SAR-2025-004",
        lotNumber: "SAR-MOR-100-004",
        quantity: 400,
        manufactureDate: daysAgo(12),
        expiryDate: daysFromNow(548),
        ingredients:
          "100% poudre de feuilles de moringa (Moringa oleifera) biologique. Origine Sénégal. Sans additifs.",
        manufacturingLocation: "Atelier Sarine Bio, Almadies, Dakar",
        transformationLocation: "Coopérative de Mboro, Sénégal",
        salesCountries: '["Sénégal", "France", "Belgique"]',
        allergens: "[]",
        nutritionalInfo:
          '{"calories":"205 kcal/100g","proteins":"27g","carbs":"38g","fats":"2g","iron":"28mg","calcium":"2003mg","vitaminA":"18mg","vitaminC":"17mg"}',
        warnings: '["À conserver au sec et à l\'abri de la lumière", "Bien refermer après ouverture"]',
        status: "ACTIVE",
        blockchainHash: "0xcf8d3a7b4e5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2",
        isVerified: true,
        verifiedAt: daysAgo(10),
        transparencyScore: 90,
      },
      history: [
        { type: "fabrication", title: "Culture du moringa", description: "Culture biologique sans pesticides.", location: "Mboro, Sénégal", date: daysAgo(120), time: "06:00" },
        { type: "fabrication", title: "Récolte et séchage", description: "Récolte manuelle, séchage à l'ombre pour préserver les nutriments.", location: "Mboro, Sénégal", date: daysAgo(20), time: "08:00" },
        { type: "fabrication", title: "Mouture et tamisage", description: "Broyage fin et tamisage à 0.5mm.", location: "Atelier Sarine Bio, Dakar", date: daysAgo(13), time: "10:00" },
        { type: "controle", title: "Analyse nutritionnelle", description: "Vérification de la teneur en protéines et fer. Conforme.", location: "Laboratoire LNSE, Dakar", date: daysAgo(11), time: "14:00" },
        { type: "marche", title: "Conditionnement 100g", description: "Mise en sachets kraft scellés de 100g.", location: "Atelier Sarine Bio, Dakar", date: daysAgo(12), time: "15:00" },
        { type: "actif", title: "Lot actif", description: "En vente locale et export.", location: "Sénégal & Europe", date: daysAgo(10), time: "09:00" },
      ],
      lotCerts: [
        { name: "Bio Ecocert", issuer: "Ecocert" },
        { name: "Superfood certifié", issuer: "Superfood Association" },
      ],
      reviews: [
        { authorName: "Ndèye Touré", rating: 5, comment: "Excellente qualité, je la mets dans mes smoothies tous les matins !", isApproved: true, isVerified: true, createdAt: daysAgo(3) },
      ],
    },
  ];

  for (const p of products) {
    // Upsert product by name + fabricant
    let product = await db.product.findFirst({
      where: { name: p.name, fabricantId: p.fabricantId },
    });
    if (!product) {
      product = await db.product.create({
        data: {
          name: p.name,
          brand: p.brand,
          description: p.description,
          category: p.category,
          categoryId: p.categoryId,
          weight: p.weight,
          imageUrl: p.imageUrl,
          fabricantId: p.fabricantId,
          isPublic: true,
          isFeatured: p.isFeatured,
          status: "ACTIVE",
          transparencyScore: p.lot.transparencyScore,
        },
      });
    } else {
      product = await db.product.update({
        where: { id: product.id },
        data: {
          brand: p.brand,
          description: p.description,
          categoryId: p.categoryId,
          weight: p.weight,
          isFeatured: p.isFeatured,
          isPublic: true,
          transparencyScore: p.lot.transparencyScore,
        },
      });
    }

    // Upsert lot by reference
    let lot = await db.lot.findUnique({ where: { reference: p.lot.reference } });
    const lotData = {
      ...p.lot,
      productId: product.id,
      fabricantId: p.fabricantId,
      salesCountries: p.lot.salesCountries,
    };
    if (!lot) {
      lot = await db.lot.create({ data: lotData });
    } else {
      lot = await db.lot.update({ where: { id: lot.id }, data: lotData });
    }

    // Delete old history and recreate
    await db.lotHistory.deleteMany({ where: { lotId: lot.id } });
    for (const h of p.history) {
      await db.lotHistory.create({ data: { ...h, lotId: lot.id } });
    }

    // Delete old lot certs and recreate
    await db.lotCertification.deleteMany({ where: { lotId: lot.id } });
    for (const c of p.lotCerts) {
      await db.lotCertification.create({ data: { ...c, lotId: lot.id } });
    }

    // Delete old reviews and recreate
    await db.review.deleteMany({ where: { lotId: lot.id } });
    for (const r of p.reviews) {
      await db.review.create({
        data: {
          ...r,
          productId: product.id,
          lotId: lot.id,
          fabricantId: p.fabricantId,
        },
      });
    }

    // Update product rating
    const avgRating =
      p.reviews.length > 0
        ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
        : 0;
    await db.product.update({
      where: { id: product.id },
      data: { averageRating: avgRating, totalReviews: p.reviews.length },
    });

    // Create a few QR codes if none exist for this lot
    const existingQr = await db.qRCode.count({ where: { lotId: lot.id } });
    if (existingQr === 0) {
      for (let i = 0; i < 5; i++) {
        await db.qRCode.create({
          data: {
            code: `${lot.lotNumber}-QR-${String(i + 1).padStart(4, "0")}`,
            lotId: lot.id,
            fabricantId: p.fabricantId,
            status: "ACTIVE",
            scans: Math.floor(Math.random() * 50),
          },
        });
      }
    }

    // Create a few scan records if none exist
    const existingScans = await db.scan.count({ where: { lotId: lot.id } });
    if (existingScans === 0) {
      const cities = [
        { city: "Dakar", country: "Sénégal", deviceType: "mobile", os: "Android" },
        { city: "Abidjan", country: "Côte d'Ivoire", deviceType: "mobile", os: "iOS" },
        { city: "Bamako", country: "Mali", deviceType: "desktop", os: "Windows" },
        { city: "Paris", country: "France", deviceType: "mobile", os: "iOS" },
        { city: "Thiès", country: "Sénégal", deviceType: "tablet", os: "Android" },
      ];
      for (let i = 0; i < 8; i++) {
        const c = cities[i % cities.length];
        await db.scan.create({
          data: {
            lotId: lot.id,
            scannedAt: daysAgo(Math.floor(Math.random() * 20)),
            city: c.city,
            country: c.country,
            deviceType: c.deviceType,
            os: c.os,
          },
        });
      }
    }
  }
  console.log(`   ✓ ${products.length} produits avec lots, historique, certifications et avis`);

  console.log("\n✅ Seed terminé.");
  console.log("   → Connexion SuperAdmin :", adminEmail, "/", adminPassword);
  console.log("   → Connexion Fabricant  :", fabricantEmail, "/", fabricantPassword);
  console.log("   → Connexion Fabricant 2 : contact@teranga-foods.sn / Demo1234!");
}

main()
  .catch((err) => {
    console.error("❌ Erreur lors du seed :", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
