import type { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";
import { prisma } from "@/lib/prisma";

export async function requirePortfolioViewer() {
  const user = await requireCurrentUser();
  if (user.role === "ADMIN") return { user, kind: "ADMIN" as const };
  if (user.role === "INTERN") { const p = await prisma.internProfile.findUnique({ where: { userId: user.id }, select: { id: true } }); if (p) return { user, kind: "INTERN" as const, profileId: p.id }; }
  if (user.role === "SUPERVISOR") { const p = await prisma.supervisorProfile.findFirst({ where: { userId: user.id, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } }, select: { id: true } }); if (p) return { user, kind: "SUPERVISOR" as const, profileId: p.id }; }
  if (user.role === "COORDINATOR") { const p = await prisma.coordinatorProfile.findUnique({ where: { userId: user.id }, select: { schoolId: true } }); if (p) return { user, kind: "COORDINATOR" as const, schoolId: p.schoolId }; }
  if (user.role === "REPRESENTATIVE") { const p = await prisma.representativeProfile.findFirst({ where: { userId: user.id, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } }, select: { companyId: true } }); if (p) return { user, kind: "REPRESENTATIVE" as const, companyId: p.companyId }; }
  redirect("/dashboard");
}
export type PortfolioContext = Awaited<ReturnType<typeof requirePortfolioViewer>>;
export function portfolioAssignmentWhere(c: PortfolioContext): Prisma.InternshipAssignmentWhereInput {
  if (c.kind === "ADMIN") return { company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } };
  if (c.kind === "INTERN") return { internProfileId: c.profileId, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } };
  if (c.kind === "SUPERVISOR") return { supervisorProfileId: c.profileId, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } };
  if (c.kind === "COORDINATOR") return { internProfile: { schoolId: c.schoolId }, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } };
  return { companyId: c.companyId };
}
export function portfolioForInternWhere(c: PortfolioContext, internUserId: string): Prisma.InternshipAssignmentWhereInput {
  return { AND: [portfolioAssignmentWhere(c), { internProfile: { userId: internUserId } }] };
}
