// DEC-2026-020 / P163–P166 — completion-time Portfolio snapshot, archive scope and PDF unit tests.
// DB-free: uses an in-memory transaction double. The rollback-only database run lives in
// scripts/test-portfolio-integration.ts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { completeAssignmentInTransaction, AssignmentChangedError } from "../src/lib/assignments/completion.ts";
import { portfolioPdfLines } from "../src/lib/portfolio/pdf.ts";
import { portfolioCandidateWhere, portfolioEvidenceMode, portfolioScopeWhere } from "../src/lib/portfolio/scope.ts";
import {
  buildCompletionSnapshot, COMPLETION_SNAPSHOT_KIND, parseCompletionSnapshot, persistCompletionPortfolio, PortfolioSnapshotError, type SnapshotSource,
} from "../src/lib/portfolio/snapshot.ts";

const read = (path: string) => readFileSync(path, "utf8");
const d = (iso: string) => new Date(iso + "T00:00:00.000Z");
const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const COMPLETED_AT = new Date("2026-11-24T09:00:00.000Z");

function source(id: string, overrides: Partial<SnapshotSource> = {}): SnapshotSource {
  return {
    id, positionTitle: "Operations Intern", department: "Operations", completedAt: COMPLETED_AT, company: { name: "Bo's Coffee Main Office" },
    startDate: d("2026-08-01"), endDate: d("2026-10-31"), status: "COMPLETED", requiredHours: 300, requiredHoursConfirmedAt: null,
    internProfile: { userId: "u1", studentNumber: "S1", course: "BSIT", yearLevel: 4, user: { firstName: "Ana", lastName: "Reyes" }, school: { name: "Partner School" } },
    supervisorProfile: { user: { firstName: "Sam", lastName: "Cruz" } },
    portfolio: null,
    attendance: [
      { attendanceDate: d("2026-08-03"), clockIn: new Date("2026-08-03T00:00:00Z"), clockOut: new Date("2026-08-03T08:00:00Z"), creditedMinutes: 480, status: "APPROVED", classification: "REGULAR", reviewRequired: false },
      { attendanceDate: d("2026-08-04"), clockIn: null, clockOut: null, creditedMinutes: 480, status: "PENDING_REVIEW", classification: "REGULAR", reviewRequired: true },
      { attendanceDate: d("2026-08-05"), clockIn: null, clockOut: null, creditedMinutes: 300, status: "REJECTED", classification: "REGULAR", reviewRequired: true },
    ],
    workLogs: [
      { workDate: d("2026-08-03"), title: "Inventory count", description: "Counted stock.", skillsApplied: ["Inventory", "Communication", 7] },
      { workDate: d("2026-08-04"), title: "Daily report", description: "Wrote the report.", skillsApplied: [" inventory ", "Teamwork", ""] },
    ],
    tasks: [{ title: "Prepare worksheet", description: "Done.", completedAt: d("2026-08-06") }],
    evaluations: [{ id: "e1", evaluationType: "FINAL", periodKey: "FINAL", periodStart: null, periodEnd: null, evaluationDate: d("2026-10-30"), overallScore: 88, strengths: "Private strengths text", areasForImprovement: "x", comments: "Private comments" }],
    feedback: [{ title: "Private feedback title", content: "Private feedback body", feedbackType: "GENERAL", createdAt: d("2026-09-01"), author: { role: "SUPERVISOR" } }],
    documents: [{ fileName: "certificate.pdf", category: "CERTIFICATE", description: "Private document description", createdAt: d("2026-10-20") }],
    ...overrides,
  } as unknown as SnapshotSource;
}

