/**
 * Include the one-off evaluation milestones before taking the most recent
 * weekly progress rows. Otherwise the first N chronological rows would
 * crowd out MIDTERM/FINAL evidence as the internship progresses.
 *
 * This helper is pure. Input is already restricted to finalized, authorized
 * evaluations by getInternReport.
 */
export function selectRepresentativeEvaluations<T extends {
  evaluationType: string;
  evaluationDate: Date;
  periodKey?: string;
}>(rows: readonly T[], limit = 10): T[] {
  const recentFirst = (a: T, b: T) =>
    b.evaluationDate.getTime() - a.evaluationDate.getTime() ||
    (b.periodKey ?? "").localeCompare(a.periodKey ?? "");
  const milestone = rows.filter(row => row.evaluationType !== "PROGRESS").sort(recentFirst);
  const weekly = rows.filter(row => row.evaluationType === "PROGRESS").sort(recentFirst);
  return [...milestone, ...weekly].slice(0, limit).sort((a, b) =>
    a.evaluationDate.getTime() - b.evaluationDate.getTime() ||
    (a.periodKey ?? "").localeCompare(b.periodKey ?? ""));
}
