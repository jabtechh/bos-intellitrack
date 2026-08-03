import { redirect } from "next/navigation";

import { getAdminGuardDestination } from "@/lib/auth/admin-guard";
import { requireCurrentUser } from "@/lib/auth/require-current-user";

export async function requireAdmin() {
  const user = await requireCurrentUser();
  const destination = getAdminGuardDestination(user.role);

  if (destination) redirect(destination);

  return user;
}
