import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { canManageCompanyOperations } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export async function requireCompanyOperationsManager() {
  const user = await requireCurrentUser();
  if (!canManageCompanyOperations(user.role)) redirect("/dashboard");
  const profile = await prisma.representativeProfile.findFirst({
    where: {
      userId: user.id,
      company: { isActive: true },
    },
    select: { id: true, companyId: true },
  });
  if (!profile) redirect("/dashboard");
  return { ...user, representativeProfileId: profile.id, companyId: profile.companyId };
}
