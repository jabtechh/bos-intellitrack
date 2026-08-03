import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getCurrentUserGuardDestination } from "@/lib/auth/guard-destination";
import { getSafeRedirectPath } from "@/lib/auth/redirects";

export async function requireCurrentUser() {
  const state = await getCurrentUser();
  const destination = getCurrentUserGuardDestination(state);

  if (destination) {
    redirect(getSafeRedirectPath(destination, "/login"));
  }

  if (state.status !== "active") {
    redirect("/login");
  }

  return state.user;
}
