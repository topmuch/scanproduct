import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const packs = await db.pack.findMany({ select: { packNumber: true, masterQrCode: true, status: true } });
console.log(JSON.stringify(packs, null, 1));
await db.$disconnect();
