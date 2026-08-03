import Link from "next/link";
import { Icon } from "@/components/icons";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "@/components/ui";
import { localDate } from "@/lib/attendance/domain";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";
import { workLogLabel } from "@/lib/work-logs/domain";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  if (user.role === "INTERN") return <InternDashboard user={user} />;
  if (user.role === "COORDINATOR") return <CoordinatorDashboard user={user} />;

  const attendance = await getReviewerAttendance(user.id, user.role);
  const corrections = await getCorrectionSummary(user.id, user.role);
  return <div className="dashboard-page"><PageHeader eyebrow="Bo’s Coffee Main Office" title={`Welcome back, ${user.firstName}`} description="Review current operations and the items that need your attention." actions={user.role === "ADMIN" ? <Link href="/admin" className="button button-primary">Open administration <Icon name="arrow" /></Link> : undefined} /><div className="metric-grid">{attendance.items.map(([label, value]) => <MetricCard key={label} label={label} value={value} icon="clock" />)}{corrections ? <MetricCard label={corrections.label} value={corrections.count} icon="review" /> : null}</div><section className="ui-card mt-6 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6"><div><h2 className="font-semibold text-brand-900">Review workspace</h2><p className="mt-1 text-sm text-secondary">Open the relevant queue to continue reviewing operational exceptions.</p></div><div className="action-bar"><Link href={attendance.href} className="button button-primary">{attendance.link}</Link><Link href="/work-logs/review" className="button button-secondary">Review work logs</Link></div></section></div>;
}

async function CoordinatorDashboard({ user }: { user: Awaited<ReturnType<typeof requireCurrentUser>> }) {
  const profile = await prisma.coordinatorProfile.findUnique({ where: { userId: user.id }, select: { school: { select: { name: true } }, assignments: { where: { status: "ACTIVE" }, select: { id: true, requiredHours: true, renderedHours: true, internProfile: { select: { user: { select: { firstName: true, lastName: true } } } }, attendance: { orderBy: { attendanceDate: "desc" }, take: 1, select: { status: true, attendanceDate: true } } } } } });
  const students = profile?.assignments ?? [];
  const needingAttention = students.filter(item => item.attendance[0]?.status === "PENDING_REVIEW").length;
  return <div className="dashboard-page"><PageHeader eyebrow="School Coordinator" title={`Welcome back, ${user.firstName}`} description={`Monitor internship progress for ${profile?.school.name ?? "your partner school"}.`} /><div className="metric-grid"><MetricCard label="Monitored students" value={students.length} icon="users" /><MetricCard label="Needs attention" value={needingAttention} icon="review" /><MetricCard label="Role" value="Read-only monitoring" icon="school" /></div><section className="ui-card mt-6 overflow-hidden"><div className="border-b border-border p-5"><h2 className="font-semibold text-brand-900">Student progress</h2><p className="mt-1 text-sm text-secondary">Required and credited hours for active students from your school.</p></div>{students.length?<div className="compact-list">{students.map(item=>{const credited=Number(item.renderedHours);const latest=item.attendance[0];return <div key={item.id} className="flex items-center justify-between gap-4 border-b border-border p-4"><span><strong>{item.internProfile.user.firstName} {item.internProfile.user.lastName}</strong><small className="block text-muted">{credited.toFixed(1)} of {item.requiredHours} hours credited</small></span><StatusBadge tone={latest?.status==="PENDING_REVIEW"?"warning":"neutral"}>{latest?.status==="PENDING_REVIEW"?"Needs attention":"Monitoring"}</StatusBadge></div>})}</div>:<EmptyState title="No active students" description="Students associated with your school will appear here when their internship is active." />}</section></div>;
}

