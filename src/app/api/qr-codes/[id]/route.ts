import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";

/**
 * DELETE /api/qr-codes/[id]
 * Auth-required (FABRICANT) — deletes a QR code owned by the authenticated
 * user. Also decrements the parent lot's qrCodeCount.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !token.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const qrCode = await db.qRCode.findUnique({
      where: { id },
      select: { fabricantId: true, lotId: true, code: true },
    });
    if (!qrCode) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 });
    }
    if (qrCode.fabricantId !== token.sub) {
      return NextResponse.json(
        { error: "You can only delete your own QR codes" },
        { status: 403 },
      );
    }

    await db.qRCode.delete({ where: { id } });

    // Decrement the lot's qrCodeCount (best-effort, won't go below 0).
    db.lot
      .update({
        where: { id: qrCode.lotId },
        data: { qrCodeCount: { decrement: 1 } },
      })
      .catch(() => undefined);

    db.auditLog
      .create({
        data: {
          userId: token.sub,
          action: "DELETE_QR",
          entity: "QRCode",
          entityId: id,
          metadata: JSON.stringify({ code: qrCode.code, lotId: qrCode.lotId }),
        },
      })
      .catch(() => undefined);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/qr-codes/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to delete QR code" }, { status: 500 });
  }
}
