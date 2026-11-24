import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveEvaluationPeriod } from "../src/lib/evaluations/period-for-save.ts";
import { evaluationPeriodLabel } from "../src/lib/evaluations/weekly-period.ts";
import { selectRepresentativeEvaluations } from "../src/lib/ai/evaluation-selection.ts";

const read = (path: string) => readFileSync(path, "utf8");
const d = (iso: string) => new Date(iso + "T00:00:00.000Z");
const assignment = {
  startDate: d("2026-09-28"),
  endDate: d("2026-12-13"),
  companyTimezone: "Asia/Manila",
};
const common = {
  evaluationType: "PROGRESS" as const,
  weekDate: "2026-10-15",
  assignment,
  now: new Date("2026-11-04T09:00:00+08:00"),
};

test("server derives a weekly Monday/Sunday and identity, never trusts client periods", () => {
  const row = resolveEvaluationPeriod({
    ...common, periodStart: "2026-01-01", periodEnd: "2029-12-31",
  });
  assert(row.ok);
  if (!row.ok) return;
  assert.equal(row.periodKey, "2026-10-12");
  assert.equal(row.periodStart?.toISOString().slice(0, 10), "2026-10-12");
  assert.equal(row.periodEnd?.toISOString().slice(0, 10), "2026-10-18");
});

test("past week allowed; current week allowed", () => {
  for (const weekDate of ["2026-09-29", "2026-11-04"]) {
    assert.equal(resolveEvaluationPeriod({ ...common, weekDate }).ok, true);
  }
});

test("future week blocked even when within assignment", () => {
  const result = resolveEvaluationPeriod({ ...common, weekDate: "2026-11-09" });
  assert(!result.ok);
  if (!result.ok) assert.match(result.message, /future/i);
});

test("partial first and last assignment weeks blocked", () => {
  const partial = {
    ...common,
    assignment: { ...assignment, startDate: d("2026-10-01"), endDate: d("2026-11-12") },
  };
  const a = resolveEvaluationPeriod({ ...partial, weekDate: "2026-10-02" });
  const b = resolveEvaluationPeriod({ ...partial, weekDate: "2026-11-09", now: new Date("2026-11-12T10:00:00+08:00") });
  assert(!a.ok);
  assert(!b.ok);
  if (!a.ok) assert.match(a.message, /starts before/i);
  if (!b.ok) assert.match(b.message, /extends past/i);
});

test("assignment-local midnight boundary is used, not UTC day", () => {
  const before = resolveEvaluationPeriod({
    ...common, weekDate: "2026-11-02", now: new Date("2026-11-01T15:30:00Z"),
  });
  const after = resolveEvaluationPeriod({
    ...common, weekDate: "2026-11-02", now: new Date("2026-11-01T17:30:00Z"),
  });
  assert(!before.ok);
  assert(after.ok);
});

test("branch timezone takes precedence when supplied", () => {
  const result = resolveEvaluationPeriod({
    ...common, weekDate: "2026-11-02",
    assignment: { ...assignment, branchTimezone: "Pacific/Honolulu" },
    now: new Date("2026-11-02T08:00:00Z"),
  });
  assert(!result.ok);
});

test("invalid company timezone fails closed", () => {
  const result = resolveEvaluationPeriod({
    ...common, assignment: { ...assignment, companyTimezone: "Invalid/Timezone" },
  });
  assert(!result.ok);
});

test("one-off types always use SINGLE and preserve optional stored dates", () => {
  for (const evaluationType of ["INITIAL", "MIDTERM", "FINAL"] as const) {
    const row = resolveEvaluationPeriod({
      ...common, evaluationType, periodStart: "2026-10-01", periodEnd: "2026-10-31",
    });
    assert(row.ok);
    if (!row.ok) continue;
    assert.equal(row.periodKey, "SINGLE");
    assert.equal(row.periodStart?.toISOString().slice(0, 10), "2026-10-01");
    assert.equal(row.periodEnd?.toISOString().slice(0, 10), "2026-10-31");
  }
});

test("legacy month-style period retains stored display and labels canonical week", () => {
  const label = evaluationPeriodLabel({
    evaluationType: "PROGRESS", periodKey: "2026-09-28",
    periodStart: d("2026-10-01"), periodEnd: d("2026-10-31"),
  });
  assert.match(label.label, /Oct 1/);
  assert.match(label.label, /Oct 31/);
  assert.match(label.note ?? "", /Sep 28/);
  assert.match(label.note ?? "", /legacy period preserved/);
});

