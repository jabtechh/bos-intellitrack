import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";
import { prisma } from "@/lib/prisma";

export async function requireRequiredHoursManager() {
  const user = await requireCurrentUser();

  if (user.role === "REPRESENTATIVE") {
    const profile = await prisma.representativeProfile.findFirst({
      where: {
        userId: user.id,
        company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true },
      },
      select: { companyId: true },
    });
    if (!profile) redirect("/dashboard");
    return { user, kind: "REPRESENTATIVE" as const, companyId: profile.companyId };
  }

  if (user.role === "ADMIN") {
    const company = await prisma.company.findFirst({
      where: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true },
      select: { id: true },
    });
    if (!company) redirect("/admin/system");
    return { user, kind: "ADMIN" as const, companyId: company.id };
  }

  redirect("/dashboard");
}