// ---- in-memory transaction double -------------------------------------------------------------------
type Row = { id: string; assignmentId: string; title: string; professionalSummary: string | null; skills: unknown; achievements: unknown; selectedWork: unknown; reflection: string | null; sourceSnapshot: unknown; status: string; aiGenerated: boolean; approvedById: string | null; approvedAt: Date | null };
function fakeDb(sources: Record<string, SnapshotSource>, assignmentStatus: Record<string, string> = {}) {
  const portfolios = new Map<string, Row>(); let next = 1; const calls: string[] = [];
  const db = {
    internshipAssignment: {
      async findUnique({ where }: { where: { id: string } }) { const s = sources[where.id]; return s ? { ...s, status: assignmentStatus[where.id] ?? s.status } : null; },
      async updateMany({ where, data }: { where: { id: string; status: string }; data: { status: string } }) {
        calls.push("updateMany");
        const current = assignmentStatus[where.id] ?? sources[where.id]?.status;
        if (!sources[where.id] || current !== where.status) return { count: 0 };
        assignmentStatus[where.id] = data.status; return { count: 1 };
      },
    },
    portfolio: {
      async findUnique({ where }: { where: { assignmentId: string } }) { return portfolios.get(where.assignmentId) ?? null; },
      async upsert({ where, create, update }: { where: { assignmentId: string }; create: Partial<Row>; update: Partial<Row> }) {
        calls.push("upsert");
        const existing = portfolios.get(where.assignmentId);
        const row = existing ? { ...existing, ...update } as Row : { id: `p${next++}`, professionalSummary: null, skills: [], achievements: [], selectedWork: [], reflection: null, approvedById: null, approvedAt: null, aiGenerated: false, ...create } as Row;
        portfolios.set(where.assignmentId, row); return { id: row.id, status: row.status };
      },
    },
  };
  return { db: db as never, portfolios, assignmentStatus, calls };
}

// ---- 1–4: evidence eligibility ---------------------------------------------------------------------
test("1/2. only eligible evidence enters the snapshot and only APPROVED Attendance is credited", () => {
  const snapshot = buildCompletionSnapshot(source(A), COMPLETED_AT);
  assert.equal(snapshot.evidence.creditedMinutes, 480, "pending and rejected Attendance contribute nothing");
  assert.equal(snapshot.evidence.approvedAttendanceDays, 1);
  assert.equal(snapshot.evidence.tasks.length, 1); assert.equal(snapshot.evidence.workLogs.length, 2); assert.equal(snapshot.evidence.evaluations.length, 1);
  assert.equal(snapshot.evidence.feedbackCount, 1);
  const json = JSON.stringify(snapshot);
  for (const leaked of ["Private feedback body", "Private feedback title", "Private strengths text", "Private comments", "Private document description", "clockIn", "selfie", "Selfie", "identity", "latitude"]) {
    assert(!json.includes(leaked), `snapshot must not contain ${leaked}`);
  }
  assert.equal(snapshot.kind, COMPLETION_SNAPSHOT_KIND); assert.equal(snapshot.assignmentId, A);
  assert.deepEqual(buildCompletionSnapshot(source(A), COMPLETED_AT), snapshot, "deterministic for the same records");
});

test("3/4. explicit Work Log skills are deduplicated; no proficiency or achievements are inferred", () => {
  const snapshot = buildCompletionSnapshot(source(A), COMPLETED_AT);
  assert.deepEqual(snapshot.evidence.skills, ["Inventory", "Communication", "Teamwork"]);
  const json = JSON.stringify(snapshot).toLowerCase();
  for (const invented of ["proficien", "expert", "advanced", "achievement", "rating\":"]) assert(!json.includes(invented), invented);
  const none = buildCompletionSnapshot(source(A, { workLogs: [] }), COMPLETED_AT);
  assert.deepEqual(none.evidence.skills, [], "no Work Logs, no skills");
});

// ---- 5–10: completion persistence -------------------------------------------------------------------
test("5/9. completion creates one GENERATED Portfolio for the correct assignment, never FINALIZED/approved", async () => {
  const { db, portfolios } = fakeDb({ [A]: source(A), [B]: source(B) });
  const result = await persistCompletionPortfolio(db, { assignmentId: A, completedAt: COMPLETED_AT });
  assert.equal(portfolios.size, 1); const row = portfolios.get(A)!;
  assert.equal(row.status, "GENERATED"); assert.equal(row.approvedById, null); assert.equal(row.approvedAt, null); assert.equal(row.aiGenerated, false);
  assert.equal(row.title, "Operations Intern Portfolio");
  assert.equal(parseCompletionSnapshot(row.sourceSnapshot, A)?.assignmentId, A); assert.equal(result.snapshot.assignmentId, A);
  assert.equal(portfolios.has(B), false, "no other assignment touched");
});

test("6/7. repeated completion is idempotent and preserves the Intern-authored narrative", async () => {
  const { db, portfolios } = fakeDb({ [A]: source(A) });
  await persistCompletionPortfolio(db, { assignmentId: A, completedAt: COMPLETED_AT });
  const narrative = { title: "My Bo's Coffee story", professionalSummary: "I supported inventory.", skills: ["Excel"], achievements: ["Mentored a peer"], selectedWork: ["Worksheet"], reflection: "Grew a lot." };
  portfolios.set(A, { ...portfolios.get(A)!, ...narrative });
  const first = JSON.stringify(portfolios.get(A)!.sourceSnapshot);
  await persistCompletionPortfolio(db, { assignmentId: A, completedAt: COMPLETED_AT });
  await persistCompletionPortfolio(db, { assignmentId: A, completedAt: COMPLETED_AT });
  assert.equal(portfolios.size, 1, "one Portfolio per assignment");
  const row = portfolios.get(A)!;
  for (const [key, value] of Object.entries(narrative)) assert.deepEqual(row[key as keyof Row], value, `${key} preserved`);
  assert.equal(JSON.stringify(row.sourceSnapshot), first, "same records, same snapshot");
  assert.equal(row.status, "GENERATED");
});

