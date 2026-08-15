import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { markAllRead } from "@/lib/notifications";

export const runtime = "nodejs";

/**
 * POST /api/notifications/mark-all-read
 * Auth-required — marks all of the authenticated user's unread notifications
 * as read.
 *
 * No body required.
 *
 * Response: { success: true, count: <number marked> }
 */
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const result = await markAllRead(token.sub);
    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("[POST /api/notifications/mark-all-read] Error:", error);
    return NextResponse.json(
      { error: "Échec du marquage des notifications" },
      { status: 500 },
    );
  }
}
