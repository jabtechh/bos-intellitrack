import {
  canonicalTimezone,
  localDateValue,
  SINGLE_PERIOD_KEY,
  validateProgressWeekSelection,
  type EvaluationTypeValue,
} from "./weekly-period";

type AssignmentPeriod = {
  startDate: Date;
  endDate: Date;
  companyTimezone: string | null;
  branchTimezone?: string | null;
};

/**
 * Never trust a submitted periodKey, periodStart or periodEnd for weekly
 * PROGRESS: the server derives all three from the selected week and the
 * authorized assignment, using the assignment-local calendar date.
 */
export function resolveEvaluationPeriod(input: {
  evaluationType: EvaluationTypeValue;
  weekDate?: string;
  periodStart?: string;
  periodEnd?: string;
  assignment: AssignmentPeriod;
  now: Date;
}):
  | { ok: true; periodKey: string; periodStart: Date | null; periodEnd: Date | null }
  | { ok: false; message: string } {
  if (input.evaluationType !== "PROGRESS") {
    return {
      ok: true,
      periodKey: SINGLE_PERIOD_KEY,
      periodStart: input.periodStart ? new Date(input.periodStart + "T00:00:00.000Z") : null,
      periodEnd: input.periodEnd ? new Date(input.periodEnd + "T00:00:00.000Z") : null,
    };
  }
  const timezone = canonicalTimezone({
    branchTimezone: input.assignment.branchTimezone,
    companyTimezone: input.assignment.companyTimezone,
  });
  let today: string;
  try {
    today = localDateValue(input.now, timezone);
  } catch {
    // Unknown/stale company timezone must fail closed rather than silently
    // derive a possibly different week.
    return { ok: false, message: "The internship timezone could not be verified." };
  }
  const validated = validateProgressWeekSelection({
    evaluationType: "PROGRESS",
    selectedDate: input.weekDate ?? "",
    today,
    assignmentStartDate: input.assignment.startDate.toISOString().slice(0, 10),
    assignmentEndDate: input.assignment.endDate.toISOString().slice(0, 10),
  });
  if (!validated.ok) return { ok: false, message: validated.message };
  return {
    ok: true,
    periodKey: validated.periodKey,
    periodStart: new Date(validated.periodStart + "T00:00:00.000Z"),
    periodEnd: new Date(validated.periodEnd + "T00:00:00.000Z"),
  };
}
