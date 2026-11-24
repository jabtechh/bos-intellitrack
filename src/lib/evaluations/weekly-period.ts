/**
 * Canonical weekly Evaluation period helpers (Phase C application support).
 *
 * Pure and database-free so server actions, rendered labels, and tests share
 * one canonical definition.
 *
 * Identity rules:
 * - INITIAL / MIDTERM / FINAL use the literal period key "SINGLE".
 * - PROGRESS uses the ISO Monday of the local internship week as YYYY-MM-DD.
 * - The canonical timezone is branch.timezone -> company.timezone -> Asia/Manila.
 */

export type EvaluationTypeValue = "INITIAL" | "MIDTERM" | "PROGRESS" | "FINAL";

export const SINGLE_PERIOD_KEY = "SINGLE";
export const DEFAULT_TIMEZONE = "Asia/Manila";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export type WeeklyPeriodErrorCode =
  | "INVALID_DATE"
  | "INVALID_TYPE"
  | "FUTURE_WEEK"
  | "BEFORE_ASSIGNMENT"
  | "AFTER_ASSIGNMENT";

export type WeeklyPeriodResult =
  | { ok: true; periodKey: string; periodStart: string; periodEnd: string }
  | { ok: false; code: WeeklyPeriodErrorCode; message: string };

export function canonicalTimezone(input: { branchTimezone?: string | null; companyTimezone?: string | null }): string {
  const branch = input.branchTimezone?.trim();
  if (branch) return branch;
  const company = input.companyTimezone?.trim();
  if (company) return company;
  return DEFAULT_TIMEZONE;
}

export function isDateOnly(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Local calendar date (YYYY-MM-DD) for an instant in the given timezone. */
export function localDateValue(timestamp: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(timestamp);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** ISO Monday for a local calendar date. Throws on a malformed date. */
export function mondayOfLocalDate(localDate: string): string {
  if (!isDateOnly(localDate)) throw new Error(`Invalid local date: ${localDate}`);
  const date = new Date(`${localDate}T00:00:00.000Z`);
  const isoDay = date.getUTCDay() || 7;
  return new Date(date.getTime() - (isoDay - 1) * DAY_MS).toISOString().slice(0, 10);
}

/** Inclusive Sunday for a canonical Monday. */
export function sundayOfMonday(monday: string): string {
  if (!isDateOnly(monday)) throw new Error(`Invalid Monday: ${monday}`);
  return new Date(new Date(`${monday}T00:00:00.000Z`).getTime() + 6 * DAY_MS).toISOString().slice(0, 10);
}

export function isCanonicalMonday(value: string): boolean {
  if (!isDateOnly(value)) return false;
  return new Date(`${value}T00:00:00.000Z`).getUTCDay() === 1;
}

/** Canonical Monday..Sunday period for the week containing a local date. */
export function canonicalWeekForLocalDate(localDate: string): { periodStart: string; periodEnd: string; periodKey: string } {
  const periodStart = mondayOfLocalDate(localDate);
  return { periodStart, periodEnd: sundayOfMonday(periodStart), periodKey: periodStart };
}

/** Canonical Monday..Sunday period for an instant in the assignment timezone. */
export function canonicalWeekForInstant(timestamp: Date, timezone: string): { periodStart: string; periodEnd: string; periodKey: string } {
  return canonicalWeekForLocalDate(localDateValue(timestamp, timezone));
}

/** Period key for any evaluation type. PROGRESS derives a Monday; others are SINGLE. */
export function periodKeyForType(evaluationType: EvaluationTypeValue, localDate: string): string {
  return evaluationType === "PROGRESS" ? mondayOfLocalDate(localDate) : SINGLE_PERIOD_KEY;
}

/** Stable identity tuple used by duplicate-prevention checks and tests. */
export function evaluationIdentity(assignmentId: string, evaluationType: EvaluationTypeValue, periodKey: string): string {
  return `${assignmentId}:${evaluationType}:${periodKey}`;
}

/**
 * Validate a Supervisor weekly PROGRESS selection.
 *
 * Approved OD-1 rules:
 * - a past week is allowed;
 * - the whole canonical week must fall inside the assignment dates;
 * - a future week (Monday after the assignment-local today) is never allowed.
 *
 * `selectedDate` may be any local date in the intended week; the server always
 * normalizes it to the canonical Monday and never accepts a client periodKey.
 */
export function validateProgressWeekSelection(input: {
  evaluationType: EvaluationTypeValue;
  selectedDate: string;
  today: string;
  assignmentStartDate: string;
  assignmentEndDate: string;
}): WeeklyPeriodResult {
  if (input.evaluationType !== "PROGRESS") {
    return { ok: false, code: "INVALID_TYPE", message: "Weekly period validation only applies to PROGRESS evaluations." };
  }
  if (!isDateOnly(input.selectedDate) || !isDateOnly(input.today) || !isDateOnly(input.assignmentStartDate) || !isDateOnly(input.assignmentEndDate)) {
    return { ok: false, code: "INVALID_DATE", message: "Enter a valid week, today, and assignment date range." };
  }

  const week = canonicalWeekForLocalDate(input.selectedDate);

  if (week.periodStart > input.today) {
    return { ok: false, code: "FUTURE_WEEK", message: "A future week cannot be evaluated." };
  }
  if (week.periodStart < input.assignmentStartDate) {
    return { ok: false, code: "BEFORE_ASSIGNMENT", message: "The selected week starts before this internship assignment." };
  }
  if (week.periodEnd > input.assignmentEndDate) {
    return { ok: false, code: "AFTER_ASSIGNMENT", message: "The selected week extends past this internship assignment." };
  }

  return { ok: true, ...week };
}

/** The legacy month-style PROGRESS dates remain visible and are never rewritten. */
export function evaluationPeriodLabel(value: {
  evaluationType: EvaluationTypeValue;
  periodKey: string;
  periodStart: Date | null;
  periodEnd: Date | null;
}): { label: string; note: string | null } {
  const human = (date: string) => new Date(date + "T00:00:00.000Z").toLocaleDateString(
    "en-PH", { dateStyle: "medium", timeZone: "UTC" },
  );
  const recorded = value.periodStart && value.periodEnd
    ? `${human(value.periodStart.toISOString().slice(0, 10))} – ${human(value.periodEnd.toISOString().slice(0, 10))}`
    : null;
  if (value.evaluationType !== "PROGRESS") {
    return { label: recorded ?? "No period specified", note: null };
  }
  const week = canonicalWeekForLocalDate(value.periodKey);
  const canonical = `${human(week.periodStart)} – ${human(week.periodEnd)}`;
  if (recorded && (value.periodStart!.toISOString().slice(0, 10) !== week.periodStart ||
                    value.periodEnd!.toISOString().slice(0, 10) !== week.periodEnd)) {
    return { label: recorded, note: `Canonical week: ${canonical} (legacy period preserved)` };
  }
  return { label: `Week: ${canonical}`, note: null };
}
