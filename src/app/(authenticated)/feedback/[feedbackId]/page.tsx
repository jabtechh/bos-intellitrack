import { notFound } from "next/navigation";
import { markFeedbackRead } from "@/app/evaluations/actions";
import { PageHeader,StatusBadge } from "@/components/ui";
import { feedbackWhere,requireEvaluationViewer } from "@/lib/evaluations/authorization";
import { FEEDBACK_TYPE_LABELS,VISIBILITY_LABELS } from "@/lib/evaluations/domain";
import { prisma } from "@/lib/prisma";
export default async function FeedbackDetail({params}:{params:Promise<{feedbackId:string}>}){
 const c=await requireEvaluationViewer(),{feedbackId}=await params;
 const row=await prisma.feedback.findFirst({where:{id:feedbackId,...feedbackWhere(c)},include:{assignment:{include:{internProfile:{include:{user:{select:{firstName:true,lastName:true}}}}}},author:{select:{firstName:true,lastName:true}}}});
 if(!row)notFound();
 return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-4xl"><PageHeader eyebrow={FEEDBACK_TYPE_LABELS[row.feedbackType]} title={row.title||"Feedback"} description={c.kind==="INTERN"?`From ${row.author.firstName} ${row.author.lastName}`:`For ${row.assignment.internProfile.user.firstName} ${row.assignment.internProfile.user.lastName}`} actions={<StatusBadge>{VISIBILITY_LABELS[row.visibility]}</StatusBadge>}/><article className="ui-card p-5 sm:p-8"><p className="whitespace-pre-wrap leading-8 text-secondary">{row.content}</p><p className="mt-7 text-sm text-muted">Shared {row.createdAt.toLocaleDateString("en-PH",{dateStyle:"long"})}</p>{c.kind==="INTERN"&&!row.isRead?<form action={markFeedbackRead} className="mt-6"><input type="hidden" name="feedbackId" value={row.id}/><button className="button button-secondary">Mark as read</button></form>:null}</article></section></div>
}
