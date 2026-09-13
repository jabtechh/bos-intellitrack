import localFont from "next/font/local";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { requireCurrentUser } from "@/lib/auth/require-current-user";
import { requireAnnouncementViewer } from "@/lib/announcements/authorization";
import { localDate } from "@/lib/attendance/domain";
import { signedEvidenceUrl } from "@/lib/attendance/storage";
import { getCalendarItems } from "@/lib/calendar/data";
import { getInternOnboarding } from "@/lib/onboarding/data";
import { optionalBranchName, workplaceLabel } from "@/lib/dashboard/intern-presentation";
import { AnnouncementReaderSummary } from "./announcement-dashboard-summary";
import { EmptyState, PageHeader } from "./ui";
import { InternDashboardView } from "./intern-dashboard";

const jakarta = localFont({ src: "./landing/fonts/PlusJakartaSans.ttf", display: "swap", variable: "--font-intern-dashboard", weight: "200 800" });

export async function InternDashboard({ user }: { user: Awaited<ReturnType<typeof requireCurrentUser>> }) {
  const assignment = await prisma.internshipAssignment.findFirst({
    where: { status: "ACTIVE", internProfile: { userId: user.id } },
    select: {
      id: true, positionTitle: true, department: true, requiredHours: true,
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
    },
  });
  if (!assignment) return <div className="dashboard-page"><PageHeader eyebrow="Intern" title={`Welcome, ${user.firstName}`} description="Your dashboard will become available after an active internship is configured." /><section className="ui-card"><EmptyState title="No active internship" description="Contact your coordinator if you expected an active internship to appear here." /></section></div>;
  if (assignment.requiredHours === null) redirect("/onboarding/internship-hours");
  const now = new Date(), today = localDate(now, assignment.company.timezone);
  const viewer = await requireAnnouncementViewer();
  const calendarEnd = new Date(today); calendarEnd.setUTCDate(calendarEnd.getUTCDate() + 45);
  const [log, onboarding, calendar, branch, pendingCorrections] = await Promise.all([
    prisma.workLog.findUnique({ where: { assignmentId_workDate: { assignmentId: assignment.id, workDate: today } }, select: { id: true, status: true, workDate: true, description: true, skillsApplied: true, learnings: true } }),
    getInternOnboarding(user.id),
    getCalendarItems(viewer, today, calendarEnd),
    optionalBranchName(() => prisma.internshipAssignment.findFirst({ where: { id: assignment.id, internProfile: { userId: user.id } }, select: { branch: { select: { name: true } } } })),
    prisma.attendanceCorrection.count({ where: { requestedById: user.id, status: "PENDING" } }),
  ]);
  const current = assignment.attendance.find(row => row.attendanceDate.getTime() === today.getTime());
  // Only the owning assignment's current evidence is signed; raw storage paths never enter the view props.
  const selfieUrl = current?.clockInSelfiePath ? await signedEvidenceUrl(current.clockInSelfiePath).catch(() => null) : null;
  const attendance = assignment.attendance.map(({ clockInSelfiePath, clockOutSelfiePath, ...row }) => ({ ...row, hasTimeInSelfie: Boolean(clockInSelfiePath), hasTimeOutSelfie: Boolean(clockOutSelfiePath) }));
  return <div className={jakarta.variable}><InternDashboardView
    firstName={user.firstName} now={now} today={today} timezone={assignment.company.timezone}
    workplace={workplaceLabel(branch, assignment.company.name, assignment.company.branchName)} branchAssigned={Boolean(branch)}
    school={assignment.internProfile.school.name} program={assignment.internProfile.course} position={assignment.positionTitle}
    supervisor={assignment.supervisorProfile ? `${assignment.supervisorProfile.user.firstName} ${assignment.supervisorProfile.user.lastName}` : null}
    startDate={assignment.startDate} endDate={assignment.endDate} requiredHours={assignment.requiredHours}
    scheduleStart={assignment.scheduleStartTime} scheduleEnd={assignment.scheduleEndTime}
    attendance={attendance} selfieUrl={selfieUrl} log={log} tasks={assignment.tasks} calendar={calendar}
    onboarding={onboarding?.counts ?? null} pendingCorrections={pendingCorrections}
  ><AnnouncementReaderSummary viewer={viewer} /></InternDashboardView></div>;
}
