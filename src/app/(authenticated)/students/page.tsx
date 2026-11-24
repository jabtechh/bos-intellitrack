import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { RecordsDataTable } from "@/components/records-data-table";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";
import { visibleCertificatesFor } from "@/lib/certificates/data";
import { internRosterColumns, internRosterRows } from "@/lib/tables/intern-roster";

export default async function StudentsPage() {
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
  const certificates = await visibleCertificatesFor({ userId: user.id, role: user.role }, assignments.map((row) => row.id));
  const rows = internRosterRows(assignments, certificates);
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader eyebrow="School Coordinator" title="Students" description={`Read-only internship monitoring for ${profile?.school.name ?? "your school"}.`} />
    <RecordsDataTable caption="Students" rows={rows} columns={internRosterColumns(false, true)} searchPlaceholder="Search name or position…" defaultSort={{ key: "name", direction: "asc" }}
      filter={{ key: "status", label: "Status", options: [{ value: "Active", label: "Active" }, { value: "Completed", label: "Completed" }] }}
      emptyTitle="No students yet" emptyDescription="Students from your school with active or completed internships will appear here." />
  </section></div>;
}
