import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Returns the SuperAdmin session, or null if the requester is not
 * authenticated or does not have the SUPERADMIN role.
 *
 * Every /api/admin/* route must call this and return 403 when null.
 */
export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPERADMIN") {
    return null;
  }
  return session;
}
