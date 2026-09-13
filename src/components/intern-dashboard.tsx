import Link from "next/link";
import type { ReactNode } from "react";
import type { CalendarItem } from "@/lib/calendar/domain";
import type { OnboardingCounts } from "@/lib/onboarding/domain";
import { creditedMinutesFromAttendance, formatHours, internshipProgress, scheduledPeriod } from "@/lib/internship-progress/domain";
import { TASK_LABELS, isOverdue } from "@/lib/tasks/domain";
import { attendanceStateLabel, dashboardAttendanceState, dashboardGreeting, formatDashboardMinutes, relevantTasks, weeklyAttendance, workLogAction, type InternAttendanceRecord, type InternLog, type InternTask } from "@/lib/dashboard/intern-presentation";
import { DashboardAttendanceCard, ElapsedTime, type DashboardAttendance } from "./dashboard-attendance-card";
import { Icon, type IconName } from "./icons";
import { ProgressBar, StatusBadge } from "./ui";
import styles from "./intern-dashboard.module.css";

export type InternDashboardProps = {
  firstName: string; now: Date; today: Date; timezone: string; workplace: string; branchAssigned: boolean;
  school: string; program: string; position: string | null; supervisor: string | null;
  startDate: Date; endDate: Date; requiredHours: number; scheduleStart: Date | null; scheduleEnd: Date | null;
  attendance: InternAttendanceRecord[]; selfieUrl: string | null; log: InternLog | null; tasks: InternTask[];
  calendar: CalendarItem[]; onboarding: OnboardingCounts | null; pendingCorrections: number; children?: ReactNode;
};
const dateLabel = (date: Date) => date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const timeLabel = (date: Date | null | undefined, timezone: string) => date?.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: timezone });
function SectionHeading({ id, eyebrow, title, icon, action }: { id?: string; eyebrow?: string; title: string; icon: IconName; action?: { href: string; label: string } }) {
  return <header className={styles.sectionHeader}><div className={styles.sectionIdentity}><span className={styles.sectionIcon}><Icon name={icon} /></span><div>{eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}<h2 id={id}>{title}</h2></div></div>{action ? <Link href={action.href} className="text-link">{action.label}<Icon name="arrow" /></Link> : null}</header>;
}

