import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { ZipArchive } from "archiver";
import { db } from "@/lib/db";
import { renderQRBuffer } from "@/lib/qr-server";
import { UPLOAD_DIR } from "@/lib/upload-config";
import { construireUrlQrPourLot } from "@/lib/gs1-resolver";
import { ErreurGs1 } from "@/lib/gs1";
import path from "path";
import { promises as fs } from "fs";

/**
 * POST /api/qr-codes/export-zip
 *
 * Exporte un lot de QR codes en archive ZIP — avec le design officiel
 * « LABEL VERIFSCAN » (cercle jaune, textes en arc, QR noir au centre).
 *
 * ── Pourquoi cette route existe ──────────────────────────────────
 * Le dashboard affichait deux boutons fantômes (« Exporter tout »,
 * « Exporter ZIP ») qui ne téléchargeaient rien. Les téléchargements
 * unitaires re-rendent déjà le badge (render-badge), mais il n'existait
 * AUCUN moyen de récupérer le nouveau design en masse. Cette route
 * re-rend chaque QR côté serveur dans le design à jour :
 *   - design "badge" (défaut) → renderBadgeQR (design officiel) ;
 *   - design "classic"        → PNG persisté du QR (ancien design,
 *     choix explicite du fabricant) ; si le fichier manque, repli
 *     sur un rendu classic à la volée.
 *
 * ── URL encodée ──────────────────────────────────────────────────
 * Identique au dashboard (construireUrlQrClient) et aux routes de
 * génération : URI GS1 Digital Link /01/<GTIN>/10/<LOT>[/21/<série>]
 * si le produit porte un GTIN valide, sinon /p/<lotId>?code=<code>.
 * La série AI 21 n'est ajoutée que si le code d'impression fait ≤ 20
 * caractères (limite GS1), exactement comme côté client.
 *
 * ── Body ────────────────────────────────────────────────────────
 *   qrIds   — string[]  QR codes précis à exporter (sélection dashboard)
 *   all     — boolean   exporter TOUS les QR codes du fabricant
 *   size?   — number    côté du rendu en px (défaut 1200 ≈ 1016 DPI à 3 cm)
 *
 * ── Réponse ─────────────────────────────────────────────────────
 *   application/zip (pièce jointe) ou JSON { error }.
 */

const MAX_QR = 300; // garde-fou mémoire : 300 × ~100 Ko ≈ 30 Mo de ZIP

/** Sanitise un code pour en faire un nom de fichier sûr (multi-OS). */
function nomFichier(code: string, index: number): string {
  const sain =
    code
      .replace(/[^A-Za-z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_")
      .slice(0, 48) || `qr-${index}`;
  return `${sain}.png`;
}

export async function POST(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const qrIds: string[] = Array.isArray(body?.qrIds) ? body.qrIds : [];
    const toutExporter = body?.all === true;
    const size = Math.max(256, Math.min(2048, parseInt(body?.size, 10) || 1200));

    if (!toutExporter && qrIds.length === 0) {
      return NextResponse.json(
        { error: "qrIds (string[]) ou all:true est requis" },
        { status: 400 }
      );
    }

    // ── Fetch des QR codes (propriété fabricant vérifiée via le lot) ──
    const qrs = await db.qRCode.findMany({
      where: {
        ...(toutExporter ? {} : { id: { in: qrIds } }),
        lot: { fabricantId: token.sub },
      },
      include: {
        lot: {
          select: {
            id: true,
            lotNumber: true,
            reference: true,
            product: { select: { name: true, barcode: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_QR,
    });

    if (qrs.length === 0) {
      return NextResponse.json(
        { error: "Aucun QR code trouvé (ou non autorisé)" },
        { status: 404 }
      );
    }

    // ── Origine encodée dans les QR (server-side) ───────────────────
    const origine =
      process.env.NEXT_PUBLIC_SCAN_URL?.replace(/\/$/, "") ||
      "https://verifscan.com";

    // ── Rendu de chaque QR (badge officiel ou PNG classic persisté) ──
    // archiver v8 = ESM pur : la fabrique historique `archiver("zip")`
    // n'existe plus, on instancie directement la classe ZipArchive.
    const zip = new ZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    zip.on("data", (c: Buffer) => chunks.push(c));
    const termine = new Promise<Buffer>((resolve, reject) => {
      zip.on("end", () => resolve(Buffer.concat(chunks)));
      zip.on("error", reject);
    });

    const vus = new Set<string>();
    let rendus = 0;
    for (let i = 0; i < qrs.length; i++) {
      const q = qrs[i];
      // Noms de fichiers uniques même si deux lignes partageaient un code.
      let nom = nomFichier(q.code, i);
      while (vus.has(nom)) nom = nomFichier(`${q.code}-${i}-${rendus}`, i);

      let buffer: Buffer | null = null;

      if (q.design === "classic" && q.imageUrl) {
        // Ancien design persisté : sert le fichier d'origine s'il existe.
        const relatif = q.imageUrl
          .replace("/api/uploads/", "")
          .replace(/^\/+/, "");
        try {
          buffer = await fs.readFile(path.join(UPLOAD_DIR, relatif));
        } catch {
          buffer = null; // fichier disparu → repli rendu classic ci-dessous
        }
        if (buffer) {
          zip.append(buffer, { name: nom });
          rendus++;
          vus.add(nom);
          continue;
        }
      }

      // ── URL scannable : même choix GS1/standard que le dashboard ──
      const codeTrim = q.code?.trim() ?? "";
      const serie = codeTrim && codeTrim.length <= 20 ? codeTrim : undefined;
      const fallbackUrl = `${origine}/p/${q.lot.id}${
        codeTrim ? `?code=${encodeURIComponent(codeTrim)}` : ""
      }`;
      let scanUrl = fallbackUrl;
      try {
        scanUrl = construireUrlQrPourLot({
          produit: {
            id: q.lot.id,
            barcode: q.lot.product?.barcode ?? null,
          },
          lot: {
            lotNumber: q.lot.lotNumber,
            reference: q.lot.reference ?? q.lot.lotNumber ?? "",
          },
          ...(serie ? { serie } : {}),
          fallbackUrl,
          origine,
        }).url;
      } catch (e) {
        if (!(e instanceof ErreurGs1)) throw e;
        // LotNumber hors CSET 82 → repli standard sûr (déjà initialisé).
      }

      const rendu = await renderQRBuffer(scanUrl, {
        size,
        design: q.design === "classic" ? "classic" : "badge",
        errorCorrectionLevel: q.design === "classic" ? "M" : "Q",
      });
      zip.append(rendu.buffer, { name: nom });
      rendus++;
      vus.add(nom);
    }

    await zip.finalize();
    const zipBuffer = await termine;

    if (rendus === 0) {
      return NextResponse.json(
        { error: "Aucun QR code n'a pu être rendu" },
        { status: 500 }
      );
    }

    const date = new Date().toISOString().slice(0, 10);
    const nomArchive = `verifscan-qr-${rendus}-${date}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${nomArchive}"`,
        "Content-Length": zipBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[POST /api/qr-codes/export-zip] Error:", error);
    return NextResponse.json(
      {
        error:
          "Échec de l'export ZIP: " +
          (error instanceof Error ? error.message : "erreur inconnue"),
      },
      { status: 500 }
    );
  }
}
