import { notFound } from "next/navigation";

import { activateAssignment, cancelAssignment, completeAssignment, terminateAssignment } from "@/app/admin/assignments/actions";
import { FormMessage } from "@/app/admin/form-fields";
import { prisma } from "@/lib/prisma";

export default async function AssignmentDetailPage({ params, searchParams }: { params: Promise<{ assignmentId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { assignmentId } = await params; const { error } = await searchParams;
  const assignment = await prisma.internshipAssignment.findUnique({ where: { id: assignmentId }, include: { internProfile: { include: { user: true, school: true } }, company: true, supervisorProfile: { include: { user: true } }, coordinatorProfile: { include: { user: true } } } });
  if (!assignment) notFound();
  const schedule = assignment.scheduleStartTime && assignment.scheduleEndTime ? `${formatTime(assignment.scheduleStartTime)}–${formatTime(assignment.scheduleEndTime)}` : "Not specified";
  return <section className="max-w-5xl"><p className="text-xs font-semibold uppercase tracking-wider text-accent-700">Internship assignment</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h1 className="font-heading text-3xl font-semibold text-brand-900">{assignment.assignmentCode}</h1><span className="rounded-full bg-stone-200 px-3 py-1 text-sm font-semibold text-brand-900">{assignment.status}</span></div><div className="mt-5"><FormMessage error={error} /></div>
    <dl className="mt-6 grid gap-x-8 gap-y-5 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2 lg:grid-cols-3">
      <Item label="Intern" value={`${assignment.internProfile.user.firstName} ${assignment.internProfile.user.lastName}`} /><Item label="Student number" value={assignment.internProfile.studentNumber} /><Item label="School" value={assignment.internProfile.school.name} />
      <Item label="Company" value={`${assignment.company.name}${assignment.company.branchName ? ` — ${assignment.company.branchName}` : ""}`} /><Item label="Supervisor" value={`${assignment.supervisorProfile.user.firstName} ${assignment.supervisorProfile.user.lastName}`} /><Item label="Coordinator" value={`${assignment.coordinatorProfile.user.firstName} ${assignment.coordinatorProfile.user.lastName}`} />
      <Item label="Position" value={assignment.positionTitle ?? "—"} /><Item label="Department" value={assignment.department ?? "—"} /><Item label="Date range" value={`${formatDate(assignment.startDate)} – ${formatDate(assignment.endDate)}`} />
      <Item label="Required hours" value={`${assignment.requiredHours}`} /><Item label="Rendered hours" value={assignment.renderedHours.toString()} /><Item label="Daily schedule" value={schedule} />
      <Item label="Grace period" value={`${assignment.gracePeriodMinutes} minutes`} /><Item label="Created" value={formatTimestamp(assignment.createdAt)} /><Item label="Updated" value={formatTimestamp(assignment.updatedAt)} />
      {assignment.activatedAt ? <Item label="Activated" value={formatTimestamp(assignment.activatedAt)} /> : null}{assignment.completedAt ? <Item label="Completed" value={formatTimestamp(assignment.completedAt)} /> : null}
      <div className="sm:col-span-2 lg:col-span-3"><dt className="text-xs uppercase tracking-wide text-muted">Notes</dt><dd className="mt-1 whitespace-pre-wrap text-primary">{assignment.notes ?? "—"}</dd></div>
    </dl>
    {assignment.status === "PENDING" ? <div className="mt-6 grid gap-4 md:grid-cols-2"><ActionForm assignmentId={assignment.id} action={activateAssignment} label="Activate assignment" description="Eligibility and conflicting active assignments will be checked again." /><ConfirmForm assignmentId={assignment.id} action={cancelAssignment} label="Cancel pending assignment" description="Cancellation is permanent and preserves this historical record." /></div> : null}
    {assignment.status === "ACTIVE" ? <div className="mt-6 grid gap-4 md:grid-cols-2"><ActionForm assignmentId={assignment.id} action={completeAssignment} label="Complete assignment" description="Marks this active placement as completed." /><ConfirmForm assignmentId={assignment.id} action={terminateAssignment} label="Terminate assignment" description="Termination is permanent and preserves this historical record." /></div> : null}
  </section>;
}

function Item({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1 font-medium text-primary">{value}</dd></div>; }
function ActionForm({ assignmentId, action, label, description }: { assignmentId: string; action: (data: FormData) => Promise<void>; label: string; description: string }) { return <form action={action} className="rounded-lg border border-border bg-surface p-5"><input type="hidden" name="assignmentId" value={assignmentId} /><h2 className="font-heading text-xl font-semibold text-brand-900">{label}</h2><p className="mt-2 text-sm text-secondary">{description}</p><button className="mt-4 min-h-11 rounded-md bg-brand-700 px-4 text-sm font-semibold text-white">{label}</button></form>; }
function ConfirmForm(props: { assignmentId: string; action: (data: FormData) => Promise<void>; label: string; description: string }) { return <form action={props.action} className="rounded-lg border border-red-200 bg-surface p-5"><input type="hidden" name="assignmentId" value={props.assignmentId} /><h2 className="font-heading text-xl font-semibold text-brand-900">{props.label}</h2><p className="mt-2 text-sm text-secondary">{props.description}</p><label className="mt-4 flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" name="confirmed" required /> I understand and confirm this action.</label><button className="mt-4 min-h-11 rounded-md border border-red-700 px-4 text-sm font-semibold text-red-800">{props.label}</button></form>; }
function formatDate(value: Date) { return value.toLocaleDateString("en-PH", { dateStyle: "long", timeZone: "UTC" }); }
function formatTimestamp(value: Date) { return value.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }); }
function formatTime(value: Date) { return value.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }); }
