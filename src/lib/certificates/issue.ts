// DEC-2026-021 (Amendment A) — issue the Certificate of Completion automatically once the intern meets the
// three intern-visible checks (hours, daily Work Logs, Getting started). Idempotent per assignment (unique
// assignment_id): a repeat returns the existing certificate unchanged. Signed by the organization, never a
// fabricated person or signature.
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { DOCUMENT_REQUIREMENTS } from "@/lib/onboarding/domain";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";
import { certificateNumber } from "./domain";
import { certificateEligibility, ORGANIZATION_SIGNATORY_POSITION } from "./eligibility";

type Db = PrismaClient | Prisma.TransactionClient;

export class CertificateIssueError extends Error {}

const day = (value: Date) => value.toISOString().slice(0, 10);

/** Loads the three checks for one assignment, using the same rules as Getting started for profile/documents. */
export async function loadCertificateEligibility(db: Db, assignmentId: string) {
  const assignment = await db.internshipAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      status: true, requiredHours: true,
      internProfile: { select: { address: true, emergencyContactName: true, emergencyContactNumber: true, user: { select: { phoneNumber: true } } } },
      attendance: { where: { status: "APPROVED", creditedMinutes: { gt: 0 } }, select: { attendanceDate: true, creditedMinutes: true } },
      workLogs: { where: { status: { in: ["SUBMITTED", "APPROVED"] } }, select: { workDate: true } },
      documents: { where: { status: { not: "ARCHIVED" } }, select: { fileName: true } },
    },
  });
  if (!assignment) return null;
  const profile = assignment.internProfile;
  const titles = new Set(assignment.documents.map((doc) => doc.fileName.trim().toLowerCase()));
  return certificateEligibility({
    assignmentStatus: assignment.status,
    requiredHours: assignment.requiredHours,
    creditedMinutes: assignment.attendance.reduce((sum, row) => sum + row.creditedMinutes, 0),
    attendedDays: assignment.attendance.map((row) => day(row.attendanceDate)),
    loggedDays: assignment.workLogs.map((row) => day(row.workDate)),
    profileComplete: Boolean(profile.user.phoneNumber && profile.address && profile.emergencyContactName && profile.emergencyContactNumber),
    requiredDocuments: DOCUMENT_REQUIREMENTS.filter((item) => item.required).map((item) => ({ title: item.title, submitted: titles.has(item.title.toLowerCase()) })),
  });
}

type IssueResult =
  | { id: string; certificateNumber: string; status: string; created: boolean; skipped: false }
  | { id: null; certificateNumber: null; status: null; created: false; skipped: true; reason: "not_eligible" | "outside_scope" };

export async function issueCertificateInTransaction(db: Db, input: { assignmentId: string; now: Date; newNumber?: () => string }): Promise<IssueResult> {
  const existing = await db.internshipCertificate.findUnique({ where: { assignmentId: input.assignmentId }, select: { id: true, certificateNumber: true, status: true } });
  if (existing) return { ...existing, created: false, skipped: false };

  const assignment = await db.internshipAssignment.findUnique({
    where: { id: input.assignmentId },
    select: {
      status: true, positionTitle: true, startDate: true, endDate: true, completedAt: true, requiredHours: true,
      company: { select: { name: true, companyCode: true, isActive: true } },
      internProfile: { select: { user: { select: { firstName: true, middleName: true, lastName: true, suffix: true } } } },
    },
  });
  if (!assignment) throw new CertificateIssueError("Internship not found.");
  // Certificates belong to the approved Bo's Coffee Main Office program (single-organization scope).
  if (assignment.company.companyCode !== BO_COFFEE_OFFICE_CODE || !assignment.company.isActive) return { id: null, certificateNumber: null, status: null, created: false, skipped: true, reason: "outside_scope" };
  const eligibility = await loadCertificateEligibility(db, input.assignmentId);
  if (!eligibility?.eligible) return { id: null, certificateNumber: null, status: null, created: false, skipped: true, reason: "not_eligible" };

  // Pick an unused number before inserting (a unique violation would abort the surrounding transaction).
  const next = input.newNumber ?? (() => certificateNumber(input.now));
  let number = next();
  for (let attempt = 0; await db.internshipCertificate.findUnique({ where: { certificateNumber: number }, select: { id: true } }); attempt += 1) {
    if (attempt >= 5) throw new CertificateIssueError("A unique certificate number could not be generated.");
    number = next();
  }
  const user = assignment.internProfile.user;
  const created = await db.internshipCertificate.create({
    data: {
      assignmentId: input.assignmentId, certificateNumber: number, status: "ISSUED", issuedAt: input.now, issuedById: null,
      signatoryName: assignment.company.name, signatoryPosition: ORGANIZATION_SIGNATORY_POSITION,
      internName: [user.firstName, user.middleName, user.lastName, user.suffix].filter((part) => part && part.trim()).join(" "),
      positionTitle: assignment.positionTitle, companyName: assignment.company.name,
      startDate: assignment.startDate, endDate: assignment.endDate,
      // When the requirements were completed: the internship completion, or the moment the checks were met.
      completedAt: assignment.completedAt ?? input.now,
      creditedMinutes: eligibility.hours.creditedMinutes, requiredHours: assignment.requiredHours,
    },
    select: { id: true, certificateNumber: true, status: true },
  });
  return { ...created, created: true, skipped: false };
}

/** Representative-only revocation with a required reason; the row and its audit data are kept. */
export async function revokeCertificate(db: Db, input: { certificateId: string; actorUserId: string; reason: string; now: Date }) {
  const updated = await db.internshipCertificate.updateMany({
    where: { id: input.certificateId, status: "ISSUED", assignment: { company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true, representativeProfiles: { some: { userId: input.actorUserId } } } } },
    data: { status: "REVOKED", revokedAt: input.now, revokedById: input.actorUserId, revokeReason: input.reason.trim() },
  });
  return updated.count === 1;
}
