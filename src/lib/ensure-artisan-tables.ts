import { db } from "@/lib/db";

/**
 * Auto-réparation du schéma du système artisanal (Batch/Pack/PreActivatedLot/
 * ArtisanScan) : TABLES manquantes ET COLONNES manquantes.
 *
 * CONTEXTE — pourquoi ce module existe :
 *   En prod (Coolify), `prisma db push` échoue parfois silencieusement au boot
 *   sur le volume persistant. Historique complet des pannes du même type :
 *   - P2022 "column barcode does not exist" (table Product ancienne)
 *   - P2021 "The table main.Batch does not exist" (tables artisanales absentes)
 *   - P2022 "The column artisanBio does not exist" (table PreActivatedLot
 *     créée AVANT l'ajout des champs bio/conseils de la page artisan v2)
 *
 *   Piège clé : `CREATE TABLE IF NOT EXISTS` est un NO-OP quand la table existe
 *   déjà → les colonnes ajoutées au schéma APRÈS le premier déploiement ne sont
 *   JAMAIS ajoutées par le DDL de création. Il faut un `ALTER TABLE ADD COLUMN`
 *   explicite (SQLite : sûr pour une colonne nullable sans défaut).
 *
 *   Solution définitive : l'APPLICATION répare sa propre base au moment de
 *   l'erreur. Si une requête échoue (P2021/P2022), on exécute le DDL via
 *   `$executeRawUnsafe` (le même canal Prisma qui a causé l'erreur — ne peut
 *   pas rater la DB), puis on rejoue la requête.
 *
 *   Aucune dépendance shell/sqlite3/child_process → compatible bundle client
 *   (même contraintes que db.ts, voir son AUTO-MIGRATION).
 *
 * Le DDL des tables est l'EXTRAIT EXACT de ce que Prisma crée (dumpé d'une DB
 * réelle via sqlite_master), identique au heredoc ARTISAN_DDL de
 * docker-entrypoint.sh. Tout est idempotent (IF NOT EXISTS / vérif PRAGMA
 * avant ALTER) → sans risque à chaque appel.
 */

export const ARTISAN_TABLES = [
  "Artisan",
  "Batch",
  "Pack",
  "PreActivatedLot",
  "ArtisanScan",
  "ArtisanReview",
  "ArtisanPhoto",
] as const;

