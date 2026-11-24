// DEC-2026-021 (Amendment A) / P175 — Certificate of Completion integration tests on the ISOLATED Gate A database.
//
//   npx tsx --env-file=.env.gatea.local --test scripts/test-certificates-integration.ts
//
// All synthetic rows are created inside ONE interactive transaction that is always rolled back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client.ts";
import { completeAssignmentInTransaction } from "../src/lib/assignments/completion.ts";
import { ORGANIZATION_SIGNATORY_POSITION } from "../src/lib/certificates/eligibility.ts";
import { CertificateIssueError, issueCertificateInTransaction, loadCertificateEligibility, revokeCertificate } from "../src/lib/certificates/issue.ts";
import { certificateCandidateWhere } from "../src/lib/certificates/scope.ts";
import { DOCUMENT_REQUIREMENTS } from "../src/lib/onboarding/domain.ts";
import { BO_COFFEE_OFFICE_CODE } from "../src/lib/organization/bo-coffee.ts";

if (process.env.GATEA_TARGET_ENV !== "test" || process.env.GATEA_ENVIRONMENT_VERIFIED !== "1" || !process.env.DATABASE_URL) {
  throw new Error("BLOCKED: certificate integration tests run only against the verified isolated Gate A environment (.env.gatea.local).");
}

class Rollback extends Error {}

test("certificates follow the three checks, are idempotent, scoped and revocable on the isolated database", async (t) => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const before = await prisma.internshipCertificate.count();
    await prisma.$transaction(async (tx) => { await workflow(t, tx); throw new Rollback("always roll back"); }, { timeout: 120_000, maxWait: 20_000 })
      .catch((error: unknown) => { if (!(error instanceof Rollback)) throw error; });
    assert.equal(await prisma.user.count({ where: { email: { startsWith: "certificate-it-" } } }), 0, "synthetic users rolled back");
    assert.equal(await prisma.internshipCertificate.count(), before, "no certificate persisted");
  } finally { await prisma.$disconnect(); }
});

