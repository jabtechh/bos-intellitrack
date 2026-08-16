import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireInsightsViewer } from "@/lib/insights/authorization";
import { listInsightInterns } from "@/lib/insights/data";
import { taskCounts } from "@/lib/insights/domain";

export default async function InsightsPage(){
  const context=await requireInsightsViewer();
  const rows=await listInsightInterns(context);
  if(context.kind==="INTERN"){
    const own=rows[0];
    if(!own)return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl"><PageHeader eyebrow="Performance insights" title="Your internship insights"/><section className="ui-card"><EmptyState title="Not enough data yet" description="Insights will appear after an active internship is available."/></section></section></div>;
    redirect(`/insights/${own.internProfile.userId}`);
  }
  const description=context.kind==="SUPERVISOR"?"Objective activity for Interns you directly supervise.":context.kind==="COORDINATOR"?"Read-only internship progress for students from your school.":"Main Office-wide operational progress from authorized records.";
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl"><PageHeader eyebrow="Performance insights" title="Internship insights" description={description}/><section className="ui-card overflow-hidden">{rows.length?<div className="divide-y divide-border">{rows.map(row=>{const tasks=taskCounts(row.tasks),credited=row.attendance.reduce((sum,item)=>sum+item.creditedMinutes,0)/60;return <Link href={`/insights/${row.internProfile.userId}`} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] sm:items-center" key={row.internProfile.userId}><span><strong className="block">{row.internProfile.user.firstName} {row.internProfile.user.lastName}</strong><small className="text-muted">{row.internProfile.school.name}</small></span><span className="text-sm text-secondary">{credited.toFixed(1)} credited hours</span><span className="text-sm text-secondary">{row.workLogs.length} approved work logs</span><StatusBadge tone={tasks.overdue?"warning":"neutral"}>{tasks.overdue?`${tasks.overdue} overdue task${tasks.overdue===1?"":"s"}`:"No overdue tasks"}</StatusBadge></Link>})}</div>:<EmptyState title="Not enough data yet" description="No active Interns are available in your authorized scope."/>}</section></section></div>;
}
