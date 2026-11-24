// DEC-2026-022 — rule-based Intern status: On track / Needs attention / At risk.
// Explainable signals computed from existing records only (no AI, no judgment of the person). Every flag carries
// the reason shown to staff. Working days are Monday–Friday in Manila. Thresholds are the approved defaults.
export const STATUS_RULES = {
  behindHoursRatio: 0.1,        // credited hours more than 10% below the pro-rata expectation
  minElapsedWorkingDays: 5,     // do not judge hours progress in the first week
  lateWindowDays: 10, lateLimit: 3,
  missingWindowDays: 5, missingLimit: 2,
  workLogWindowDays: 10, workLogLimit: 2,
  lowScore: 75,
  staffReviewWaitDays: 2,
} as const;

export type InternStatusLevel = "On track" | "Needs attention" | "At risk" | "Completed";
export type StatusFlagKey = "BEHIND_HOURS" | "LATE_OFTEN" | "MISSING_ATTENDANCE" | "MISSING_WORK_LOGS" | "OVERDUE_TASKS" | "LOW_EVALUATION";
export type StatusFlag = { key: StatusFlagKey; label: string };
export type InternStatus = { level: InternStatusLevel; flags: StatusFlag[]; staffFlags: string[]; behindHours: number };

export type StatusInput = {
  status: string;
  startDate: Date; endDate: Date; requiredHours: number | null;
  attendance: { attendanceDate: Date; clockIn: Date | null; status: string; classification: string; creditedMinutes: number; reviewRequired: boolean }[];
  workLogs: { workDate: Date; status: string }[];
  tasks: { dueAt: Date | null; status: string }[];
  evaluations: { evaluationDate: Date; overallScore: unknown; status: string }[];
};

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const isWeekday = (d: Date) => { const w = d.getUTCDay(); return w !== 0 && w !== 6; };
/** Manila calendar date as UTC midnight (matches @db.Date). */
export function manilaDate(now: Date) { const local = new Date(now.getTime() + 8 * 3_600_000); return utcDay(local); }
/** Weekdays in [from, to] inclusive. */
export function workingDaysBetween(from: Date, to: Date) { let n = 0; for (let d = utcDay(from); d <= to; d = new Date(d.getTime() + DAY)) if (isWeekday(d)) n++; return n; }
/** The `count` most recent weekdays strictly before `today`, not earlier than `notBefore`. */
function recentWorkingDays(today: Date, count: number, notBefore: Date) {
  const out: string[] = []; const floor = utcDay(notBefore);
  for (let d = new Date(today.getTime() - DAY); out.length < count && d >= floor; d = new Date(d.getTime() - DAY)) if (isWeekday(d)) out.push(iso(d));
  return out;
}
const hours = (n: number) => `${Math.round(n)} h`;

