// REQ-FR-ATT-9 / REQ-FR-REP-4 — staff analytics: pure aggregation and scope wiring.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildReportAnalytics, progressBucket, punctualityOf, type AnalyticsAssignment } from "../src/lib/reports/analytics-shared.ts";

const NOW = new Date("2026-11-25T04:00:00Z"); // Wed 25 Nov 2026, 12:00 Manila
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const at = (iso: string, h: number) => new Date(`${iso}T${String(h).padStart(2, "0")}:00:00.000Z`);
const day = (iso: string, extra: Partial<AnalyticsAssignment["attendance"][number]> = {}) => ({ attendanceDate: d(iso), creditedMinutes: 480, status: "APPROVED", classification: "ON_TIME", reviewRequired: false, clockIn: at(iso, 0), clockOut: at(iso, 9), ...extra });

const intern: AnalyticsAssignment = {
  status: "ACTIVE", requiredHours: 20,
  attendance: [day("2026-11-23"), day("2026-11-24", { classification: "LATE" }), day("2026-11-17", { status: "PENDING_REVIEW", reviewRequired: true, creditedMinutes: 0 }), day("2026-11-18", { classification: "EARLY_DEPARTURE" }), day("2026-11-25", { clockOut: null, status: "CLOCKED_IN", creditedMinutes: 0 })],
  workLogs: [{ workDate: d("2026-11-23"), status: "SUBMITTED" }, { workDate: d("2026-11-24"), status: "DRAFT" }, { workDate: d("2026-11-17"), status: "APPROVED" }],
  evaluations: [{ evaluationDate: d("2026-11-20"), overallScore: "88.50", status: "ACKNOWLEDGED" }, { evaluationDate: d("2026-11-21"), overallScore: "70", status: "DRAFT" }],
};
const done: AnalyticsAssignment = { status: "COMPLETED", requiredHours: 8, attendance: [day("2026-10-01")], workLogs: [{ workDate: d("2026-10-01"), status: "SUBMITTED" }], evaluations: [] };
const noRequired: AnalyticsAssignment = { status: "ACTIVE", requiredHours: null, attendance: [], workLogs: [], evaluations: [] };

test("weekly buckets end with the current Manila week and count only approved credited minutes", () => {
  const a = buildReportAnalytics([intern, done, noRequired], NOW);
  assert.equal(a.weeks.length, 12);
  assert.equal(a.weeks.at(-1)!.start, "2026-11-23");
  assert.equal(a.weeks.at(-1)!.creditedHours, 16, "two approved 8 h days this week; the open day adds nothing");
  assert.equal(a.weeks.at(-2)!.creditedHours, 8, "pending-review day is not credited");
});

test("punctuality per week uses classification, review status overrides, open days are skipped", () => {
  const a = buildReportAnalytics([intern], NOW);
  assert.deepEqual(a.weeks.at(-1)!.punctuality, { "On time": 1, Late: 1, "Early departure": 0, "Needs review": 0 });
  assert.deepEqual(a.weeks.at(-2)!.punctuality, { "On time": 0, Late: 0, "Early departure": 1, "Needs review": 1 });
  assert.equal(punctualityOf(day("2026-11-25", { classification: "LATE_AND_EARLY_DEPARTURE" })), "Late");
  assert.equal(punctualityOf(day("2026-11-25", { status: "VOIDED" })), null);
});

test("progress buckets, required-hours exclusions, Work Log compliance and evaluation averages", () => {
  const a = buildReportAnalytics([intern, done, noRequired], NOW);
  assert.deepEqual(a.progress.map((p) => p.interns), [0, 0, 0, 0, 2], "24 h of 20 h and 8 h of 8 h are both done");
  assert.equal(a.progressExcluded, 1);
  assert.equal(progressBucket(600, 20), "50–74%");
  assert.deepEqual(a.workLogs, { attendedDays: 6, withWorkLog: 3, rate: 50 }, "draft Work Logs do not count");
  assert.equal(a.weeks.at(-2)!.averageScore, 88.5, "only finalized evaluations are averaged");
  assert.equal(a.weeks.at(-2)!.evaluations, 1);
  assert.equal(a.internCount, 3);
});

test("Reports page builds analytics from each role's existing report scope", () => {
  const page = readFileSync("src/app/(authenticated)/reports/page.tsx", "utf8");
  assert.match(page, /loadReportAnalytics\(\{companyId:c\.companyId\}\)/, "Representative: own company only");
  assert.match(page, /loadReportAnalytics\(reportAssignmentWhere\(c\)\)/, "Supervisor / Coordinator: existing report scope");
  const loader = readFileSync("src/lib/reports/analytics.ts", "utf8");
  assert.match(loader, /where: \{ AND: \[scope, \{ status: \{ in: \["ACTIVE", "COMPLETED"\] \} \}\] \}/);
  assert.doesNotMatch(readFileSync("src/components/report-analytics.tsx", "utf8"), /@\/lib\/prisma|reports\/analytics"/, "client charts never import the database layer");
});