test("new weekly period displays canonical Monday–Sunday without legacy note", () => {
  const label = evaluationPeriodLabel({
    evaluationType: "PROGRESS", periodKey: "2026-10-12",
    periodStart: d("2026-10-12"), periodEnd: d("2026-10-18"),
  });
  assert.match(label.label, /Week: Oct 12/);
  assert.equal(label.note, null);
});

test("AI includes Initial, Midterm and Final even with many weekly records", () => {
  const rows = Array.from({ length: 22 }, (_, index) => ({
    evaluationType: "PROGRESS", periodKey: `week-${index}`,
    evaluationDate: new Date(Date.UTC(2026, 0, 1 + 7 * index)),
  }));
  for (const evaluationType of ["INITIAL", "MIDTERM", "FINAL"]) {
    rows.push({ evaluationType, periodKey: "SINGLE", evaluationDate: d("2026-01-02") });
  }
  const selected = selectRepresentativeEvaluations(rows, 10);
  assert.equal(selected.length, 10);
  for (const type of ["INITIAL", "MIDTERM", "FINAL"]) {
    assert(selected.some(row => row.evaluationType === type), type);
  }
  assert.equal(selected.filter(row => row.evaluationType === "PROGRESS").length, 7);
  assert(selected.some(row => row.periodKey === "week-21"));
  assert(!selected.some(row => row.periodKey === "week-0"));
});

test("AI selection is chronological and never mutates report array", () => {
  const rows = [
    { evaluationType: "PROGRESS", periodKey: "2026-10-12", evaluationDate: d("2026-10-19") },
    { evaluationType: "INITIAL", periodKey: "SINGLE", evaluationDate: d("2026-10-04") },
    { evaluationType: "PROGRESS", periodKey: "2026-10-19", evaluationDate: d("2026-10-25") },
  ];
  const original = [...rows];
  const selected = selectRepresentativeEvaluations(rows, 2);
  assert.deepEqual(rows, original);
  assert.equal(selected[0].evaluationType, "INITIAL");
  assert.equal(selected[1].periodKey, "2026-10-19");
});

test("create/update both derive server-owned periodKey, scope to direct active Supervisor, and catch duplicates", () => {
  const actions = read("src/app/evaluations/actions.ts");
  assert.equal((actions.match(/resolveEvaluationPeriod\(/g) ?? []).length, 2);
  assert.match(actions, /periodKey: period\.periodKey/g);
  assert.match(actions, /status: "ACTIVE"/);
  assert.match(actions, /supervisorProfileId: c\.profileId/);
  assert.match(actions, /isUniqueConflict\(error\)/g);
  assert.match(actions, /duplicateMessage\(parsed\.data\.evaluationType\)/g);
});

test("reports and Insights use stable repeated-week identities, do not limit finalized rows", () => {
  const report = read("src/lib/reports/data.ts") + read("src/lib/reports/select.ts"); // canonical select lives in select.ts
  const ui = read("src/components/intern-report.tsx");
  const insight = read("src/lib/insights/data.ts");
  const ai = read("src/lib/ai/evidence.ts");
  assert(report.includes("id: true, evaluationType: true, periodKey: true"));
  assert(!report.includes("evaluations: { where: { status: { in: [\"SUBMITTED\", \"ACKNOWLEDGED\"] }, evaluationDate: date }, take:"));
  assert(ui.includes("key:x.id"));
  assert(!ui.includes("key:`${x.evaluationType}-${x.evaluationDate.toISOString()}`"));
  assert(insight.includes("periodKey: true"));
  assert(ai.includes("selectRepresentativeEvaluations(r.evaluations,10)"));
});

test("one-off and weekly modes are explicit and safely explained in the Intern form", () => {
  const form = read("src/components/evaluation-form.tsx");
  assert(form.includes('name="weekDate"'));
  assert(form.includes('type === "PROGRESS"'));
  assert(form.includes("Past and current weeks"));
  assert(form.includes("one-time evaluations"));
  assert(!form.includes('name="periodKey"'));
});