export function computeInternStatus(input: StatusInput, now: Date): InternStatus {
  if (input.status === "COMPLETED") return { level: "Completed", flags: [], staffFlags: [], behindHours: 0 };
  const today = manilaDate(now);
  const flags: StatusFlag[] = [];
  const attended = input.attendance.filter((a) => a.clockIn && a.status !== "VOIDED" && a.status !== "REJECTED");
  const attendedDates = new Set(attended.map((a) => iso(a.attendanceDate)));

  // Behind on hours: compare credited minutes with required hours spread evenly over the internship's working days.
  let behindHours = 0;
  if (input.requiredHours && input.requiredHours > 0) {
    const lastDay = new Date(Math.min(input.endDate.getTime(), today.getTime() - DAY));
    const elapsed = lastDay >= utcDay(input.startDate) ? workingDaysBetween(input.startDate, lastDay) : 0;
    const total = workingDaysBetween(input.startDate, utcDay(input.endDate));
    if (elapsed >= STATUS_RULES.minElapsedWorkingDays && total > 0) {
      const expectedMinutes = input.requiredHours * 60 * Math.min(1, elapsed / total);
      const credited = input.attendance.reduce((sum, a) => sum + (a.status === "APPROVED" ? a.creditedMinutes : 0), 0);
      if (credited < expectedMinutes * (1 - STATUS_RULES.behindHoursRatio)) {
        behindHours = (expectedMinutes - credited) / 60;
        flags.push({ key: "BEHIND_HOURS", label: `Behind by ${hours(behindHours)}` });
      }
    }
  }

  const lateWindow = new Set(recentWorkingDays(new Date(today.getTime() + DAY), STATUS_RULES.lateWindowDays, input.startDate));
  const late = attended.filter((a) => lateWindow.has(iso(a.attendanceDate)) && (a.classification === "LATE" || a.classification === "LATE_AND_EARLY_DEPARTURE")).length;
  if (late >= STATUS_RULES.lateLimit) flags.push({ key: "LATE_OFTEN", label: `${late} late in 2 weeks` });

  const missingWindow = recentWorkingDays(today, STATUS_RULES.missingWindowDays, input.startDate);
  const missing = missingWindow.filter((d) => !attendedDates.has(d)).length;
  if (missing >= STATUS_RULES.missingLimit) flags.push({ key: "MISSING_ATTENDANCE", label: `No attendance ${missing} of last ${missingWindow.length} days` });

  const logDates = new Set(input.workLogs.filter((w) => w.status === "SUBMITTED" || w.status === "APPROVED").map((w) => iso(w.workDate)));
  const logWindow = recentWorkingDays(today, STATUS_RULES.workLogWindowDays, input.startDate);
  const missingLogs = logWindow.filter((d) => attendedDates.has(d) && !logDates.has(d)).length;
  if (missingLogs >= STATUS_RULES.workLogLimit) flags.push({ key: "MISSING_WORK_LOGS", label: `${missingLogs} Work Logs missing` });

  const overdue = input.tasks.filter((t) => t.dueAt && t.dueAt < now && t.status !== "COMPLETED" && t.status !== "CANCELLED").length;
  if (overdue > 0) flags.push({ key: "OVERDUE_TASKS", label: `${overdue} overdue Task${overdue === 1 ? "" : "s"}` });

  const latest = input.evaluations.filter((e) => (e.status === "SUBMITTED" || e.status === "ACKNOWLEDGED") && e.overallScore !== null && e.overallScore !== undefined && Number.isFinite(Number(e.overallScore)))
    .sort((a, b) => b.evaluationDate.getTime() - a.evaluationDate.getTime())[0];
  if (latest && Number(latest.overallScore) < STATUS_RULES.lowScore) flags.push({ key: "LOW_EVALUATION", label: `Latest evaluation ${Math.round(Number(latest.overallScore))}` });

  // Staff-side work (not counted against the Intern).
  const waiting = input.attendance.filter((a) => (a.status === "PENDING_REVIEW" || a.reviewRequired) && a.status !== "APPROVED" && (today.getTime() - utcDay(a.attendanceDate).getTime()) / DAY > STATUS_RULES.staffReviewWaitDays).length;
  const staffFlags = waiting ? [`${waiting} review${waiting === 1 ? "" : "s"} waiting`] : [];

  const level: InternStatusLevel = flags.length === 0 ? "On track" : flags.some((f) => f.key === "BEHIND_HOURS") || flags.length >= 2 ? "At risk" : "Needs attention";
  return { level, flags, staffFlags, behindHours };
}

export const STATUS_LEVELS: Exclude<InternStatusLevel, "Completed">[] = ["On track", "Needs attention", "At risk"];
export const statusTone = (level: InternStatusLevel) => level === "On track" ? "success" as const : level === "Needs attention" ? "warning" as const : level === "At risk" ? "danger" as const : "neutral" as const;
/** Worst first, then most behind. */
export const statusRank = (s: InternStatus) => (s.level === "At risk" ? 0 : s.level === "Needs attention" ? 1 : s.level === "On track" ? 2 : 3) * 1e6 - s.behindHours;