test("a human-finalized Portfolio keeps its status; system generation never downgrades or claims approval", async () => {
  const { db, portfolios } = fakeDb({ [A]: source(A) });
  await persistCompletionPortfolio(db, { assignmentId: A, completedAt: COMPLETED_AT });
  portfolios.set(A, { ...portfolios.get(A)!, status: "FINALIZED" });
  await persistCompletionPortfolio(db, { assignmentId: A, completedAt: COMPLETED_AT });
  assert.equal(portfolios.get(A)!.status, "FINALIZED");
});

test("snapshots are only created for completed assignments", async () => {
  const { db } = fakeDb({ [A]: source(A, { status: "ACTIVE" }) });
  await assert.rejects(persistCompletionPortfolio(db, { assignmentId: A, completedAt: COMPLETED_AT }), PortfolioSnapshotError);
});

test("10. a snapshot failure rejects the completion step so the surrounding transaction rolls back", async () => {
  const { db, calls } = fakeDb({ [A]: source(A, { status: "ACTIVE" }) });
  await assert.rejects(
    completeAssignmentInTransaction(db, { assignmentId: A, companyId: "c", fromStatus: "ACTIVE", now: COMPLETED_AT }, { persist: async () => { throw new Error("storage down"); } }),
    PortfolioSnapshotError,
  );
  assert.deepEqual(calls, ["updateMany"], "the status change ran inside the same unit of work that is now failing");
  const actions = read("src/app/admin/assignments/actions.ts");
  const transaction = actions.split("await prisma.$transaction(async (tx) => {")[1].split("}, { timeout: 20_000 });")[0];
  assert(transaction.includes("await completeAssignmentInTransaction(tx, "), "completion + snapshot run in the same prisma.$transaction");
  assert(actions.includes("The internship Portfolio could not be saved, so the assignment was not completed."));
});

test("a concurrent status change stops completion before any Portfolio write", async () => {
  const { db, calls } = fakeDb({ [A]: source(A, { status: "ACTIVE" }) }, { [A]: "TERMINATED" });
  await assert.rejects(completeAssignmentInTransaction(db, { assignmentId: A, companyId: "c", fromStatus: "ACTIVE", now: COMPLETED_AT }), AssignmentChangedError);
  assert.deepEqual(calls, ["updateMany"]);
});

