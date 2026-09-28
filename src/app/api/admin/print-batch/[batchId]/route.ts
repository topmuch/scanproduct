import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/admin-guard";

/**
 * GET /api/admin/print-batch/[batchId]
 * SuperAdmin-only — génère le PDF d'impression de TOUTES les étiquettes
 * QR d'un batch (A4, 4 QR par ligne, Maître encadré en rouge + libellé
 * "MAÎTRE"). Marque le batch comme "printed" à la première génération.
 *
 * Next 16 : le PDF est bufferisé puis renvoyé dans une Response (pas de
 * stream Node brut dans l'edge/runtime Next).
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { batchId } = await params;

  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: {
      packs: {
        orderBy: { packNumber: "asc" },
        include: { lots: { orderBy: { qrCode: "asc" } } },
      },
    },
  });

  if (!batch) {
    return NextResponse.json({ error: "Batch non trouvé" }, { status: 404 });
  }

  // ── Construction du PDF ────────────────────────────────────────────────
  const doc = new PDFDocument({ margin: 30, size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(18).font("Helvetica-Bold").text("VerifScan — Étiquettes QR Artisans", {
    align: "center",
  });
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      `Batch ${batch.id.slice(0, 8).toUpperCase()} · ${batch.totalQuantity} QR codes · ${batch.numberOfPacks} packs de ${batch.packSize}`,
      { align: "center" }
    )
    .text(
      "Étiquette MAÎTRE (encadrée rouge) : à donner à l'artisan — active tout le pack en un scan. " +
        "URL publique des QR : https://verifscan.sn/a/<code>",
      { align: "center", color: "#555555" }
    );
  doc.moveDown(1.5);

  const QR_PER_ROW = 4;
  const QR_SIZE = 95;
  const H_SPACING = 18;
  const V_SPACING = 34;
  const LEFT = 30;
  let col = 0;
  let y = doc.y;

  const newPageIfNeeded = (needed: number) => {
    if (y + needed > 780) {
      doc.addPage();
      y = 40;
    }
  };

  for (const pack of batch.packs) {
    newPageIfNeeded(140);
    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .fillColor("#022150")
      .text(
        `Pack ${pack.packNumber}/${batch.numberOfPacks} — ${pack.quantity} étiquettes — ${pack.price.toLocaleString("fr-FR")} FCFA`,
        LEFT,
        y
      )
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#6B7280")
      .text(`Code maître : ${pack.masterQrCode}`, LEFT, y + 15);
    y += 34;

    for (const lot of pack.lots) {
      newPageIfNeeded(QR_SIZE + V_SPACING + 20);

      try {
        const dataUrl = await QRCode.toDataURL(lot.qrCode, {
          width: QR_SIZE * 2,
          margin: 1,
          color: { dark: "#022150", light: "#FFFFFF" },
        });
        const x = LEFT + col * (QR_SIZE + H_SPACING);

        doc.image(dataUrl, x, y, { width: QR_SIZE, height: QR_SIZE });

        // Libellé du code sous le QR
        doc
          .fontSize(6.5)
          .font(lot.isMaster ? "Helvetica-Bold" : "Helvetica")
          .fillColor(lot.isMaster ? "#DC2626" : "#374151")
          .text(lot.qrCode, x - 8, y + QR_SIZE + 3, {
            width: QR_SIZE + 16,
            align: "center",
            lineBreak: false,
          });

        // Encadré rouge pour le QR Maître
        if (lot.isMaster) {
          doc
            .rect(x - 4, y - 4, QR_SIZE + 8, QR_SIZE + 20)
            .lineWidth(2)
            .strokeColor("#DC2626")
            .stroke();
          doc
            .fontSize(8)
            .font("Helvetica-Bold")
            .fillColor("#DC2626")
            .text("MAÎTRE", x - 8, y + QR_SIZE + 14, {
              width: QR_SIZE + 16,
              align: "center",
              lineBreak: false,
            });
        }

        doc.fillColor("#000000");
        col++;
        if (col >= QR_PER_ROW) {
          col = 0;
          y += QR_SIZE + V_SPACING;
        }
      } catch (e) {
        console.error("[print-batch] QR render error:", e);
      }
    }

    // Fin de pack : repartir sur une nouvelle ligne
    if (col !== 0) {
      col = 0;
      y += QR_SIZE + V_SPACING;
    }
    y += 18;
  }

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#6B7280")
    .text(
      `VerifScan · La vérité au bout du scan · Généré le ${new Date().toLocaleDateString("fr-FR")} — ${batch.totalQuantity + batch.numberOfPacks} étiquettes au total`,
      { align: "center" }
    );
  doc.end();

  const pdf = await done;

  // Marquer comme imprimé (1ʳᵉ fois uniquement — printedAt stable)
  if (!batch.printedAt) {
    await db.batch.update({
      where: { id: batch.id },
      data: { printedAt: new Date(), status: "printed" },
    });
  }

  await db.auditLog.create({
    data: {
      userId: session.user?.id ?? null,
      action: "PRINT_BATCH",
      entity: "Batch",
      entityId: batch.id,
      metadata: JSON.stringify({ quantity: batch.totalQuantity }),
    },
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="verifscan-batch-${batch.id.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
