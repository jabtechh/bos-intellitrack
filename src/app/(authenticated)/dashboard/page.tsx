import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { AnnouncementManagerSummary, AnnouncementReaderSummary } from "@/components/announcement-dashboard-summary";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "@/components/ui";
import { TaskDashboardSummary } from "@/components/task-dashboard-summary";
import { EvaluationDashboardSummary } from "@/components/evaluation-dashboard-summary";
import { DocumentDashboardSummary } from "@/components/document-dashboard-summary";
import { InsightsDashboardSummary } from "@/components/insights-dashboard-summary";
import { localDate } from "@/lib/attendance/domain";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { requireAnnouncementViewer } from "@/lib/announcements/authorization";
import { prisma } from "@/lib/prisma";
import { workLogLabel } from "@/lib/work-logs/domain";
import { creditedMinutesFromAttendance, formatHours, internshipProgress } from "@/lib/internship-progress/domain";
import {getCalendarItems} from "@/lib/calendar/data";
import { DashboardCalendar, InternProgressPanel, WeeklyHours } from "@/components/intern-mobile-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  if (user.role === "INTERN") return <><InternDashboard user={user} /><InsightsDashboardSummary role={user.role}/></>;
  if (user.role === "COORDINATOR") {
    const viewer = await requireAnnouncementViewer();
    return <><CoordinatorDashboard user={user} /><InsightsDashboardSummary role={user.role}/><TaskDashboardSummary userId={user.id} role={user.role} /><EvaluationDashboardSummary userId={user.id} role={user.role}/><DocumentDashboardSummary userId={user.id} role={user.role}/><AnnouncementReaderSummary viewer={viewer} /></>;
  }
  if (user.role === "SUPERVISOR") {
    const viewer = await requireAnnouncementViewer();
    return <><SupervisorDashboard user={user} /><InsightsDashboardSummary role={user.role}/><TaskDashboardSummary userId={user.id} role={user.role} /><EvaluationDashboardSummary userId={user.id} role={user.role}/><DocumentDashboardSummary userId={user.id} role={user.role}/><AnnouncementReaderSummary viewer={viewer} /></>;
  }

  const viewer = await requireAnnouncementViewer();
  const attendance = await getReviewerAttendance(user.id, user.role);
  const corrections = await getCorrectionSummary(user.id, user.role);
  return <div className="dashboard-page"><PageHeader eyebrow="Bo’s Coffee Main Office" title={`Welcome back, ${user.firstName}`} description="Review current operations and the items that need your attention." actions={user.role === "ADMIN" ? <Link href="/admin" className="button button-primary">Open administration <Icon name="arrow" /></Link> : undefined} /><div className="metric-grid">{attendance.items.map(([label, value]) => <MetricCard key={label} label={label} value={value} icon="clock" />)}{corrections ? <MetricCard label={corrections.label} value={corrections.count} icon="review" /> : null}</div><section className="ui-card mt-6 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div><h2 className="font-semibold text-brand-900">Operational workspace</h2><p className="mt-1 text-sm text-secondary">Open attendance exceptions or read Intern journal records.</p></div><div className="action-bar"><Link href={attendance.href} className="button button-primary">{attendance.link}</Link><Link href="/work-logs" className="button button-secondary">View work logs</Link></div></section><InsightsDashboardSummary role={user.role}/><AnnouncementManagerSummary viewer={viewer} /></div>;
}

