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

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: selected = "" } = await searchParams;
  const user = await requireCurrentUser();
  if (user.role !== "COORDINATOR") redirect("/dashboard");
  const profile = await prisma.coordinatorProfile.findUnique({ where: { userId: user.id }, select: { school: { select: { name: true } } } });
  // Read-only school scope: active and completed internships coordinated by this Coordinator.
  const assignments = await prisma.internshipAssignment.findMany({
    where: { coordinatorProfile: { userId: user.id }, status: { in: ["ACTIVE", "COMPLETED"] } },
    orderBy: [{ status: "asc" }, { internProfile: { user: { lastName: "asc" } } }],
    select: {
      id: true, status: true, positionTitle: true, requiredHours: true, completedAt: true,
      internProfile: { select: { userId: true, user: { select: { firstName: true, lastName: true } }, school: { select: { name: true } } } },
      attendance: { where: { status: "APPROVED" }, select: { creditedMinutes: true } },
      evaluations: { where: { status: { in: ["SUBMITTED", "ACKNOWLEDGED"] } }, select: { id: true } },
    },
  });
  const [certificates, statuses] = await Promise.all([
    visibleCertificatesFor({ userId: user.id, role: user.role }, assignments.map((row) => row.id)),
    loadInternStatuses({ coordinatorProfile: { userId: user.id } }), // DEC-2026-022, same scope as the table
  ]);
  const rows = internRosterRows(assignments, certificates, new Map(statuses.map((s) => [s.assignmentId, s.status])));
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader eyebrow="School Coordinator" title="Students" description={`Read-only internship monitoring for ${profile?.school.name ?? "your school"}.`} />
    <SummaryBand label="Student summary" tiles={rosterTiles(statusCounts(statuses), "/students", selected)} />
    <RecordsDataTable key={selected} caption="Students" rows={rows} columns={internRosterColumns(false, true)} searchPlaceholder="Search name, position or issue…" defaultSort={{ key: "progress", direction: "asc" }}
      filter={ROSTER_STATUS_FILTER} initialFilterValue={selected}
      emptyTitle="No students yet" emptyDescription="Students from your school with active or completed internships will appear here." />
  </section></div>;
}
