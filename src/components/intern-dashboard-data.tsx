import type { ReactNode } from "react";
import { assignmentBranch } from "@/lib/branches/compatibility";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { requireCurrentUser } from "@/lib/auth/require-current-user";
import { requireAnnouncementViewer } from "@/lib/announcements/authorization";
import { localDate } from "@/lib/attendance/domain";
import { signedEvidenceUrl } from "@/lib/attendance/storage";
import { getInternOnboarding } from "@/lib/onboarding/data";
import { workplaceLabel } from "@/lib/dashboard/intern-presentation";
import { AnnouncementReaderSummary } from "./announcement-dashboard-summary";
import { EmptyState, PageHeader } from "./ui";
import { InternDashboardView } from "./intern-dashboard";
import { CertificateProgressCard } from "./certificate-progress-card";
import { MyStatusCard } from "./my-status-card";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";

const dashboardSelect = {
  id: true, status: true, completedAt: true, positionTitle: true, department: true, requiredHours: true,
  startDate: true, endDate: true, scheduleStartTime: true, scheduleEndTime: true,
  company: { select: { name: true, branchName: true, timezone: true } },
  internProfile: { select: { course: true, school: { select: { name: true } } } },
  supervisorProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
  attendance: { orderBy: { attendanceDate: "desc" }, select: {
    id: true, attendanceDate: true, status: true, classification: true, clockIn: true, clockOut: true,
    workedMinutes: true, creditedMinutes: true, clockInInsideGeofence: true, clockOutInsideGeofence: true,
    clockInSelfiePath: true, clockOutSelfiePath: true, corrections: { where: { status: "PENDING" }, select: { id: true } },
  } },
  tasks: { where: { status: { not: "CANCELLED" } }, select: { id: true, title: true, status: true, dueAt: true, updatedAt: true } },
} as const;

export async function InternDashboard({ user, children }: { user: Awaited<ReturnType<typeof requireCurrentUser>>; children?: ReactNode }) {
  // The active internship; otherwise (DEC-2026-021) the latest completed Main Office internship, shown on the
  // same dashboard in a read-only "completed" mode so the intern keeps every section and record.
  const assignment = await prisma.internshipAssignment.findFirst({ where: { status: "ACTIVE", internProfile: { userId: user.id } }, select: dashboardSelect })
    ?? await prisma.internshipAssignment.findFirst({ where: { status: "COMPLETED", internProfile: { userId: user.id }, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } }, orderBy: [{ completedAt: "desc" }, { endDate: "desc" }], select: dashboardSelect });
  if (!assignment) return <div className="dashboard-page"><PageHeader className="brand-banner" eyebrow="Intern" title={`Welcome, ${user.firstName}`} description="Your dashboard will become available after an active internship is configured." /><section className="ui-card"><EmptyState title="No active internship" description="Contact your coordinator if you expected an active internship to appear here." /></section></div>;
  const completed = assignment.status === "COMPLETED";
  if (!completed && assignment.requiredHours === null) redirect("/onboarding/internship-hours");
  const now = new Date();
  // A completed internship shows its final week and latest Work Log instead of "today".
  const today = completed ? assignment.attendance[0]?.attendanceDate ?? assignment.endDate : localDate(now, assignment.company.timezone);
  const viewer = await requireAnnouncementViewer();
  const [log, onboarding, branch, pendingCorrections] = await Promise.all([
    completed
      ? prisma.workLog.findFirst({ where: { assignmentId: assignment.id, status: { in: ["SUBMITTED", "APPROVED"] } }, orderBy: { workDate: "desc" }, select: { id: true, status: true, workDate: true, description: true, skillsApplied: true, learnings: true } })
      : prisma.workLog.findUnique({ where: { assignmentId_workDate: { assignmentId: assignment.id, workDate: today } }, select: { id: true, status: true, workDate: true, description: true, skillsApplied: true, learnings: true } }),
    getInternOnboarding(user.id),
    assignmentBranch(assignment.id).then(branch => branch?.name ?? null),
    prisma.attendanceCorrection.count({ where: { requestedById: user.id, status: "PENDING" } }),
  ]);
  const current = completed ? undefined : assignment.attendance.find(row => row.attendanceDate.getTime() === today.getTime());
  // Only the owning assignment's current evidence is signed; raw storage paths never enter the view props.
  const selfieUrl = current?.clockInSelfiePath ? await signedEvidenceUrl(current.clockInSelfiePath).catch(() => null) : null;
  const attendance = assignment.attendance.map(({ clockInSelfiePath, clockOutSelfiePath, ...row }) => ({ ...row, hasTimeInSelfie: Boolean(clockInSelfiePath), hasTimeOutSelfie: Boolean(clockOutSelfiePath) }));
  return <InternDashboardView
    firstName={user.firstName} now={now} today={today} timezone={assignment.company.timezone}
    workplace={workplaceLabel(branch, assignment.company.name, assignment.company.branchName)} branchAssigned={Boolean(branch)}
    school={assignment.internProfile.school.name} program={assignment.internProfile.course} position={assignment.positionTitle}
    supervisor={assignment.supervisorProfile ? `${assignment.supervisorProfile.user.firstName} ${assignment.supervisorProfile.user.lastName}` : null}
    startDate={assignment.startDate} endDate={assignment.endDate} requiredHours={assignment.requiredHours ?? 0}
    scheduleStart={assignment.scheduleStartTime} scheduleEnd={assignment.scheduleEndTime}
    attendance={attendance} selfieUrl={selfieUrl} log={log} tasks={assignment.tasks}
    onboarding={onboarding?.counts ?? null} pendingCorrections={pendingCorrections} insights={children}
    completed={completed ? { assignmentId: assignment.id, completedAt: assignment.completedAt } : undefined}
    certificate={<><MyStatusCard assignmentId={assignment.id} /><CertificateProgressCard assignmentId={assignment.id} /></>}
  ><AnnouncementReaderSummary viewer={viewer} /></InternDashboardView>;
}