async function SupervisorDashboard({ user }: { user: Awaited<ReturnType<typeof requireCurrentUser>> }) {
  const [profile, exceptions, corrections, workLogs] = await Promise.all([
    prisma.supervisorProfile.findUnique({ where: { userId: user.id }, select: { assignments: { where: { status: "ACTIVE" }, select: { id: true, requiredHours: true, attendance:{where:{status:"APPROVED"},select:{status:true,creditedMinutes:true}}, internProfile: { select: { user: { select: { firstName: true, lastName: true } } } } } } } }),
    prisma.attendance.count({where:{status:"PENDING_REVIEW",assignment:{supervisorProfile:{userId:user.id}}}}),
    prisma.attendanceCorrection.count({where:{status:"PENDING",attendance:{assignment:{supervisorProfile:{userId:user.id}}}}}),
    prisma.workLog.count({where:{status:"SUBMITTED",assignment:{supervisorProfile:{userId:user.id}}}}),
  ]);
  const interns = profile?.assignments ?? [];
  return <div className="dashboard-page"><PageHeader eyebrow="Company Supervisor" title={`Welcome back, ${user.firstName}`} description="Monitor your assigned Interns and address submitted review items." actions={<Link href="/attendance/review" className="button button-primary">Review exceptions</Link>} /><div className="metric-grid"><MetricCard label="Assigned Interns" value={interns.length} icon="users" /><MetricCard label="Attendance exceptions" value={exceptions} icon="clock" /><MetricCard label="Correction requests" value={corrections} icon="review" /><MetricCard label="Submitted work logs" value={workLogs} icon="journal" /></div><section className="ui-card mt-6 overflow-hidden"><div className="border-b border-border p-5"><h2 className="font-semibold text-brand-900">Intern progress</h2></div>{interns.length?<div className="compact-list">{interns.map(item=>{const credited=creditedMinutesFromAttendance(item.attendance)/60;if(item.requiredHours===null)return <div key={item.id} className="p-4"><strong>{item.internProfile.user.firstName} {item.internProfile.user.lastName}</strong><small className="block text-muted">Required internship hours have not been provided yet.</small></div>;const progress=internshipProgress(item.requiredHours,credited*60);return <div key={item.id} className="grid gap-2 border-b border-border p-4 sm:grid-cols-[1fr_auto]"><strong>{item.internProfile.user.firstName} {item.internProfile.user.lastName}</strong><span className="text-sm text-secondary">{formatHours(credited)} credited · {formatHours(item.requiredHours)} required · {formatHours(progress.remainingHours!)} remaining · {progress.percentage}%</span></div>})}</div>:<EmptyState title="No assigned Interns" description="Assigned active Interns will appear here." />}</section></div>;
}

async function CoordinatorDashboard({ user }: { user: Awaited<ReturnType<typeof requireCurrentUser>> }) {
  const profile = await prisma.coordinatorProfile.findUnique({ where: { userId: user.id }, select: { school: { select: { name: true } }, assignments: { where: { status: "ACTIVE" }, select: { id: true, requiredHours: true, internProfile: { select: { user: { select: { firstName: true, lastName: true } } } }, attendance: { orderBy: { attendanceDate: "desc" }, select: { status: true, attendanceDate: true, creditedMinutes:true } } } } } });
  const students = profile?.assignments ?? [];
  const needingAttention = students.filter(item => item.attendance[0]?.status === "PENDING_REVIEW").length;
  const awaitingHours = students.filter(item => item.requiredHours === null).length;
  return <div className="dashboard-page"><PageHeader eyebrow="School Coordinator" title={`Welcome back, ${user.firstName}`} description={`Monitor internship progress for ${profile?.school.name ?? "your partner school"}.`} /><div className="metric-grid"><MetricCard label="Monitored students" value={students.length} icon="users" /><MetricCard label="Needs attention" value={needingAttention} icon="review" /><MetricCard label="Awaiting required hours" value={awaitingHours} icon="school" /></div><section className="ui-card mt-6 overflow-hidden"><div className="border-b border-border p-5"><h2 className="font-semibold text-brand-900">Student progress</h2><p className="mt-1 text-sm text-secondary">Required and credited hours for active students from your school.</p></div>{students.length?<div className="compact-list">{students.map(item=>{const credited=creditedMinutesFromAttendance(item.attendance)/60;const latest=item.attendance[0];return <div key={item.id} className="flex items-center justify-between gap-4 border-b border-border p-4"><span><strong>{item.internProfile.user.firstName} {item.internProfile.user.lastName}</strong><small className="block text-muted">{item.requiredHours===null?"Required internship hours have not been provided yet.":`${formatHours(credited)} of ${formatHours(item.requiredHours)} credited`}</small></span><StatusBadge tone={latest?.status==="PENDING_REVIEW"?"warning":"neutral"}>{latest?.status==="PENDING_REVIEW"?"Needs attention":"Monitoring"}</StatusBadge></div>})}</div>:<EmptyState title="No active students" description="Students associated with your school will appear here when their internship is active." />}</section></div>;
}

