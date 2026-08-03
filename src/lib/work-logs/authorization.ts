import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";
import { prisma } from "@/lib/prisma";

export async function requireWorkLogReviewer() {
  const user = await requireCurrentUser();
  if (user.role === "ADMIN") return { user, kind: "ADMIN" as const };
  if (user.role === "SUPERVISOR") { const profile = await prisma.supervisorProfile.findFirst({ where: { userId: user.id, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } }, select: { id: true } }); if (profile) return { user, kind: "SUPERVISOR" as const, profileId: profile.id }; }
  if (user.role === "REPRESENTATIVE") { const profile = await prisma.representativeProfile.findFirst({ where: { userId: user.id, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } }, select: { companyId: true } }); if (profile) return { user, kind: "REPRESENTATIVE" as const, companyId: profile.companyId }; }
  redirect("/dashboard");
}

export function workLogAssignmentWhere(context: Awaited<ReturnType<typeof requireWorkLogReviewer>>) {
  if (context.kind === "ADMIN") return {};
  if (context.kind === "SUPERVISOR") return { supervisorProfileId: context.profileId };
  return { companyId: context.companyId };
}
