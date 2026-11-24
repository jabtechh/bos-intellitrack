import Link from "next/link";
import { redirect } from "next/navigation";
import { createWorkmateFeedback } from "@/app/feedback/actions";
import { PageHeader } from "@/components/ui";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { FEEDBACK_TYPE_LABELS } from "@/lib/evaluations/domain";
import { prisma } from "@/lib/prisma";

const allowedTypes = ["GENERAL","PRAISE","IMPROVEMENT","TASK_RELATED","PERFORMANCE"] as const;

export default async function NewWorkmateFeedback({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const user = await requireCurrentUser();
  if (user.role !== "INTERN") redirect("/dashboard");
  const {error} = await searchParams;
  const profile = await prisma.internProfile.findUnique({
    where: { userId: user.id },
    select: {
      assignments: {
        where: { status: "ACTIVE" },
        orderBy: { activatedAt: "desc" },
        take: 1,
        select: { id:true, supervisorProfileId:true, startDate:true, endDate:true },
      },
    },
  });
  const assignment = profile?.assignments[0];
  const peers = assignment ? await prisma.internshipAssignment.findMany({
    where: {
      id: { not: assignment.id },
      status: "ACTIVE",
      supervisorProfileId: assignment.supervisorProfileId,
      startDate: { lte: assignment.endDate },
      endDate: { gte: assignment.startDate },
      internProfile: { user: { isActive: true } },
    },
    select: { id:true, internProfile:{select:{user:{select:{id:true,firstName:true,lastName:true}}}} },
    orderBy: { internProfile: { user: { lastName: "asc" } } },
  }) : [];

  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-3xl">
    <PageHeader eyebrow="Workmate feedback" title="Share feedback with a workmate" description="You can share constructive feedback only with another active Intern who has the same directly assigned Company Supervisor during an overlapping internship period." />
    {error?<p className="inline-notice" role="alert">{error}</p>:null}
    <form action={createWorkmateFeedback} className="ui-card space-y-6 p-5 sm:p-7">
      <label className="field"><span>Workmate</span><select name="recipientUserId" required><option value="">Select an eligible workmate</option>{peers.map((row)=><option key={row.id} value={row.internProfile.user.id}>{row.internProfile.user.firstName} {row.internProfile.user.lastName}</option>)}</select></label>
      <label className="field"><span>Feedback type</span><select name="feedbackType" defaultValue="GENERAL">{allowedTypes.map((value)=><option key={value} value={value}>{FEEDBACK_TYPE_LABELS[value]}</option>)}</select></label>
      <label className="field"><span>Title (optional)</span><input name="title" maxLength={255}/></label>
      <label className="field"><span>Feedback</span><textarea name="content" rows={9} required maxLength={10000}/><small>Be specific, constructive, and based on your real shared internship experience.</small></label>
      <div className="action-bar justify-end"><Link href="/feedback" className="button button-secondary">Cancel</Link><button className="button button-primary" disabled={!peers.length}>Share feedback</button></div>
      {!peers.length?<p className="text-sm text-muted">No eligible workmates are available for your current active internship.</p>:null}
    </form>
  </section></div>;
}
