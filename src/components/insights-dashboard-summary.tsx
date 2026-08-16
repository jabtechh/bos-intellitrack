import Link from "next/link";
import type { UserRole } from "@/generated/prisma/enums";
import { requireInsightsViewer } from "@/lib/insights/authorization";
import { listInsightInterns } from "@/lib/insights/data";
import { taskCounts } from "@/lib/insights/domain";
import { EmptyState } from "./ui";
import { creditedMinutesFromAttendance, formatHours } from "@/lib/internship-progress/domain";

export async function InsightsDashboardSummary({ role }: { role: UserRole }) {
  const context = await requireInsightsViewer();
  const rows = await listInsightInterns(context);
  if (role === "INTERN") {
    const row = rows[0];
    if (!row) return null;
    const credited = creditedMinutesFromAttendance(row.attendance)/60;
    return <section className="ui-card mt-6 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div><p className="eyebrow">Your performance insights</p><h2 className="font-semibold text-brand-900">{formatHours(credited)} credited · {row.workLogs.length} submitted work logs</h2><p className="mt-1 text-sm text-secondary">Review objective internship activity and recorded skill evidence.</p></div><Link href="/insights" className="button button-primary">View insights</Link></section>;
  }
  const summaries=rows.map(row=>({row,tasks:taskCounts(row.tasks)}));
  const overdue=summaries.filter(item=>item.tasks.overdue>0).length;
  const missingLogs=summaries.filter(item=>item.row.workLogs.length===0).length;
  const title=role==="SUPERVISOR"?"Assigned Interns needing attention":role==="COORDINATOR"?"School internship progress":"Main Office operational insights";
  return <section className="ui-card mt-6 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Performance insights</p><h2 className="font-semibold text-brand-900">{title}</h2><p className="mt-1 text-sm text-secondary">{rows.length} active Interns · {overdue} with overdue tasks · {missingLogs} without a submitted work log</p></div><Link href="/insights" className="button button-secondary">Open insights</Link></div>{rows.length?null:<EmptyState title="Not enough data yet" description="Authorized internship activity will appear here."/>}</section>;
}
