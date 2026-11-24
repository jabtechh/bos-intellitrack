// REQ-FR-ATT-9 / REQ-FR-REP-4 — pure analytics constants, types and aggregation (no Prisma).
// Shared by the server loader (./analytics), the client charts and unit tests.
export const ANALYTICS_WEEKS = 12;
export const PUNCTUALITY = ["On time", "Late", "Early departure", "Needs review"] as const;
export type Punctuality = (typeof PUNCTUALITY)[number];
export const PROGRESS_BUCKETS = ["0–24%", "25–49%", "50–74%", "75–99%", "Done (100%+)"] as const;

export type ReportAnalytics = {
  weeks: { start: string; label: string; creditedHours: number; punctuality: Record<Punctuality, number>; averageScore: number | null; evaluations: number }[];
  progress: { bucket: (typeof PROGRESS_BUCKETS)[number]; interns: number }[];
  progressExcluded: number;
  workLogs: { attendedDays: number; withWorkLog: number; rate: number | null };
  internCount: number;
};

export type AnalyticsAssignment = {
  status: string;
  requiredHours: number | null;
  attendance: { attendanceDate: Date; creditedMinutes: number; status: string; classification: string; reviewRequired: boolean; clockIn: Date | null; clockOut: Date | null }[];
  workLogs: { workDate: Date; status: string }[];
  evaluations: { evaluationDate: Date; overallScore: unknown; status: string }[];
};

const DAY = 86_400_000;
const iso = (date: Date) => date.toISOString().slice(0, 10);
/** Monday (UTC date) of the week containing the given UTC date. */
function mondayOf(date: Date) { const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); const shift = (d.getUTCDay() + 6) % 7; return new Date(d.getTime() - shift * DAY); }
/** Today's calendar date in Manila, as a UTC-midnight Date (matches @db.Date storage). */
export function manilaToday(now: Date) { const local = new Date(now.getTime() + 8 * 3_600_000); return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())); }

export function punctualityOf(row: AnalyticsAssignment["attendance"][number]): Punctuality | null {
  if (!row.clockIn || !row.clockOut || row.status === "VOIDED" || row.status === "REJECTED") return null;
  if (row.reviewRequired || row.status === "PENDING_REVIEW") return "Needs review";
  if (row.classification === "ON_TIME") return "On time";
  if (row.classification === "LATE" || row.classification === "LATE_AND_EARLY_DEPARTURE") return "Late";
  if (row.classification === "EARLY_DEPARTURE") return "Early departure";
  return null;
}

export function progressBucket(creditedMinutes: number, requiredHours: number) {
  const pct = creditedMinutes / (requiredHours * 60);
  return pct >= 1 ? PROGRESS_BUCKETS[4] : pct >= 0.75 ? PROGRESS_BUCKETS[3] : pct >= 0.5 ? PROGRESS_BUCKETS[2] : pct >= 0.25 ? PROGRESS_BUCKETS[1] : PROGRESS_BUCKETS[0];
}

export function buildReportAnalytics(rows: AnalyticsAssignment[], now: Date): ReportAnalytics {
  const lastMonday = mondayOf(manilaToday(now));
  const firstMonday = new Date(lastMonday.getTime() - (ANALYTICS_WEEKS - 1) * 7 * DAY);
  const weeks = Array.from({ length: ANALYTICS_WEEKS }, (_, i) => {
    const start = new Date(firstMonday.getTime() + i * 7 * DAY);
    return { start: iso(start), label: start.toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" }), creditedMinutes: 0, punctuality: Object.fromEntries(PUNCTUALITY.map((p) => [p, 0])) as Record<Punctuality, number>, scoreTotal: 0, evaluations: 0 };
  });
  const weekIndex = (date: Date) => { const i = Math.round((mondayOf(date).getTime() - firstMonday.getTime()) / (7 * DAY)); return i >= 0 && i < ANALYTICS_WEEKS ? i : -1; };

  const progress = new Map(PROGRESS_BUCKETS.map((b) => [b, 0]));
  let progressExcluded = 0, attendedDays = 0, withWorkLog = 0;
  for (const row of rows) {
    let credited = 0;
    const submittedDates = new Set(row.workLogs.filter((w) => w.status === "SUBMITTED" || w.status === "APPROVED").map((w) => iso(w.workDate)));
    for (const a of row.attendance) {
      const counted = a.status === "APPROVED" ? a.creditedMinutes : 0;
      credited += counted;
      const w = weekIndex(a.attendanceDate);
      if (w >= 0) {
        weeks[w].creditedMinutes += counted;
        const p = punctualityOf(a); if (p) weeks[w].punctuality[p] += 1;
      }
      if (a.clockIn && a.status !== "VOIDED" && a.status !== "REJECTED") { attendedDays += 1; if (submittedDates.has(iso(a.attendanceDate))) withWorkLog += 1; }
    }
    for (const e of row.evaluations) {
      const score = e.overallScore === null || e.overallScore === undefined ? NaN : Number(e.overallScore);
      const w = weekIndex(e.evaluationDate);
      if (w >= 0 && Number.isFinite(score) && (e.status === "SUBMITTED" || e.status === "ACKNOWLEDGED")) { weeks[w].scoreTotal += score; weeks[w].evaluations += 1; }
    }
    if (row.requiredHours && row.requiredHours > 0) { const b = progressBucket(credited, row.requiredHours); progress.set(b, (progress.get(b) ?? 0) + 1); } else progressExcluded += 1;
  }
  return {
    weeks: weeks.map(({ start, label, creditedMinutes, punctuality, scoreTotal, evaluations }) => ({ start, label, creditedHours: Math.round((creditedMinutes / 60) * 10) / 10, punctuality, averageScore: evaluations ? Math.round((scoreTotal / evaluations) * 10) / 10 : null, evaluations })),
    progress: PROGRESS_BUCKETS.map((bucket) => ({ bucket, interns: progress.get(bucket) ?? 0 })),
    progressExcluded,
    workLogs: { attendedDays, withWorkLog, rate: attendedDays ? Math.round((withWorkLog / attendedDays) * 1000) / 10 : null },
    internCount: rows.length,
  };
}
