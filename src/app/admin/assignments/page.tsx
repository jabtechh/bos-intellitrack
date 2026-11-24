import Link from "next/link";
import { RecordsDataTable } from "@/components/records-data-table";
import { requireCompanyOperationsManager } from "@/lib/auth/require-company-operations-manager";
import { prisma } from "@/lib/prisma";
import type { RecordRow, RecordTone } from "@/lib/tables/records";

const STATUS_TONE: Record<string, RecordTone> = { ACTIVE: "info", PENDING: "warning", COMPLETED: "success", CANCELLED: "neutral", TERMINATED: "danger" };
const STATUS_LABEL: Record<string, string> = { ACTIVE: "Active", PENDING: "Pending", COMPLETED: "Completed", CANCELLED: "Cancelled", TERMINATED: "Terminated" };

export default async function AssignmentsPage() {
  const actor = await requireCompanyOperationsManager();
  const assignments = await prisma.internshipAssignment.findMany({
    where: { companyId: actor.companyId },
    select: {
      id: true, assignmentCode: true, status: true, startDate: true, endDate: true, positionTitle: true,
      internProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
      supervisorProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: [{ createdAt: "desc" }],
  });
  const date = (value: Date) => value.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" });
  const rows: RecordRow[] = assignments.map((row) => ({
    id: row.id,
    href: `/admin/assignments/${row.id}`,
    cells: {
      intern: { text: `${row.internProfile.user.firstName} ${row.internProfile.user.lastName}`, sort: `${row.internProfile.user.lastName} ${row.internProfile.user.firstName}` },
      code: { text: row.assignmentCode, mono: true },
      position: { text: row.positionTitle ?? "—" },
      supervisor: { text: `${row.supervisorProfile.user.firstName} ${row.supervisorProfile.user.lastName}` },
      dates: { text: `${date(row.startDate)} – ${date(row.endDate)}`, sort: row.startDate.getTime() },
      status: { text: STATUS_LABEL[row.status] ?? row.status, tone: STATUS_TONE[row.status] ?? "neutral" },
    },
  }));

  return <div className="mx-auto max-w-6xl space-y-6 px-5 py-7 sm:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">Company Operations</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Internship assignments</h1>
        <p className="mt-2 text-sm text-secondary">Review company assignments and authorized lifecycle changes.</p>
      </div>
      <Link href="/admin/users/new" className="button button-primary">Provision an Intern</Link>
    </header>
    <section aria-label="Company internship assignments">
      <RecordsDataTable caption="Internship assignments" rows={rows} searchPlaceholder="Search intern, code, supervisor…" defaultSort={{ key: "dates", direction: "desc" }}
        filter={{ key: "status", label: "Status", options: Object.values(STATUS_LABEL).map((value) => ({ value, label: value })) }}
        columns={[{ key: "intern", label: "Intern", primary: true }, { key: "code", label: "Code" }, { key: "position", label: "Position" }, { key: "supervisor", label: "Supervisor" }, { key: "dates", label: "Dates" }, { key: "status", label: "Status" }]}
        emptyTitle="No internship assignments" emptyDescription="No internship assignments for your company yet." />
    </section>
  </div>;
}
