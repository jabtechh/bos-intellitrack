import type { UserRole } from "@/generated/prisma/enums";
import type { AuthUser } from "@/lib/auth/get-auth-user";

export type ApplicationUser = {
  id: string;
  authId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

export type CurrentUserState =
  | { status: "unauthenticated" }
  | { status: "not-provisioned"; authUser: AuthUser }
  | { status: "inactive"; user: ApplicationUser }
  | { status: "active"; user: ApplicationUser };

export function classifyCurrentUser(
  authUser: AuthUser | null,
  user: ApplicationUser | null,
): CurrentUserState {
  if (!authUser) return { status: "unauthenticated" };
  if (!user) return { status: "not-provisioned", authUser };
  if (!user.isActive) return { status: "inactive", user };
  return { status: "active", user };
}
