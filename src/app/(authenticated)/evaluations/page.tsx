import { internshipAssignmentBaseSelect } from "@/lib/assignments/projection";
import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { InternDevelopmentTabs } from "@/components/intern-development-tabs";
import { prisma } from "@/lib/prisma";
import { evaluationWhere, feedbackWhere, requireEvaluationViewer } from "@/lib/evaluations/authorization";
import { EVALUATION_LABELS, FEEDBACK_TYPE_LABELS, TYPE_LABELS, VISIBILITY_LABELS } from "@/lib/evaluations/domain";
import { evaluationPeriodLabel } from "@/lib/evaluations/weekly-period";

export default async function Evaluations({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const context = await requireEvaluationViewer();
  const rows = await prisma.evaluation.findMany({
    where: evaluationWhere(context),
    include: {
      assignment: {
        select: {
          ...internshipAssignmentBaseSelect,
          internProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
          supervisorProfile: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
    orderBy: [{ evaluationDate: "desc" }, { periodKey: "desc" }, { id: "desc" }],
  });

  if (context.kind === "INTERN") {
    const query = await searchParams;
    const initialTab = query.tab === "feedback" ? "feedback" : "evaluations";
    const feedbackRows = await prisma.feedback.findMany({
      where: feedbackWhere(context),
      include: {
        author: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const evaluations = <section className="ui-card overflow-hidden">
      {rows.length ? <div className="divide-y divide-border">
        {rows.map(row => <Link
          key={row.id}
          href={`/evaluations/${row.id}`}
          className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_12rem_10rem_auto] sm:items-center"
        >
          <span>
            <strong className="block">{row.evaluationType === "PROGRESS" ? "Weekly progress evaluation" : `${TYPE_LABELS[row.evaluationType]} evaluation`}</strong>
            <small className="mt-1 block text-secondary">{evaluationPeriodLabel(row).label}</small>
            {evaluationPeriodLabel(row).note ? <small className="block text-muted">{evaluationPeriodLabel(row).note}</small> : null}
            <small className="text-muted">By {row.assignment.supervisorProfile.user.firstName} {row.assignment.supervisorProfile.user.lastName}</small>
          </span>
          <span className="text-sm text-secondary">{row.evaluationDate.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" })}</span>
          <span className="text-sm text-secondary">{row.overallScore === null ? "No overall score" : `${row.overallScore.toString()} / 100`}</span>
          <StatusBadge tone="success">{EVALUATION_LABELS[row.status]}</StatusBadge>
        </Link>)}
      </div> : <EmptyState title="No evaluations available" description="Finalized Supervisor evaluations will appear here." />}
    </section>;

    const feedback = <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-secondary">
          Read Supervisor coaching and feedback shared with you. You can also give feedback to eligible workmates.
        </p>
        <Link href="/feedback/workmate/new" className="button button-secondary">Give workmate feedback</Link>
      </div>
      <section className="ui-card overflow-hidden">
        {feedbackRows.length ? <div className="divide-y divide-border">
          {feedbackRows.map(row => {
            const source = row.author.role === "INTERN" ? "Workmate feedback" : row.author.role === "SUPERVISOR" ? "Supervisor coaching" : "Feedback";
            return <Link
              key={row.id}
              href={`/feedback/${row.id}`}
              className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] sm:items-center"
            >
              <span>
                <strong className="block">{row.title || FEEDBACK_TYPE_LABELS[row.feedbackType]}</strong>
                <small className="text-muted">{source} · From {row.author.firstName} {row.author.lastName}</small>
              </span>
              <span className="text-sm text-secondary">{FEEDBACK_TYPE_LABELS[row.feedbackType]}</span>
              <span className="text-sm text-muted">{row.createdAt.toLocaleDateString("en-PH", { dateStyle: "medium" })}</span>
              <StatusBadge tone={!row.isRead ? "info" : "neutral"}>{!row.isRead ? "New" : VISIBILITY_LABELS[row.visibility]}</StatusBadge>
            </Link>;
          })}
        </div> : <EmptyState
          title="No feedback available"
          description="Supervisor coaching and shared workmate feedback will appear here."
        />}
      </section>
    </div>;

    return <div className="px-5 py-8 sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Intern development"
          title="Evaluations & Feedback"
          description="Review your finalized Supervisor evaluations and feedback received during your internship."
        />
        <InternDevelopmentTabs
          key={initialTab}
          initialTab={initialTab}
          evaluationCount={rows.length}
          feedbackCount={feedbackRows.length}
          evaluations={evaluations}
          feedback={feedback}
        />
      </section>
    </div>;
  }

  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader
      eyebrow="Intern development"
      title="Evaluations"
      description="View performance evaluations within your authorized internship scope."
      actions={context.kind === "SUPERVISOR"
        ? <><Link href="/evaluations/new" className="button button-primary">Create evaluation</Link><Link href="/evaluations/review" className="button button-secondary">Draft review</Link></>
        : undefined}
    />
    <section className="ui-card overflow-hidden">
      {rows.length ? <div className="divide-y divide-border">
        {rows.map(row => {
          const intern = row.assignment.internProfile.user;
          return <Link
            key={row.id}
            href={`/evaluations/${row.id}`}
            className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_12rem_10rem_auto] sm:items-center"
          >
            <span>
              <strong className="block">{row.evaluationType === "PROGRESS" ? "Weekly progress evaluation" : `${TYPE_LABELS[row.evaluationType]} evaluation`}</strong>
              <small className="mt-1 block text-secondary">{evaluationPeriodLabel(row).label}</small>
              {evaluationPeriodLabel(row).note ? <small className="block text-muted">{evaluationPeriodLabel(row).note}</small> : null}
              <small className="text-muted">{intern.firstName} {intern.lastName}</small>
            </span>
            <span className="text-sm text-secondary">{row.evaluationDate.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" })}</span>
            <span className="text-sm text-secondary">{row.overallScore === null ? "No overall score" : `${row.overallScore.toString()} / 100`}</span>
            <StatusBadge tone={row.status === "DRAFT" ? "warning" : "success"}>{EVALUATION_LABELS[row.status]}</StatusBadge>
          </Link>;
        })}
      </div> : <EmptyState
        title="No evaluations available"
        description="Evaluations in your authorized scope will appear here."
        action={context.kind === "SUPERVISOR" ? { href: "/evaluations/new", label: "Create evaluation" } : undefined}
      />}
    </section>
    <div className="mt-6"><Link href="/feedback" className="button button-secondary">View feedback</Link></div>
  </section></div>;
}
