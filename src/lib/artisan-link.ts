import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { normalizePhone } from "@/lib/artisan-auth";

/**
 * VerifScan — LIAISON CLIENT ↔ NOUVEAU LOT (source de vérité unique).
 *
 * ── Le problème ─────────────────────────────────────────────────────────
 * Un client qui a déjà acheté un lot (pack) et créé son tableau de bord
 * (/artisan/dashboard) rachète un lot plus tard : ce NOUVEAU lot doit
 * atterrir dans le MÊME tableau de bord, sans créer un second compte.
 *
 * ── La solution : un ordre de priorité clair ────────────────────────────
 * 1. pack.artisanId déjà posé (vente admin via /api/admin/sell-pack)
 *    → l'admin connaît le client, sa décision est prioritaire.
 * 2. Le client est CONNECTÉ à son portail (JWT localStorage du dashboard,
 *    envoyé par le wizard) → le lot rejoint SON compte, même s'il tape un
 *    autre numéro (changement de SIM, assistance par un proche…).
 * 3. Même numéro de téléphone (normalisé) → même client.
 * 4. Même email sur un pack précédent (Pack.artisanEmail) → même client
 *    (rattrape les fautes de frappe sur le numéro).
 * 5. Sinon → CRÉATION d'un nouveau compte Artisan (mot de passe 0000).
 *
 * Le dashboard /artisan/dashboard agrège déjà TOUS les packs liés par
 * artisanId OU artisanPhone (cf. src/app/api/artisan/dashboard/route.ts)
 * : dès que le nouveau pack porte l'artisanId du client, il apparaît
 * automatiquement dans son tableau de bord — aucun changement requis côté
 * dashboard.
 */

export type ResolveArtisanInput = {
  tx: Prisma.TransactionClient;
  packId: string;
  shared: {
    artisanName: string;
    contactPhone: string;
    contactEmail?: string | null;
  };
  /** Artisan déjà connecté (payload JWT du portail) — optionnel. */
  authArtisanId?: string | null;
};

export type ResolveArtisanResult = {
  artisanId: string;
  phone: string;
  name: string | null;
  /** true si le compte vient d'être créé (1er achat du client). */
  isNew: boolean;
  /** Comment le client a été rattaché au lot. */
  matchedBy: "pack" | "session" | "phone" | "email" | "created";
};

export async function resolveArtisanForPack(
  input: ResolveArtisanInput
): Promise<ResolveArtisanResult> {
  const { tx, shared, authArtisanId } = input;
  const normalizedPhone = normalizePhone(shared.contactPhone).replace(/^\+/, "");

  // ── 1. Lot déjà lié à un client (vente admin / activation précédente) ──
  const pack = await tx.pack.findUnique({
    where: { id: input.packId },
    select: { artisanId: true },
  });
  if (pack?.artisanId) {
    const artisan = await tx.artisan.findUnique({ where: { id: pack.artisanId } });
    if (artisan) {
      return {
        artisanId: artisan.id,
        phone: artisan.phone,
        name: artisan.name,
        isNew: false,
        matchedBy: "pack",
      };
    }
  }

  // ── 2. Client déjà connecté (JWT du portail artisan) ────────────────────
  if (authArtisanId) {
    const artisan = await tx.artisan.findUnique({ where: { id: authArtisanId } });
    if (artisan) {
      // Complète le nom de marque s'il manque sur le compte.
      if (!artisan.name && shared.artisanName) {
        const updated = await tx.artisan.update({
          where: { id: artisan.id },
          data: { name: shared.artisanName },
        });
        return {
          artisanId: updated.id,
          phone: updated.phone,
          name: updated.name,
          isNew: false,
          matchedBy: "session",
        };
      }
      return {
        artisanId: artisan.id,
        phone: artisan.phone,
        name: artisan.name,
        isNew: false,
        matchedBy: "session",
      };
    }
  }

  // ── 3. Même numéro de téléphone → même client ───────────────────────────
  const byPhone = await tx.artisan.findUnique({ where: { phone: normalizedPhone } });
  if (byPhone) {
    const updated = !byPhone.name && shared.artisanName
      ? await tx.artisan.update({
          where: { id: byPhone.id },
          data: { name: shared.artisanName },
        })
      : byPhone;
    return {
      artisanId: updated.id,
      phone: updated.phone,
      name: updated.name,
      isNew: false,
      matchedBy: "phone",
    };
  }

  // ── 4. Même email sur un lot précédent → même client ────────────────────
  // (Artisan n'a pas de colonne email : l'email collecté par le wizard est
  // stocké sur Pack.artisanEmail — on retrouve le compte via les packs.)
  const email = shared.contactEmail?.trim();
  if (email) {
    const prevPack = await tx.pack.findFirst({
      where: { artisanEmail: email, artisanId: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { artisanId: true },
    });
    if (prevPack?.artisanId) {
      const artisan = await tx.artisan.findUnique({ where: { id: prevPack.artisanId } });
      if (artisan) {
        return {
          artisanId: artisan.id,
          phone: artisan.phone,
          name: artisan.name,
          isNew: false,
          matchedBy: "email",
        };
      }
    }
  }

  // ── 5. Nouveau client → création du compte (mot de passe 0000) ──────────
  const created = await tx.artisan.create({
    data: {
      phone: normalizedPhone,
      password: await bcrypt.hash("0000", 10),
      name: shared.artisanName,
    },
  });
  return {
    artisanId: created.id,
    phone: created.phone,
    name: created.name,
    isNew: true,
    matchedBy: "created",
  };
}
