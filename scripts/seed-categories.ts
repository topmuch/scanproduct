/**
 * VerifScan — Category schemas seed script.
 *
 * Idempotently upserts all 10 product categories declared in
 * `src/lib/product-schemas.ts` into the SQLite database, persisting their
 * JSON-encoded `fields` and `exportFields` so the dynamic form renderer
 * (Task 3b) can read them at runtime.
 *
 * Usage:
 *   bun run scripts/seed-categories.ts
 *
 * Notes:
 *   - Uses RELATIVE imports (../src/lib/...) so the script runs standalone
 *     without needing the `@/*` tsconfig path alias to be resolved by tsx.
 *   - Bun handles TypeScript natively — no transpilation step needed.
 *   - `db.category.upsert` makes this script safe to re-run; existing
 *     categories are updated in place (their `id` and relations are preserved).
 */
import { db } from "../src/lib/db";
import { PRODUCT_SCHEMA_LIST } from "../src/lib/product-schemas";

async function main() {
  console.log("🌱 Seeding product category schemas…");
  console.log(`   Found ${PRODUCT_SCHEMA_LIST.length} schemas to upsert.`);

  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < PRODUCT_SCHEMA_LIST.length; i++) {
    const schema = PRODUCT_SCHEMA_LIST[i]!;

    // Detect whether this slug already exists so we can report inserts vs updates.
    const existing = await db.category.findUnique({
      where: { slug: schema.id },
      select: { id: true },
    });

    await db.category.upsert({
      where: { slug: schema.id },
      create: {
        slug: schema.id,
        name: schema.name,
        emoji: schema.emoji,
        description: schema.description,
        schema: JSON.stringify(schema.fields),
        exportSchema: schema.exportFields
          ? JSON.stringify(schema.exportFields)
          : null,
        phase: schema.phase,
        order: i,
        isActive: true,
      },
      update: {
        name: schema.name,
        emoji: schema.emoji,
        description: schema.description,
        schema: JSON.stringify(schema.fields),
        exportSchema: schema.exportFields
          ? JSON.stringify(schema.exportFields)
          : null,
        phase: schema.phase,
        order: i,
        isActive: true,
      },
    });

    if (existing) {
      updated++;
      console.log(`   ↻ Updated  [phase ${schema.phase}] ${schema.emoji}  ${schema.name}  (${schema.fields.length} fields, ${schema.exportFields?.length ?? 0} export)`);
    } else {
      inserted++;
      console.log(`   ✓ Created  [phase ${schema.phase}] ${schema.emoji}  ${schema.name}  (${schema.fields.length} fields, ${schema.exportFields?.length ?? 0} export)`);
    }
  }

  // Sanity check — count categories by phase.
  const all = await db.category.findMany({
    where: { slug: { in: PRODUCT_SCHEMA_LIST.map((s) => s.id) } },
    select: { slug: true, phase: true, schema: true, exportSchema: true },
    orderBy: { order: "asc" },
  });

  console.log("");
  console.log(`✅ Seed complete — ${inserted} created, ${updated} updated, ${all.length} total VerifScan categories.`);
  console.log("");
  console.log("   Breakdown by phase:");
  for (const phase of [1, 2, 3] as const) {
    const items = all.filter((c) => c.phase === phase);
    console.log(`     Phase ${phase}: ${items.length} categories`);
    for (const c of items) {
      const fieldsCount = c.schema ? JSON.parse(c.schema).length : 0;
      const exportCount = c.exportSchema ? JSON.parse(c.exportSchema).length : 0;
      console.log(`       • ${c.slug.padEnd(20)}  ${fieldsCount} fields / ${exportCount} export`);
    }
  }
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