export function InternDashboardView(props: InternDashboardProps) {
  const { firstName, now, today, timezone, workplace, supervisor, requiredHours, attendance, log, onboarding } = props;
  const todayRecord = attendance.find(row => row.attendanceDate.getTime() === today.getTime());
  const state = dashboardAttendanceState(todayRecord, today);
  const logAction = workLogAction(log);
  const progress = internshipProgress(requiredHours, creditedMinutesFromAttendance(attendance));
  const tasks = relevantTasks(props.tasks, now);
  const upcoming = props.calendar.filter(item => item.date >= today.toISOString().slice(0, 10) && ["event", "holiday", "evaluation", "milestone"].includes(item.type)).sort((a,b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? "")).slice(0, 4);
  const location: DashboardAttendance["evidence"]["location"] = !todayRecord ? "required" : todayRecord.clockInInsideGeofence === false || todayRecord.clockOutInsideGeofence === false ? "issue" : todayRecord.clockInInsideGeofence === true && (!todayRecord.clockOut || todayRecord.clockOutInsideGeofence === true) ? "verified" : "issue";
  const selfie: DashboardAttendance["evidence"]["selfie"] = !todayRecord ? "required" : todayRecord.hasTimeInSelfie && (!todayRecord.clockOut || todayRecord.hasTimeOutSelfie) ? "captured" : "issue";
  const presentation: DashboardAttendance = {
    id: todayRecord?.id, state, dateLabel: dateLabel(today),
    scheduleLabel: props.scheduleStart && props.scheduleEnd ? `${timeLabel(props.scheduleStart, "UTC")} – ${timeLabel(props.scheduleEnd, "UTC")}` : "Not specified",
    clockIn: timeLabel(todayRecord?.clockIn, timezone), clockInIso: todayRecord?.clockIn?.toISOString(), clockOut: timeLabel(todayRecord?.clockOut, timezone), nowIso: now.toISOString(),
    creditedMinutes: todayRecord?.creditedMinutes, workedMinutes: todayRecord?.workedMinutes, workplace, selfieUrl: props.selfieUrl,
    evidence: { location, selfie }, pendingCorrection: Boolean(todayRecord?.corrections.length),
    issue: todayRecord?.corrections.length ? "A correction request is awaiting review." : state === "incomplete" ? "This Attendance record is incomplete. Review the recorded times and request a correction if needed." : state === "needs-review" ? "This Attendance record has an exception. Open the details for the recorded issue and review status." : undefined,
  };
  return <div className={styles.dashboard}>
    <section className={`ui-card ${styles.summary}`} aria-labelledby="intern-greeting">
      <div className={styles.greetingRow}><div><p className={styles.internBadge}>Intern</p><p className={styles.programLine}><Icon name="school" />{props.program} · {props.school}</p><h1 id="intern-greeting">{dashboardGreeting(now, timezone)}, {firstName}!</h1><p className={styles.placementLine}><Icon name="home" />{workplace}<span>{scheduledPeriod(props.startDate, props.endDate)}</span></p></div><div className={styles.headerActions}><Link href="/attendance" className="button button-secondary"><Icon name="clock" />View Attendance</Link><Link href={logAction.href} className="button button-primary"><Icon name="journal" />{!log ? "New Work Log" : logAction.label}</Link></div></div>
      <div className={styles.progressSummary}><div className={styles.progressMain}><p className={styles.eyebrow}>Internship Progress</p><div className={styles.progressNumbers}><p><strong>{formatHours(progress.creditedHours)}</strong><span> / {formatHours(requiredHours)} rendered</span></p><b>{progress.percentage}%</b></div><ProgressBar value={progress.visualPercentage ?? 0} label="Internship hours completed" /></div><dl><div><dt>Hours remaining</dt><dd>{formatHours(progress.remainingHours ?? 0)}</dd></div><div><dt>Scheduled end</dt><dd>{dateLabel(props.endDate)}</dd></div></dl></div>
    </section>
    <DashboardAttendanceCard attendance={presentation} />
    <div className={styles.workspace}>
      <div className={styles.mainColumn}>
        <section className={`ui-card ${styles.card}`} aria-labelledby="today-log-title"><SectionHeading id="today-log-title" eyebrow="Daily work & learning" title="Today's Work Log" icon="journal" /><div className={styles.logMeta}><StatusBadge tone={logAction.status === "Submitted" ? "success" : log ? "warning" : "neutral"}>{logAction.status}</StatusBadge><time dateTime={today.toISOString().slice(0,10)}>{dateLabel(today)}</time></div>{log ? <div className={styles.logPreview}><h3>What did you work on today?</h3><p>{log.description}</p>{log.learnings ? <><h3>Learning & reflection</h3><p>{log.learnings}</p></> : null}{Array.isArray(log.skillsApplied) && log.skillsApplied.some(skill => typeof skill === "string") ? <ul className={styles.skillTags}>{log.skillsApplied.filter((skill): skill is string => typeof skill === "string").slice(0,5).map((skill,index) => <li key={`${index}-${skill}`}>{skill}</li>)}</ul> : null}</div> : <div className={styles.logEmpty}><span className={styles.sectionIcon}><Icon name="journal" /></span><div><h3>Capture today&apos;s work and learning.</h3><p>Record what you worked on, the skills you used, and what you learned. Attendance remains the source of credited hours.</p></div></div>}<div className={styles.cardFooter}><Link href={logAction.href} className="button button-primary">{logAction.label}<Icon name="arrow" /></Link><Link href="/work-logs" className="text-link">All Work Logs</Link></div></section>
        <section className={`ui-card ${styles.card}`} aria-labelledby="my-tasks-title"><SectionHeading id="my-tasks-title" eyebrow="Assigned work" title="My Tasks" icon="review" action={{ href: "/tasks", label: "View all Tasks" }} />{tasks.length ? <ul className={styles.taskList}>{tasks.map(task => {
          const overdue = isOverdue(task, now), revision = task.status === "REVISION_REQUESTED";
          return <li key={task.id}><Link href={`/tasks/${task.id}`}><span className={styles.taskGlyph}><Icon name={task.status === "COMPLETED" ? "check" : overdue || revision ? "alert" : "review"} /></span><span className={styles.taskDescription}><strong>{task.title}</strong><small>{task.dueAt ? `${overdue ? "Overdue · " : "Due "}${dateLabel(task.dueAt)}` : "No due date"}</small></span><StatusBadge tone={overdue ? "danger" : revision || task.status === "BLOCKED" ? "warning" : task.status === "COMPLETED" ? "success" : "neutral"}>{TASK_LABELS[task.status]}</StatusBadge></Link></li>;
        })}</ul> : <p className={styles.emptyCopy}>No Tasks assigned yet. Assigned work will appear here.</p>}{props.pendingCorrections > 0 ? <div className={styles.correctionNotice}><Icon name="alert" /><Link href="/attendance/corrections">{props.pendingCorrections} attendance correction{props.pendingCorrections === 1 ? "" : "s"} awaiting review</Link></div> : null}</section>
        <section className={`ui-card ${styles.card}`} aria-labelledby="weekly-attendance-title"><SectionHeading id="weekly-attendance-title" eyebrow="Attendance records" title="This Week's Attendance" icon="clock" action={{ href: "/attendance/history", label: "History" }} /><div className={styles.weekGrid}>{weeklyAttendance(attendance, today).map(day => {
          const tone = day.state === "completed" || day.state === "clocked-in" ? "success" : day.state === "needs-review" || day.state === "incomplete" ? "warning" : "neutral";
          const content = <><time dateTime={day.date.toISOString().slice(0,10)}>{day.date.toLocaleDateString("en-PH", { weekday: "short", timeZone: "UTC" })}<span>{day.date.toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" })}</span></time><strong>{day.state === "completed" && day.record ? formatDashboardMinutes(day.record.creditedMinutes) : day.state === "clocked-in" && day.record?.clockIn ? <ElapsedTime clockInIso={day.record.clockIn.toISOString()} nowIso={now.toISOString()} /> : "—"}</strong><StatusBadge tone={tone}>{attendanceStateLabel(day.state)}</StatusBadge></>;
          return <div key={day.date.toISOString()} className={`${styles.weekDay} ${day.isToday ? styles.today : ""}`}>{day.record ? <Link href={`/attendance/${day.record.id}`} aria-label={`${dateLabel(day.date)}: ${attendanceStateLabel(day.state)}`}>{content}</Link> : content}</div>;
        })}</div></section>
      </div>
      <aside className={styles.rail} aria-label="Internship context">
        <section className={`ui-card ${styles.card}`}><SectionHeading eyebrow="Your calendar" title="Upcoming Calendar" icon="clock" action={{ href: "/calendar", label: "View" }} />{upcoming.length ? <ol className={styles.calendarList}>{upcoming.map(item => <li key={item.key}><time dateTime={item.date}><b>{Number(item.date.slice(-2))}</b><span>{new Date(`${item.date}T00:00:00Z`).toLocaleDateString("en", { month: "short", timeZone: "UTC" })}</span></time><div>{item.href ? <Link href={item.href}>{item.title}</Link> : <strong>{item.title}</strong>}{item.startTime ? <small>{item.startTime}{item.endTime ? ` – ${item.endTime}` : ""}</small> : null}{item.detail ? <small>{item.detail}</small> : null}</div></li>)}</ol> : <p className={styles.emptyCopy}>No upcoming events in the next 45 days. Your schedule is available in Calendar.</p>}</section>
        <section className={`ui-card ${styles.card}`}><SectionHeading title="Assigned Supervisor" icon="users" /><div className={styles.supervisor}><span className={styles.supervisorAvatar} aria-hidden="true">{supervisor ? supervisor.split(/\s+/).filter(Boolean).slice(0,2).map(word => word[0]).join("") : "—"}</span><div><h3>{supervisor || "Not assigned"}</h3><p>Company Supervisor</p></div></div><dl className={styles.contextFacts}><div><dt>{props.branchAssigned ? "Assigned Branch" : "Workplace"}</dt><dd>{workplace}</dd></div>{props.position ? <div><dt>Internship role</dt><dd>{props.position}</dd></div> : null}</dl></section>
        {onboarding && !onboarding.done ? <section className={`ui-card ${styles.card}`}><SectionHeading title="Complete your onboarding" icon="check" /><div className={styles.setupProgress}><strong>{onboarding.complete} / {onboarding.required}</strong><span>requirements complete</span></div><ProgressBar value={onboarding.percentage} label="Onboarding requirements complete" /><Link className={`button button-secondary ${styles.setupAction}`} href="/onboarding">Continue setup<Icon name="arrow" /></Link></section> : null}
      </aside>
    </div>
    {props.children ? <div className={styles.additional}>{props.children}</div> : null}
  </div>;
}
