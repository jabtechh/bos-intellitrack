import Link from "next/link";
import { Icon } from "@/components/icons";
import { RecordsDataTable } from "@/components/records-data-table";
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
    {/* journal-history: the daily journal, presented as a searchable data table */}
    <section className="journal-history-table" data-journal-history>
      <RecordsDataTable caption="Work Logs" rows={records} columns={columns} searchPlaceholder="Search title, work or skills…" defaultSort={{ key: "date", direction: "desc" }}
        filter={{ key: "status", label: "Status", options: [...new Set(records.map((row) => row.cells.status.text))].map((value) => ({ value, label: value })) }}
        emptyTitle="No daily work logs yet" emptyDescription={intern ? "Create your first journal entry when you are ready." : "No journal records are available in your authorized scope."} />
    </section>
  </div>;
}
