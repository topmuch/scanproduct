// V3 Phase 3 — Direct DB verification that a product was persisted with dynamic fields
import { db } from "../src/lib/db";

const PRODUCT_ID = process.argv[2];

async function main() {
  if (!PRODUCT_ID) {
    console.error("Usage: bun run scripts/verify-product.ts <productId>");
    process.exit(1);
  }

  const p = await db.product.findUnique({
    where: { id: PRODUCT_ID },
    include: { categoryRef: true },
  });

  if (!p) {
    console.log("PRODUCT NOT FOUND:", PRODUCT_ID);
    process.exit(1);
  }

  console.log("DB product:");
  console.log("  id:", p.id);
  console.log("  name:", p.name);
  console.log("  brand:", p.brand);
  console.log("  categoryId:", p.categoryId);
  console.log("  categoryRef.slug:", p.categoryRef?.slug);
  console.log("  categoryRef.name:", p.categoryRef?.name);
  console.log("  isExport:", p.isExport);
  console.log("  categoryData (raw):", p.categoryData);
  console.log("  exportData (raw):", p.exportData);
  console.log("  certifications (raw):", p.certifications);
  console.log("  legacy category field:", p.category);
  console.log("");

  // Parse JSON to verify shape
  if (p.categoryData) {
    const parsed = JSON.parse(p.categoryData);
    console.log("Parsed categoryData keys:", Object.keys(parsed));
    console.log("  variety:", parsed.variety);
    console.log("  originCountry:", parsed.originCountry);
    console.log("  harvestDate:", parsed.harvestDate);
    console.log("  brixDegree:", parsed.brixDegree);
    console.log("  organic:", parsed.organic);
  }

  if (p.exportData) {
    const parsed = JSON.parse(p.exportData);
    console.log("Parsed exportData:", parsed);
  }

  if (p.certifications) {
    const parsed = JSON.parse(p.certifications);
    console.log("Parsed certifications:", parsed);
  }

  console.log("");
  console.log("=== All 10 categories in DB ===");
  const cats = await db.category.findMany({
    orderBy: { phase: "asc" },
    select: { slug: true, name: true, phase: true, schema: true, exportSchema: true },
  });
  console.log("Total categories:", cats.length);
  for (const c of cats) {
    const schemaFields = c.schema ? JSON.parse(c.schema).length : 0;
    const exportFields = c.exportSchema ? JSON.parse(c.exportSchema).length : 0;
    console.log(
      `  phase ${c.phase}: ${c.slug} (${c.name}) — ${schemaFields} fields + ${exportFields} export`
    );
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
