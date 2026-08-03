import Link from "next/link";
import { Icon } from "@/components/icons";
import { MetricCard, PageHeader, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";

export default async function AdminPage() {
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
  const [office, interns, supervisors, schools, present, pending, hours, coordinators, pendingCorrections, pendingWorkLogs, pendingTasks, recentAttendance, recentWorkLogs] = await Promise.all([
    prisma.company.findUnique({ where: { companyCode: BO_COFFEE_OFFICE_CODE } }),
    prisma.user.count({ where: { role: "INTERN", isActive: true } }),
    prisma.user.count({ where: { role: "SUPERVISOR", isActive: true } }),
    prisma.school.count({ where: { isActive: true } }),
    prisma.attendance.count({ where: { attendanceDate: { gte: start, lt: end }, clockIn: { not: null } } }),
    prisma.attendance.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.attendance.aggregate({ _sum: { creditedMinutes: true } }),
    prisma.user.count({ where: { role: "COORDINATOR", isActive: true } }),
    prisma.attendanceCorrection.count({ where: { status: "PENDING" } }),
    prisma.workLog.count({ where: { status: "SUBMITTED" } }),
    prisma.task.count({ where: { status: "SUBMITTED" } }),
    prisma.attendance.findMany({orderBy:{createdAt:"desc"},take:4,select:{id:true,attendanceDate:true,status:true,assignment:{select:{internProfile:{select:{user:{select:{firstName:true,lastName:true}}}}}}}}),
    prisma.workLog.findMany({orderBy:{updatedAt:"desc"},take:4,select:{id:true,title:true,status:true,updatedAt:true,assignment:{select:{internProfile:{select:{user:{select:{firstName:true,lastName:true}}}}}}}}),
  ]);
  const checklist = [
    ["Configure Main Office", Boolean(office?.isActive), "/admin/settings/office"],
    ["Add a school", schools > 0, "/admin/schools/new"],
    ["Add a coordinator", coordinators > 0, "/admin/users/new"],
    ["Add a supervisor", supervisors > 0, "/admin/users/new"],
    ["Enroll the first intern", interns > 0, "/admin/users/new"],
  ] as const;
  return <>
    <PageHeader eyebrow="Bo’s Coffee Main Office" title="Operations overview" description="Monitor your internship program, review exceptions, and keep every participant moving forward." actions={<><Link href="/admin/users/new" className="button button-primary"><Icon name="plus" />Add user</Link><Link href="/attendance/review" className="button button-secondary">Review queue</Link></>} />
    <section className="metric-grid" aria-label="Program metrics">
      <MetricCard label="Active interns" value={interns} icon="users" />
      <MetricCard label="Present today" value={present} icon="clock" />
      <MetricCard label="Needs review" value={pending} icon="review" />
      <MetricCard label="Pending corrections" value={pendingCorrections} icon="review" />
      <MetricCard label="Work log reviews" value={pendingWorkLogs} icon="journal" />
      <MetricCard label="Task submissions" value={pendingTasks} icon="review" />
      <MetricCard label="Credited hours" value={Math.round((hours._sum.creditedMinutes ?? 0) / 60)} icon="journal" />
      <MetricCard label="Company Supervisors" value={supervisors} icon="users" />
      <MetricCard label="Partner schools" value={schools} icon="school" />
    </section>
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,.8fr)]">
      <section className="ui-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6"><div><h2 className="font-semibold text-brand-900">Priority queues</h2><p className="mt-1 text-xs text-muted">Items that may need Company Operations attention</p></div><StatusBadge tone={pending ? "warning" : "success"}>{pending ? `${pending} pending` : "All clear"}</StatusBadge></div>
        <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4"><QueueLink href="/attendance/review" icon="clock" title="Attendance exceptions" description={`${pending} awaiting review`} /><QueueLink href="/attendance/corrections/review" icon="review" title="Correction requests" description={`${pendingCorrections} awaiting review`} /><QueueLink href="/work-logs/review" icon="journal" title="Work log reviews" description={`${pendingWorkLogs} awaiting review`} /><QueueLink href="/tasks" icon="review" title="Task submissions" description={`${pendingTasks} awaiting supervisor review`} /></div>
      </section>
      <section className="ui-card overflow-hidden"><div className="border-b border-border px-5 py-4 sm:px-6"><h2 className="font-semibold text-brand-900">Workspace setup</h2><p className="mt-1 text-xs text-muted">Core program readiness</p></div><div className="divide-y divide-border">{checklist.map(([label, done, href]) => <Link key={label} href={href} className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-stone-50 sm:px-6"><span className="text-sm font-medium">{label}</span><StatusBadge tone={done ? "success" : "warning"}>{done ? "Complete" : "Action needed"}</StatusBadge></Link>)}</div></section>
    </div>
    <section className="ui-card mt-6 overflow-hidden"><div className="border-b border-border px-5 py-4 sm:px-6"><h2 className="font-semibold text-brand-900">Recent operational activity</h2><p className="mt-1 text-xs text-muted">Latest attendance and work-log updates</p></div><div className="responsive-record-list border-0 shadow-none">{[...recentAttendance.map(item=>({key:`a-${item.id}`,name:`${item.assignment.internProfile.user.firstName} ${item.assignment.internProfile.user.lastName}`,title:"Attendance update",detail:item.status.replaceAll("_"," ").toLowerCase(),at:item.attendanceDate,href:`/attendance/review/${item.id}`})),...recentWorkLogs.map(item=>({key:`w-${item.id}`,name:`${item.assignment.internProfile.user.firstName} ${item.assignment.internProfile.user.lastName}`,title:item.title,detail:item.status.replaceAll("_"," ").toLowerCase(),at:item.updatedAt,href:`/work-logs/review/${item.id}`}))].sort((a,b)=>b.at.getTime()-a.at.getTime()).slice(0,6).map(item=><Link key={item.key} href={item.href} className="responsive-record"><span className="record-primary"><strong>{item.name}</strong><small>{item.title}</small></span><StatusBadge>{item.detail}</StatusBadge><span className="record-action">View activity</span></Link>)}</div></section>
  </>;
}

function QueueLink({href,icon,title,description}:{href:string;icon:"clock"|"review"|"journal";title:string;description:string}){return <Link href={href} className="group bg-surface p-5 sm:p-6"><span className="metric-icon"><Icon name={icon}/></span><h3 className="mt-4 font-semibold text-brand-900">{title}</h3><p className="mt-1 text-sm leading-6 text-secondary">{description}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent-700">Open queue <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1"/></span></Link>}
