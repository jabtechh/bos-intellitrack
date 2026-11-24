// DEC-2026-020 / P163–P166 — Portfolio completion integration tests against the ISOLATED Gate A database.
//
//   npm run gatea:env:preflight
//   npx tsx --env-file=.env.gatea.local --test scripts/test-portfolio-integration.ts
//
// Every row (synthetic users, profiles, assignments, evidence, Portfolios) is created inside ONE interactive
// transaction that is always rolled back, so protected Gate A / E6 fixtures and operational data are untouched.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client.ts";
import { completeAssignmentInTransaction } from "../src/lib/assignments/completion.ts";
import { BO_COFFEE_OFFICE_CODE } from "../src/lib/organization/bo-coffee.ts";
import { portfolioCandidateWhere, portfolioEvidenceMode } from "../src/lib/portfolio/scope.ts";
import { parseCompletionSnapshot, persistCompletionPortfolio, PortfolioSnapshotError } from "../src/lib/portfolio/snapshot.ts";

if (process.env.GATEA_TARGET_ENV !== "test" || process.env.GATEA_ENVIRONMENT_VERIFIED !== "1" || !process.env.DATABASE_URL) {
  throw new Error("BLOCKED: Portfolio integration tests run only against the verified isolated Gate A environment (.env.gatea.local).");
}

class Rollback extends Error {}

test("completion snapshots, idempotency, isolation and rollback on the isolated database", async (t) => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const before = { portfolios: await prisma.portfolio.count(), completed: await prisma.internshipAssignment.count({ where: { status: "COMPLETED" } }) };
    await prisma.$transaction(async (tx) => { await workflow(t, tx); throw new Rollback("always roll back"); }, { timeout: 120_000, maxWait: 20_000 })
      .catch((error: unknown) => { if (!(error instanceof Rollback)) throw error; });
    // Rollback proof: nothing from the synthetic run persisted and existing data is unchanged.
    assert.equal(await prisma.user.count({ where: { email: { startsWith: "portfolio-it-" } } }), 0);
    assert.equal(await prisma.portfolio.count(), before.portfolios);
    assert.equal(await prisma.internshipAssignment.count({ where: { status: "COMPLETED" } }), before.completed);
  } finally { await prisma.$disconnect(); }
});

