import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCompanyReport, hoursLabel, rateLabel } from "@/lib/reports/company";
import { reportAssignmentWhere, resolveReportViewer } from "@/lib/reports/authorization";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { loadReportAnalytics } from "@/lib/reports/analytics";
import { ReportAnalyticsPanel } from "@/components/report-analytics";

export default async function Reports(){
  const c=await resolveReportViewer(await requireCurrentUser());
  if(!c) return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-3xl">
    <PageHeader eyebrow="Reports" title="Reports are not available for this account" description="Internship reports are limited to accounts linked to the Bo's Coffee Main Office internship program."/>
    <div className="ui-card p-6"><p className="text-sm text-secondary">Your account does not have a report-eligible profile in the Main Office program, so no report data is shown. If you expected access, ask the System Administrator to check your profile and company assignment.</p><Link href="/dashboard" className="button button-secondary mt-4">Go to Dashboard</Link></div>
  </section></div>;

  if(c.kind==="REPRESENTATIVE"){
    const [report,analytics]=await Promise.all([getCompanyReport(c.companyId),loadReportAnalytics({companyId:c.companyId})]);
    const hoursDescription=report.missingRequiredHoursCount
      ? `${hoursLabel(report.knownRequiredMinutes)} known required hours · ${report.missingRequiredHoursCount} assignment${report.missingRequiredHoursCount===1?"":"s"} missing required hours`
      : `${hoursLabel(report.requiredMinutes)} required hours`;

    return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Company Representative" title="Company internship report" description="One canonical Company view calculated from authoritative IntelliTrack records." actions={<Link href="/certificates" className="button button-secondary">Certificates of Completion</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric title="Active Interns" value={String(report.activeInternCount)} detail="Distinct active Interns"/>
        <Metric title="Hours rendered" value={hoursLabel(report.renderedMinutes)} detail={hoursDescription}/>
        <Metric title="Attendance exceptions" value={String(report.exceptionCount)} detail={`${rateLabel(report.attendanceExceptionRate)} of ${report.eligibleAttendanceCount} attendance records`}/>
        <Metric title="Final evaluations" value={rateLabel(report.finalEvaluationCompletionRate)} detail={`${report.finalEvaluationsCompleted} of ${report.completedInternships} completed internships`}/>
        <Metric title="Completed internships" value={String(report.internshipStatusCounts.COMPLETED)} detail="Persisted completion status"/>
      </div>
      <div className="mt-6"><ReportAnalyticsPanel data={analytics} scopeLabel="All Main Office Interns"/></div>
      {report.missingRequiredHoursCount?<p className="inline-notice mt-5">An aggregate required-hours completion percentage is intentionally not shown because some included internships do not yet have required hours.</p>:null}
      <section className="ui-card mt-6 overflow-hidden">
        <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Internship status</h2><p className="mt-1 text-xs text-muted">Persisted assignment states only—no inferred “on track” status.</p></div>
        <div className="grid gap-px bg-border sm:grid-cols-5">{(["PENDING","ACTIVE","COMPLETED","CANCELLED","TERMINATED"] as const).map(status=><div key={status} className="bg-surface p-5"><span className="text-xs text-muted">{friendly(status)}</span><strong className="mt-2 block text-2xl">{report.internshipStatusCounts[status]}</strong></div>)}</div>
      </section>
    </section></div>;
  }

  if(c.kind==="INTERN"){
    const a=await prisma.internshipAssignment.findFirst({where:reportAssignmentWhere(c),select:{internProfile:{select:{userId:true}}}});
    return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Verified internship records" title="Reports" description="A private report generated from your authorized IntelliTrack records."/>
      {a?<Link className="ui-card group flex items-center justify-between p-6" href={`/reports/intern/${a.internProfile.userId}`}><span><strong className="block text-lg">My internship report</strong><small className="text-muted">Attendance, submitted work, completed Tasks, finalized Evaluations, authorized Feedback, and approved Document metadata</small></span><span aria-hidden>→</span></Link>:<EmptyState title="No report available" description="A report becomes available when an internship is assigned."/>}
    </section></div>;
  }

  const analytics=await loadReportAnalytics(reportAssignmentWhere(c));
  const rows=await prisma.internshipAssignment.findMany({
    where:reportAssignmentWhere(c),
    select:{id:true,internProfile:{select:{userId:true,user:{select:{firstName:true,lastName:true}},school:{select:{name:true}}}},status:true},
    orderBy:{internProfile:{user:{lastName:"asc"}}},
  });
  return <div className="px-5 py-8 sm:px-8 lg:px-12"><section className="mx-auto max-w-6xl">
    <PageHeader eyebrow={c.kind==="SUPERVISOR"?"Company Supervisor":"School Coordinator"} title="Internship reports" description={c.kind==="SUPERVISOR"?"Reports for your directly assigned Interns.":"Read-only reports for students in your school scope."}/>
    <ReportAnalyticsPanel data={analytics} scopeLabel={c.kind==="SUPERVISOR"?"Your assigned Interns":"Students in your school"}/>
    <section className="ui-card overflow-hidden">{rows.length?<div className="divide-y divide-border">{rows.map(x=><Link key={x.id} href={`/reports/intern/${x.internProfile.userId}`} className="grid gap-2 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-center"><strong>{x.internProfile.user.firstName} {x.internProfile.user.lastName}</strong><span className="text-secondary">{x.internProfile.school.name}</span><StatusBadge>{friendly(x.status)}</StatusBadge></Link>)}</div>:<EmptyState title="No Interns in scope" description="Authorized reports will appear here."/>}</section>
  </section></div>;
}

function Metric({title,value,detail}:{title:string;value:string;detail:string}){return <section className="ui-card p-5"><p className="text-xs font-medium text-muted">{title}</p><strong className="mt-2 block text-3xl">{value}</strong><p className="mt-2 text-xs leading-5 text-secondary">{detail}</p></section>}
function friendly(value:string){return value.charAt(0)+value.slice(1).toLowerCase().replaceAll("_"," ")}
