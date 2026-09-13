import { InternDashboard } from "@/components/intern-dashboard-data";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { AnnouncementManagerSummary, AnnouncementReaderSummary } from "@/components/announcement-dashboard-summary";
import { EmptyState } from "@/components/ui";
import { TaskDashboardSummary } from "@/components/task-dashboard-summary";
import { EvaluationDashboardSummary } from "@/components/evaluation-dashboard-summary";
import { DocumentDashboardSummary } from "@/components/document-dashboard-summary";
import { InsightsDashboardSummary } from "@/components/insights-dashboard-summary";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { requireAnnouncementViewer } from "@/lib/announcements/authorization";
import { prisma } from "@/lib/prisma";
import { creditedMinutesFromAttendance } from "@/lib/internship-progress/domain";
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

function formatDate(value: Date) { return value.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" }); }
