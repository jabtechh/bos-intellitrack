import type { UserRole } from "@/generated/prisma/enums";

export const BUSINESS_ROLE_LABELS: Record<UserRole, string> = {
  INTERN: "Intern",
  SUPERVISOR: "Company Supervisor",
  COORDINATOR: "School Coordinator",
  REPRESENTATIVE: "Company Representative",
  ADMIN: "System Administrator",
};

export function roleLabel(role: UserRole) { return BUSINESS_ROLE_LABELS[role]; }
export function canManageCompanyOperations(role: UserRole) { return role === "REPRESENTATIVE" || role === "ADMIN"; }
export function canApproveOperationalReviews(role: UserRole) { return role === "SUPERVISOR" || role === "REPRESENTATIVE" || role === "ADMIN"; }
