import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canonicalTimezone,
  canonicalWeekForInstant,
  canonicalWeekForLocalDate,
  evaluationIdentity,
  isCanonicalMonday,
  localDateValue,
  mondayOfLocalDate,
  periodKeyForType,
  SINGLE_PERIOD_KEY,
  sundayOfMonday,
  validateProgressWeekSelection,
} from "../src/lib/evaluations/weekly-period.ts";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20261104120000_support_weekly_evaluations/migration.sql", "utf8");
const migrationSqlOnly = migration
  .split(/\r?\n/)
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

test("schema declares the required period key and composite identity", () => {
  assert.match(schema, /periodKey\s+String\s+@map\("period_key"\)\s+@db\.VarChar\(20\)/);
  assert.match(schema, /@@unique\(\[assignmentId, evaluationType, periodKey\], map: "evaluations_assignment_type_period_key_key"\)/);
  assert.ok(!schema.includes('@@unique([assignmentId, evaluationType], map: "evaluations_assignment_type_key")'));
});

test("schema preserves the four evaluation types and supporting indexes", () => {
  assert.match(schema, /enum EvaluationType \{[\s\S]*INITIAL[\s\S]*MIDTERM[\s\S]*PROGRESS[\s\S]*FINAL[\s\S]*\}/);
  for (const index of [
    "evaluations_assignment_idx",
    "evaluations_evaluator_idx",
    "evaluations_type_idx",
    "evaluations_status_idx",
    "evaluations_date_idx",
    "evaluations_assignment_status_idx",
  ]) {
    assert.ok(schema.includes(index), `missing ${index}`);
  }
});

test("migration follows the reviewed safe sequence", () => {
  const markers = [
    'ADD COLUMN "period_key" VARCHAR(20)',
    'UPDATE "evaluations"',
    "RAISE EXCEPTION",
    'ALTER COLUMN "period_key" SET NOT NULL',
    'ADD CONSTRAINT "evaluations_period_key_matches_type"',
    'DROP INDEX "evaluations_assignment_type_key"',
    'CREATE UNIQUE INDEX "evaluations_assignment_type_period_key_key"',
  ];
  const positions = markers.map((marker) => migration.indexOf(marker));
  positions.forEach((position, index) => assert.ok(position >= 0, `missing migration step: ${markers[index]}`));
  for (let index = 1; index < positions.length; index += 1) {
    assert.ok(positions[index] > positions[index - 1], `migration step out of order: ${markers[index]}`);
  }
});

