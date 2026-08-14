import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FabricantShell } from "@/components/fabricant/FabricantShell";
import { getFabricantData } from "@/lib/fabricant-server-data";
import type { FabricantData } from "@/lib/fabricant-types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }
  if (session.user?.role !== "FABRICANT") {
    redirect("/login?error=unauthorized");
  }

  let initialData: FabricantData;
  try {
    initialData = await getFabricantData(session.user.id);
  } catch (error) {
    console.error("[/dashboard] getFabricantData failed:", error);
    // If the user row was deleted mid-session, force a re-login.
    redirect("/login?error=session_invalid");
  }

  return <FabricantShell initialData={initialData} />;
}
