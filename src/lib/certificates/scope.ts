// DEC-2026-021 — who can see which certificate (pure where-clauses; shared by the app and its tests).
import type { Prisma } from "@/generated/prisma/client";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";

export type CertificateViewer = { userId: string; role: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const mainOffice = { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } as const;

/**
 * Intern: own certificates. Company Supervisor: interns they supervised on that assignment. School
 * Coordinator: students of their own school. Company Representative: certificates of their own Main Office
 * company. Everyone else (including the technical System Administrator) has no certificate scope.
 */
export function certificateViewerWhere(viewer: CertificateViewer): Prisma.InternshipCertificateWhereInput | null {
  const scope: Prisma.InternshipAssignmentWhereInput | null =
    viewer.role === "INTERN" ? { internProfile: { userId: viewer.userId } }
    : viewer.role === "SUPERVISOR" ? { supervisorProfile: { userId: viewer.userId } }
    : viewer.role === "COORDINATOR" ? { internProfile: { school: { coordinatorProfiles: { some: { userId: viewer.userId } } } } }
    : viewer.role === "REPRESENTATIVE" ? { company: { representativeProfiles: { some: { userId: viewer.userId } } } }
    : null;
  if (!scope) return null;
  // Amendment A: certificates can be issued while the internship is still active (all checks met).
  return { assignment: { AND: [{ status: { in: ["ACTIVE", "COMPLETED"] }, company: mainOffice }, scope] } };
}

/** A client-supplied assignment ID is only a candidate; it must also fall inside the viewer's scope. */
export function certificateCandidateWhere(viewer: CertificateViewer, assignmentId: unknown): Prisma.InternshipCertificateWhereInput | null {
  const scope = certificateViewerWhere(viewer);
  if (!scope || typeof assignmentId !== "string" || !UUID.test(assignmentId)) return null;
  return { AND: [scope, { assignmentId }] };
}
