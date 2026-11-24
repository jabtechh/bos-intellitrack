import Link from "next/link";
import { Icon } from "@/components/icons";
import { RecordsDataTable } from "@/components/records-data-table";
import { SummaryBand } from "@/components/summary-band";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import type { RecordColumn, RecordRow } from "@/lib/tables/records";
import { requireWorkLogViewer, workLogAssignmentWhere } from "@/lib/work-logs/authorization";
import { workLogLabel } from "@/lib/work-logs/domain";

export default async function WorkLogs() {
  const context = await requireWorkLogViewer();
  const rows = await prisma.workLog.findMany({
    where: { assignment: workLogAssignmentWhere(context) },
    orderBy: [{ workDate: "desc" }, { updatedAt: "desc" }],
    include: { assignment: { select: { internProfile: { select: { user: { select: { firstName: true, lastName: true } } } } } } },
  });
  const intern = context.kind === "INTERN";
  // DEC-2026-022: number banner inside the same Work Log scope.
  const submittedDates = new Set(rows.filter((row) => row.status === "SUBMITTED" || row.status === "APPROVED").map((row) => row.workDate.toISOString().slice(0, 10)));
  const attendedDays = intern ? await prisma.attendance.findMany({ where: { assignment: workLogAssignmentWhere(context), clockIn: { not: null }, status: { notIn: ["VOIDED", "REJECTED"] } }, select: { attendanceDate: true } }) : [];
  const missingLogs = attendedDays.filter((row) => !submittedDates.has(row.attendanceDate.toISOString().slice(0, 10))).length;
  const drafts = rows.filter((row) => row.status === "DRAFT").length;
  const weekAgo = new Date(); weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const records: RecordRow[] = rows.map((row) => {
    const skills = Array.isArray(row.skillsApplied) ? row.skillsApplied.filter((value): value is string => typeof value === "string") : [];
    return { id: row.id, href: `/work-logs/${row.id}`, cells: {
      date: { text: row.workDate.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }), sort: row.workDate.getTime() },
      ...(intern ? {} : { intern: { text: `${row.assignment.internProfile.user.firstName} ${row.assignment.internProfile.user.lastName}` } }),
      title: { text: row.title },
      summary: { text: `${row.description.slice(0, 120)}${row.description.length > 120 ? "…" : ""}` },
      skills: { text: skills.slice(0, 4).join(", ") || "—" },
      status: { text: workLogLabel(row.status), tone: row.status === "SUBMITTED" || row.status === "APPROVED" ? "info" : "neutral" },
    } };
  });
  const columns: RecordColumn[] = [
    { key: "date", label: "Work date", primary: true },
    ...(intern ? [] : [{ key: "intern", label: "Intern" }]),
    { key: "title", label: "Title" },
    { key: "summary", label: "What was done", sortable: false },
    { key: "skills", label: "Skills", sortable: false },
    { key: "status", label: "Status" },
  ];

  return <div className="operational-page">
    <PageHeader eyebrow="Daily journal" title="Daily Work Logs" description={intern ? "A simple history of the work you recorded each day." : "Read-only daily journal records in your authorized Intern scope."} actions={intern ? <Link href="/work-logs/new" className="button button-primary"><Icon name="plus" />Create work log</Link> : undefined} />
    <SummaryBand label="Work Log summary" tiles={[
      { label: "Work Logs", value: rows.length, detail: `${submittedDates.size} submitted`, tone: "info" },
      { label: "Drafts", value: drafts, detail: "Not yet submitted", tone: drafts ? "warning" : "success" },
      ...(intern ? [{ label: "Days missing a log", value: missingLogs, detail: `of ${attendedDays.length} attended days`, tone: missingLogs ? "danger" as const : "success" as const }] : []),
      { label: "Last 7 days", value: rows.filter((row) => row.workDate >= weekAgo).length, detail: "Work Logs dated this week" },
    ]} />
    {/* journal-history: the daily journal, presented as a searchable data table */}
    <section className="journal-history-table" data-journal-history>
      <RecordsDataTable caption="Work Logs" rows={records} columns={columns} searchPlaceholder="Search title, work or skills…" defaultSort={{ key: "date", direction: "desc" }}
        filter={{ key: "status", label: "Status", options: [...new Set(records.map((row) => row.cells.status.text))].map((value) => ({ value, label: value })) }}
        emptyTitle="No daily work logs yet" emptyDescription={intern ? "Create your first journal entry when you are ready." : "No journal records are available in your authorized scope."} />
    </section>
  </div>;
}