test("8. completion-time generation never invokes Gemini or other AI", () => {
  for (const file of ["src/lib/portfolio/snapshot.ts", "src/lib/assignments/completion.ts", "src/lib/portfolio/automatic.ts", "src/app/admin/assignments/actions.ts"]) {
    const text = read(file);
    assert(!/@\/lib\/ai|gemini|generateGrounded|GoogleGenAI/i.test(text.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")), `${file} must not reach AI`);
  }
});

// ---- 11–13: archive isolation, legacy, PDF ----------------------------------------------------------
test("11. two completed assignments keep separate Portfolio records and snapshots", async () => {
  const { db, portfolios } = fakeDb({ [A]: source(A), [B]: source(B, { positionTitle: "Barista Intern", tasks: [] }) });
  await persistCompletionPortfolio(db, { assignmentId: A, completedAt: COMPLETED_AT });
  await persistCompletionPortfolio(db, { assignmentId: B, completedAt: COMPLETED_AT });
  assert.equal(portfolios.size, 2); assert.notEqual(portfolios.get(A)!.id, portfolios.get(B)!.id);
  assert.equal(parseCompletionSnapshot(portfolios.get(B)!.sourceSnapshot, B)!.evidence.tasks.length, 0);
  assert.equal(parseCompletionSnapshot(portfolios.get(A)!.sourceSnapshot, A)!.evidence.tasks.length, 1);
});

test("a snapshot can never be presented for a different assignment (no evidence/narrative mixing)", () => {
  const snapshot = buildCompletionSnapshot(source(A), COMPLETED_AT);
  assert.equal(parseCompletionSnapshot(snapshot, B), null);
  assert.equal(parseCompletionSnapshot({ ...snapshot, kind: "OTHER" }, A), null);
  assert.equal(parseCompletionSnapshot("garbage", A), null);
  assert.equal(portfolioEvidenceMode({ id: B, status: "COMPLETED" }, snapshot), "LEGACY_ON_DEMAND", "B never borrows A's snapshot");
});

test("12. evidence mode: active is live, completed uses its snapshot, legacy completed stays readable on demand", () => {
  assert.equal(portfolioEvidenceMode({ id: A, status: "ACTIVE" }, null), "LIVE");
  assert.equal(portfolioEvidenceMode({ id: A, status: "COMPLETED" }, buildCompletionSnapshot(source(A), COMPLETED_AT)), "SNAPSHOT");
  assert.equal(portfolioEvidenceMode({ id: A, status: "COMPLETED" }, null), "LEGACY_ON_DEMAND");
});

test("candidate assignment IDs are re-authorized against the Intern's own Main Office internships", () => {
  assert.equal(portfolioCandidateWhere("profile-1", "not-a-uuid"), null);
  assert.equal(portfolioCandidateWhere("profile-1", 42), null);
  assert.deepEqual(portfolioCandidateWhere("profile-1", A), { AND: [portfolioScopeWhere("profile-1"), { status: { in: ["ACTIVE", "COMPLETED"] } }, { id: A }] });
  assert.deepEqual(portfolioScopeWhere("profile-1"), { internProfileId: "profile-1", company: { companyCode: "BO_MAIN_OFFICE", isActive: true } });
});

test("13. the PDF uses only the selected assignment's evidence and narrative", () => {
  const a = buildCompletionSnapshot(source(A, { tasks: [{ title: "Alpha task", description: null, completedAt: d("2026-08-06") }] }), COMPLETED_AT);
  const b = buildCompletionSnapshot(source(B, { tasks: [{ title: "Bravo task", description: null, completedAt: d("2026-08-06") }] }), COMPLETED_AT);
  const lines = portfolioPdfLines({ internName: "Ana Reyes", schoolName: "Partner School", companyName: "Bo's Coffee Main Office", positionTitle: "Operations Intern", mode: "SNAPSHOT", snapshotCompletedAt: a.completedAt, evidence: a.evidence, portfolio: { title: "Alpha Portfolio", professionalSummary: "Alpha summary", skills: [], achievements: [], selectedWork: [], reflection: null }, defaultTitle: "x", generatedAt: COMPLETED_AT }).join("\n");
  assert(lines.includes("Alpha task") && lines.includes("Alpha summary") && lines.includes("Alpha Portfolio"));
  assert(!lines.includes("Bravo task"), "no evidence from another internship"); void b;
  assert(lines.includes("Saved completion snapshot"));
  for (const heading of ["INTERNSHIP OVERVIEW", "Credited Attendance hours: 8 h", "SKILLS EXPLICITLY RECORDED IN WORK LOGS", "COMPLETED TASKS", "WORK LOG HIGHLIGHTS", "FINALIZED EVALUATION SUMMARY", "INTERN-AUTHORED PERSONAL SECTIONS"]) assert(lines.includes(heading), heading);
  const legacy = portfolioPdfLines({ internName: "Ana", schoolName: null, companyName: "Main", positionTitle: null, mode: "LEGACY_ON_DEMAND", snapshotCompletedAt: null, evidence: a.evidence, portfolio: null, defaultTitle: "Internship Portfolio", generatedAt: COMPLETED_AT }).join("\n");
  assert(legacy.includes("no completion snapshot was saved")); assert(!legacy.includes("Saved completion snapshot"));
  assert(legacy.includes("No Intern-authored narrative has been saved for this internship"));
});

test("Portfolio routes re-authorize assignment candidates and never trust hidden fields", () => {
  const sourceFile = read("src/lib/portfolio/source.ts");
  assert(sourceFile.includes("portfolioCandidateWhere(context.profileId, candidateId)"));
  assert(read("src/app/(authenticated)/portfolio/page.tsx").includes("if (candidate && !source) notFound();"));
  assert(read("src/app/(authenticated)/portfolio/pdf/route.ts").includes('getPortfolioSource(context, candidate)'));
  assert(read("src/app/portfolio/actions.ts").includes("getPortfolioAssignment(c, typeof candidate === \"string\" && candidate ? candidate : null)"));
  assert(!read("src/app/portfolio/actions.ts").includes("sourceSnapshot:"), "saving narrative never writes the snapshot");
});
