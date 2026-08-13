import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FabricantShell } from "@/components/fabricant/FabricantShell";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/dashboard");
  }
  if (session.user?.role !== "FABRICANT") {
    redirect("/login?error=unauthorized");
  }

  return <FabricantShell />;
}
