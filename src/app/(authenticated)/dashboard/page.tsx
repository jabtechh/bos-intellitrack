import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { AnnouncementManagerSummary, AnnouncementReaderSummary } from "@/components/announcement-dashboard-summary";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { TaskDashboardSummary } from "@/components/task-dashboard-summary";
import { EvaluationDashboardSummary } from "@/components/evaluation-dashboard-summary";
import { DocumentDashboardSummary } from "@/components/document-dashboard-summary";
import { InsightsDashboardSummary } from "@/components/insights-dashboard-summary";
import { localDate } from "@/lib/attendance/domain";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { requireAnnouncementViewer } from "@/lib/announcements/authorization";
import { prisma } from "@/lib/prisma";
import { workLogLabel } from "@/lib/work-logs/domain";
import { creditedMinutesFromAttendance } from "@/lib/internship-progress/domain";
import {getCalendarItems} from "@/lib/calendar/data";
import { DashboardCalendar, InternProgressPanel, WeeklyHours } from "@/components/intern-mobile-dashboard";
import { DashboardAttendanceCard, type DashboardAttendance } from "@/components/dashboard-attendance-card";
import { getInternOnboarding } from "@/lib/onboarding/data";
import { AttentionQueue, DashboardMetricCard, DashboardMetricGrid, DashboardSection, ProgressRow, RoleDashboardHeader } from "@/components/role-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  if (user.role === "INTERN") return <><InternDashboard user={user} /><InsightsDashboardSummary role={user.role}/></>;
  if (user.role === "COORDINATOR") {
    const viewer = await requireAnnouncementViewer();
    return <><CoordinatorRoleDashboard user={user} /><InsightsDashboardSummary role={user.role}/><TaskDashboardSummary userId={user.id} role={user.role} /><EvaluationDashboardSummary userId={user.id} role={user.role}/><DocumentDashboardSummary userId={user.id} role={user.role}/><AnnouncementReaderSummary viewer={viewer} /></>;
  }
  if (user.role === "SUPERVISOR") {
    const viewer = await requireAnnouncementViewer();
    return <><SupervisorRoleDashboard user={user} /><InsightsDashboardSummary role={user.role}/><DocumentDashboardSummary userId={user.id} role={user.role}/><AnnouncementReaderSummary viewer={viewer} /></>;
  }

  if (user.role === "ADMIN") return <SystemDashboard user={user} />;
  const viewer = await requireAnnouncementViewer();
  return <><RepresentativeDashboard user={user} /><InsightsDashboardSummary role={user.role}/><AnnouncementManagerSummary viewer={viewer} /></>;
}

