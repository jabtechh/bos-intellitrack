import { internshipAssignmentBaseSelect } from "@/lib/assignments/projection";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { feedbackWhere, requireEvaluationViewer } from "@/lib/evaluations/authorization";
import { FEEDBACK_TYPE_LABELS, VISIBILITY_LABELS } from "@/lib/evaluations/domain";

export default async function Feedback(){
  const c=await requireEvaluationViewer();
  if (c.kind === "INTERN") redirect("/evaluations?tab=feedback");
  const rows=await prisma.feedback.findMany({
    where:feedbackWhere(c),
    include:{
      assignment:{select:{...internshipAssignmentBaseSelect,internProfile:{include:{user:{select:{firstName:true,lastName:true}}}}}},
      author:{select:{firstName:true,lastName:true,role:true}},
    },
    orderBy:{createdAt:"desc"},
  });

  const action = c.kind==="SUPERVISOR"
    ? <Link href="/feedback/new" className="button button-primary">Share supervisor coaching</Link>
    : undefined;

  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader eyebrow="Intern development" title="Feedback" description="Constructive coaching and eligible workmate feedback for your directly assigned Interns." actions={action}/>
    <section className="ui-card overflow-hidden">{rows.length?<div className="divide-y divide-border">{rows.map(row=>{
      const source=row.author.role==="INTERN"?"Workmate feedback":row.author.role==="SUPERVISOR"?"Supervisor coaching":"Feedback";
      return <Link key={row.id} href={`/feedback/${row.id}`} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] sm:items-center">
        <span><strong className="block">{row.title||FEEDBACK_TYPE_LABELS[row.feedbackType]}</strong><small className="text-muted">{`${source} · For ${row.assignment.internProfile.user.firstName} ${row.assignment.internProfile.user.lastName}`}</small></span>
        <span className="text-sm text-secondary">{FEEDBACK_TYPE_LABELS[row.feedbackType]}</span>
        <span className="text-sm text-muted">{row.createdAt.toLocaleDateString("en-PH",{dateStyle:"medium"})}</span>
        <StatusBadge tone="neutral">{VISIBILITY_LABELS[row.visibility]}</StatusBadge>
      </Link>;
    })}</div>:<EmptyState title="No feedback available" description="Feedback for your directly assigned Interns will appear here." action={c.kind==="SUPERVISOR"?{href:"/feedback/new",label:"Share supervisor coaching"}:undefined}/>}</section>
  </section></div>;
}
