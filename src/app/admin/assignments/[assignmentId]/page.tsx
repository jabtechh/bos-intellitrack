import Link from "next/link";
import { notFound } from "next/navigation";
import { activateAssignment, cancelAssignment, completeAssignment, terminateAssignment } from "@/app/admin/assignments/actions";
import { completionShortfallMinutes, hoursText } from "@/lib/certificates/domain";
import { canTransition } from "@/lib/assignments/validation";
import { requireCompanyOperationsManager } from "@/lib/auth/require-company-operations-manager";
import { prisma } from "@/lib/prisma";

export default async function AssignmentDetails({
  params, searchParams,
}: { params: Promise<{ assignmentId: string }>; searchParams: Promise<{ error?: string; updated?: string }> }) {
  const actor = await requireCompanyOperationsManager();
  const { assignmentId } = await params;
  const query = await searchParams;
  const row = await prisma.internshipAssignment.findFirst({
    where: { id: assignmentId, companyId: actor.companyId },
    select: {
      id: true, assignmentCode: true, status: true, positionTitle: true, department: true,
      startDate: true, endDate: true, requiredHours: true, notes: true,
      internProfile: { select: { user: { select: { id: true, firstName: true, lastName: true } } } },
      supervisorProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
      coordinatorProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
      certificate: { select: { status: true } },
    },
  });
  if (!row) notFound();
  // DEC-2026-021: completion issues the certificate, so show credited vs required hours before completing.
  const credited = await prisma.attendance.aggregate({ where: { assignmentId: row.id, status: "APPROVED" }, _sum: { creditedMinutes: true } });
  const creditedMinutes = credited._sum.creditedMinutes ?? 0;
  const shortfall = completionShortfallMinutes({ creditedMinutes, requiredHours: row.requiredHours });
  const actions = [
    { status: "ACTIVE" as const, name: "Activate assignment", action: activateAssignment, confirmation: false },
    { status: "COMPLETED" as const, name: "Complete assignment", action: completeAssignment, confirmation: false },
    { status: "CANCELLED" as const, name: "Cancel assignment", action: cancelAssignment, confirmation: true },
    { status: "TERMINATED" as const, name: "Terminate assignment", action: terminateAssignment, confirmation: true },
  ].filter(({ status }) => canTransition(row.status, status));

  return <div className="mx-auto max-w-3xl space-y-6 px-5 py-7 sm:px-8">
    <Link href="/admin/assignments" className="text-sm font-medium text-primary">Back to assignments</Link>
    <header>
      <p className="eyebrow">Company Operations</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold">Assignment {row.assignmentCode}</h1>
      <p className="mt-2 text-sm text-secondary">Status: <strong>{row.status}</strong>{row.certificate ? <> · <Link href={`/certificates/${row.id}`} className="font-medium text-primary">Certificate {row.certificate.status === "ISSUED" ? "issued" : "revoked"}</Link></> : null}</p>
    </header>
    {query.error ? <p role="alert" className="rounded-md bg-destructive-soft p-4 text-sm text-destructive">{query.error}</p> : null}
    {query.updated ? <p role="status" className="rounded-md bg-success-soft p-4 text-sm text-success">Assignment status updated.</p> : null}
    <section className="ui-card space-y-5 p-5">
      <h2 className="font-heading text-xl font-semibold">Internship details</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Item label="Intern" value={`${row.internProfile.user.firstName} ${row.internProfile.user.lastName}`} />
        <Item label="Supervisor" value={`${row.supervisorProfile.user.firstName} ${row.supervisorProfile.user.lastName}`} />
        <Item label="Coordinator" value={`${row.coordinatorProfile.user.firstName} ${row.coordinatorProfile.user.lastName}`} />
        <Item label="Position" value={row.positionTitle ?? "Not configured"} />
        <Item label="Department" value={row.department ?? "Not configured"} />
        <Item label="Start" value={row.startDate.toLocaleDateString("en-PH")} />
        <Item label="End" value={row.endDate.toLocaleDateString("en-PH")} />
        <Item label="Required hours" value={row.requiredHours === null ? "Awaiting Intern confirmation" : String(row.requiredHours)} />
      </dl>
      <Link href={`/admin/users/${row.internProfile.user.id}`} className="button button-secondary">View Intern details</Link>
    </section>
    {actions.length ? <section className="ui-card space-y-4 p-5">
      <h2 className="font-heading text-xl font-semibold">Assignment status</h2>
      <p className="text-sm text-secondary">Changes are restricted to this company&apos;s assignments and validated before saving.</p>
      {actions.map(({ status, name, action, confirmation }) => <form key={status} action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="assignmentId" value={row.id} />
        {confirmation ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmed" required /> Confirm {name.toLowerCase()}</label> : null}
        {status === "COMPLETED" ? <div className="w-full space-y-2 rounded-md border border-border p-3 text-sm" data-completion-summary>
          <p>Credited hours (approved Attendance): <strong>{hoursText(creditedMinutes)} h</strong>{row.requiredHours ? <> of <strong>{row.requiredHours} h</strong> required</> : " (required hours not set)"}.</p>
          <p className="text-secondary">Completing saves the internship Portfolio snapshot. A Certificate of Completion is issued automatically only when the intern has met the required hours, submitted a Work Log for every attended day and finished Getting started.</p>
          {shortfall > 0 ? <label className="flex items-start gap-2 text-destructive"><input type="checkbox" name="confirmShortfall" required /> The intern is {hoursText(shortfall)} hours short of the required hours. I confirm completing with fewer hours. No Certificate of Completion will be issued.</label> : null}
        </div> : null}
        <button className="button button-secondary">{name}</button>
      </form>)}
    </section> : <p className="text-sm text-muted">This assignment has no further lifecycle actions.</p>}
  </div>;
}

function Item({label,value}:{label:string;value:string}) {
  return <div><dt className="text-xs uppercase text-muted">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>;
}
