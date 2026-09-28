import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const b = await db.batch.deleteMany({});
const s = await db.artisanScan.deleteMany({});
console.log(`Nettoyé: ${b.count} batch(es), ${s.count} scan(s)`);
await db.$disconnect();
