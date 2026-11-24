// DEC-2026-022 — rule-based Intern status (On track / Needs attention / At risk) and its wiring.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { computeInternStatus, STATUS_RULES, workingDaysBetween, type StatusInput } from "../src/lib/insights/intern-status.ts";

const NOW = new Date("2026-11-25T04:00:00Z"); // Wed 25 Nov 2026 (Manila)
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
/** Weekdays from start up to (not including) 2026-11-25. */
function weekdays(from: string, to = "2026-11-24") { const out: string[] = []; for (let t = d(from); t <= d(to); t = new Date(t.getTime() + 86_400_000)) { const w = t.getUTCDay(); if (w && w !== 6) out.push(t.toISOString().slice(0, 10)); } return out; }
function intern(overrides: Partial<StatusInput> = {}, days = weekdays("2026-11-02"), minutes = 480): StatusInput {
  return {
    status: "ACTIVE", startDate: d("2026-11-02"), endDate: d("2027-01-29"), requiredHours: 480,
    attendance: days.map((iso) => ({ attendanceDate: d(iso), clockIn: d(iso), status: "APPROVED", classification: "ON_TIME", creditedMinutes: minutes, reviewRequired: false })),
    workLogs: days.map((iso) => ({ workDate: d(iso), status: "SUBMITTED" })),
    tasks: [], evaluations: [], ...overrides,
  };
}

test("a fully attended, logged intern is On track", () => {
  const s = computeInternStatus(intern(), NOW);
  assert.equal(s.level, "On track"); assert.deepEqual(s.flags, []);
});

test("completed internships are reported as Completed, never judged", () => {
  assert.equal(computeInternStatus(intern({ status: "COMPLETED", attendance: [] }), NOW).level, "Completed");
});

test("behind on hours (>10% below pro-rata) is At risk on its own, with the hours shown", () => {
  const s = computeInternStatus(intern({}, weekdays("2026-11-02"), 240), NOW); // half days
  assert.equal(s.level, "At risk");
  assert.match(s.flags.find((f) => f.key === "BEHIND_HOURS")!.label, /^Behind by \d+ h$/);
  assert.equal(computeInternStatus(intern({}, weekdays("2026-11-02"), 450), NOW).flags.some((f) => f.key === "BEHIND_HOURS"), false, "about 6% below is within tolerance");
});

test("no hours judgement in the first working week", () => {
  const start = intern({ startDate: d("2026-11-20") }, [], 0); start.workLogs = [];
  assert.equal(computeInternStatus(start, NOW).flags.some((f) => f.key === "BEHIND_HOURS"), false);
});

test("late often: 3+ late Time Ins in the last 10 working days", () => {
  const base = intern();
  base.attendance.slice(-3).forEach((a) => (a.classification = "LATE"));
  const s = computeInternStatus(base, NOW);
  assert.deepEqual(s.flags.map((f) => f.key), ["LATE_OFTEN"]); assert.equal(s.level, "Needs attention");
  const two = intern(); two.attendance.slice(-2).forEach((a) => (a.classification = "LATE"));
  assert.equal(computeInternStatus(two, NOW).level, "On track");
});

test("missing attendance: 2+ of the last 5 working days", () => {
  const days = weekdays("2026-11-02").filter((x) => x !== "2026-11-24" && x !== "2026-11-20");
  const s = computeInternStatus(intern({ requiredHours: null }, days), NOW);
  assert.equal(s.flags.find((f) => f.key === "MISSING_ATTENDANCE")?.label, "No attendance 2 of last 5 days");
});

test("missing Work Logs, overdue Tasks and a low evaluation each flag; 2+ flags is At risk", () => {
  const base = intern();
  base.workLogs = base.workLogs.slice(0, -2);
  base.tasks = [{ dueAt: new Date("2026-11-20T09:00:00Z"), status: "IN_PROGRESS" }, { dueAt: new Date("2026-11-19T09:00:00Z"), status: "COMPLETED" }];
  base.evaluations = [{ evaluationDate: d("2026-11-13"), overallScore: "90", status: "ACKNOWLEDGED" }, { evaluationDate: d("2026-11-20"), overallScore: "72.5", status: "SUBMITTED" }, { evaluationDate: d("2026-11-21"), overallScore: "60", status: "DRAFT" }];
  const s = computeInternStatus(base, NOW);
  assert.deepEqual(s.flags.map((f) => f.label), ["2 Work Logs missing", "1 overdue Task", "Latest evaluation 73"]);
  assert.equal(s.level, "At risk");
});

test("reviews waiting more than 2 days are the Supervisor's work, not the Intern's flag", () => {
  const base = intern();
  base.attendance.find((a) => a.attendanceDate.toISOString().startsWith("2026-11-18"))!.status = "PENDING_REVIEW";
  const s = computeInternStatus(base, NOW);
  assert.deepEqual(s.staffFlags, ["1 review waiting"]);
  assert.equal(s.flags.some((f) => f.key === "BEHIND_HOURS"), false);
});

test("approved thresholds and working-day counting", () => {
  assert.deepEqual([STATUS_RULES.behindHoursRatio, STATUS_RULES.lateLimit, STATUS_RULES.missingLimit, STATUS_RULES.workLogLimit, STATUS_RULES.lowScore], [0.1, 3, 2, 2, 75]);
  assert.equal(workingDaysBetween(d("2026-11-23"), d("2026-11-29")), 5);
});

test("every surface uses the same scopes as the tables beside it", () => {
  const read = (p: string) => readFileSync(p, "utf8");
  assert.match(read("src/app/(authenticated)/interns/page.tsx"), /loadInternStatuses\(\{ supervisorProfile: \{ userId: user\.id \} \}\)/);
  assert.match(read("src/app/(authenticated)/students/page.tsx"), /loadInternStatuses\(\{ coordinatorProfile: \{ userId: user\.id \} \}\)/);
  assert.match(read("src/app/admin/page.tsx"), /loadInternStatuses\(\{ companyId \}\)/);
  assert.match(read("src/components/intern-dashboard-data.tsx"), /<MyStatusCard assignmentId=\{assignment\.id\} \/>/);
});