async function workflow(t: TestContext, tx: Prisma.TransactionClient) {
  const stamp = randomUUID().slice(0, 8);
  const mainOffice = await tx.company.findFirst({ where: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true }, select: { id: true } });
  const otherCompany = await tx.company.findFirst({ where: { companyCode: { not: BO_COFFEE_OFFICE_CODE } }, select: { id: true } });
  const school = await tx.school.findFirst({ select: { id: true } });
  const coordinator = await tx.coordinatorProfile.findFirst({ select: { id: true } });
  const supervisor = await tx.supervisorProfile.findFirst({ where: { companyId: mainOffice?.id }, select: { id: true, userId: true } });
  const representative = await tx.representativeProfile.findFirst({ where: { companyId: mainOffice?.id }, select: { userId: true } });
  assert(mainOffice && otherCompany && school && coordinator && supervisor && representative, "isolated environment needs Main Office, another company, a school, a coordinator and a Main Office supervisor");

  const intern = async (name: string) => {
    const user = await tx.user.create({ data: { authId: randomUUID(), email: `portfolio-it-${stamp}-${name}@example.invalid`, role: "INTERN", firstName: "Portfolio", lastName: `IT ${name}` }, select: { id: true } });
    return tx.internProfile.create({ data: { userId: user.id, schoolId: school.id, studentNumber: `PIT-${stamp}-${name}`, course: "Integration test" }, select: { id: true } });
  };
  const x = await intern("x"); const y = await intern("y");
  let n = 0;
  const assignment = (internProfileId: string, status: "ACTIVE" | "COMPLETED", companyId = mainOffice.id, positionTitle = "Operations Intern") => tx.internshipAssignment.create({
    data: { internProfileId, companyId, supervisorProfileId: supervisor.id, coordinatorProfileId: coordinator.id, assignmentCode: `PIT-${stamp}-${++n}`, positionTitle, startDate: new Date("2026-08-01T00:00:00Z"), endDate: new Date("2026-10-31T00:00:00Z"), status, requiredHours: 300 },
    select: { id: true },
  });
  const now = new Date("2026-11-24T09:00:00Z");

  const x1 = await assignment(x.id, "ACTIVE");
  await tx.attendance.createMany({ data: [
    { assignmentId: x1.id, attendanceDate: new Date("2026-08-03T00:00:00Z"), status: "APPROVED", creditedMinutes: 480, workedMinutes: 480 },
    { assignmentId: x1.id, attendanceDate: new Date("2026-08-04T00:00:00Z"), status: "PENDING_REVIEW", creditedMinutes: 0, workedMinutes: 480 },
  ] });
  await tx.workLog.createMany({ data: [
    { assignmentId: x1.id, workDate: new Date("2026-08-03T00:00:00Z"), title: "Inventory", description: "Counted stock.", status: "SUBMITTED", skillsApplied: ["SQL", "sql", "Excel"] },
    { assignmentId: x1.id, workDate: new Date("2026-08-04T00:00:00Z"), title: "Unsent draft", description: "Draft only.", status: "DRAFT", skillsApplied: ["SecretDraftSkill"] },
  ] });
  await tx.task.createMany({ data: [
    { assignmentId: x1.id, assignedById: supervisor.userId, title: "Completed worksheet", status: "COMPLETED", completedAt: new Date("2026-08-05T00:00:00Z") },
    { assignmentId: x1.id, assignedById: supervisor.userId, title: "Unfinished task", status: "TODO" },
  ] });
  const narrative = { title: "My Main Office story", professionalSummary: "I supported the inventory team.", skills: ["Excel"], achievements: ["Helped a peer"], selectedWork: ["Worksheet"], reflection: "I learned a lot." };
  await tx.portfolio.create({ data: { assignmentId: x1.id, ...narrative, status: "DRAFT" } });

  await t.test("P163: completion saves an evidence snapshot to that assignment's Portfolio atomically", async () => {
    await completeAssignmentInTransaction(tx, { assignmentId: x1.id, companyId: mainOffice.id, fromStatus: "ACTIVE", now });
    const done = await tx.internshipAssignment.findUniqueOrThrow({ where: { id: x1.id }, select: { status: true, completedAt: true } });
    assert.equal(done.status, "COMPLETED"); assert.deepEqual(done.completedAt, now);
    const portfolio = await tx.portfolio.findUniqueOrThrow({ where: { assignmentId: x1.id } });
    assert.equal(portfolio.status, "GENERATED"); assert.equal(portfolio.approvedById, null); assert.equal(portfolio.approvedAt, null); assert.equal(portfolio.aiGenerated, false);
    for (const [key, value] of Object.entries(narrative)) assert.deepEqual(portfolio[key as keyof typeof portfolio], value, `${key} preserved`);
    const snapshot = parseCompletionSnapshot(portfolio.sourceSnapshot, x1.id);
    assert(snapshot, "a valid snapshot for this assignment");
    assert.equal(snapshot.evidence.creditedMinutes, 480, "only APPROVED Attendance credited");
    assert.deepEqual(snapshot.evidence.skills, ["SQL", "Excel"], "explicit, deduplicated, submitted Work Logs only");
    assert.deepEqual(snapshot.evidence.tasks.map((task) => task.title), ["Completed worksheet"]);
    assert(!JSON.stringify(snapshot).includes("SecretDraftSkill") && !JSON.stringify(snapshot).includes("Unfinished task"));
    assert.equal(portfolioEvidenceMode({ id: x1.id, status: "COMPLETED" }, portfolio.sourceSnapshot), "SNAPSHOT");
  });

  await t.test("retried completion is idempotent: one Portfolio, same snapshot, narrative intact", async () => {
    const first = await tx.portfolio.findUniqueOrThrow({ where: { assignmentId: x1.id }, select: { sourceSnapshot: true } });
    await persistCompletionPortfolio(tx, { assignmentId: x1.id, completedAt: now });
    await assert.rejects(completeAssignmentInTransaction(tx, { assignmentId: x1.id, companyId: mainOffice.id, fromStatus: "ACTIVE", now }), "a completed assignment cannot be completed again");
    assert.equal(await tx.portfolio.count({ where: { assignmentId: x1.id } }), 1);
    const again = await tx.portfolio.findUniqueOrThrow({ where: { assignmentId: x1.id } });
    assert.deepEqual(again.sourceSnapshot, first.sourceSnapshot); assert.equal(again.title, narrative.title); assert.equal(again.reflection, narrative.reflection);
  });

  await t.test("a later internship gets its own Portfolio; the earlier one is never overwritten", async () => {
    const x2 = await assignment(x.id, "ACTIVE", mainOffice.id, "Barista Intern");
    await completeAssignmentInTransaction(tx, { assignmentId: x2.id, companyId: mainOffice.id, fromStatus: "ACTIVE", now });
    const [p1, p2] = await Promise.all([tx.portfolio.findUniqueOrThrow({ where: { assignmentId: x1.id } }), tx.portfolio.findUniqueOrThrow({ where: { assignmentId: x2.id } })]);
    assert.notEqual(p1.id, p2.id); assert.equal(p2.title, "Barista Intern Portfolio"); assert.equal(p1.title, narrative.title);
    assert.equal(parseCompletionSnapshot(p2.sourceSnapshot, x2.id)!.evidence.creditedMinutes, 0);
    assert.equal(parseCompletionSnapshot(p1.sourceSnapshot, x1.id)!.evidence.creditedMinutes, 480);
    assert.equal(parseCompletionSnapshot(p2.sourceSnapshot, x1.id), null, "x2's snapshot cannot be shown as x1's");
  });

  await t.test("snapshot failure rolls back the COMPLETED transition", async () => {
    const x3 = await assignment(x.id, "ACTIVE");
    await tx.$executeRawUnsafe("SAVEPOINT portfolio_failure");
    await assert.rejects(completeAssignmentInTransaction(tx, { assignmentId: x3.id, companyId: mainOffice.id, fromStatus: "ACTIVE", now }, { persist: async () => { throw new Error("simulated failure"); } }), PortfolioSnapshotError);
    await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT portfolio_failure");
    assert.equal((await tx.internshipAssignment.findUniqueOrThrow({ where: { id: x3.id }, select: { status: true } })).status, "ACTIVE");
    assert.equal(await tx.portfolio.count({ where: { assignmentId: x3.id } }), 0);
  });

  await t.test("assignment candidates are re-authorized (own Intern, Main Office, active/completed only)", async () => {
    const legacy = await assignment(x.id, "COMPLETED");
    const foreignCompany = await assignment(x.id, "COMPLETED", otherCompany.id);
    const find = (profileId: string, id: unknown) => { const where = portfolioCandidateWhere(profileId, id); return where ? tx.internshipAssignment.findFirst({ where, select: { id: true } }) : Promise.resolve(null); };
    assert.equal((await find(x.id, x1.id))?.id, x1.id, "own completed internship");
    assert.equal(await find(y.id, x1.id), null, "another Intern cannot open it by changing the assignment ID");
    assert.equal(await find(x.id, foreignCompany.id), null, "outside the approved Main Office scope");
    assert.equal(await find(x.id, "not-a-uuid"), null);
    assert.equal(await find(x.id, randomUUID()), null);
    // Legacy completed internship (no snapshot) stays visible and is honestly labelled.
    assert.equal((await find(x.id, legacy.id))?.id, legacy.id);
    assert.equal(portfolioEvidenceMode({ id: legacy.id, status: "COMPLETED" }, null), "LEGACY_ON_DEMAND");
    assert.equal(await tx.portfolio.count({ where: { assignmentId: legacy.id } }), 0, "reading the archive never backfills a Portfolio");
  });
}
