import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import { jsPDF } from "jspdf";
import { renderQRBuffer, resolveLogoPath } from "@/lib/qr-server";

/**
 * POST /api/qr-codes/labels-pdf
 *
 * Generates an A4 PDF label sheet containing multiple QR codes with
 * product name + lot number under each label. Returns the PDF as a
 * binary download (application/pdf).
 *
 * ── Body ────────────────────────────────────────────────────────
 *   lotIds         — string[]  (lots to include; generates 1 QR per lot
 *                    OR perQty per lot if perLot > 1)
 *   perLot         — number    (QR codes per lot, default 1, max 100)
 *   options        — {
 *     size?,           // QR pixel size (rendering resolution)
 *     color?,          // brand color
 *     includeLogo?,
 *     includeLotNumber?,
 *     includeProductName?,
 *     labelsPerRow?,  // default 3
 *     labelWidth?,    // mm, default 60
 *     labelHeight?,   // mm, default 70
 *     pageMargin?,    // mm, default 10
 *     cutLines?       // boolean, default true
 *   }
 *
 * ── Layout ──────────────────────────────────────────────────────
 * A4 = 210 × 297 mm. With 3 labels per row × 60mm wide + 10mm margins,
 * we fit ~3 columns × 4 rows = 12 labels per page. The layout
 * auto-paginates when labels overflow.
 */
export async function POST(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { lotIds, perLot = 1, options = {} } = body;

    if (!Array.isArray(lotIds) || lotIds.length === 0) {
      return NextResponse.json(
        { error: "lotIds (string[]) est requis" },
        { status: 400 }
      );
    }

    const qtyPerLot = Math.min(100, Math.max(1, parseInt(perLot, 10) || 1));
    const totalLabels = lotIds.length * qtyPerLot;
    if (totalLabels > 500) {
      return NextResponse.json(
        { error: "Maximum 500 étiquettes par PDF (demandé: " + totalLabels + ")" },
        { status: 400 }
      );
    }

    // ── Fetch lots (ownership-guarded) ──────────────────────────
    const lots = await db.lot.findMany({
      where: {
        id: { in: lotIds },
        fabricantId: token.sub,
      },
      include: { product: { select: { name: true } } },
    });

    if (lots.length === 0) {
      return NextResponse.json(
        { error: "Aucun lot valide trouvé" },
        { status: 404 }
      );
    }

    // Fetch fabricant logo + brand color.
    const fabricant = await db.user.findUnique({
      where: { id: token.sub },
      select: { logoUrl: true, brandColor: true },
    });
    const logoPath =
      options.includeLogo !== false ? resolveLogoPath(fabricant?.logoUrl) : null;
    const qrColor = options.color || fabricant?.brandColor || "#000000";

    // ── PDF layout config ───────────────────────────────────────
    const PAGE_W = 210; // A4 width mm
    const PAGE_H = 297; // A4 height mm
    const margin = options.pageMargin ?? 10;
    const labelW = options.labelWidth ?? 60;
    const labelH = options.labelHeight ?? 70;
    const gapX = options.gapX ?? 5;
    const gapY = options.gapY ?? 5;
    const labelsPerRow = options.labelsPerRow ?? Math.floor(
      (PAGE_W - 2 * margin + gapX) / (labelW + gapX)
    );
    const labelsPerRowSafe = Math.max(1, Math.min(5, labelsPerRow));
    const labelsPerPage = labelsPerRowSafe * Math.floor(
      (PAGE_H - 2 * margin + gapY) / (labelH + gapY)
    );

    // ── Build the label list (lot + index) ─────────────────────
    const labels: Array<{
      lotId: string;
      lotNumber: string | null;
      productName: string;
      index: number;
    }> = [];
    for (const lot of lots) {
      for (let i = 0; i < qtyPerLot; i++) {
        labels.push({
          lotId: lot.id,
          lotNumber: lot.lotNumber,
          productName: lot.product?.name || "Produit",
          index: i,
        });
      }
    }

    // ── Create PDF ──────────────────────────────────────────────
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    // Pre-generate ALL QR PNG buffers (parallelizable but sequential
    // here to avoid memory spikes with 500 QRs).
    const qrBuffers: Buffer[] = [];
    for (const label of labels) {
      const scanUrl = `${
        process.env.NEXT_PUBLIC_SCAN_URL?.replace(/\/$/, "") || "https://verifscan.sn"
      }/p/${label.lotId}?code=${label.lotNumber || label.lotId}-${label.index}`;
      const rendered = await renderQRBuffer(scanUrl, {
        size: 400,
        color: qrColor,
        logoPath: logoPath || undefined,
        lotNumber: options.includeLotNumber !== false ? label.lotNumber : null,
        productName:
          options.includeProductName !== false ? label.productName : null,
        errorCorrectionLevel: logoPath ? "H" : "M",
      });
      qrBuffers.push(rendered.buffer);
    }

    // ── Place labels on pages ───────────────────────────────────
    let labelIdx = 0;
    let pageNum = 0;

    while (labelIdx < labels.length) {
      if (pageNum > 0) doc.addPage();
      pageNum++;

      const pageLabels = labels.slice(labelIdx, labelIdx + labelsPerPage);
      const pageBuffers = qrBuffers.slice(labelIdx, labelIdx + labelsPerPage);

      for (let i = 0; i < pageLabels.length; i++) {
        const col = i % labelsPerRowSafe;
        const row = Math.floor(i / labelsPerRowSafe);
        const x = margin + col * (labelW + gapX);
        const y = margin + row * (labelH + gapY);

        // QR code image (centered horizontally, top portion of label).
        const qrSize = labelW - 10; // 10mm horizontal padding
        const qrY = y + 3;
        const qrX = x + (labelW - qrSize) / 2;

        const pngDataUrl = `data:image/png;base64,${pageBuffers[i].toString("base64")}`;
        doc.addImage(pngDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

        // If the QR buffer already includes text labels (lot number +
        // product name), we don't need to add PDF text. But if text
        // labels are disabled in options, render just the QR.

        // Cut lines (dotted) around the label.
        if (options.cutLines !== false) {
          doc.setDrawColor(180, 180, 180);
          doc.setLineDashPattern([1, 1], 0);
          doc.rect(x, y, labelW, labelH);
          doc.setLineDashPattern([], 0);
        }
      }

      labelIdx += pageLabels.length;
    }

    // ── Return as binary download ───────────────────────────────
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    const filename = `etiquettes-qr-${new Date().toISOString().slice(0, 10)}.pdf`;
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[POST /api/qr-codes/labels-pdf] Error:", error);
    return NextResponse.json(
      {
        error:
          "Échec de la génération du PDF: " +
          (error instanceof Error ? error.message : "erreur inconnue"),
      },
      { status: 500 }
    );
  }
}
