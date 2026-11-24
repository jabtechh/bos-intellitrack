import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { RecordsDataTable } from "@/components/records-data-table";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";
import { visibleCertificatesFor } from "@/lib/certificates/data";
import { internRosterColumns, internRosterRows } from "@/lib/tables/intern-roster";
import { SummaryBand } from "@/components/summary-band";
import { loadInternStatuses, statusCounts } from "@/lib/insights/intern-status-data";
import { rosterTiles, ROSTER_STATUS_FILTER } from "@/lib/insights/roster-tiles";

export default async function InternsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: selected = "" } = await searchParams;
  const user = await requireCurrentUser();
  if (user.role !== "SUPERVISOR") redirect("/dashboard");
  // Directly assigned Interns only: active, plus completed (DEC-2026-021) so finished interns stay discoverable.
  const assignments = await prisma.internshipAssignment.findMany({
    where: { supervisorProfile: { userId: user.id }, status: { in: ["ACTIVE", "COMPLETED"] } },
    orderBy: [{ status: "asc" }, { internProfile: { user: { lastName: "asc" } } }],
    select: {
      id: true, status: true, positionTitle: true, requiredHours: true, completedAt: true,
      internProfile: { select: { userId: true, user: { select: { firstName: true, lastName: true } }, school: { select: { name: true } } } },
      attendance: { where: { status: "APPROVED" }, select: { creditedMinutes: true } },
    },
  });
  const [certificates, statuses] = await Promise.all([
    visibleCertificatesFor({ userId: user.id, role: user.role }, assignments.map((row) => row.id)),
    loadInternStatuses({ supervisorProfile: { userId: user.id } }), // DEC-2026-022, same scope as the table
  ]);
  const rows = internRosterRows(assignments, certificates, new Map(statuses.map((s) => [s.assignmentId, s.status])));
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader eyebrow="Company Supervisor" title="Interns" description="Your directly assigned Interns, their Attendance-based rendered hours and, once complete, their certificates." />
    <SummaryBand label="Intern summary" tiles={rosterTiles(statusCounts(statuses), "/interns", selected)} />
    <RecordsDataTable key={selected} caption="Interns" rows={rows} columns={internRosterColumns(true)} searchPlaceholder="Search name, position, school or issue…" defaultSort={{ key: "progress", direction: "asc" }}
      filter={ROSTER_STATUS_FILTER} initialFilterValue={selected}
      emptyTitle="No assigned Interns" emptyDescription="Active Interns assigned to you will appear here." />
  </section></div>;
}
