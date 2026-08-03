import type { UserRole } from "@/generated/prisma/enums";

export function getAdminGuardDestination(role: UserRole): string | null {
  return role === "ADMIN" ? null : "/dashboard";
}
