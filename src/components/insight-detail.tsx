import Link from "next/link";
import { FEEDBACK_TYPE_LABELS, TYPE_LABELS } from "@/lib/evaluations/domain";
import { evaluationPeriodLabel } from "@/lib/evaluations/weekly-period";
import { sourcePeriodLabel, type InsightPeriod } from "@/lib/insights/domain";
import type { getInternInsights } from "@/lib/insights/data";
import { PageHeader, StatusBadge } from "./ui";
import { AiProgressSummary } from "./ai-progress-summary";

type Insight = NonNullable<Awaited<ReturnType<typeof getInternInsights>>>;
const number = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);
const date = (value: Date | string) => new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" });

export function InsightDetail({ insight, period, values, internId, aiEnabled }: { insight: Insight; period: InsightPeriod; values: { from: string; to: string }; internId: string; aiEnabled: boolean }) {
  const evaluation = insight.latestEvaluation;
  const reportPeriod = new URLSearchParams();
  if (values.from) reportPeriod.set("from", values.from);
  if (values.to) reportPeriod.set("to", values.to);
  const query = reportPeriod.toString();
  const reportHref = `/reports/intern/${encodeURIComponent(internId)}${query ? `?${query}` : ""}`;
  const reportPdfHref = `/reports/intern/${encodeURIComponent(internId)}/pdf${query ? `?${query}` : ""}`;
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader
      eyebrow="Insights"
      title="Internship Insights"
      description={"Understand your internship activity and verified progress from "+sourcePeriodLabel(period, insight)+". Skills and required hours remain grounded in your records."}
      actions={<><Link href="/evaluations" className="button button-secondary">Evaluations &amp; Feedback</Link><Link href="/portfolio" className="button button-primary">Portfolio</Link></>}
    />

    <form method="get" className="ui-card mb-6 grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="field"><span>From</span><input type="date" name="from" defaultValue={values.from}/></label>
      <label className="field"><span>To</span><input type="date" name="to" defaultValue={values.to}/></label>
      <button className="button button-primary">Apply dates</button>
    </form>

    <AiProgressSummary internId={internId} from={values.from} to={values.to} enabled={aiEnabled}/>

    <section className="ui-card mb-6 p-5 sm:p-6">
      <div className="section-heading"><div><p className="eyebrow">Hours progress</p><h2>Internship progress</h2></div>{insight.hours.percentage === null ? null : <strong className="progress-percent">{insight.hours.percentage}%</strong>}</div>
      {insight.hours.percentage === null ? <p className="text-secondary">Required internship hours have not been provided.</p> : <><div className="progress-track" aria-label={String(insight.hours.percentage)+"% of required hours credited"}><span style={{width:String(Math.min(100,insight.hours.percentage))+"%"}}/></div><div className="progress-stats"><Stat label="Credited" value={number(insight.hours.creditedHours)+" h"}/><Stat label="Required" value={number(insight.hours.requiredHours!)+" h"}/><Stat label="Remaining" value={number(insight.hours.remainingHours!)+" h"}/></div></>}
    </section>

    <section className="ui-card mb-6 p-5 sm:p-6" aria-labelledby="internship-report-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-xl">
          <p className="eyebrow">Verified internship records</p>
          <h2 id="internship-report-title" className="mt-1 font-semibold text-foreground">Internship Report</h2>
          <p className="mt-2 text-sm text-secondary">View your record-based internship summary, or download a PDF for the selected period. This is separate from your curated Portfolio.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={reportHref} className="button button-secondary">View Internship Report</Link>
          <Link href={reportPdfHref} className="button button-primary">Download Report PDF</Link>
        </div>
      </div>
    </section>

    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Attendance">{insight.attendanceSummary.days?<dl className="grid grid-cols-3 gap-4"><Stat label="Recorded days" value={String(insight.attendanceSummary.days)}/><Stat label="Late arrivals" value={String(insight.attendanceSummary.late)}/><Stat label="Early departures" value={String(insight.attendanceSummary.early)}/></dl>:<NotEnough/>}</Panel>

      <Panel title="Work and Tasks">{insight.workLogs.length||insight.taskSummary.denominator?<><dl className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Stat label="Submitted Work Logs" value={String(insight.workLogs.length)}/><Stat label="Active Tasks" value={String(insight.taskSummary.active)}/><Stat label="Completed Tasks" value={String(insight.taskSummary.completed)}/><Stat label="Overdue Tasks" value={String(insight.taskSummary.overdue)}/></dl>{insight.taskSummary.completionRate===null?null:<p className="mt-4 text-sm text-secondary">Task completion: <strong>{insight.taskSummary.completionRate}%</strong> of {insight.taskSummary.denominator} non-cancelled Task{insight.taskSummary.denominator===1?"":"s"} in this period.</p>}</>:<NotEnough/>}</Panel>

      <Panel title="Latest finalized Evaluation">{evaluation?<><p className="mb-3 text-sm text-secondary">{insight.evaluations.length} finalized Evaluation{insight.evaluations.length===1?"":"s"} in this period.</p><div className="flex flex-wrap items-center justify-between gap-3"><p><strong>{evaluation.evaluationType==="PROGRESS"?"Weekly progress Evaluation":`${TYPE_LABELS[evaluation.evaluationType]} Evaluation`}</strong><span className="block text-sm text-muted">{date(evaluation.evaluationDate)} · {evaluationPeriodLabel(evaluation).label}</span>{evaluationPeriodLabel(evaluation).note?<span className="block text-xs text-muted">{evaluationPeriodLabel(evaluation).note}</span>:null}</p><StatusBadge tone="success">{evaluation.overallScore===null?"No overall score":evaluation.overallScore.toString()+" / 100"}</StatusBadge></div>{evaluation.criteria.length?<dl className="mt-4 divide-y divide-border">{evaluation.criteria.map(item=><div key={item.criterion} className="flex justify-between gap-4 py-2 text-sm"><dt>{item.criterion}</dt><dd className="font-semibold">{item.rating} / 5</dd></div>)}</dl>:null}<p className="mt-3 text-xs text-muted">Ratings preserve the Supervisor-entered scale; IntelliTrack does not recalculate them.</p></>:<NotEnough/>}</Panel>

      <Panel title="Recent authorized Feedback">{insight.feedback.length?<div className="divide-y divide-border">{insight.feedback.map((item,index)=><article className="py-3" key={item.createdAt.toISOString()+"-"+index}><div className="flex justify-between gap-3"><strong>{item.title || FEEDBACK_TYPE_LABELS[item.feedbackType]}</strong><small className="text-muted">{date(item.createdAt)}</small></div><p className="mt-1 text-xs font-medium text-primary">{item.author.role==="INTERN"?"Workmate feedback":item.author.role==="SUPERVISOR"?"Supervisor coaching":"Authorized feedback"}</p><p className="mt-1 text-sm text-secondary">{item.content}</p></article>)}</div>:<NotEnough/>}</Panel>

      <Panel title="Skill progress over time">
        {insight.skillEvidence.length?<div className="divide-y divide-border">{insight.skillEvidence.map((item)=><article className="py-3" key={item.skill}><div className="flex flex-wrap items-center justify-between gap-3"><strong>{item.skill}</strong><StatusBadge tone="info">{item.count} dated {item.count===1?"entry":"entries"}</StatusBadge></div><p className="mt-1 text-sm text-secondary">First recorded {date(item.firstSeen)} · Most recent {date(item.lastSeen)}</p><p className="mt-1 text-xs text-muted">Explicitly recorded in submitted Work Logs. This is evidence frequency, not a proficiency score.</p></article>)}</div>:<NotEnough/>}
      </Panel>

      <Panel title="Recorded skills">{insight.skills.length?<><ul className="flex flex-wrap gap-2">{insight.skills.map(skill=><li className="status-badge status-info" key={skill}>{skill}</li>)}</ul><p className="mt-4 text-xs text-muted">Explicitly recorded in submitted Work Logs or your saved Portfolio. IntelliTrack does not assign proficiency rankings.</p></>:<NotEnough/>}</Panel>

      <Panel title="Internship activity">{insight.activity.length?<div className="divide-y divide-border">{insight.activity.slice(-12).map(item=><div className="grid grid-cols-[7rem_1fr] gap-3 py-2 text-sm" key={item.date}><strong>{date(item.date)}</strong><span className="text-secondary">{[item.attendance&&String(item.attendance)+" attendance",item.workLogs&&String(item.workLogs)+" submitted Work Log",item.tasks&&String(item.tasks)+" completed Task"].filter(Boolean).join(" · ")}</span></div>)}</div>:<NotEnough/>}</Panel>
    </div>
  </section></div>;
}

function Panel({title,children}:{title:string;children:React.ReactNode}){return <section className="ui-card p-5 sm:p-6"><h2 className="mb-4 font-semibold text-foreground">{title}</h2>{children}</section>}
function Stat({label,value}:{label:string;value:string}){return <div><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 text-lg font-semibold text-foreground">{value}</dd></div>}
function NotEnough(){return <p className="text-sm text-muted">Not enough data yet.</p>}
