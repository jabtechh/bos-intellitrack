import type { AssignmentInput } from "@/lib/assignments/validation";
import { getEligibilityErrors } from "@/lib/assignments/validation";
import { prisma } from "@/lib/prisma";

type AssignmentReader = Pick<typeof prisma, "internProfile" | "company" | "supervisorProfile" | "coordinatorProfile" | "internshipAssignment">;

export async function verifyAssignmentEligibility(input: AssignmentInput, reader: AssignmentReader = prisma, excludeAssignmentId?: string) {
  const [intern, company, supervisor, coordinator, conflict] = await Promise.all([
    reader.internProfile.findUnique({ where: { id: input.internProfileId }, select: { schoolId: true, user: { select: { isActive: true } }, school: { select: { isActive: true } } } }),
    reader.company.findUnique({ where: { id: input.companyId }, select: { isActive: true } }),
    reader.supervisorProfile.findUnique({ where: { id: input.supervisorProfileId }, select: { companyId: true, user: { select: { isActive: true } } } }),
    reader.coordinatorProfile.findUnique({ where: { id: input.coordinatorProfileId }, select: { schoolId: true, user: { select: { isActive: true } } } }),
    reader.internshipAssignment.findFirst({ where: { internProfileId: input.internProfileId, status: "ACTIVE", ...(excludeAssignmentId ? { id: { not: excludeAssignmentId } } : {}) }, select: { id: true } }),
  ]);
  return getEligibilityErrors({
    internExists: Boolean(intern), internActive: intern?.user.isActive ?? false, internSchoolActive: intern?.school.isActive ?? false,
    companyExists: Boolean(company), companyActive: company?.isActive ?? false,
    supervisorExists: Boolean(supervisor), supervisorActive: supervisor?.user.isActive ?? false, supervisorCompanyMatches: supervisor?.companyId === input.companyId,
    coordinatorExists: Boolean(coordinator), coordinatorActive: coordinator?.user.isActive ?? false, coordinatorSchoolMatches: Boolean(intern && coordinator?.schoolId === intern.schoolId),
    hasConflictingActiveAssignment: Boolean(conflict),
  });
}
