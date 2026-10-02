import { NextRequest, NextResponse } from "next/server";
import { calculateExpirationDate } from "@/lib/expiration-calculator";

/**
 * POST /api/calculate-expiration — Calcul serveur de la date de péremption.
 *
 * Body :
 *   manufacturingDate string  ISO ou "YYYY-MM-DD" (requis)
 *   shelfLifeMonths   number  durée en mois (si shelfLifeDays absent)
 *   shelfLifeDays     number? durée fine en jours (prime sur les mois)
 *
 * Réponse : { expirationDate: "YYYY-MM-DD" }
 */
export async function POST(request: NextRequest) {
  try {
    const { manufacturingDate, shelfLifeMonths, shelfLifeDays } =
      await request.json();

    if (!manufacturingDate || typeof manufacturingDate !== "string") {
      return NextResponse.json(
        { error: "Date de fabrication requise" },
        { status: 400 },
      );
    }

    const months = Number(shelfLifeMonths);
    const days = shelfLifeDays !== undefined ? Number(shelfLifeDays) : undefined;
    if (
      (!Number.isFinite(months) || months < 0) &&
      (!Number.isFinite(days) || (days ?? 0) <= 0)
    ) {
      return NextResponse.json(
        { error: "Durée de conservation requise (mois ou jours)" },
        { status: 400 },
      );
    }

    // "YYYY-MM-DD" → Date locale à minuit pour éviter les décalages UTC.
    const mfg = /^\d{4}-\d{2}-\d{2}$/.test(manufacturingDate)
      ? new Date(`${manufacturingDate}T00:00:00`)
      : new Date(manufacturingDate);
    if (Number.isNaN(mfg.getTime())) {
      return NextResponse.json(
        { error: "Date de fabrication invalide" },
        { status: 400 },
      );
    }

    const expirationDate = calculateExpirationDate(
      mfg,
      Number.isFinite(months) ? months : 0,
      Number.isFinite(days) ? days : undefined,
    );

    return NextResponse.json({
      expirationDate: expirationDate.toISOString().split("T")[0],
    });
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
}