async function workflow(t: TestContext, tx: Prisma.TransactionClient) {
  const stamp = randomUUID().slice(0, 8);
  const company = await tx.company.findFirst({ where: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true }, select: { id: true, name: true } });
  const supervisor = await tx.supervisorProfile.findFirst({ where: { companyId: company?.id, user: { email: { startsWith: "gatea.supervisor.a." } } }, select: { id: true, userId: true } });
  const otherSupervisor = await tx.supervisorProfile.findFirst({ where: { user: { email: { startsWith: "gatea.supervisor.b." } } }, select: { userId: true } });
  const coordinator = await tx.coordinatorProfile.findFirst({ where: { user: { email: { startsWith: "gatea.coordinator.a." } } }, select: { id: true, userId: true, schoolId: true } });
  const representative = await tx.representativeProfile.findFirst({ where: { companyId: company?.id, user: { email: { startsWith: "gatea.representative.a." } } }, select: { userId: true } });
  const otherRepresentative = await tx.representativeProfile.findFirst({ where: { user: { email: { startsWith: "gatea.representative.b." } } }, select: { userId: true } });
  const admin = await tx.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  assert(company && supervisor && otherSupervisor && coordinator && representative && otherRepresentative && admin, "Gate A fixtures are required");

  const days = ["2026-06-01", "2026-06-02"];
  const intern = async (name: string, opts: { logs: number }) => {
    const user = await tx.user.create({ data: { authId: randomUUID(), email: `certificate-it-${stamp}-${name}@example.invalid`, role: "INTERN", firstName: "Certificate", lastName: `IT ${name}`, phoneNumber: "+63 900 000 0000" }, select: { id: true } });
    const profile = await tx.internProfile.create({ data: { userId: user.id, schoolId: coordinator.schoolId, studentNumber: `CIT-${stamp}-${name}`, course: "Integration test", address: "Test", emergencyContactName: "Test", emergencyContactNumber: "+63 900 000 0001" }, select: { id: true } });
    const assignment = await tx.internshipAssignment.create({
      data: { internProfileId: profile.id, companyId: company.id, supervisorProfileId: supervisor.id, coordinatorProfileId: coordinator.id, assignmentCode: `CIT-${stamp}-${name}`, positionTitle: "Operations Intern", startDate: new Date("2026-06-01T00:00:00Z"), endDate: new Date("2026-08-28T00:00:00Z"), status: "ACTIVE", requiredHours: 2 },
      select: { id: true },
    });
    await tx.attendance.createMany({ data: days.map((d) => ({ assignmentId: assignment.id, attendanceDate: new Date(`${d}T00:00:00Z`), status: "APPROVED" as const, creditedMinutes: 60, workedMinutes: 60 })) });
    await tx.attendance.create({ data: { assignmentId: assignment.id, attendanceDate: new Date("2026-06-03T00:00:00Z"), status: "PENDING_REVIEW", creditedMinutes: 0, workedMinutes: 480 } });
    await tx.workLog.createMany({ data: days.slice(0, opts.logs).map((d) => ({ assignmentId: assignment.id, workDate: new Date(`${d}T00:00:00Z`), title: "Daily log", description: "Work done.", status: "SUBMITTED" as const })) });
    await tx.document.createMany({ data: DOCUMENT_REQUIREMENTS.filter((item) => item.required).map((item) => ({ assignmentId: assignment.id, uploadedById: user.id, fileName: item.title, originalFileName: `${item.key}.pdf`, storagePath: `certificate-it/${stamp}/${name}/${item.key}.pdf`, mimeType: "application/pdf", fileSizeBytes: BigInt(1) })) });
    return { userId: user.id, assignmentId: assignment.id };
  };
  const now = new Date("2026-08-29T01:00:00Z");
  const x = await intern("x", { logs: 2 });   // all three checks met
  const y = await intern("y", { logs: 1 });   // one attended day without a Work Log

  await t.test("all checks met: completion issues the certificate, signed by the organization", async () => {
    const eligibility = await loadCertificateEligibility(tx, x.assignmentId);
    assert(eligibility?.eligible); assert.equal(eligibility.hours.creditedMinutes, 120, "only APPROVED Attendance counts");
    const result = await completeAssignmentInTransaction(tx, { assignmentId: x.assignmentId, companyId: company.id, fromStatus: "ACTIVE", now });
    assert(!result.certificate.skipped && result.certificate.created);
    const certificate = await tx.internshipCertificate.findUniqueOrThrow({ where: { assignmentId: x.assignmentId } });
    assert.equal(certificate.status, "ISSUED"); assert.equal(certificate.creditedMinutes, 120); assert.equal(certificate.issuedById, null);
    assert.equal(certificate.signatoryName, company.name); assert.equal(certificate.signatoryPosition, ORGANIZATION_SIGNATORY_POSITION);
    assert.equal(await tx.portfolio.count({ where: { assignmentId: x.assignmentId, status: "GENERATED" } }), 1);
  });

  await t.test("retries never duplicate a certificate", async () => {
    const again = await issueCertificateInTransaction(tx, { assignmentId: x.assignmentId, now });
    assert(!again.skipped && !again.created);
    assert.equal(await tx.internshipCertificate.count({ where: { assignmentId: x.assignmentId } }), 1);
  });

  await t.test("a missing Work Log means no certificate: preview only, and completion still succeeds", async () => {
    const eligibility = await loadCertificateEligibility(tx, y.assignmentId);
    assert.equal(eligibility?.eligible, false); assert.deepEqual(eligibility?.workLogs.missingLogDays, ["2026-06-02"]);
    assert((await issueCertificateInTransaction(tx, { assignmentId: y.assignmentId, now })).skipped);
    await tx.$executeRawUnsafe("SAVEPOINT certificate_completion");
    const result = await completeAssignmentInTransaction(tx, { assignmentId: y.assignmentId, companyId: company.id, fromStatus: "ACTIVE", now });
    assert(result.certificate.skipped);
    assert.equal(await tx.internshipCertificate.count({ where: { assignmentId: y.assignmentId } }), 0);
    await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT certificate_completion");
  });

  await t.test("a certificate failure rolls back the COMPLETED transition and the Portfolio snapshot", async () => {
    await tx.$executeRawUnsafe("SAVEPOINT certificate_failure");
    await assert.rejects(completeAssignmentInTransaction(tx, { assignmentId: y.assignmentId, companyId: company.id, fromStatus: "ACTIVE", now }, { issue: async () => { throw new Error("simulated failure"); } }), CertificateIssueError);
    await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT certificate_failure");
    assert.equal((await tx.internshipAssignment.findUniqueOrThrow({ where: { id: y.assignmentId }, select: { status: true } })).status, "ACTIVE");
    assert.equal(await tx.portfolio.count({ where: { assignmentId: y.assignmentId } }), 0);
  });

  await t.test("scope: own Intern, assigned Supervisor, school Coordinator, Main Office Representative; others denied", async () => {
    const sees = async (userId: string, role: string) => { const where = certificateCandidateWhere({ userId, role }, x.assignmentId); return where ? Boolean(await tx.internshipCertificate.findFirst({ where, select: { id: true } })) : false; };
    assert.equal(await sees(x.userId, "INTERN"), true);
    assert.equal(await sees(y.userId, "INTERN"), false, "another Intern");
    assert.equal(await sees(supervisor.userId, "SUPERVISOR"), true);
    assert.equal(await sees(otherSupervisor.userId, "SUPERVISOR"), false);
    assert.equal(await sees(coordinator.userId, "COORDINATOR"), true);
    assert.equal(await sees(representative.userId, "REPRESENTATIVE"), true);
    assert.equal(await sees(otherRepresentative.userId, "REPRESENTATIVE"), false, "another company's Representative");
    assert.equal(await sees(admin.id, "ADMIN"), false, "the technical Admin has no certificate scope");
  });

  await t.test("revocation: Main Office Representative only, reason kept, database rejects inconsistent rows", async () => {
    const certificate = await tx.internshipCertificate.findUniqueOrThrow({ where: { assignmentId: x.assignmentId }, select: { id: true } });
    assert.equal(await revokeCertificate(tx, { certificateId: certificate.id, actorUserId: otherRepresentative.userId, reason: "Wrong company", now }), false);
    assert.equal(await revokeCertificate(tx, { certificateId: certificate.id, actorUserId: representative.userId, reason: "Completed by mistake", now }), true);
    const row = await tx.internshipCertificate.findUniqueOrThrow({ where: { id: certificate.id } });
    assert.equal(row.status, "REVOKED"); assert.equal(row.revokeReason, "Completed by mistake"); assert.equal(row.revokedById, representative.userId);
    await tx.$executeRawUnsafe("SAVEPOINT certificate_check");
    await assert.rejects(tx.internshipCertificate.update({ where: { id: certificate.id }, data: { revokeReason: null } }));
    await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT certificate_check");
  });
}