async function InternDashboard({ user }: { user: Awaited<ReturnType<typeof requireCurrentUser>> }) {
  const [assignment, announcementViewer] = await Promise.all([
    prisma.internshipAssignment.findFirst({
    where: { status: "ACTIVE", internProfile: { userId: user.id } },
    select: {
      id: true, status: true, positionTitle: true, department: true, requiredHours: true,
      scheduleStartTime: true, scheduleEndTime: true, startDate: true, endDate: true,
      company: { select: { timezone: true } },
      internProfile: { select: { course: true, yearLevel: true, school: { select: { name: true } } } },
      supervisorProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
      attendance: { orderBy: { attendanceDate: "desc" }, select: { id: true, attendanceDate: true, clockIn: true, clockOut: true, creditedMinutes: true, status: true, classification:true, createdAt: true, corrections:{where:{status:"PENDING"},select:{id:true}} } },
      workLogs: { orderBy: { workDate: "desc" }, take: 5, select: { id: true, workDate: true, title: true, status: true, updatedAt: true } },
      tasks: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, orderBy: { dueAt: "asc" }, take: 3, select: { id: true, title: true, status: true, dueAt: true } },
      evaluations: { where: { status: { in: ["SUBMITTED", "ACKNOWLEDGED"] } }, orderBy: { submittedAt: "desc" }, take: 1, select: { id: true, evaluationType: true, overallScore: true, submittedAt: true } },
      documents: { where: { status: { not: "ARCHIVED" } }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, fileName: true, status: true, createdAt: true } },
    },
  }),
    requireAnnouncementViewer(),
  ]);
  const pendingCorrections = await prisma.attendanceCorrection.count({ where: { requestedById: user.id, status: "PENDING" } });
  if (!assignment) return <div className="dashboard-page"><PageHeader eyebrow="Intern workspace" title={`Welcome, ${user.firstName}`} description="Your dashboard will become available after an active internship is configured." /><section className="ui-card"><EmptyState title="No active internship" description="Contact your coordinator if you expected an active internship to appear here." /></section></div>;

  const todayDate = localDate(new Date(), assignment.company.timezone);
  const today = assignment.attendance.find(row => row.attendanceDate.getTime() === todayDate.getTime());
  const todayLog = assignment.workLogs.find(row => row.workDate.getTime() === todayDate.getTime());
  const creditedMinutes = creditedMinutesFromAttendance(assignment.attendance);
  if (assignment.requiredHours === null) redirect("/onboarding/internship-hours");
  const calendarMonth=new Date(Date.UTC(todayDate.getUTCFullYear(),todayDate.getUTCMonth(),1)),calendarItems=await getCalendarItems(announcementViewer,calendarMonth,new Date(Date.UTC(todayDate.getUTCFullYear(),todayDate.getUTCMonth()+1,0,23,59,59)));
  const daysAttended=new Set(assignment.attendance.filter(row=>row.status==="APPROVED"&&row.creditedMinutes>0).map(row=>row.attendanceDate.toISOString().slice(0,10))).size;
  const attendanceAction = !today ? "Clock in" : today.clockIn && !today.clockOut ? "Clock out" : "View attendance";
  const logAction = !todayLog ? { label: "Create work log", href: "/work-logs/new" } : todayLog.status === "DRAFT" ? { label: "Continue draft", href: `/work-logs/${todayLog.id}/edit` } : { label: "View today’s log", href: `/work-logs/${todayLog.id}` };
  const activities = [
    ...assignment.attendance.map(row => ({ key: `a-${row.id}`, at: row.createdAt, title: `Attendance ${attendanceLabel(row.status).toLowerCase()}`, detail: formatDate(row.attendanceDate) })),
    ...assignment.workLogs.map(row => ({ key: `w-${row.id}`, at: row.updatedAt, title: workLogLabel(row.status), detail: row.title })),
    ...assignment.evaluations.map(row => ({ key: `e-${row.id}`, at: row.submittedAt??new Date(0), title: "Finalized evaluation", detail: `${row.evaluationType.charAt(0)+row.evaluationType.slice(1).toLowerCase()} · ${row.overallScore?.toString()??"Score not provided"}` })),
    ...assignment.documents.map(row => ({ key: `d-${row.id}`, at: row.createdAt, title: "Document update", detail: row.fileName })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 5);

  return <div className="dashboard-page">
    <section className="welcome-panel"><div><p className="eyebrow text-[#d7b99f]">Intern workspace</p><h1>Good day, {user.firstName}</h1><p>{assignment.positionTitle ?? "Intern"} · Active · {assignment.internProfile.course}</p><p className="welcome-context">{assignment.internProfile.school.name} · Bo’s Coffee Main Office</p></div><Link href="/attendance" className="button welcome-action"><Icon name="clock" />{attendanceAction}</Link></section>
    <section className="dashboard-grid-primary">
      <article className="ui-card attendance-focus"><div className="section-heading"><div><p className="eyebrow">Your day at Bo’s Coffee</p><h2>Today’s attendance</h2></div><StatusBadge tone={today?.status === "APPROVED" ? "success" : today?.status === "PENDING_REVIEW" ? "warning" : today ? "info" : "neutral"}>{today ? attendanceLabel(today.status) : "Not started"}</StatusBadge></div><div className="attendance-times"><TimeStat label="Scheduled" value={schedule(assignment.scheduleStartTime, assignment.scheduleEndTime)} /><TimeStat label="Clock in" value={time(today?.clockIn, assignment.company.timezone)} /><TimeStat label="Clock out" value={time(today?.clockOut, assignment.company.timezone)} /></div><Link href="/attendance" className="button button-primary attendance-primary"><Icon name="clock" />{attendanceAction}</Link><p className="approval-note"><Icon name="check" />Complete GPS and selfie evidence is approved automatically unless an exception is detected.</p></article>
      <article className="ui-card progress-panel"><InternProgressPanel requiredHours={assignment.requiredHours} creditedMinutes={creditedMinutes} daysAttended={daysAttended} reportHref={`/reports/intern/${user.id}/pdf`}/></article>
    </section>
    <DashboardCalendar items={calendarItems} today={todayDate} timezone={assignment.company.timezone} attendance={assignment.attendance}/>
    <WeeklyHours attendance={assignment.attendance} today={todayDate}/>
    <section className="dashboard-grid-secondary">
      <article className="ui-card worklog-focus"><div className="section-heading"><div><p className="eyebrow">Today’s journal</p><h2>Daily work log</h2></div><StatusBadge tone={todayLog?.status === "SUBMITTED" || todayLog?.status === "APPROVED" ? "info" : "neutral"}>{todayLog ? workLogLabel(todayLog.status) : "Not started"}</StatusBadge></div><p className="mt-3 text-sm leading-6 text-secondary">{todayLog?.title ?? "Record what you worked on and learned today."}</p><Link href={logAction.href} className="button button-secondary mt-5">{logAction.label}<Icon name="arrow" /></Link></article>
      <article className="ui-card pending-panel"><p className="eyebrow">Pending items</p><h2>Needs attention</h2><Link href="/tasks" className="pending-row"><span className="metric-icon"><Icon name="review" /></span><span><strong>Assigned tasks</strong><small>{assignment.tasks.length ? `${assignment.tasks.length} active or awaiting review` : "No active tasks"}</small></span><Icon name="arrow" /></Link><Link href="/attendance/corrections" className="pending-row"><span className="metric-icon"><Icon name="review" /></span><span><strong>Attendance corrections</strong><small>{pendingCorrections ? `${pendingCorrections} awaiting review` : "No pending requests"}</small></span><Icon name="arrow" /></Link></article>
    </section>
    <section className="dashboard-grid-bottom">
      <article className="ui-card activity-panel"><div className="section-heading"><div><p className="eyebrow">Latest updates</p><h2>Recent activity</h2></div></div>{activities.length ? <ol className="activity-list">{activities.map(item => <li key={item.key}><span className="activity-dot" /><div><strong>{item.title}</strong><p>{item.detail}</p></div></li>)}</ol> : <p className="empty-copy">Your attendance and work-log activity will appear here.</p>}</article>
      <article className="ui-card internship-panel"><p className="eyebrow">Internship details</p><h2>Your placement</h2><dl><Detail label="Office" value="Bo’s Coffee Main Office" /><Detail label="School" value={assignment.internProfile.school.name} /><Detail label="Program" value={[assignment.internProfile.course, assignment.internProfile.yearLevel].filter(Boolean).join(" · ")} /><Detail label="Supervisor" value={`${assignment.supervisorProfile.user.firstName} ${assignment.supervisorProfile.user.lastName}`} /><Detail label="Team" value={[assignment.positionTitle, assignment.department].filter(Boolean).join(" · ") || "Not specified"} /></dl></article>
    </section>
    <AnnouncementReaderSummary viewer={announcementViewer} />
  </div>;
}

