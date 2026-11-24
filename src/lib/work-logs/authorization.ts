import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";
import { prisma } from "@/lib/prisma";

export async function requireWorkLogViewer() {
  const user = await requireCurrentUser();
  if (user.role === "INTERN") {
    const profile = await prisma.internProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (profile) return { user, kind: "INTERN" as const, profileId: profile.id };
  }
  if (user.role === "SUPERVISOR") {
    const profile = await prisma.supervisorProfile.findFirst({
      where: { userId: user.id, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } },
      select: { id: true },
    });
    if (profile) return { user, kind: "SUPERVISOR" as const, profileId: profile.id };
  }
  redirect("/dashboard");
}

export const requireWorkLogReviewer = requireWorkLogViewer;

export function workLogAssignmentWhere(context: Awaited<ReturnType<typeof requireWorkLogViewer>>) {
  return context.kind === "INTERN"
    ? { internProfileId: context.profileId }
    : { supervisorProfileId: context.profileId };
}
