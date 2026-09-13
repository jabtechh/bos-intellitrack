import Link from "next/link";
import { FEEDBACK_TYPE_LABELS, TYPE_LABELS } from "@/lib/evaluations/domain";
import { sourcePeriodLabel, type InsightPeriod } from "@/lib/insights/domain";
import type { getInternInsights } from "@/lib/insights/data";
import { PageHeader, StatusBadge } from "./ui";

type Insight = NonNullable<Awaited<ReturnType<typeof getInternInsights>>>;
const number = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);
const date = (value: Date | string) => new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" });

export function InsightDetail({ insight, period, values, canChooseIntern }: { insight: Insight; period: InsightPeriod; values: { from: string; to: string }; canChooseIntern: boolean }) {
  const name = `${insight.internProfile.user.firstName} ${insight.internProfile.user.lastName}`;
  const evaluation = insight.latestEvaluation;
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader eyebrow="Performance insights" title={name} description={`Evidence from ${sourcePeriodLabel(period, insight)}. Required-hour progress covers the full internship.`} actions={canChooseIntern ? <Link href="/insights" className="button button-secondary">Choose another Intern</Link> : undefined}/>
    <form method="get" className="ui-card mb-6 grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="field"><span>From</span><input type="date" name="from" defaultValue={values.from}/></label>
      <label className="field"><span>To</span><input type="date" name="to" defaultValue={values.to}/></label>
      <button className="button button-primary">Apply dates</button>
    </form>
    <section className="ui-card mb-6 p-5 sm:p-6">
      <div className="section-heading"><div><p className="eyebrow">Concise summary</p><h2>Internship progress</h2></div>{insight.hours.percentage === null ? null : <strong className="progress-percent">{insight.hours.percentage}%</strong>}</div>
      {insight.hours.percentage === null ? <p className="text-secondary">Required internship hours have not been provided.</p> : <><div className="progress-track" aria-label={`${insight.hours.percentage}% of required hours credited`}><span style={{width:`${Math.min(100,insight.hours.percentage)}%`}}/></div><div className="progress-stats"><Stat label="Credited" value={`${number(insight.hours.creditedHours)} h`}/><Stat label="Required" value={`${number(insight.hours.requiredHours!)} h`}/><Stat label="Remaining" value={`${number(insight.hours.remainingHours!)} h`}/></div></>}
    </section>
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Attendance">{insight.attendanceSummary.days?<dl className="grid grid-cols-3 gap-4"><Stat label="Recorded days" value={String(insight.attendanceSummary.days)}/><Stat label="Late arrivals" value={String(insight.attendanceSummary.late)}/><Stat label="Early departures" value={String(insight.attendanceSummary.early)}/></dl>:<NotEnough/>}</Panel>
      <Panel title="Work and tasks">{insight.workLogs.length||insight.taskSummary.denominator?<><dl className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Stat label="Approved work logs" value={String(insight.workLogs.length)}/><Stat label="Active tasks" value={String(insight.taskSummary.active)}/><Stat label="Completed tasks" value={String(insight.taskSummary.completed)}/><Stat label="Overdue tasks" value={String(insight.taskSummary.overdue)}/></dl>{insight.taskSummary.completionRate===null?null:<p className="mt-4 text-sm text-secondary">Task completion: <strong>{insight.taskSummary.completionRate}%</strong> of {insight.taskSummary.denominator} non-cancelled task{insight.taskSummary.denominator===1?"":"s"} in this period.</p>}</>:<NotEnough/>}</Panel>
      <Panel title="Latest finalized evaluation">{evaluation?<><p className="mb-3 text-sm text-secondary">{insight.evaluations.length} finalized evaluation{insight.evaluations.length===1?"":"s"} in this period.</p><div className="flex flex-wrap items-center justify-between gap-3"><p><strong>{TYPE_LABELS[evaluation.evaluationType]} evaluation</strong><span className="block text-sm text-muted">{date(evaluation.evaluationDate)}</span></p><StatusBadge tone="success">{evaluation.overallScore===null?"No overall score":`${evaluation.overallScore.toString()} / 100`}</StatusBadge></div>{evaluation.criteria.length?<dl className="mt-4 divide-y divide-border">{evaluation.criteria.map(item=><div key={item.criterion} className="flex justify-between gap-4 py-2 text-sm"><dt>{item.criterion}</dt><dd className="font-semibold">{item.rating} / 5</dd></div>)}</dl>:null}<p className="mt-3 text-xs text-muted">Ratings preserve the Supervisor-entered scale; IntelliTrack does not recalculate them.</p></>:<NotEnough/>}</Panel>
      <Panel title="Recent Supervisor feedback">{insight.feedback.length?<div className="divide-y divide-border">{insight.feedback.map((item,index)=><article className="py-3" key={`${item.createdAt.toISOString()}-${index}`}><div className="flex justify-between gap-3"><strong>{item.title || FEEDBACK_TYPE_LABELS[item.feedbackType]}</strong><small className="text-muted">{date(item.createdAt)}</small></div><p className="mt-1 text-sm text-secondary">{item.content}</p></article>)}</div>:<NotEnough/>}</Panel>
      <Panel title="Recorded skill evidence">{insight.skills.length?<><ul className="flex flex-wrap gap-2">{insight.skills.map(skill=><li className="status-badge status-info" key={skill}>{skill}</li>)}</ul><p className="mt-4 text-xs text-muted">Explicitly recorded in submitted Work Logs or the Intern-maintained Portfolio. These are not proficiency ratings.</p></>:<NotEnough/>}</Panel>
      <Panel title="Internship activity trend">{insight.activity.length?<div className="divide-y divide-border">{insight.activity.slice(-12).map(item=><div className="grid grid-cols-[7rem_1fr] gap-3 py-2 text-sm" key={item.date}><strong>{date(item.date)}</strong><span className="text-secondary">{[item.attendance&&`${item.attendance} attendance`,item.workLogs&&`${item.workLogs} submitted work log`,item.tasks&&`${item.tasks} completed task`].filter(Boolean).join(" · ")}</span></div>)}</div>:<NotEnough/>}</Panel>
    </div>
  </section></div>;
}

function Panel({title,children}:{title:string;children:React.ReactNode}){return <section className="ui-card p-5 sm:p-6"><h2 className="mb-4 font-semibold text-foreground">{title}</h2>{children}</section>}
function Stat({label,value}:{label:string;value:string}){return <div><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 text-lg font-semibold text-foreground">{value}</dd></div>}
function NotEnough(){return <p className="text-sm text-muted">Not enough data yet.</p>}
