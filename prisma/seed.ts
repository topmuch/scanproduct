/**
 * VerifScan — Database seed script
 *
 * Creates:
 *   1. A SUPERADMIN user (reads ADMIN_EMAIL / ADMIN_PASSWORD from env,
 *      falls back to admin@verifscan.sn / Admin123!2025)
 *   2. A demo FABRICANT user (sarine@biocosmetique.sn / Demo1234!)
 *
 * Usage:
 *   bun run db:seed         (after bun run db:push)
 *
 * Idempotent: re-running updates existing users in place.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

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
  console.log(`   ✓ SUPERADMIN  ${admin.email}  (id: ${admin.id})`);

  // ---- 2. Demo Fabricant ----
  const fabricantHash = await bcrypt.hash(fabricantPassword, 10);
  const fabricant = await db.user.upsert({
    where: { email: fabricantEmail },
    update: {
      password: fabricantHash,
      role: "FABRICANT",
      status: "ACTIVE",
      name: "Sarine Bio",
      companyName: "Sarine Bio Cosmétiques",
      phone: "+221 77 123 45 67",
      city: "Dakar",
      country: "Sénégal",
      address: "Almadies, Dakar",
      points: 1250,
    },
    create: {
      email: fabricantEmail,
      name: "Sarine Bio",
      password: fabricantHash,
      role: "FABRICANT",
      status: "ACTIVE",
      companyName: "Sarine Bio Cosmétiques",
      phone: "+221 77 123 45 67",
      city: "Dakar",
      country: "Sénégal",
      address: "Almadies, Dakar",
      points: 1250,
    },
  });
  console.log(`   ✓ FABRICANT  ${fabricant.email}  (id: ${fabricant.id})`);

  // ---- 3. Sample products for the demo fabricant ----
  const sampleProducts = [
    {
      name: "Huile de Baobab Bio 250ml",
      description: "Huile végétale pure, pressée à froid, certifiée bio.",
      category: "Cosmétique",
    },
    {
      name: "Beurre de Karité Brut 200g",
      description: "Beurre de karité non raffiné, origine Sénégal.",
      category: "Cosmétique",
    },
    {
      name: "Savon Noir Africain 150g",
      description: "Savon traditionnel à base de beurre de karité et cendre.",
      category: "Hygiène",
    },
  ];

  for (const p of sampleProducts) {
    const existing = await db.product.findFirst({
      where: { name: p.name, fabricantId: fabricant.id },
    });
    if (!existing) {
      await db.product.create({
        data: { ...p, fabricantId: fabricant.id },
      });
    }
  }
  console.log(`   ✓ ${sampleProducts.length} produits de démonstration créés`);

  console.log("\n✅ Seed terminé.");
  console.log("   → Connexion SuperAdmin :", adminEmail, "/", adminPassword);
  console.log("   → Connexion Fabricant  :", fabricantEmail, "/", fabricantPassword);
}

main()
  .catch((err) => {
    console.error("❌ Erreur lors du seed :", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