/** DDL artisana — une instruction par élément (Prisma = 1 statement par appel). */
export const ARTISAN_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "Artisan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT '0000',
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Artisan_phone_key" ON "Artisan"("phone")`,
  `CREATE INDEX IF NOT EXISTS "Artisan_phone_idx" ON "Artisan"("phone")`,
  `CREATE TABLE IF NOT EXISTS "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "totalQuantity" INTEGER NOT NULL,
    "packSize" INTEGER NOT NULL,
    "numberOfPacks" INTEGER NOT NULL,
    "printedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS "Batch_status_idx" ON "Batch"("status")`,
  `CREATE TABLE IF NOT EXISTS "Pack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "packNumber" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "masterQrCode" TEXT NOT NULL,
    "soldTo" TEXT,
    "soldAt" DATETIME,
    "artisanPhone" TEXT,
    "artisanEmail" TEXT,
    "artisanId" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "tiktokUrl" TEXT,
    "artisanPhotos" TEXT,
    "productPrice" TEXT,
    "productDesignation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pack_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pack_artisanId_fkey" FOREIGN KEY ("artisanId") REFERENCES "Artisan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Pack_masterQrCode_key" ON "Pack"("masterQrCode")`,
  `CREATE INDEX IF NOT EXISTS "Pack_batchId_idx" ON "Pack"("batchId")`,
  `CREATE INDEX IF NOT EXISTS "Pack_status_idx" ON "Pack"("status")`,
  `CREATE INDEX IF NOT EXISTS "Pack_masterQrCode_idx" ON "Pack"("masterQrCode")`,
  `CREATE INDEX IF NOT EXISTS "Pack_artisanId_idx" ON "Pack"("artisanId")`,
  `CREATE TABLE IF NOT EXISTS "PreActivatedLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packId" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "isMaster" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "activatedAt" DATETIME,
    "productName" TEXT,
    "contenance" TEXT,
    "ingredients" TEXT,
    "manufacturingDate" DATETIME,
    "expirationDate" DATETIME,
    "artisanName" TEXT,
    "contactPhone" TEXT,
    "photoUrl" TEXT,
    "productPrice" TEXT,
    "productDesignation" TEXT,
    "artisanBio" TEXT,
    "usageTips" TEXT,
    "counterfeitAlert" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PreActivatedLot_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PreActivatedLot_qrCode_key" ON "PreActivatedLot"("qrCode")`,
  `CREATE INDEX IF NOT EXISTS "PreActivatedLot_packId_idx" ON "PreActivatedLot"("packId")`,
  `CREATE INDEX IF NOT EXISTS "PreActivatedLot_qrCode_idx" ON "PreActivatedLot"("qrCode")`,
  `CREATE INDEX IF NOT EXISTS "PreActivatedLot_status_idx" ON "PreActivatedLot"("status")`,
  `CREATE INDEX IF NOT EXISTS "PreActivatedLot_isMaster_idx" ON "PreActivatedLot"("isMaster")`,
  `CREATE TABLE IF NOT EXISTS "ArtisanScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "country" TEXT,
    "city" TEXT,
    "deviceType" TEXT,
    "timezone" TEXT,
    CONSTRAINT "ArtisanScan_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "PreActivatedLot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS "ArtisanScan_lotId_idx" ON "ArtisanScan"("lotId")`,
  `CREATE INDEX IF NOT EXISTS "ArtisanScan_scannedAt_idx" ON "ArtisanScan"("scannedAt")`,
  `CREATE TABLE IF NOT EXISTS "ArtisanReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtisanReview_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "PreActivatedLot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS "ArtisanReview_lotId_idx" ON "ArtisanReview"("lotId")`,
  `CREATE INDEX IF NOT EXISTS "ArtisanReview_createdAt_idx" ON "ArtisanReview"("createdAt")`,
  // Photos artisan stockées EN BASE (fix « photo perdue au redéploiement »)
  `CREATE TABLE IF NOT EXISTS "ArtisanPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ArtisanPhoto_filename_key" ON "ArtisanPhoto"("filename")`,
  // ── Tables de l'API publique (clés + webhooks, Paramètres → API) ──
  `CREATE TABLE IF NOT EXISTS "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" DATETIME,
    "lastUsedIp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME
)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_keyHash_key" ON "ApiKey"("keyHash")`,
  `CREATE INDEX IF NOT EXISTS "ApiKey_active_idx" ON "ApiKey"("active")`,
  `CREATE TABLE IF NOT EXISTS "Webhook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "events" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS "Webhook_active_idx" ON "Webhook"("active")`,
];

/** Tables de l'API publique (clés + webhooks) — reportées dans le dashboard de santé. */
export const ADMIN_API_TABLES = ["ApiKey", "Webhook"] as const;

/**
 * Colonnes ajoutées au schéma APRÈS le premier déploiement — les tables de
 * prod créées avant leur introduction ne les ont pas. Réparées via
 * `ALTER TABLE ADD COLUMN` (vérif PRAGMA avant → idempotent).
 *
 * ⚠️ À TENIR À JOUR à chaque ajout de champ sur les modèles artisanaux
 * (le DDL CREATE ci-dessus couvre les DB fraîches, ceci couvre les DB
 * existantes — les deux doivent évoluer ensemble).
 */
