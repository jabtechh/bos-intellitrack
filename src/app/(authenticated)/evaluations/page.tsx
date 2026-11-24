import { internshipAssignmentBaseSelect } from "@/lib/assignments/projection";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { InternDevelopmentTabs } from "@/components/intern-development-tabs";
import { RecordsDataTable } from "@/components/records-data-table";
import { SummaryBand } from "@/components/summary-band";
import type { RecordColumn, RecordRow } from "@/lib/tables/records";
import { prisma } from "@/lib/prisma";
import { evaluationWhere, feedbackWhere, requireEvaluationViewer } from "@/lib/evaluations/authorization";
import { EVALUATION_LABELS, FEEDBACK_TYPE_LABELS, TYPE_LABELS, VISIBILITY_LABELS } from "@/lib/evaluations/domain";
import { evaluationPeriodLabel } from "@/lib/evaluations/weekly-period";

const dateText = (value: Date, utc = true) => value.toLocaleDateString("en-PH", { dateStyle: "medium", ...(utc ? { timeZone: "UTC" } : {}) });
const typeText = (type: keyof typeof TYPE_LABELS) => type === "PROGRESS" ? "Weekly progress evaluation" : `${TYPE_LABELS[type]} evaluation`;
const average = (scores: number[]) => scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;

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
  const finalizedScores = rows.filter((row) => row.status === "SUBMITTED" || row.status === "ACKNOWLEDGED").map((row) => row.overallScore === null ? NaN : Number(row.overallScore)).filter(Number.isFinite);

  // One record shape for both views; the title cell carries the type and period so it stays the row link text.
  const evaluationRecords = (showIntern: boolean): RecordRow[] => rows.map((row) => {
    const period = evaluationPeriodLabel(row);
    const person = showIntern ? row.assignment.internProfile.user : row.assignment.supervisorProfile.user;
    return {
      id: row.id,
      href: `/evaluations/${row.id}`,
      cells: {
        title: { text: `${typeText(row.evaluationType)} · ${period.label}` },
        type: { text: TYPE_LABELS[row.evaluationType] },
        person: { text: `${person.firstName} ${person.lastName}` },
        date: { text: dateText(row.evaluationDate), sort: row.evaluationDate.getTime() },
        score: { text: row.overallScore === null ? "No overall score" : `${row.overallScore.toString()} / 100`, sort: row.overallScore === null ? -1 : Number(row.overallScore) },
        status: { text: EVALUATION_LABELS[row.status], tone: row.status === "DRAFT" ? "warning" : "success" },
      },
    };
  });
  const evaluationColumns = (personLabel: string): RecordColumn[] => [
    { key: "title", label: "Evaluation", primary: true }, { key: "person", label: personLabel }, { key: "date", label: "Date" }, { key: "score", label: "Score" }, { key: "status", label: "Status" },
  ];
  const typeFilter = { key: "type", label: "Type", options: Object.values(TYPE_LABELS).map((value) => ({ value, label: value })) };

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
    const latest = rows.find((row) => (row.status === "SUBMITTED" || row.status === "ACKNOWLEDGED") && row.overallScore !== null);

    const evaluations = <RecordsDataTable caption="My evaluations" rows={evaluationRecords(false)} columns={evaluationColumns("Evaluated by")} searchPlaceholder="Search evaluations…"
      defaultSort={{ key: "date", direction: "desc" }} filter={typeFilter} emptyTitle="No evaluations available" emptyDescription="Finalized Supervisor evaluations will appear here." />;

    const feedbackRecords: RecordRow[] = feedbackRows.map((row) => {
      const source = row.author.role === "INTERN" ? "Workmate feedback" : row.author.role === "SUPERVISOR" ? "Supervisor coaching" : "Feedback";
      return {
        id: row.id,
        href: `/feedback/${row.id}`,
        cells: {
          title: { text: row.title || FEEDBACK_TYPE_LABELS[row.feedbackType] },
          from: { text: `${row.author.firstName} ${row.author.lastName}` },
          source: { text: source },
          type: { text: FEEDBACK_TYPE_LABELS[row.feedbackType] },
          date: { text: dateText(row.createdAt, false), sort: row.createdAt.getTime() },
          status: { text: !row.isRead ? "New" : VISIBILITY_LABELS[row.visibility], tone: !row.isRead ? "info" : "neutral" },
        },
      };
    });
    const feedback = <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-secondary">
          Read Supervisor coaching and feedback shared with you. You can also give feedback to eligible workmates.
        </p>
        <Link href="/feedback/workmate/new" className="button button-secondary">Give workmate feedback</Link>
      </div>
      <RecordsDataTable caption="My feedback" rows={feedbackRecords} searchPlaceholder="Search feedback…" defaultSort={{ key: "date", direction: "desc" }}
        columns={[{ key: "title", label: "Feedback", primary: true }, { key: "from", label: "From" }, { key: "source", label: "Source" }, { key: "date", label: "Date" }, { key: "status", label: "Status" }]}
        filter={{ key: "source", label: "Source", options: ["Supervisor coaching", "Workmate feedback", "Feedback"].map((value) => ({ value, label: value })) }}
        emptyTitle="No feedback available" emptyDescription="Supervisor coaching and shared workmate feedback will appear here." />
    </div>;

    return <div className="px-5 py-8 sm:px-8 lg:px-12">
      <section className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Intern development"
          title="Evaluations & Feedback"
          description="Review your finalized Supervisor evaluations and feedback received during your internship."
        />
        <SummaryBand label="Evaluation summary" tiles={[
          { label: "Finalized evaluations", value: rows.length, tone: "info" },
          { label: "Latest score", value: latest?.overallScore ? `${latest.overallScore.toString()}` : "—", detail: latest ? dateText(latest.evaluationDate) : "No score yet", tone: latest && Number(latest.overallScore) < 75 ? "warning" : "success" },
          { label: "Average score", value: average(finalizedScores) ?? "—", detail: "Out of 100" },
          { label: "Feedback received", value: feedbackRows.length, detail: `${feedbackRows.filter((row) => !row.isRead).length} new`, tone: feedbackRows.some((row) => !row.isRead) ? "info" : "neutral", href: "/evaluations?tab=feedback" },
        ]} />
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

  const drafts = rows.filter((row) => row.status === "DRAFT").length;
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader
      eyebrow="Intern development"
      title="Evaluations"
      description="View performance evaluations within your authorized internship scope."
      actions={context.kind === "SUPERVISOR"
        ? <><Link href="/evaluations/new" className="button button-primary">Create evaluation</Link><Link href="/evaluations/review" className="button button-secondary">Draft review</Link></>
        : undefined}
    />
    <SummaryBand label="Evaluation summary" tiles={[
      { label: "Evaluations", value: rows.length, detail: `${rows.length - drafts} finalized`, tone: "info" },
      { label: "Drafts", value: drafts, detail: "Not yet finalized", tone: drafts ? "warning" : "success", ...(context.kind === "SUPERVISOR" ? { href: "/evaluations/review" } : {}) },
      { label: "Average score", value: average(finalizedScores) ?? "—", detail: "Finalized, out of 100" },
      { label: "Last 7 days", value: rows.filter((row) => row.evaluationDate >= weekAgo).length, detail: "Evaluations dated this week" },
    ]} />
    <RecordsDataTable caption="Evaluations" rows={evaluationRecords(true)} columns={evaluationColumns("Intern")} searchPlaceholder="Search evaluation, Intern or period…"
      defaultSort={{ key: "date", direction: "desc" }} filter={typeFilter}
      emptyTitle="No evaluations available" emptyDescription="Evaluations in your authorized scope will appear here." />
    <div className="mt-6"><Link href="/feedback" className="button button-secondary">View feedback</Link></div>
  </section></div>;
}
