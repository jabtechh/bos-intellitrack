import type { CurrentUserState } from "@/lib/auth/current-user-state";

export function getCurrentUserGuardDestination(
  state: CurrentUserState,
): string | null {
  if (state.status === "unauthenticated") return "/login";
  if (state.status === "not-provisioned") return "/account/not-provisioned";
  if (state.status === "inactive") return "/account/inactive";
  return null;
}