export const REQUIRED_COLUMNS: Record<string, Array<{ name: string; ddl: string }>> = {
  Pack: [
    // artisanId : lien vers le compte Artisan (portail artisan, vente,
    // dashboard). Les DB de prod creees avant cette colonne la recoivent via
    // ALTER (sans contrainte FK - SQLite ne sait pas ajouter une FK par
    // ALTER, et Prisma n'en a pas besoin pour les requetes/includes).
    { name: "artisanId", ddl: `ALTER TABLE "Pack" ADD COLUMN "artisanId" TEXT` },
    { name: "artisanPhone", ddl: `ALTER TABLE "Pack" ADD COLUMN "artisanPhone" TEXT` },
    { name: "artisanEmail", ddl: `ALTER TABLE "Pack" ADD COLUMN "artisanEmail" TEXT` },
    { name: "instagramUrl", ddl: `ALTER TABLE "Pack" ADD COLUMN "instagramUrl" TEXT` },
    { name: "facebookUrl", ddl: `ALTER TABLE "Pack" ADD COLUMN "facebookUrl" TEXT` },
    { name: "tiktokUrl", ddl: `ALTER TABLE "Pack" ADD COLUMN "tiktokUrl" TEXT` },
    { name: "artisanPhotos", ddl: `ALTER TABLE "Pack" ADD COLUMN "artisanPhotos" TEXT` },
    { name: "productPrice", ddl: `ALTER TABLE "Pack" ADD COLUMN "productPrice" TEXT` },
    {
      name: "productDesignation",
      ddl: `ALTER TABLE "Pack" ADD COLUMN "productDesignation" TEXT`,
    },
  ],
  PreActivatedLot: [
    { name: "artisanBio", ddl: `ALTER TABLE "PreActivatedLot" ADD COLUMN "artisanBio" TEXT` },
    { name: "usageTips", ddl: `ALTER TABLE "PreActivatedLot" ADD COLUMN "usageTips" TEXT` },
    { name: "counterfeitAlert", ddl: `ALTER TABLE "PreActivatedLot" ADD COLUMN "counterfeitAlert" TEXT` },
    // Activation flexible : prix + désignation PAR PRODUIT (chaque lot du
    // groupe porte les siens ; les packs mono-produit gardent le fallback
    // Pack.productPrice / Pack.productDesignation).
    { name: "productPrice", ddl: `ALTER TABLE "PreActivatedLot" ADD COLUMN "productPrice" TEXT` },
    {
      name: "productDesignation",
      ddl: `ALTER TABLE "PreActivatedLot" ADD COLUMN "productDesignation" TEXT`,
    },
    // Auto-complétion intelligente (produits types) : template + précautions
    // + conservation remplis à l'activation par le SmartProductSelector.
    { name: "templateId", ddl: `ALTER TABLE "PreActivatedLot" ADD COLUMN "templateId" TEXT` },
    { name: "precautions", ddl: `ALTER TABLE "PreActivatedLot" ADD COLUMN "precautions" TEXT` },
    {
      name: "storageConditions",
      ddl: `ALTER TABLE "PreActivatedLot" ADD COLUMN "storageConditions" TEXT`,
    },
  ],
  ArtisanScan: [
    { name: "timezone", ddl: `ALTER TABLE "ArtisanScan" ADD COLUMN "timezone" TEXT` },
  ],
};

/** Détecte une erreur « table ou colonne inexistante » (P2021/P2022 Prisma ou SQLite brut). */
export function isTableMissingError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /P2021|P2022|does not exist in the current database|no such table|no such column/i.test(
    msg
  );
}

/**
 * Rend une chaîne sûre pour un EN-TÊTE HTTP (ByteString : chaque code de
 * caractère doit être ≤ 255 — un « — » U+2014 (8212) ou un emoji fait
 * planter res.headers.set avec "Cannot convert argument to a ByteString",
 * ce qui transforme une réponse 201 pourtant réussie en 500).
 * Accents → ASCII (NFD), tirets typographiques → « - », reste → retiré.
 */
export function asciiHeader(value: string): string {
  return value
    .replace(/[—–―]/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .slice(0, 200);
}

export type HealResult = {
  ok: boolean;
  /** Tables qui MANQUAIENT et ont été créées par cet appel. */
  created: string[];
  /** Colonnes qui MANQUAIENT et ont été ajoutées par cet appel (« Table.colonne »). */
  columnsAdded: string[];
  /** Tables déjà en place (rien à faire). */
  alreadyOk: string[];
  /** Erreurs par instruction si le DDL a échoué (ex. DB read-only). */
  errors: string[];
};

async function listTables(): Promise<string[]> {
  const rows = await db.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type='table'"
  );
  return rows.map((r) => r.name);
}