async function SupervisorRoleDashboard({ user }: { user: Awaited<ReturnType<typeof requireCurrentUser>> }) {
  const scope = { assignment: { supervisorProfile: { userId: user.id } } };
  const [profile, exceptions, corrections, submissions, evaluationsDue, taskCounts, attendanceQueue, taskQueue] = await Promise.all([
    prisma.supervisorProfile.findUnique({ where: { userId: user.id }, select: { assignments: { where: { status: "ACTIVE" }, select: { id: true, positionTitle: true, requiredHours: true, attendance: { where: { status: "APPROVED" }, select: { status: true, creditedMinutes: true } }, internProfile: { select: { user: { select: { firstName: true, lastName: true } } } } } } } }),
    prisma.attendance.count({ where: { status: "PENDING_REVIEW", ...scope } }),
    prisma.attendanceCorrection.count({ where: { status: "PENDING", attendance: scope } }),
    prisma.task.count({ where: { status: "SUBMITTED", ...scope } }),
    prisma.evaluation.count({ where: { status: "DRAFT", evaluatorId: user.id, ...scope } }),
    Promise.all(["TODO", "IN_PROGRESS", "SUBMITTED", "COMPLETED"].map((status) => prisma.task.count({ where: { status: status as "TODO", ...scope } }))),
    prisma.attendance.findMany({ where: { status: "PENDING_REVIEW", ...scope }, orderBy: { attendanceDate: "desc" }, take: 3, select: { id: true, attendanceDate: true, assignment: { select: { internProfile: { select: { user: { select: { firstName: true, lastName: true } } } } } } } }),
    prisma.task.findMany({
      where: { status: "SUBMITTED", ...scope }, orderBy: { submittedAt: "desc" }, take: 3,
      select: { id: true, title: true, submittedAt: true, assignment: { select: { internProfile: { select: { user: { select: { firstName: true, lastName: true } } } } } } },
    }),
  ]);
  const interns = profile?.assignments ?? [], needsAttention = exceptions + corrections + submissions + evaluationsDue;
  const queue = [...attendanceQueue.map((item) => ({ id: `a-${item.id}`, kind: "Attendance exception", title: `${item.assignment.internProfile.user.firstName} ${item.assignment.internProfile.user.lastName} · ${formatDate(item.attendanceDate)}`, detail: "Attendance evidence requires review", href: `/attendance/review/${item.id}`, action: "Review" })), ...taskQueue.map((item) => ({ id: `t-${item.id}`, kind: "Task submission", title: `${item.assignment.internProfile.user.firstName} ${item.assignment.internProfile.user.lastName} · ${item.title}`, detail: item.submittedAt ? `Submitted ${item.submittedAt.toLocaleDateString("en-PH", { dateStyle: "medium" })}` : "Submitted for review", href: `/tasks/review/${item.id}`, action: "Review" }))].slice(0, 5);
  return <div className="dashboard-page role-dashboard"><RoleDashboardHeader eyebrow="Company Supervisor" name={user.firstName} description="Monitor your assigned Interns and items requiring attention." action={{ href: "/attendance/review", label: "Review exceptions" }} /><DashboardMetricGrid><DashboardMetricCard label="Assigned Interns" value={interns.length} icon="users" tone="success" /><DashboardMetricCard label="Needs Attention" value={needsAttention} icon="review" tone={needsAttention ? "warning" : "success"} /><DashboardMetricCard label="Task Submissions" value={submissions} icon="journal" tone="info" /><DashboardMetricCard label="Evaluations Due" value={evaluationsDue} icon="clock" tone={evaluationsDue ? "warning" : "neutral"} /></DashboardMetricGrid><div className="role-dashboard-grid"><DashboardSection title="Needs your attention" description="Authorized review work from your assigned Interns." action={{ href: "/attendance/review", label: "Open review queue" }}><AttentionQueue items={queue} /></DashboardSection><DashboardSection title="Tasks & evaluations" description="Current directly assigned workload."><div className="dashboard-mini-summary"><div><strong>{taskCounts[0] + taskCounts[1]}</strong><span>Active tasks</span></div><div><strong>{taskCounts[2]}</strong><span>Submitted</span></div><div><strong>{taskCounts[3]}</strong><span>Completed</span></div><div><strong>{evaluationsDue}</strong><span>Evaluations due</span></div></div><div className="dashboard-section-links"><Link href="/tasks/review">View task review <Icon name="arrow" /></Link><Link href="/evaluations/review">View evaluations <Icon name="arrow" /></Link></div></DashboardSection></div><DashboardSection title="Intern progress" description="Credited hours across your directly assigned active Interns.">{interns.length ? <div className="dashboard-progress-list">{interns.map((item) => <ProgressRow key={item.id} name={`${item.internProfile.user.firstName} ${item.internProfile.user.lastName}`} subtitle={item.positionTitle ?? "Intern"} credited={creditedMinutesFromAttendance(item.attendance) / 60} required={item.requiredHours} />)}</div> : <EmptyState title="No assigned Interns" description="Assigned active Interns will appear here." />}</DashboardSection></div>;
}

