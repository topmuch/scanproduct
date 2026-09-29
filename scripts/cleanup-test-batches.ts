/** Nettoyage ciblé : batchs de test d'aujourd'hui (préfixe cmun*) sauf la démo. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:/home/z/my-project/db/custom.db" } },
});

const KEEP = process.env.KEEP_BATCH ?? "cmun27j9"; // préfixe suffit

const batches = await prisma.batch.findMany({
  where: { id: { startsWith: "cmun" } },
  include: { packs: true },
});

let deleted = 0;
for (const b of batches) {
  if (b.id.startsWith(KEEP)) {
    console.log(`conservé (démo scannable): ${b.id} (${b.packs.length} packs)`);
    continue;
  }
  await prisma.preActivatedLot.deleteMany({ where: { pack: { batchId: b.id } } });
  await prisma.pack.deleteMany({ where: { batchId: b.id } });
  await prisma.batch.delete({ where: { id: b.id } });
  deleted++;
}
console.log(`${deleted} batch(s) de test supprimé(s)`);
await prisma.$disconnect();
