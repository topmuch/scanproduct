import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminData } from "@/lib/admin-server-data";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/superadmin");
  }
  if (session.user?.role !== "SUPERADMIN") {
    redirect("/login?error=unauthorized");
  }

  const initialData = await getAdminData();

  return <AdminShell initialData={initialData} />;
}
