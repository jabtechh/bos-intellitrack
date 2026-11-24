import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";

export async function requireAttendanceReviewer() {
  const user = await requireCurrentUser();
  if (user.role !== "SUPERVISOR") redirect("/dashboard");
  const profile = await prisma.supervisorProfile.findFirst({
    where: {
      userId: user.id,
      company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true },
    },
    select: { id: true, companyId: true },
  });
  if (!profile) redirect("/dashboard");
  return {
    user,
    kind: "SUPERVISOR" as const,
    profileId: profile.id,
    companyId: profile.companyId,
  };
}

export function reviewerAssignmentWhere(
  context: Awaited<ReturnType<typeof requireAttendanceReviewer>>,
) {
  return { supervisorProfileId: context.profileId };
}
