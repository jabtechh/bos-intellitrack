import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/get-auth-user";
import { getSafeRedirectPath } from "@/lib/auth/redirects";

export async function requireAuthUser() {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect(getSafeRedirectPath("/login", "/login"));
  }

  return authUser;
}
