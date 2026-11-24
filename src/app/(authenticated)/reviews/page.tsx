import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";

export default async function ReviewsPage() {
  const user = await requireCurrentUser();
  if (user.role !== "SUPERVISOR") redirect("/dashboard");
  const profile = await prisma.supervisorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!profile) redirect("/dashboard");
  const scope = { assignment: { supervisorProfileId: profile.id } };
  const [attendance, corrections, workLogs] = await Promise.all([
    prisma.attendance.count({ where: { ...scope, status: "PENDING_REVIEW" } }),
    prisma.attendanceCorrection.count({ where: { status: "PENDING", attendance: scope } }),
    prisma.workLog.findMany({
      where: { assignment: { supervisorProfileId: profile.id }, status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      take: 8,
      select: { id: true, workDate: true, submittedAt: true, assignment: { select: { internProfile: { select: { user: { select: { firstName: true, lastName: true } } } } } } },
    }),
  ]);
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader eyebrow="Supervisor workspace" title="Reviews" description="Attendance exceptions, correction requests, and submitted Work Logs for your directly assigned Interns." />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <ReviewCard href="/attendance/review" title="Attendance exceptions" count={attendance} description="Evidence requiring your decision." />
      <ReviewCard href="/attendance/corrections/review" title="Correction requests" count={corrections} description="Intern correction requests awaiting decision." />
      <ReviewCard href="/work-logs" title="Work Log journals" count={workLogs.length} description="Submitted journals are read-only." />
    </div>
    <section className="ui-card mt-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold">Recent submitted Work Logs</h2><p className="mt-1 text-xs text-muted">Read-only journal review</p></div><StatusBadge tone="info">{workLogs.length} shown</StatusBadge></div>
      {workLogs.length ? <div className="divide-y divide-border">{workLogs.map((row) => <Link key={row.id} href={`/work-logs/${row.id}`} className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-canvas"><span><strong className="block">{row.assignment.internProfile.user.firstName} {row.assignment.internProfile.user.lastName}</strong><small className="text-muted">{row.workDate.toLocaleDateString("en-PH",{dateStyle:"medium",timeZone:"UTC"})}</small></span><span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">Read journal <Icon name="arrow" className="h-4 w-4"/></span></Link>)}</div> : <EmptyState title="No submitted Work Logs" description="Submitted journals from your assigned Interns will appear here." />}
    </section>
  </section></div>;
}

function ReviewCard({href,title,count,description}:{href:string;title:string;count:number;description:string}) {
  return <Link href={href} className="ui-card group p-5 transition-shadow hover:shadow-md"><div className="flex items-start justify-between gap-4"><span className="metric-icon"><Icon name="review"/></span><StatusBadge tone={count?"warning":"success"}>{count ? `${count} pending` : "Clear"}</StatusBadge></div><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-1 text-sm text-secondary">{description}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Open <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1"/></span></Link>;
}
