// SERVER-ONLY MODULE — DEC-2026-021 certificate reads, always through the role scope.
import { prisma } from "@/lib/prisma";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { certificateCandidateWhere, certificateViewerWhere, type CertificateViewer } from "./scope";

export async function certificateViewer(): Promise<CertificateViewer & { firstName: string }> {
  const user = await requireCurrentUser();
  return { userId: user.id, role: user.role, firstName: user.firstName };
}

const select = {
  id: true, assignmentId: true, certificateNumber: true, status: true, issuedAt: true, signatoryName: true, signatoryPosition: true,
  internName: true, positionTitle: true, companyName: true, startDate: true, endDate: true, completedAt: true, creditedMinutes: true,
  requiredHours: true, revokedAt: true, revokeReason: true,
  assignment: { select: { internProfile: { select: { userId: true, school: { select: { name: true } } } } } },
} as const;

export async function listCertificates(viewer: CertificateViewer) {
  const where = certificateViewerWhere(viewer);
  if (!where) return null;
  return prisma.internshipCertificate.findMany({ where, select, orderBy: [{ issuedAt: "desc" }, { id: "asc" }] });
}

/** The assignment ID from the URL is only a candidate; it must be inside the viewer's scope. */
export async function getCertificate(viewer: CertificateViewer, assignmentId: string) {
  const where = certificateCandidateWhere(viewer, assignmentId);
  return where ? prisma.internshipCertificate.findFirst({ where, select }) : null;
}

/** Certificates for the given assignments that this viewer may see (for roster/profile/Portfolio links). */
export async function visibleCertificatesFor(viewer: CertificateViewer, assignmentIds: string[]) {
  const where = certificateViewerWhere(viewer);
  if (!where || !assignmentIds.length) return new Map<string, { status: string; certificateNumber: string }>();
  const rows = await prisma.internshipCertificate.findMany({ where: { AND: [where, { assignmentId: { in: assignmentIds } }] }, select: { assignmentId: true, status: true, certificateNumber: true } });
  return new Map(rows.map((row) => [row.assignmentId, row]));
}

export type CertificateRecord = NonNullable<Awaited<ReturnType<typeof getCertificate>>>;

/** The signed-in Intern's own active/completed Main Office internship with this ID (for the certificate preview). */
export async function ownInternshipForCertificate(userId: string, assignmentId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assignmentId)) return null;
  return prisma.internshipAssignment.findFirst({
    where: { id: assignmentId, status: { in: ["ACTIVE", "COMPLETED"] }, internProfile: { userId }, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } },
    select: { id: true, status: true, positionTitle: true, startDate: true, endDate: true, completedAt: true, requiredHours: true, company: { select: { name: true } }, internProfile: { select: { user: { select: { firstName: true, middleName: true, lastName: true, suffix: true } } } } },
  });
}
