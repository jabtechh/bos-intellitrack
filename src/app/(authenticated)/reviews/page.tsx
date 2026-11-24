import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { RecordsDataTable } from "@/components/records-data-table";
import { SummaryBand } from "@/components/summary-band";
import type { RecordRow } from "@/lib/tables/records";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";

const DAY = 86_400_000;
const name = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName}`;
const day = (value: Date) => value.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" });
const waitingDays = (since: Date, now: Date) => Math.max(0, Math.floor((now.getTime() - since.getTime()) / DAY));
const waitingText = (days: number) => days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"}`;

export default async function ReviewsPage() {
  const user = await requireCurrentUser();
  if (user.role !== "SUPERVISOR") redirect("/dashboard");
  const profile = await prisma.supervisorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!profile) redirect("/dashboard");
  const scope = { assignment: { supervisorProfileId: profile.id } };
  // Work Logs are read-only journals (nothing to decide): show only the last 7 days as recent reading.
  const recent = new Date(); recent.setUTCDate(recent.getUTCDate() - 7);
  const [attendance, corrections, workLogs] = await Promise.all([
    prisma.attendance.findMany({ where: { ...scope, status: "PENDING_REVIEW" }, orderBy: { attendanceDate: "asc" }, take: 500, select: { id: true, attendanceDate: true, assignment: { select: { internProfile: { select: { user: { select: { firstName: true, lastName: true } } } } } } } }),
    prisma.attendanceCorrection.findMany({ where: { status: "PENDING", attendance: scope }, orderBy: { createdAt: "asc" }, take: 500, select: { id: true, createdAt: true, attendance: { select: { attendanceDate: true, assignment: { select: { internProfile: { select: { user: { select: { firstName: true, lastName: true } } } } } } } } } }),
    prisma.workLog.findMany({ where: { ...scope, status: "SUBMITTED", workDate: { gte: recent } }, orderBy: { submittedAt: "desc" }, take: 500, select: { id: true, workDate: true, submittedAt: true, assignment: { select: { internProfile: { select: { user: { select: { firstName: true, lastName: true } } } } } } } }),
  ]);

  // DEC-2026-022: one review queue with a number banner (scope: this Supervisor's directly assigned Interns).
  const now = new Date();
  const rows: RecordRow[] = [
    ...attendance.map((row) => ({ kind: "Attendance exception", id: `a-${row.id}`, href: `/attendance/review/${row.id}`, intern: name(row.assignment.internProfile.user), date: row.attendanceDate, since: row.attendanceDate, action: "Decide" })),
    ...corrections.map((row) => ({ kind: "Correction request", id: `c-${row.id}`, href: `/attendance/corrections/review/${row.id}`, intern: name(row.attendance.assignment.internProfile.user), date: row.attendance.attendanceDate, since: row.createdAt, action: "Decide" })),
    ...workLogs.map((row) => ({ kind: "Work Log", id: `w-${row.id}`, href: `/work-logs/${row.id}`, intern: name(row.assignment.internProfile.user), date: row.workDate, since: row.submittedAt ?? row.workDate, action: "Read" })),
  ].map((item) => {
    const days = waitingDays(item.since, now);
    return {
      id: item.id, href: item.href,
      cells: {
        item: { text: `${item.kind} · ${item.intern}` },
        kind: { text: item.kind, tone: item.kind === "Work Log" ? "info" as const : "warning" as const },
        intern: { text: item.intern },
        date: { text: day(item.date), sort: item.date.getTime() },
        waiting: item.kind === "Work Log" ? { text: "Read only", sort: -1 } : { text: waitingText(days), sort: days, ...(days > 2 ? { tone: "danger" as const } : {}) },
        action: { text: item.action, href: item.href },
      },
    };
  });
  const decisions = [...attendance.map((r) => r.attendanceDate), ...corrections.map((r) => r.createdAt)];
  const oldest = decisions.length ? Math.max(...decisions.map((d) => waitingDays(d, now))) : 0;

  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader eyebrow="Supervisor workspace" title="Reviews" description="Attendance exceptions, correction requests, and submitted Work Logs for your directly assigned Interns." />
    <SummaryBand label="Review summary" tiles={[
      { label: "Attendance exceptions", value: attendance.length, detail: "Evidence requiring your decision", tone: attendance.length ? "warning" : "success", href: "/attendance/review" },
      { label: "Correction requests", value: corrections.length, detail: "Awaiting your decision", tone: corrections.length ? "warning" : "success", href: "/attendance/corrections/review" },
      { label: "Work Logs this week", value: workLogs.length, detail: "Read-only journals, last 7 days", tone: "info", href: "/work-logs" },
      { label: "Oldest decision waiting", value: decisions.length ? waitingText(oldest) : "—", detail: decisions.length ? "Attendance or correction" : "Nothing waiting", tone: oldest > 2 ? "danger" : "success" },
    ]} />
    <RecordsDataTable caption="Review queue" rows={rows} searchPlaceholder="Search Intern or item…" defaultSort={{ key: "waiting", direction: "desc" }}
      columns={[{ key: "item", label: "Item", primary: true }, { key: "kind", label: "Type" }, { key: "date", label: "Record date" }, { key: "waiting", label: "Waiting" }, { key: "action", label: "Action", sortable: false }]}
      filter={{ key: "kind", label: "Type", options: ["Attendance exception", "Correction request", "Work Log"].map((value) => ({ value, label: value })) }}
      emptyTitle="Nothing to review" emptyDescription="Attendance exceptions, correction requests and submitted Work Logs will appear here." />
  </section></div>;
}