async function InternDashboard({ user }: { user: Awaited<ReturnType<typeof requireCurrentUser>> }) {
  const assignment = await prisma.internshipAssignment.findFirst({
    where: { status: "ACTIVE", internProfile: { userId: user.id } },
    select: {
      id: true, status: true, positionTitle: true, department: true, requiredHours: true, renderedHours: true,
      scheduleStartTime: true, scheduleEndTime: true, startDate: true, endDate: true,
      company: { select: { timezone: true } },
      internProfile: { select: { course: true, yearLevel: true, school: { select: { name: true } } } },
      supervisorProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
      attendance: { orderBy: { attendanceDate: "desc" }, take: 5, select: { id: true, attendanceDate: true, clockIn: true, clockOut: true, creditedMinutes: true, status: true, createdAt: true } },
      workLogs: { orderBy: { workDate: "desc" }, take: 5, select: { id: true, workDate: true, title: true, status: true, updatedAt: true } },
    },
  });
  const pendingCorrections = await prisma.attendanceCorrection.count({ where: { requestedById: user.id, status: "PENDING" } });
  if (!assignment) return <div className="dashboard-page"><PageHeader eyebrow="Intern workspace" title={`Welcome, ${user.firstName}`} description="Your dashboard will become available after an active internship is configured." /><section className="ui-card"><EmptyState title="No active internship" description="Contact your coordinator if you expected an active internship to appear here." /></section></div>;

  const todayDate = localDate(new Date(), assignment.company.timezone);
  const today = assignment.attendance.find(row => row.attendanceDate.getTime() === todayDate.getTime());
  const todayLog = assignment.workLogs.find(row => row.workDate.getTime() === todayDate.getTime());
  const rendered = Number(assignment.renderedHours);
  const remaining = Math.max(assignment.requiredHours - rendered, 0);
  const progress = assignment.requiredHours ? Math.min(Math.round(rendered / assignment.requiredHours * 100), 100) : 0;
  const attendanceAction = !today ? "Clock in" : today.clockIn && !today.clockOut ? "Clock out" : "View attendance";
  const logAction = !todayLog ? { label: "Create work log", href: "/work-logs/new" } : todayLog.status === "DRAFT" || todayLog.status === "REVISION_REQUIRED" ? { label: todayLog.status === "DRAFT" ? "Continue draft" : "Revise work log", href: `/work-logs/${todayLog.id}/edit` } : { label: "View today’s log", href: `/work-logs/${todayLog.id}` };
  const activities = [
    ...assignment.attendance.map(row => ({ key: `a-${row.id}`, at: row.createdAt, title: `Attendance ${attendanceLabel(row.status).toLowerCase()}`, detail: formatDate(row.attendanceDate) })),
    ...assignment.workLogs.map(row => ({ key: `w-${row.id}`, at: row.updatedAt, title: workLogLabel(row.status), detail: row.title })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 5);

  return <div className="dashboard-page">
    <section className="welcome-panel"><div><p className="eyebrow text-[#d7b99f]">Intern workspace</p><h1>Good day, {user.firstName}</h1><p>{assignment.positionTitle ?? "Intern"} · {assignment.internProfile.course}</p><p className="welcome-context">{assignment.internProfile.school.name} · Bo’s Coffee Main Office</p></div><Link href="/attendance" className="button welcome-action"><Icon name="clock" />{attendanceAction}</Link></section>
    <section className="dashboard-grid-primary">
      <article className="ui-card attendance-focus"><div className="section-heading"><div><p className="eyebrow">Your day at Bo’s Coffee</p><h2>Today’s attendance</h2></div><StatusBadge tone={today?.status === "APPROVED" ? "success" : today?.status === "PENDING_REVIEW" ? "warning" : today ? "info" : "neutral"}>{today ? attendanceLabel(today.status) : "Not started"}</StatusBadge></div><div className="attendance-times"><TimeStat label="Scheduled" value={schedule(assignment.scheduleStartTime, assignment.scheduleEndTime)} /><TimeStat label="Clock in" value={time(today?.clockIn, assignment.company.timezone)} /><TimeStat label="Clock out" value={time(today?.clockOut, assignment.company.timezone)} /></div><Link href="/attendance" className="button button-primary attendance-primary"><Icon name="clock" />{attendanceAction}</Link><p className="approval-note"><Icon name="check" />Complete GPS and selfie evidence is approved automatically unless an exception is detected.</p></article>
      <article className="ui-card progress-panel"><div className="section-heading"><div><p className="eyebrow">Internship progress</p><h2>Required hours</h2></div><strong className="progress-percent">{progress}%</strong></div><div className="progress-track" aria-label={`${progress}% of required hours completed`}><span style={{ width: `${progress}%` }} /></div><div className="progress-stats"><TimeStat label="Credited" value={`${rendered.toFixed(1)}h`} /><TimeStat label="Required" value={`${assignment.requiredHours}h`} /><TimeStat label="Remaining" value={`${remaining.toFixed(1)}h`} /></div><p className="panel-footnote">Internship active · {formatDate(assignment.startDate)}–{formatDate(assignment.endDate)}</p></article>
    </section>
    <section className="dashboard-grid-secondary">
      <article className="ui-card worklog-focus"><div className="section-heading"><div><p className="eyebrow">Today’s documentation</p><h2>Daily work log</h2></div><StatusBadge tone={todayLog?.status === "APPROVED" ? "success" : todayLog?.status === "SUBMITTED" ? "info" : todayLog?.status === "REJECTED" || todayLog?.status === "REVISION_REQUIRED" ? "warning" : "neutral"}>{todayLog ? workLogLabel(todayLog.status) : "Not started"}</StatusBadge></div><p className="mt-3 text-sm leading-6 text-secondary">{todayLog?.title ?? "Document today’s accomplishments, learning, and rendered hours."}</p><Link href={logAction.href} className="button button-secondary mt-5">{logAction.label}<Icon name="arrow" /></Link></article>
      <article className="ui-card pending-panel"><p className="eyebrow">Pending items</p><h2>Needs attention</h2><Link href="/attendance/corrections" className="pending-row"><span className="metric-icon"><Icon name="review" /></span><span><strong>Attendance corrections</strong><small>{pendingCorrections ? `${pendingCorrections} awaiting review` : "No pending requests"}</small></span><Icon name="arrow" /></Link></article>
    </section>
    <section className="dashboard-grid-bottom">
      <article className="ui-card activity-panel"><div className="section-heading"><div><p className="eyebrow">Latest updates</p><h2>Recent activity</h2></div></div>{activities.length ? <ol className="activity-list">{activities.map(item => <li key={item.key}><span className="activity-dot" /><div><strong>{item.title}</strong><p>{item.detail}</p></div></li>)}</ol> : <p className="empty-copy">Your attendance and work-log activity will appear here.</p>}</article>
      <article className="ui-card internship-panel"><p className="eyebrow">Internship details</p><h2>Your placement</h2><dl><Detail label="Office" value="Bo’s Coffee Main Office" /><Detail label="School" value={assignment.internProfile.school.name} /><Detail label="Program" value={[assignment.internProfile.course, assignment.internProfile.yearLevel].filter(Boolean).join(" · ")} /><Detail label="Supervisor" value={`${assignment.supervisorProfile.user.firstName} ${assignment.supervisorProfile.user.lastName}`} /><Detail label="Team" value={[assignment.positionTitle, assignment.department].filter(Boolean).join(" · ") || "Not specified"} /></dl></article>
    </section>
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