async function CoordinatorRoleDashboard({ user }: { user: Awaited<ReturnType<typeof requireCurrentUser>> }) {
  const profile = await prisma.coordinatorProfile.findUnique({ where: { userId: user.id }, select: { school: { select: { name: true } }, assignments: { where: { status: "ACTIVE" }, select: { id: true, positionTitle: true, requiredHours: true, internProfile: { select: { user: { select: { firstName: true, lastName: true } } } }, attendance: { select: { status: true, creditedMinutes: true } } } } } });
  const students = profile?.assignments ?? [];
  const rows = students.map((item) => { const credited = creditedMinutesFromAttendance(item.attendance.filter((row) => row.status === "APPROVED")) / 60, percentage = item.requiredHours ? Math.min(100, Math.round(credited / item.requiredHours * 100)) : 0, attention = item.attendance.some((row) => row.status === "PENDING_REVIEW"); return { item, credited, percentage, status: attention ? "Needs attention" as const : percentage >= 90 ? "Near completion" as const : percentage === 0 ? "Not started" as const : "On track" as const }; });
  const needsAttention = rows.filter((row) => row.status === "Needs attention").length, nearCompletion = rows.filter((row) => row.status === "Near completion").length, notStarted = rows.filter((row) => row.status === "Not started").length;
  return <div className="dashboard-page role-dashboard"><RoleDashboardHeader eyebrow="School Coordinator" name={user.firstName} description={`Monitor internship progress for ${profile?.school.name ?? "your partner school"}.`} /><DashboardMetricGrid><DashboardMetricCard label="Monitored Students" value={students.length} icon="users" tone="info" /><DashboardMetricCard label="Needs Attention" value={needsAttention} icon="review" tone={needsAttention ? "warning" : "success"} /><DashboardMetricCard label="Near Completion" value={nearCompletion} icon="journal" tone="success" /><DashboardMetricCard label="Not Started" value={notStarted} icon="clock" /></DashboardMetricGrid><DashboardSection title="Student progress" description="School-scoped, read-only credited-hour progress." action={{ href: "/reports", label: "View reports" }}>{rows.length ? <div className="dashboard-progress-list">{rows.map(({ item, credited, status }) => <ProgressRow key={item.id} name={`${item.internProfile.user.firstName} ${item.internProfile.user.lastName}`} subtitle={item.positionTitle ?? "Intern"} credited={credited} required={item.requiredHours} status={status} />)}</div> : <EmptyState title="No active students" description="Students associated with your school will appear here." />}</DashboardSection></div>;
}

async function RepresentativeDashboard({ user }: { user: Awaited<ReturnType<typeof requireCurrentUser>> }) {
  const profile = await prisma.representativeProfile.findUnique({ where: { userId: user.id }, select: { companyId: true } });
  const companyId = profile?.companyId;
  const assignmentScope = companyId ? { assignment: { companyId } } : { assignment: { id: "__none__" } };
  const [activeInterns, pendingAttendance, pendingCorrections, activeSupervisors, attendanceQueue] = await Promise.all([
    prisma.internshipAssignment.count({ where: { companyId: companyId ?? "__none__", status: "ACTIVE" } }), prisma.attendance.count({ where: { status: "PENDING_REVIEW", ...assignmentScope } }), prisma.attendanceCorrection.count({ where: { status: "PENDING", attendance: assignmentScope } }), prisma.supervisorProfile.count({ where: { companyId: companyId ?? "__none__", user: { isActive: true } } }), prisma.attendance.findMany({ where: { status: "PENDING_REVIEW", ...assignmentScope }, orderBy: { attendanceDate: "desc" }, take: 5, select: { id: true, attendanceDate: true, assignment: { select: { internProfile: { select: { user: { select: { firstName: true, lastName: true } } } } } } } }),
  ]);
  const queue = attendanceQueue.map((item) => ({ id: item.id, kind: "Attendance review", title: `${item.assignment.internProfile.user.firstName} ${item.assignment.internProfile.user.lastName}`, detail: formatDate(item.attendanceDate), href: `/attendance/review/${item.id}`, action: "Review" }));
  return <div className="dashboard-page role-dashboard"><RoleDashboardHeader eyebrow="Bo’s Coffee Operations" name={user.firstName} description="Review current internship operations and items requiring attention." action={{ href: "/admin", label: "Company Operations" }} /><DashboardMetricGrid><DashboardMetricCard label="Active Interns" value={activeInterns} icon="users" tone="success" /><DashboardMetricCard label="Needs Review" value={pendingAttendance} icon="clock" tone={pendingAttendance ? "warning" : "success"} /><DashboardMetricCard label="Pending Corrections" value={pendingCorrections} icon="review" tone={pendingCorrections ? "warning" : "neutral"} /><DashboardMetricCard label="Active Supervisors" value={activeSupervisors} icon="users" tone="info" /></DashboardMetricGrid><DashboardSection title="Needs attention" description="Current authorized operational exceptions." action={{ href: "/attendance/review", label: "Open queue" }}><AttentionQueue items={queue} /></DashboardSection></div>;
}

