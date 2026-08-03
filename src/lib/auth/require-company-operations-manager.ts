import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { canManageCompanyOperations } from "@/lib/auth/roles";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";
import { prisma } from "@/lib/prisma";

export async function requireCompanyOperationsManager() {
  const user = await requireCurrentUser();
  if (!canManageCompanyOperations(user.role)) redirect("/dashboard");
  if (user.role === "REPRESENTATIVE") {
    const profile = await prisma.representativeProfile.findFirst({ where: { userId: user.id, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } }, select: { id: true } });
    if (!profile) redirect("/dashboard");
  }
  return user;
}
