import type { Prisma } from "@/generated/prisma/client";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";
import { prisma } from "@/lib/prisma";

type ReportUser = Awaited<ReturnType<typeof requireCurrentUser>>;

/**
 * Resolves the caller's report scope without redirecting. Returns null when the
 * account has no report-eligible profile in the approved Bo's Coffee Main Office
 * scope (for example a Supervisor or Representative linked to another company).
 * DEC-2026-020: such accounts must not see a Reports link that silently bounces
 * them to their dashboard.
 */
export async function resolveReportViewer(user: ReportUser) {
  if (user.role === "INTERN") {
    const profile = await prisma.internProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (profile) return { user, kind: "INTERN" as const, profileId: profile.id };
  }
  if (user.role === "SUPERVISOR") {
    const profile = await prisma.supervisorProfile.findFirst({
      where: { userId: user.id, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } },
      select: { id: true, companyId: true },
    });
    if (profile) return { user, kind: "SUPERVISOR" as const, profileId: profile.id, companyId: profile.companyId };
  }
  if (user.role === "COORDINATOR") {
    const profile = await prisma.coordinatorProfile.findUnique({ where: { userId: user.id }, select: { schoolId: true } });
    if (profile) return { user, kind: "COORDINATOR" as const, schoolId: profile.schoolId };
  }
  if (user.role === "REPRESENTATIVE") {
    const profile = await prisma.representativeProfile.findFirst({
      where: { userId: user.id, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } },
      select: { companyId: true },
    });
    if (profile) return { user, kind: "REPRESENTATIVE" as const, companyId: profile.companyId };
  }
  return null;
}

/** Report routes below /reports: deny with 404 (never a silent redirect to Dashboard). */
export async function requireReportViewer() {
  const context = await resolveReportViewer(await requireCurrentUser());
  if (!context) notFound();
  return context;
}

export type ReportContext = NonNullable<Awaited<ReturnType<typeof resolveReportViewer>>>;

export function reportAssignmentWhere(c: ReportContext): Prisma.InternshipAssignmentWhereInput {
  if (c.kind === "INTERN") return { internProfileId: c.profileId };
  if (c.kind === "SUPERVISOR") return { supervisorProfileId: c.profileId };
  if (c.kind === "COORDINATOR") return { internProfile: { schoolId: c.schoolId } };
  return { id: "__representative_aggregate_only__" };
}

export function reportForInternWhere(c: ReportContext, internUserId: string): Prisma.InternshipAssignmentWhereInput {
  return { AND: [reportAssignmentWhere(c), { internProfile: { userId: internUserId } }] };
}