async function SystemDashboard({ user }: { user: Awaited<ReturnType<typeof requireCurrentUser>> }) {
  const [users, inactive, schools, supervisors] = await Promise.all([prisma.user.count(), prisma.user.count({ where: { isActive: false } }), prisma.school.count({ where: { isActive: true } }), prisma.user.count({ where: { role: "SUPERVISOR", isActive: true } })]);
  return <div className="dashboard-page role-dashboard"><RoleDashboardHeader eyebrow="System Administrator" name={user.firstName} description="Manage IntelliTrack accounts and technical configuration." action={{ href: "/admin", label: "Open administration" }} /><DashboardMetricGrid><DashboardMetricCard label="User Accounts" value={users} icon="users" tone="info" /><DashboardMetricCard label="Inactive Accounts" value={inactive} icon="review" tone={inactive ? "warning" : "success"} /><DashboardMetricCard label="Partner Schools" value={schools} icon="school" /><DashboardMetricCard label="Active Supervisors" value={supervisors} icon="users" tone="success" /></DashboardMetricGrid><DashboardSection title="System management" description="Technical account and workspace controls."><div className="dashboard-section-links"><Link href="/admin/users">Manage users <Icon name="arrow" /></Link><Link href="/admin/settings/office">Office settings <Icon name="arrow" /></Link></div></DashboardSection></div>;
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
      attendance: { orderBy: { attendanceDate: "desc" }, select: { id: true, attendanceDate: true, clockIn: true, clockOut: true, workedMinutes:true, creditedMinutes: true, status: true, classification:true, createdAt: true, clockInInsideGeofence:true, clockOutInsideGeofence:true, corrections:{where:{status:"PENDING"},select:{id:true}} } },
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
  const onboarding = await getInternOnboarding(user.id);
  const calendarMonth=new Date(Date.UTC(todayDate.getUTCFullYear(),todayDate.getUTCMonth(),1)),calendarItems=await getCalendarItems(announcementViewer,calendarMonth,new Date(Date.UTC(todayDate.getUTCFullYear(),todayDate.getUTCMonth()+1,0,23,59,59)));
  const daysAttended=new Set(assignment.attendance.filter(row=>row.status==="APPROVED"&&row.creditedMinutes>0).map(row=>row.attendanceDate.toISOString().slice(0,10))).size;
  const logAction = !todayLog ? { label: "Create work log", href: "/work-logs/new" } : todayLog.status === "DRAFT" ? { label: "Continue draft", href: `/work-logs/${todayLog.id}/edit` } : { label: "View today’s log", href: `/work-logs/${todayLog.id}` };
  const activities = [
    ...assignment.attendance.map(row => ({ key: `a-${row.id}`, at: row.createdAt, title: `Attendance ${attendanceLabel(row.status).toLowerCase()}`, detail: formatDate(row.attendanceDate) })),
    ...assignment.workLogs.map(row => ({ key: `w-${row.id}`, at: row.updatedAt, title: workLogLabel(row.status), detail: row.title })),
    ...assignment.evaluations.map(row => ({ key: `e-${row.id}`, at: row.submittedAt??new Date(0), title: "Finalized evaluation", detail: `${row.evaluationType.charAt(0)+row.evaluationType.slice(1).toLowerCase()} · ${row.overallScore?.toString()??"Score not provided"}` })),
    ...assignment.documents.map(row => ({ key: `d-${row.id}`, at: row.createdAt, title: "Document update", detail: row.fileName })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 5);
  const attendanceState:DashboardAttendance["state"]=!today?"not-started":today.clockIn&&!today.clockOut?"clocked-in":today.status==="PENDING_REVIEW"?"needs-review":"completed";
  const locationState:DashboardAttendance["evidence"]["location"]=!today?"required":today.clockInInsideGeofence===false||today.clockOutInsideGeofence===false?"issue":today.clockInInsideGeofence===true&&(today.clockOut?today.clockOutInsideGeofence===true:true)?"verified":"captured";
  const selfieState:DashboardAttendance["evidence"]["selfie"]=!today?.clockIn?"required":"captured";
  const attendancePresentation:DashboardAttendance={id:today?.id,state:attendanceState,dateLabel:todayDate.toLocaleDateString("en-PH",{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"}),scheduleLabel:schedule(assignment.scheduleStartTime,assignment.scheduleEndTime),clockIn:time(today?.clockIn,assignment.company.timezone),clockInIso:today?.clockIn?.toISOString(),clockOut:time(today?.clockOut,assignment.company.timezone),workedMinutes:today?.workedMinutes,creditedMinutes:today?.creditedMinutes,evidence:{location:locationState,selfie:selfieState},issue:locationState==="issue"?"Location evidence needs attention.":attendanceState==="needs-review"?"Attendance evidence needs attention.":undefined};

  return <div className="dashboard-page">
    <section className="welcome-panel"><div><p className="eyebrow text-[#d7b99f]">Intern workspace</p><h1>Good day, {user.firstName}</h1><p>{assignment.positionTitle ?? "Intern"} · Active · {assignment.internProfile.course}</p><p className="welcome-context">{assignment.internProfile.school.name} · Bo’s Coffee Main Office</p></div></section>
    <section className="dashboard-grid-primary">
      <DashboardAttendanceCard attendance={attendancePresentation}/>
      <article className="ui-card progress-panel"><InternProgressPanel requiredHours={assignment.requiredHours} creditedMinutes={creditedMinutes} daysAttended={daysAttended} reportHref={`/reports/intern/${user.id}/pdf`}/></article>
    </section>
    {onboarding && !onboarding.counts.done ? <section className="ui-card onboarding-reminder"><div><p className="eyebrow">Complete your onboarding</p><h2>{onboarding.counts.percentage}% complete</h2><p>{onboarding.counts.yourAction} required item{onboarding.counts.yourAction===1?"":"s"} need your attention</p></div><Link href="/onboarding" className="text-link">Continue onboarding <Icon name="arrow"/></Link></section> : null}
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

function Detail({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function formatDate(value: Date) { return value.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" }); }
function time(value: Date | null | undefined, timezone: string) { return value ? value.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: timezone }) : "—"; }
function schedule(start: Date | null, end: Date | null) { const part = (value: Date) => value.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }); return start && end ? `${part(start)}–${part(end)}` : "Not specified"; }
function attendanceLabel(status: string) { if (status === "PENDING_REVIEW") return "Needs review"; if (status === "APPROVED") return "Auto-approved"; if (status === "CLOCKED_IN") return "Clocked in"; return status.charAt(0) + status.slice(1).toLowerCase().replaceAll("_", " "); }
