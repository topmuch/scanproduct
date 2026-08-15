import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { FabricantShell } from "@/components/fabricant/FabricantShell";
import { getFabricantData } from "@/lib/fabricant-server-data";
import type { FabricantData } from "@/lib/fabricant-types";
import { DashboardLoadError } from "./DashboardLoadError";
import { StripRetryParam } from "./StripRetryParam";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }
  if (session.user?.role !== "FABRICANT") {
    redirect("/login?error=unauthorized");
  }

  // ────────────────────────────────────────────────────────────────────────
  // Verify the user referenced by the JWT actually still exists in the DB.
  // If the DB was reset / re-seeded while the browser still holds an old
  // session cookie, the JWT's `user.id` will point to a row that no longer
  // exists. That is the one genuine "session_invalid" case: we MUST send the
  // user back to /login so they can authenticate against the current DB.
  // ────────────────────────────────────────────────────────────────────────
  const userExists = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, status: true },
  });

  if (!userExists) {
    // Stale session: the account no longer exists. Force re-login.
    redirect("/login?error=session_invalid");
  }

  if (userExists.status === "SUSPENDED") {
    redirect("/login?error=suspended");
  }

  // ────────────────────────────────────────────────────────────────────────
  // The user exists. From here on, a data-loading failure is NOT a session
  // problem — it's a transient/operational error (e.g. a Prisma query threw,
  // a JSON column is malformed, etc.). We must NOT force a logout here: that
  // would bounce a valid user to /login for no good reason and hide the real
  // error. Instead, render an inline error UI with a retry button so the
  // admin can read the actual cause from the server logs.
  // ────────────────────────────────────────────────────────────────────────
  let initialData: FabricantData;
  try {
    initialData = await getFabricantData(session.user.id);
  } catch (error) {
    console.error("[/dashboard] getFabricantData failed:", error);
    return <DashboardLoadError />;
  }

  return (
    <>
      {/* Strip the ?_r= cache-buster param left by DashboardLoadError's retry
          button so the URL stays clean after a successful reload. */}
      <StripRetryParam />
      <FabricantShell initialData={initialData} />
    </>
  );
}
