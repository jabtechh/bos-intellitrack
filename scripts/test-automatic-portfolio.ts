import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildAutomaticPortfolio, type PortfolioEvidenceSource } from "../src/lib/portfolio/automatic.ts";

const read = (path: string) => readFileSync(path, "utf8");
const date = (iso: string) => new Date(iso + "T00:00:00.000Z");

const base: PortfolioEvidenceSource = {
  startDate: date("2026-05-01"),
  endDate: date("2026-06-30"),
  status: "COMPLETED",
  requiredHours: 200,
  attendance: [
    { status: "APPROVED", creditedMinutes: 480, attendanceDate: date("2026-05-04") },
    { status: "APPROVED", creditedMinutes: 120, attendanceDate: date("2026-05-04") },
    { status: "PENDING_REVIEW", creditedMinutes: 500, attendanceDate: date("2026-05-05") },
    { status: "REJECTED", creditedMinutes: 500, attendanceDate: date("2026-05-06") },
  ],
  workLogs: [
    { workDate: date("2026-05-04"), title: "Stock checklist", description: "Documented stock counts for Supervisor review.", skillsApplied: ["Documentation", "Communication", null] },
    { workDate: date("2026-05-05"), title: "Daily report", description: "Submitted a daily inventory update.", skillsApplied: ["documentation", "  Teamwork ", ""] },
  ],
  tasks: [{ title: "Prepare an inventory worksheet", description: "Completed a worksheet.", completedAt: date("2026-05-05") }],
  evaluations: [{ evaluationDate: date("2026-05-06"), evaluationType: "PROGRESS", overallScore: 82 }],
  feedback: [{}],
  documents: [{ fileName: "approved-worksheet.pdf", category: "TRAINING", createdAt: date("2026-05-07") }],
};

test("Automatic Portfolio compiles factual evidence without a saved narrative or AI", () => {
  const p = buildAutomaticPortfolio(base);
  assert.equal(p.creditedMinutes, 600);
  assert.equal(p.approvedAttendanceDays, 1);
  assert.equal(p.requiredMinutes, 12000);
  assert.equal(p.remainingMinutes, 11400);
  assert.equal(p.tasks.length, 1);
  assert.equal(p.tasks[0].description, "Completed a worksheet.");
  assert.equal(p.workLogs[0].description, "Documented stock counts for Supervisor review.");
  assert.equal(p.workLogs.length, 2);
  assert.equal(p.evaluations.length, 1);
  assert.equal(p.evaluations[0].score, 82);
  assert.equal(p.feedbackCount, 1);
  assert.equal(p.documents.length, 1);
  assert.equal(p.hasEvidence, true);
  assert.match(p.overview, /10 approved attendance hours/);
  assert.doesNotMatch(p.overview, /excellent|hardworking|proficient|top performer/i);
});

test("Only eligible approved Attendance is credited, not pending/rejected records", () => {
  const p = buildAutomaticPortfolio(base);
  assert.equal(p.creditedMinutes, 10 * 60);
  assert.equal(p.approvedAttendanceDays, 1);
});

test("Skill evidence requires explicitly recorded, nonblank Work Log skills", () => {
  const p = buildAutomaticPortfolio(base);
  assert.deepEqual(p.skills, ["Documentation", "Communication", "Teamwork"]);
});

test("No required hours or no evidence stays honest and safe", () => {
  const p = buildAutomaticPortfolio({
    ...base, requiredHours: null, attendance: [], workLogs: [], tasks: [], evaluations: [], feedback: [], documents: [],
  });
  assert.equal(p.creditedMinutes, 0);
  assert.equal(p.requiredMinutes, null);
  assert.equal(p.remainingMinutes, null);
  assert.equal(p.approvedAttendanceDays, 0);
  assert.equal(p.hasEvidence, false);
  assert.deepEqual(p.skills, []);
  assert.match(p.overview, /0 approved attendance hours/);
});

test("Verified evidence reflects source updates without writing/overwriting personal content", () => {
  const before = buildAutomaticPortfolio(base);
  const after = buildAutomaticPortfolio({
    ...base,
    tasks: [...base.tasks, { title: "Submit daily handover", description: "Submitted a handover.", completedAt: date("2026-05-06") }],
  });
  assert.equal(before.tasks.length, 1);
  assert.equal(after.tasks.length, 2);
  assert.equal(base.tasks.length, 1);
  assert.equal("professionalSummary" in after, false);
  assert.equal("reflection" in after, false);
});

test("Main Office assignment and canonical report are pinned to the same ID", () => {
  const source = read("src/lib/portfolio/source.ts");
  const report = read("src/lib/reports/data.ts");
  const aiActions = read("src/app/ai/actions.ts");
  assert(source.includes("portfolioAssignmentWhere(context)"));
  assert(source.includes('status: "ACTIVE"'));
  assert(source.includes('status: "COMPLETED"'));
  assert(source.includes("getInternReport(context, assignment.internProfile.userId, {}, assignment.id)"));
  assert(report.includes("assignmentId ? { AND: [reportForInternWhere(c, internUserId), { id: assignmentId }] }"));
  assert(aiActions.includes("getPortfolioSource(c)"));
  assert(aiActions.includes("generateGroundedPortfolioDraft"));
});

test("Portfolio and PDF render verified evidence even without a manually saved Portfolio", () => {
  const page = read("src/app/(authenticated)/portfolio/page.tsx");
  const pdf = read("src/app/(authenticated)/portfolio/pdf/route.ts");
  const review = read("src/app/(authenticated)/portfolio/[internId]/page.tsx");
  const action = read("src/app/portfolio/actions.ts");
  // DEC-2026-020: evidence is resolved once per selected assignment in source.ts (live, saved snapshot or legacy on-demand).
  const source = read("src/lib/portfolio/source.ts");
  const pdfLines = read("src/lib/portfolio/pdf.ts");
  assert(source.includes("buildAutomaticPortfolio(report)"));
  for (const file of [page, pdf, review]) assert(file.includes("getPortfolioSource"));
  assert(page.includes("<AutomaticPortfolioEvidence data={evidence} mode={mode}/>"));
  assert(review.includes("<AutomaticPortfolioEvidence data={evidence} mode={mode}/>"));
  assert(pdf.includes("evidence: source.evidence"));
  assert(!pdf.includes("if(!assignment?.portfolio)"));
  assert(pdfLines.includes("No Intern-authored narrative has been saved for this internship"));
  assert(pdfLines.includes("INTERNSHIP OVERVIEW"));
  assert(pdfLines.includes("SOURCE AND REVIEW NOTE"));
  assert(!pdf.includes("generateGroundedPortfolioDraft") && !pdfLines.includes("generateGroundedPortfolioDraft"));
  assert(action.includes("getPortfolioAssignment(c, "));
  assert(action.includes("prisma.portfolio.upsert"));
});

test("Personal narratives remain optional and AI remains review-before-save", () => {
  const edit = read("src/app/(authenticated)/portfolio/edit/page.tsx");
  const generator = read("src/components/portfolio-draft-generator.tsx");
  assert(edit.includes("Your verified internship evidence is compiled automatically"));
  assert(edit.includes("Nothing is saved until you explicitly submit this form."));
  assert(generator.includes("I reviewed the generated draft"));
  assert(generator.includes("Apply reviewed draft to editor"));
  assert(generator.includes('disabled={!enabled || pending}'));
});
