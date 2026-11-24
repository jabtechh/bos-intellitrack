import { internshipAssignmentBaseSelect } from "@/lib/assignments/projection";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelTask, saveTaskProgress, transitionInternTask } from "@/app/tasks/actions";
import { PageHeader, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireTaskViewer, taskWhere } from "@/lib/tasks/authorization";
import { PRIORITY_LABELS, TASK_LABELS } from "@/lib/tasks/domain";
import { signedTaskEvidence } from "@/lib/tasks/storage";

const date=(x:Date|null)=>x?x.toLocaleDateString("en-PH",{dateStyle:"medium",timeZone:"UTC"}):"Not set";

export default async function TaskDetail({params,searchParams}:{params:Promise<{taskId:string}>;searchParams:Promise<{error?:string}>}){
  const c=await requireTaskViewer(),{taskId}=await params,{error}=await searchParams;
  const task=await prisma.task.findFirst({where:{id:taskId,...taskWhere(c)},include:{assignment:{select:{...internshipAssignmentBaseSelect,internProfile:{include:{user:{select:{firstName:true,lastName:true}}}},supervisorProfile:{include:{user:{select:{firstName:true,lastName:true}}}}}}}});
  if(!task)notFound();
  const evidence=await signedTaskEvidence(task.completionEvidencePath),intern=task.assignment.internProfile.user,supervisor=task.assignment.supervisorProfile.user;
  const editable=c.kind==="INTERN"&&task.status==="IN_PROGRESS";
  const legacy=task.status==="BLOCKED"||task.status==="REVISION_REQUESTED";
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-5xl">
    <PageHeader eyebrow="Task details" title={task.title} description={`${PRIORITY_LABELS[task.priority]} priority · Due ${date(task.dueAt)}`} actions={<><StatusBadge>{TASK_LABELS[task.status]}</StatusBadge>{c.kind==="SUPERVISOR"&&task.status==="TODO"?<Link className="button button-secondary" href={`/tasks/${task.id}/edit`}>Edit</Link>:null}{c.kind==="SUPERVISOR"&&task.status==="SUBMITTED"?<Link className="button button-primary" href={`/tasks/review/${task.id}`}>Confirm completion</Link>:null}</>}/>
    {error?<p className="inline-notice" role="alert">{error}</p>:null}
    {legacy?<p className="inline-notice">This task uses a legacy status. Its history remains readable, but IntelliTrack no longer creates new blocked or revision-requested transitions.</p>:null}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="ui-card space-y-6 p-5 sm:p-7">
        <div><h2 className="section-title">Expected outcome</h2><p className="mt-2 whitespace-pre-wrap text-secondary">{task.description||"No description provided."}</p></div>
        <div className="grid gap-4 sm:grid-cols-3"><p><small className="text-muted">Start date</small><strong className="block">{date(task.startAt)}</strong></p><p><small className="text-muted">Progress</small><strong className="block">{task.progressPercentage}%</strong></p><p><small className="text-muted">Submission</small><strong className="block">{task.submittedAt?date(task.submittedAt):"Not submitted"}</strong></p></div>
        {task.completionNotes?<div><h2 className="section-title">Completion notes</h2><p className="mt-2 whitespace-pre-wrap text-secondary">{task.completionNotes}</p></div>:null}
        {evidence?<a className="button button-secondary" href={evidence} target="_blank" rel="noreferrer">Open completion evidence</a>:null}
        {task.reviewRemarks?<div className="inline-notice"><strong>Supervisor remarks</strong><p>{task.reviewRemarks}</p></div>:null}
      </section>
      <aside className="space-y-5">
        <section className="ui-card p-5"><h2 className="section-title">People</h2><dl className="mt-4 space-y-3"><div><dt className="text-xs text-muted">Intern</dt><dd>{intern.firstName} {intern.lastName}</dd></div><div><dt className="text-xs text-muted">Company Supervisor</dt><dd>{supervisor.firstName} {supervisor.lastName}</dd></div></dl></section>
        {c.kind==="INTERN"?<section className="ui-card p-5"><h2 className="section-title">Task actions</h2>
          {task.status==="TODO"?<form action={transitionInternTask} className="mt-4"><input type="hidden" name="taskId" value={task.id}/><button name="intent" value="start" className="button button-primary w-full">Start task</button></form>:null}
          {editable?<><form action={saveTaskProgress} className="mt-4 space-y-4" encType="multipart/form-data"><input type="hidden" name="taskId" value={task.id}/><label className="field"><span>Progress percentage</span><input name="progressPercentage" type="number" min="0" max="100" defaultValue={task.progressPercentage}/></label><label className="field"><span>Completion notes</span><textarea name="completionNotes" rows={5} maxLength={10000} defaultValue={task.completionNotes??""}/></label><label className="field"><span>Completion evidence (optional)</span><input name="completionEvidence" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"/></label><button className="button button-secondary w-full">Save progress</button></form><form action={transitionInternTask} className="mt-3"><input type="hidden" name="taskId" value={task.id}/><button name="intent" value="submit" className="button button-primary w-full">Submit for completion</button></form></>:null}
        </section>:null}
        {c.kind==="SUPERVISOR"&&["TODO","IN_PROGRESS"].includes(task.status)?<form action={cancelTask} className="ui-card p-5"><input type="hidden" name="taskId" value={task.id}/><button className="button button-secondary w-full">Cancel task</button></form>:null}
      </aside>
    </div>
  </section></div>;
}