/**
 * Colonnes existantes d'une table. Passe par la table-virtuelle
 * pragma_table_info (SELECT standard → compatible prepared statement Prisma,
 * contrairement à `PRAGMA table_info(...)` nu).
 */
async function listColumns(table: string): Promise<string[]> {
  const rows = await db.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM pragma_table_info('${table.replace(/'/g, "''")}')`
  );
  return rows.map((r) => r.name);
}

/**
 * Répare le schéma artisanal : crée les tables manquantes PUIS ajoute les
 * colonnes manquantes sur les tables existantes. Idempotent et bon marché :
 * à appeler dès qu'une erreur « table/column does not exist » est détectée.
 */
export async function ensureArtisanTables(): Promise<HealResult> {
  const result: HealResult = {
    ok: true,
    created: [],
    columnsAdded: [],
    alreadyOk: [],
    errors: [],
  };

  let before: string[];
  try {
    before = await listTables();
  } catch (error) {
    // Même sqlite_master est inaccessible → la DB elle-même est cassée
    // (ex. fichier illisible, volume non monté). On expose l'erreur brute.
    result.ok = false;
    result.errors.push(
      `sqlite_master inaccessible: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`
    );
    return result;
  }

  for (const sql of ARTISAN_DDL) {
    try {
      await db.$executeRawUnsafe(sql);
    } catch (error) {
      const msg = (error instanceof Error ? error.message : String(error)).slice(0, 200);
      // "table already exists" = course bénigne entre deux appels concurrents
      if (!/already exists/i.test(msg)) {
        result.ok = false;
        result.errors.push(msg);
      }
    }
  }

  const after = await listTables().catch(() => [] as string[]);
  for (const t of ARTISAN_TABLES) {
    const had = before.includes(t);
    const has = after.includes(t);
    if (has && !had) result.created.push(t);
    else if (has && had) result.alreadyOk.push(t);
    else if (has === false) {
      result.ok = false;
      result.errors.push(`${t} toujours absente après DDL`);
    }
  }

  // ── Colonnes : une table PRÉSENTE mais créée par une ancienne version du
  // schéma manque des champs ajoutés depuis (ex. artisanBio/usageTips sur
  // PreActivatedLot). CREATE TABLE IF NOT EXISTS ne les ajoute PAS.
  for (const [table, cols] of Object.entries(REQUIRED_COLUMNS)) {
    if (!after.includes(table)) continue; // absente (création ratée) → déjà tracé ci-dessus

    let existing: string[];
    try {
      existing = await listColumns(table);
    } catch (error) {
      const msg = (error instanceof Error ? error.message : String(error)).slice(0, 200);
      result.ok = false;
      result.errors.push(`pragma_table_info(${table}) inaccessible: ${msg}`);
      continue;
    }

    for (const col of cols) {
      if (existing.includes(col.name)) continue;
      try {
        await db.$executeRawUnsafe(col.ddl);
        result.columnsAdded.push(`${table}.${col.name}`);
      } catch (error) {
        const msg = (error instanceof Error ? error.message : String(error)).slice(0, 200);
        // "duplicate column name" = course bénigne entre deux appels concurrents
        if (!/duplicate column name/i.test(msg)) {
          result.ok = false;
          result.errors.push(msg);
        }
      }
    }
  }

  if (result.created.length > 0 || result.columnsAdded.length > 0) {
    const parts: string[] = [];
    if (result.created.length > 0) parts.push(`tables créées : ${result.created.join(", ")}`);
    if (result.columnsAdded.length > 0)
      parts.push(`colonnes ajoutées : ${result.columnsAdded.join(", ")}`);
    console.log(`[ensure-artisan-tables] Auto-réparation — ${parts.join(" | ")}`);
  }
  return result;
}

/**
 * Détecte une erreur Prisma « enregistrement introuvable » (P2025) — le code
 * vit dans error.code, PAS dans le message (une regex sur le message rate
 * l'erreur : leçon du test DELETE clé inconnue → 404).
 */
export function isRecordMissingError(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const code = (error as { code?: unknown }).code;
    if (code === "P2025") return true;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return /P2025|required but was not found|not found/i.test(msg);
}
