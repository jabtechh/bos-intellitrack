import type { TaskStatus } from "@/generated/prisma/enums";
import { attendanceCalendarState } from "@/lib/attendance/calendar";
import { isOverdue } from "@/lib/tasks/domain";
import { workLogLabel } from "@/lib/work-logs/domain";

export type InternAttendanceRecord = {
  id: string; attendanceDate: Date; status: string; classification: string;
  clockIn: Date | null; clockOut: Date | null; workedMinutes: number; creditedMinutes: number;
  clockInInsideGeofence: boolean | null; clockOutInsideGeofence: boolean | null;
  hasTimeInSelfie: boolean; hasTimeOutSelfie: boolean; corrections: { id: string }[];
};
export type InternTask = { id: string; title: string; status: TaskStatus; dueAt: Date | null; updatedAt: Date };
export type InternLog = { id: string; workDate: Date; status: string; description: string; learnings: string | null; skillsApplied: unknown };
export type DailyState = "not-started" | "clocked-in" | "completed" | "needs-review" | "incomplete";

const dayKey = (date: Date) => date.toISOString().slice(0, 10);
export function dashboardAttendanceState(record: InternAttendanceRecord | undefined, today: Date): DailyState {
  if (!record) return "not-started";
  if (record.status === "INCOMPLETE") return "incomplete";
  if (record.status === "CLOCKED_IN" && record.clockIn && !record.clockOut) return dayKey(record.attendanceDate) === dayKey(today) ? "clocked-in" : "incomplete";
  if (["PENDING_REVIEW", "REJECTED", "ABSENT", "VOIDED"].includes(record.status)) return "needs-review";
  if (!record.clockIn || !record.clockOut) return "incomplete";
  return attendanceCalendarState(record, false) === "present" ? "completed" : "needs-review";
}
export function attendanceStateLabel(state: DailyState) {
  return { "not-started": "No record", "clocked-in": "Timed in", completed: "Completed", "needs-review": "Exception", incomplete: "Incomplete" }[state];
}
export function weeklyAttendance(records: InternAttendanceRecord[], today: Date) {
  const start = new Date(today); start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start); date.setUTCDate(start.getUTCDate() + index);
    const record = records.find(row => dayKey(row.attendanceDate) === dayKey(date));
    return { date, record, state: dashboardAttendanceState(record, today), isToday: dayKey(date) === dayKey(today) };
  });
}
export function relevantTasks(tasks: InternTask[], now: Date, limit = 5) {
  const rank = (task: InternTask) => task.status === "REVISION_REQUESTED" || isOverdue(task, now) ? 0 : task.dueAt && task.dueAt.getTime() <= now.getTime() + 7 * 86400000 && task.status !== "COMPLETED" ? 1 : task.status === "COMPLETED" ? 3 : 2;
  return tasks.filter(task => task.status !== "CANCELLED").sort((a, b) => rank(a) - rank(b) || (rank(a) === 3 ? b.updatedAt.getTime() - a.updatedAt.getTime() : (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity)) || b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, limit);
}
export function workLogAction(log: InternLog | null) {
  if (!log) return { label: "Write Today's Work Log", href: "/work-logs/new", status: "No log" };
  if (log.status === "DRAFT") return { label: "Continue Work Log", href: `/work-logs/${log.id}/edit`, status: workLogLabel(log.status) };
  return { label: "View Work Log", href: `/work-logs/${log.id}`, status: workLogLabel(log.status) };
}
export function dashboardGreeting(now: Date, timezone: string) {
  const hour = Number(new Intl.DateTimeFormat("en", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(now));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}
export function workplaceLabel(branch: string | null | undefined, company: string, location: string | null) {
  return branch?.trim() || [company, location].filter(Boolean).join(" · ") || "Workplace not specified";
}
export function formatDashboardMinutes(value: number) {
  const minutes = Math.max(0, Math.floor(value));
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export async function optionalBranchName(read: () => Promise<{ branch: { name: string } | null } | null>) {
  try { return (await read())?.branch?.name ?? null; }
  catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && ["P2021", "P2022"].includes(String(error.code))) return null;
    throw error;
  }
}