test("migration backfills deterministically and fails closed on collisions", () => {
  assert.ok(migration.includes(`date_trunc('week', COALESCE("period_start", "evaluation_date"))::date`));
  assert.match(migration, /WHEN "evaluation_type" = 'PROGRESS'[\s\S]*to_char\(/);
  assert.match(migration, /HAVING count\(\*\) > 1/);
  assert.match(migration, /IF duplicate_groups > 0 THEN/);
  assert.match(migration, /RAISE EXCEPTION/);
  assert.ok(!/DELETE|TRUNCATE|MERGE/i.test(migrationSqlOnly));
});

test("migration enforces SINGLE and canonical Monday keys at the database", () => {
  assert.match(migration, /"period_key" = 'SINGLE'/);
  assert.match(migration, /extract\(isodow FROM "period_key"::date\) = 1/);
  assert.match(migration, /\^\[0-9\]\{4\}-\[0-9\]\{2\}-\[0-9\]\{2\}\$/);
});

test("migration contains no unrelated or non-transactional statements", () => {
  assert.ok(!/DROP TABLE|ALTER TYPE|task_status|notification|branch_id|CREATE TABLE/i.test(migrationSqlOnly));
  assert.ok(!/CONCURRENTLY/i.test(migrationSqlOnly));
  assert.equal((migrationSqlOnly.match(/DROP INDEX/g) ?? []).length, 1);
  assert.ok(migrationSqlOnly.includes('DROP INDEX "evaluations_assignment_type_key"'));
});

test("SINGLE key rules", () => {
  assert.equal(periodKeyForType("INITIAL", "2026-10-01"), SINGLE_PERIOD_KEY);
  assert.equal(periodKeyForType("MIDTERM", "2026-10-01"), SINGLE_PERIOD_KEY);
  assert.equal(periodKeyForType("FINAL", "2026-10-01"), SINGLE_PERIOD_KEY);
  assert.equal(periodKeyForType("PROGRESS", "2026-10-01"), "2026-09-28");
  assert.equal(SINGLE_PERIOD_KEY, "SINGLE");
});

test("canonical Monday calculation covers weekdays and boundaries", () => {
  assert.equal(mondayOfLocalDate("2026-10-01"), "2026-09-28");
  assert.equal(mondayOfLocalDate("2026-10-04"), "2026-09-28");
  assert.equal(mondayOfLocalDate("2026-10-05"), "2026-10-05");
  assert.equal(mondayOfLocalDate("2026-12-28"), "2026-12-28");
  assert.equal(mondayOfLocalDate("2027-01-01"), "2026-12-28");
  assert.equal(mondayOfLocalDate("2028-02-29"), "2028-02-28");
  assert.equal(sundayOfMonday("2026-09-28"), "2026-10-04");
  assert.ok(isCanonicalMonday("2026-09-28"));
  assert.ok(!isCanonicalMonday("2026-10-01"));
});

test("timezone boundary behavior uses the local calendar day", () => {
  // 23:59 Sunday in Asia/Manila is still the previous canonical week.
  assert.deepEqual(canonicalWeekForInstant(new Date("2026-10-04T15:59:00Z"), "Asia/Manila"), {
    periodStart: "2026-09-28",
    periodEnd: "2026-10-04",
    periodKey: "2026-09-28",
  });
  // 00:00 Monday in Asia/Manila starts the next canonical week.
  assert.deepEqual(canonicalWeekForInstant(new Date("2026-10-04T16:00:00Z"), "Asia/Manila"), {
    periodStart: "2026-10-05",
    periodEnd: "2026-10-11",
    periodKey: "2026-10-05",
  });
  // DST-observing timezone still follows the local calendar day.
  assert.equal(localDateValue(new Date("2026-03-09T04:30:00Z"), "America/New_York"), "2026-03-09");
  assert.equal(canonicalWeekForInstant(new Date("2026-03-08T06:30:00Z"), "America/New_York").periodKey, "2026-03-02");
});

test("canonical timezone falls back branch -> company -> Asia/Manila", () => {
  assert.equal(canonicalTimezone({ branchTimezone: "America/New_York", companyTimezone: "Asia/Manila" }), "America/New_York");
  assert.equal(canonicalTimezone({ branchTimezone: null, companyTimezone: "Asia/Tokyo" }), "Asia/Tokyo");
  assert.equal(canonicalTimezone({ branchTimezone: "  ", companyTimezone: null }), "Asia/Manila");
});

test("past week is allowed when fully inside the assignment", () => {
  const result = validateProgressWeekSelection({
    evaluationType: "PROGRESS",
    selectedDate: "2026-10-01",
    today: "2026-10-15",
    assignmentStartDate: "2026-09-28",
    assignmentEndDate: "2026-10-31",
  });
  assert.deepEqual(result, { ok: true, periodKey: "2026-09-28", periodStart: "2026-09-28", periodEnd: "2026-10-04" });
});

test("current week is allowed and future week is rejected", () => {
  const current = validateProgressWeekSelection({
    evaluationType: "PROGRESS",
    selectedDate: "2026-10-15",
    today: "2026-10-15",
    assignmentStartDate: "2026-09-28",
    assignmentEndDate: "2026-10-31",
  });
  assert.equal(current.ok, true);
  assert.equal(current.ok && current.periodKey, "2026-10-12");

  const future = validateProgressWeekSelection({
    evaluationType: "PROGRESS",
    selectedDate: "2026-10-19",
    today: "2026-10-15",
    assignmentStartDate: "2026-09-28",
    assignmentEndDate: "2026-10-31",
  });
  assert.equal(future.ok, false);
  assert.equal(!future.ok && future.code, "FUTURE_WEEK");
});

test("assignment-date boundaries require the whole canonical week", () => {
  const base = {
    evaluationType: "PROGRESS" as const,
    today: "2026-11-15",
    assignmentStartDate: "2026-10-07",
    assignmentEndDate: "2026-10-30",
  };
  const before = validateProgressWeekSelection({ ...base, selectedDate: "2026-10-07" });
  assert.equal(before.ok, false);
  assert.equal(!before.ok && before.code, "BEFORE_ASSIGNMENT");

  const inside = validateProgressWeekSelection({ ...base, selectedDate: "2026-10-14" });
  assert.equal(inside.ok, true);
  assert.equal(inside.ok && inside.periodKey, "2026-10-12");

  const after = validateProgressWeekSelection({ ...base, selectedDate: "2026-10-30" });
  assert.equal(after.ok, false);
  assert.equal(!after.ok && after.code, "AFTER_ASSIGNMENT");
});

test("non-PROGRESS and malformed weekly selections are rejected", () => {
  const base = {
    selectedDate: "2026-10-01",
    today: "2026-10-15",
    assignmentStartDate: "2026-09-28",
    assignmentEndDate: "2026-10-31",
  };
  const wrongType = validateProgressWeekSelection({ ...base, evaluationType: "FINAL" });
  assert.equal(wrongType.ok, false);
  assert.equal(!wrongType.ok && wrongType.code, "INVALID_TYPE");

  const malformed = validateProgressWeekSelection({ ...base, evaluationType: "PROGRESS", selectedDate: "2026-02-30" });
  assert.equal(malformed.ok, false);
  assert.equal(!malformed.ok && malformed.code, "INVALID_DATE");
});

test("duplicate prevention identity is canonical per assignment, type, and week", () => {
  const weekA = canonicalWeekForLocalDate("2026-10-01").periodKey;
  const weekA2 = canonicalWeekForLocalDate("2026-10-04").periodKey;
  const weekB = canonicalWeekForLocalDate("2026-10-05").periodKey;

  assert.equal(weekA, weekA2);
  assert.equal(evaluationIdentity("assignment-1", "PROGRESS", weekA), evaluationIdentity("assignment-1", "PROGRESS", weekA2));
  assert.notEqual(evaluationIdentity("assignment-1", "PROGRESS", weekA), evaluationIdentity("assignment-1", "PROGRESS", weekB));
  assert.notEqual(evaluationIdentity("assignment-1", "PROGRESS", weekA), evaluationIdentity("assignment-2", "PROGRESS", weekA));
  assert.notEqual(evaluationIdentity("assignment-1", "PROGRESS", weekA), evaluationIdentity("assignment-1", "FINAL", weekA));
  assert.notEqual(evaluationIdentity("assignment-1", "FINAL", SINGLE_PERIOD_KEY), evaluationIdentity("assignment-1", "MIDTERM", SINGLE_PERIOD_KEY));
});

test("legacy month-style PROGRESS keeps its stored period and derives only the key", () => {
  const legacy = { periodStart: "2026-10-01", periodEnd: "2026-10-31" };
  const week = canonicalWeekForLocalDate(legacy.periodStart);
  assert.equal(week.periodKey, "2026-09-28");
  assert.equal(week.periodStart, "2026-09-28");
  assert.equal(week.periodEnd, "2026-10-04");
  // The helper is pure: the stored month-style boundaries are untouched.
  assert.deepEqual(legacy, { periodStart: "2026-10-01", periodEnd: "2026-10-31" });
  // SQL mirrors the same derivation and only derives period_key.
  assert.ok(migration.includes(`COALESCE("period_start", "evaluation_date")`));
  assert.ok(migration.includes(`WHERE "period_key" IS NULL`));
});
