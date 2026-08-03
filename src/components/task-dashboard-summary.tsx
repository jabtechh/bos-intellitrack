import Link from "next/link";
import { Icon } from "@/components/icons";
import { MetricCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
export async function TaskDashboardSummary({userId,role}:{userId:string;role:"SUPERVISOR"|"COORDINATOR"}) {
  const scope=role==="SUPERVISOR"?{assignment:{supervisorProfile:{userId}}}:{assignment:{coordinatorProfile:{userId}}};
  const now=new Date();const [active,overdue,submitted,completed]=await Promise.all([
    prisma.task.count({where:{...scope,status:{notIn:["COMPLETED","CANCELLED"]}}}),
    prisma.task.count({where:{...scope,dueAt:{lt:now},status:{notIn:["COMPLETED","CANCELLED"]}}}),
    prisma.task.count({where:{...scope,status:"SUBMITTED"}}),
    prisma.task.count({where:{...scope,status:"COMPLETED"}}),
  ]);
  return <section className="dashboard-page pt-0"><div className="ui-card p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Task overview</p><h2 className="font-semibold text-brand-900">Intern work status</h2></div><Link href="/tasks" className="button button-secondary">View tasks <Icon name="arrow" /></Link></div><div className="metric-grid mt-5"><MetricCard label="Active tasks" value={active} icon="review"/><MetricCard label="Overdue tasks" value={overdue} icon="clock"/><MetricCard label="Submitted tasks" value={submitted} icon="review"/><MetricCard label="Completed tasks" value={completed} icon="check"/></div></div></section>;
}
