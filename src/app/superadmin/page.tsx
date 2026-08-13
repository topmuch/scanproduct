import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/superadmin");
  }
  if (session.user?.role !== "SUPERADMIN") {
    redirect("/login?error=unauthorized");
  }

  return <AdminShell />;
}
