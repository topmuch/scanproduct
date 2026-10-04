import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";
import { normalizePhone } from "@/lib/artisan-auth";

/**
 * GET /api/admin/artisan-lookup?phone=... — RACHAT DE LOT (SuperAdmin).
 *
 * Appelé par SellPackModal quand le SuperAdmin tape le téléphone du
 * client : si le client existe DÉJÀ (compte Artisan), la modale affiche
 * « Client existant — ce nouveau lot sera ajouté à son tableau de bord »
 * et préremplit son nom de marque. Cela évite les doublons de comptes
 * (faute de frappe sur le numéro) lors du rachat d'un lot.
 *
 * Garde : SuperAdmin (session NextAuth, identique à sell-pack).
 * Réponse : { artisan: {id, phone, name, packsCount} | null }
 */
export async function GET(request: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const raw = request.nextUrl.searchParams.get("phone") ?? "";
  const phone = normalizePhone(raw).replace(/^\+/, "");
  if (phone.length < 6) {
    return NextResponse.json({ artisan: null });
  }

  const artisan = await db.artisan.findUnique({
    where: { phone },
    select: { id: true, phone: true, name: true },
  });
  if (!artisan) {
    return NextResponse.json({ artisan: null });
  }

  const packsCount = await db.pack.count({ where: { artisanId: artisan.id } });
  return NextResponse.json({ artisan: { ...artisan, packsCount } });
}