function TimeStat({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function formatDate(value: Date) { return value.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" }); }
function time(value: Date | null | undefined, timezone: string) { return value ? value.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: timezone }) : "—"; }
function schedule(start: Date | null, end: Date | null) { const part = (value: Date) => value.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }); return start && end ? `${part(start)}–${part(end)}` : "Not specified"; }
function attendanceLabel(status: string) { if (status === "PENDING_REVIEW") return "Needs review"; if (status === "APPROVED") return "Auto-approved"; if (status === "CLOCKED_IN") return "Clocked in"; return status.charAt(0) + status.slice(1).toLowerCase().replaceAll("_", " "); }

async function getCorrectionSummary(userId: string, role: string) { if (role === "SUPERVISOR") return { count: await prisma.attendanceCorrection.count({ where: { status: "PENDING", attendance: { assignment: { supervisorProfile: { userId } } } } }), label: "Correction reviews" }; if (role === "REPRESENTATIVE") { const profile = await prisma.representativeProfile.findUnique({ where: { userId }, select: { companyId: true } }); return { count: profile ? await prisma.attendanceCorrection.count({ where: { status: "PENDING", attendance: { assignment: { companyId: profile.companyId } } } }) : 0, label: "Office correction reviews" }; } if (role === "ADMIN") return { count: await prisma.attendanceCorrection.count({ where: { status: "PENDING" } }), label: "Correction reviews" }; return null; }
async function getReviewerAttendance(userId: string, role: string) { if (role === "SUPERVISOR") { const today = localDate(new Date(), "Asia/Manila"); const scope = { assignment: { supervisorProfile: { userId } } }; const [approved, pending, completed] = await Promise.all([prisma.attendance.count({ where: { ...scope, attendanceDate: today, status: "APPROVED", reviewedAt: null } }), prisma.attendance.count({ where: { ...scope, status: "PENDING_REVIEW" } }), prisma.attendance.count({ where: { ...scope, attendanceDate: today, clockOut: { not: null } } })]); return { items: [["Auto-approved today", String(approved)], ["Needs review", String(pending)], ["Completed today", String(completed)]] as [string, string][], href: "/attendance/review", link: "Review exceptions" }; } const today = localDate(new Date(), "Asia/Manila"); const [pending, total] = await Promise.all([prisma.attendance.count({ where: { status: "PENDING_REVIEW" } }), prisma.attendance.count({ where: { attendanceDate: today } })]); return { items: [["Pending reviews", String(pending)], ["Today’s records", String(total)]] as [string, string][], href: "/attendance/review", link: "Open review queue" }; }
