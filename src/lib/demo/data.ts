import { createHash } from "node:crypto";

export const DEMO_DATA_SEED = 20260817;
export const DEMO_DATA_CONFIRMATION = "1";
export const DEMO_DATA_ANCHOR = new Date("2026-08-17T00:00:00.000Z");
export const DEMO_DATA_EMAIL_SUFFIX = "@demo.intellitrack.example";

export type DemoRole = "INTERN" | "SUPERVISOR" | "COORDINATOR" | "REPRESENTATIVE";
export type DemoIdentity = { key: string; role: DemoRole; firstName: string; lastName: string; email: string; existing: boolean };
export type DemoAttendance = { key: string; date: Date; clockIn: Date | null; clockOut: Date | null; workedMinutes: number; creditedMinutes: number; classification: "ON_TIME" | "LATE" | "EARLY_DEPARTURE" | "LATE_AND_EARLY_DEPARTURE" | "UNDETERMINED"; status: "APPROVED" | "PENDING_REVIEW" | "INCOMPLETE"; reviewRequired: boolean };
export type DemoWorkLog = { key: string; date: Date; status: "DRAFT" | "SUBMITTED"; description: string; skills: string[]; challenges: string | null; learnings: string | null };
export type DemoTask = { key: string; title: string; description: string; status: "TODO" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED"; priority: "LOW" | "MEDIUM" | "HIGH"; startAt: Date; dueAt: Date; progress: number; submittedAt: Date | null; completedAt: Date | null };
export type DemoEvaluation = { key: string; type: "MIDTERM" | "PROGRESS" | "FINAL"; date: Date; score: number; status: "SUBMITTED" | "ACKNOWLEDGED" };
export type DemoFeedback = { key: string; type: "GENERAL" | "PRAISE" | "IMPROVEMENT" | "ATTENDANCE_RELATED"; title: string; content: string; createdAt: Date };
export type DemoInternPlan = { identity: DemoIdentity; studentNumber: string; supervisorKey: string; coordinatorKey: string; startDate: Date; endDate: Date; attendance: DemoAttendance[]; workLogs: DemoWorkLog[]; tasks: DemoTask[]; evaluations: DemoEvaluation[]; feedback: DemoFeedback[]; correctionAttendanceKey: string | null };

const existing: DemoIdentity[] = [
  { key: "intern-01", role: "INTERN", firstName: "John", lastName: "DemoAcc", email: "john.demoacc@paterostechnologicalcollege.edu.ph", existing: true },
  { key: "supervisor-01", role: "SUPERVISOR", firstName: "Jose", lastName: "DemoAcc", email: "jose.demoacc@paterostechnologicalcollege.edu.ph", existing: true },
  { key: "coordinator-01", role: "COORDINATOR", firstName: "Mary", lastName: "DemoAcc", email: "mary.demoacc@paterostechnologicalcollege.edu.ph", existing: true },
  { key: "representative-01", role: "REPRESENTATIVE", firstName: "Maria", lastName: "DemoAcc", email: "maria.demoacc@paterostechnologicalcollege.edu.ph", existing: true },
];

const additional: DemoIdentity[] = [
  ["intern-02", "INTERN", "Alyssa", "Navarro"], ["intern-03", "INTERN", "Marco", "Santos"], ["intern-04", "INTERN", "Bianca", "Reyes"],
  ["intern-05", "INTERN", "Paolo", "Mendoza"], ["intern-06", "INTERN", "Leah", "Castillo"], ["intern-07", "INTERN", "Nico", "Villanueva"],
  ["intern-08", "INTERN", "Sofia", "Garcia"], ["intern-09", "INTERN", "Enzo", "Ramos"], ["intern-10", "INTERN", "Mika", "Torres"],
  ["supervisor-02", "SUPERVISOR", "Carlo", "Domingo"], ["supervisor-03", "SUPERVISOR", "Nina", "Flores"],
  ["coordinator-02", "COORDINATOR", "Elena", "Aquino"],
].map(([key, role, firstName, lastName]) => ({ key, role: role as DemoRole, firstName, lastName, email: `${key}.${firstName.toLowerCase()}${DEMO_DATA_EMAIL_SUFFIX}`, existing: false }));

export const DEMO_DATA_IDENTITIES = [...existing, ...additional];

const workContent = [
  ["Checked inventory records and updated the stock documentation for the operations team.", ["Inventory checking", "Documentation"], "Confirmed item counts before updating the shared record."],
  ["Organized administrative files and verified that records followed the office naming convention.", ["Administrative filing", "Records management"], "Learned how consistent labels make later retrieval faster."],
  ["Prepared and verified a spreadsheet summary for the weekly operations review.", ["Spreadsheet preparation", "Data verification"], "Used a second-pass check to catch inconsistent totals."],
  ["Observed customer service workflows and supported the preparation of reference materials.", ["Customer service", "Communication"], "Noted how staff adapt explanations to different customer concerns."],
  ["Documented a routine office process and clarified the sequence with the assigned supervisor.", ["Operations documentation", "Process mapping"], "Breaking the process into checkpoints made the guide easier to follow."],
  ["Recorded meeting notes and organized follow-up items from the team orientation.", ["Meeting notes", "Organization"], "Practiced separating decisions from action items."],
  ["Checked encoded records against source documents and corrected formatting inconsistencies.", ["Records checking", "Data encoding"], "Some source labels differed, so I documented the chosen standard."],
  ["Prepared a concise progress report from verified attendance and activity records.", ["Report preparation", "Written communication"], "Focused on factual summaries and avoided unsupported conclusions."],
] as const;

const taskContent = [
  ["Organize weekly inventory worksheet", "Prepare a clean worksheet from verified stock records."],
  ["Document filing workflow", "Create a concise reference for the office filing sequence."],
  ["Verify operations spreadsheet", "Check formulas, labels, and totals before the weekly review."],
  ["Prepare orientation notes", "Summarize the key workplace procedures covered during orientation."],
] as const;

function day(value: Date) { return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())); }
function plusDays(value: Date, amount: number) { const result = day(value); result.setUTCDate(result.getUTCDate() + amount); return result; }
function atManila(date: Date, hour: number, minute: number) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour - 8, minute)); }
function previousWeekdays(count: number) { const dates: Date[] = []; let cursor = plusDays(DEMO_DATA_ANCHOR, -1); while (dates.length < count) { if (cursor.getUTCDay() !== 0 && cursor.getUTCDay() !== 6) dates.push(day(cursor)); cursor = plusDays(cursor, -1); } return dates.reverse(); }
export function deterministicUuid(key: string) { const hex = createHash("sha256").update(`intellitrack:${DEMO_DATA_SEED}:${key}`).digest("hex").slice(0, 32).split(""); hex[12] = "5"; hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16); return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`; }

function attendanceFor(index: number, count: number): DemoAttendance[] {
  return previousWeekdays(count).map((date, position) => {
    const late = (index === 2 || index === 7) && position % 7 === 2;
    const early = index === 3 && position % 11 === 5;
    const genuineException = index === 6 && position === count - 3;
    const incomplete = index === 8 && position === count - 2;
    const inMinute = late ? 14 + (position % 5) : 50 + ((index * 3 + position) % 21);
    const clockIn = inMinute >= 60 ? atManila(date, 8, inMinute - 60) : atManila(date, 7, inMinute);
    const clockOut = incomplete ? null : atManila(date, early ? 16 : 16, early ? 42 : 50 + ((index + position) % 30));
    const workedMinutes = clockOut ? Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000) : 0;
    return { key: `attendance-${index + 1}-${date.toISOString().slice(0, 10)}`, date, clockIn, clockOut, workedMinutes, creditedMinutes: genuineException || incomplete ? 0 : workedMinutes, classification: late && early ? "LATE_AND_EARLY_DEPARTURE" : late ? "LATE" : early ? "EARLY_DEPARTURE" : "ON_TIME", status: genuineException ? "PENDING_REVIEW" : incomplete ? "INCOMPLETE" : "APPROVED", reviewRequired: genuineException || incomplete };
  });
}

function logsFor(index: number, attendance: DemoAttendance[]): DemoWorkLog[] {
  return attendance.filter((row, position) => row.status === "APPROVED" && position % 3 !== 1).map((row, position) => { const item = workContent[(index + position) % workContent.length]; return { key: `work-log-${index + 1}-${row.date.toISOString().slice(0, 10)}`, date: row.date, status: position === attendance.length - 1 && index % 4 === 0 ? "DRAFT" : "SUBMITTED", description: item[0], skills: [...item[1]], challenges: position % 6 === 3 ? "A few source entries used inconsistent labels, so I confirmed the intended format before continuing." : null, learnings: position % 3 === 0 ? item[2] : null }; });
}

function tasksFor(index: number, dates: Date[]): DemoTask[] {
  const statuses = ["TODO", "IN_PROGRESS", "SUBMITTED", "COMPLETED"] as const;
  return taskContent.map((item, position) => { const status = statuses[(index + position) % statuses.length]; const startAt = dates[Math.min(position * 3, dates.length - 1)]; const dueAt = plusDays(startAt, 7); const submittedAt = status === "SUBMITTED" || status === "COMPLETED" ? plusDays(dueAt, -1) : null; const completedAt = status === "COMPLETED" ? dueAt : null; return { key: `task-${index + 1}-${position + 1}`, title: item[0], description: item[1], status, priority: position === 2 ? "HIGH" : position === 0 ? "LOW" : "MEDIUM", startAt, dueAt, progress: status === "TODO" ? 0 : status === "IN_PROGRESS" ? 45 + index % 4 * 10 : 100, submittedAt, completedAt }; });
}

export function createDemoDataPlan(): { identities: DemoIdentity[]; interns: DemoInternPlan[]; announcementKeys: string[] } {
  const internIdentities = DEMO_DATA_IDENTITIES.filter((identity) => identity.role === "INTERN");
  const counts = [14, 25, 30, 35, 38, 41, 44, 46, 49, 50];
  const interns = internIdentities.map((identity, index) => {
    const attendance = attendanceFor(index, counts[index]); const dates = attendance.map((row) => row.date); const startDate = plusDays(dates[0], -3); const endDate = plusDays(startDate, 180);
    const evaluationCount = index < 2 ? 0 : index < 7 ? 1 : 2;
    const evaluations: DemoEvaluation[] = Array.from({ length: evaluationCount }, (_, position) => ({ key: `evaluation-${index + 1}-${position}`, type: position === 0 ? (index > 7 ? "MIDTERM" : "PROGRESS") : "FINAL", date: dates[Math.floor(dates.length * (position ? .9 : .55))], score: 78 + ((index * 3 + position * 2) % 14), status: position === 1 && index % 2 === 0 ? "ACKNOWLEDGED" : "SUBMITTED" }));
    const feedback: DemoFeedback[] = index % 3 === 0 ? [{ key: `feedback-${index + 1}`, type: index === 6 ? "ATTENDANCE_RELATED" : index >= 7 ? "PRAISE" : "GENERAL", title: index >= 7 ? "Consistent follow-through" : "Progress note", content: index === 6 ? "Please continue checking arrival time against the agreed schedule." : "Continue documenting completed work clearly and confirming details before final submission.", createdAt: dates[Math.floor(dates.length * .72)] }] : [];
    return { identity, studentNumber: `DEMO-${DEMO_DATA_SEED}-${String(index + 1).padStart(2, "0")}`, supervisorKey: `supervisor-0${index % 3 + 1}`, coordinatorKey: `coordinator-0${index % 2 + 1}`, startDate, endDate, attendance, workLogs: logsFor(index, attendance), tasks: tasksFor(index, dates), evaluations, feedback, correctionAttendanceKey: index === 4 ? attendance[Math.floor(attendance.length / 2)].key : null };
  });
  return { identities: DEMO_DATA_IDENTITIES, interns, announcementKeys: ["orientation-reminder", "reporting-deadline", "office-schedule"] };
}

export function demoSeedEnabled(environment: Record<string, string | undefined>) { return environment.INTELLITRACK_DEMO_SEED === DEMO_DATA_CONFIRMATION; }
export function creditedMinutes(plan: DemoInternPlan) { return plan.attendance.reduce((total, row) => total + row.creditedMinutes, 0); }
export function assertDemoPlan(plan = createDemoDataPlan()) {
  if (plan.interns.length !== 10) throw new Error("Demo plan must contain exactly ten Interns.");
  if (plan.identities.filter((x) => x.role === "SUPERVISOR").length !== 3 || plan.identities.filter((x) => x.role === "COORDINATOR").length !== 2 || plan.identities.filter((x) => x.role === "REPRESENTATIVE").length !== 1) throw new Error("Demo role counts are invalid.");
  for (const intern of plan.interns) { const dates = new Set<string>(); for (const row of intern.attendance) { const key = row.date.toISOString().slice(0, 10); if (dates.has(key) || row.date < intern.startDate || row.date > intern.endDate || [0, 6].includes(row.date.getUTCDay())) throw new Error("Demo attendance dates are invalid."); dates.add(key); if (row.clockIn && row.clockOut && row.clockOut <= row.clockIn) throw new Error("Demo attendance time ordering is invalid."); } for (const log of intern.workLogs) { const attendance = intern.attendance.find((row) => row.date.getTime() === log.date.getTime()); if (!attendance || attendance.status !== "APPROVED" || !["DRAFT", "SUBMITTED"].includes(log.status)) throw new Error("Demo Work Log is inconsistent with attendance."); } for (const task of intern.tasks) if (task.startAt < intern.startDate || task.dueAt < task.startAt || task.dueAt > intern.endDate || (task.completedAt && task.completedAt < task.startAt)) throw new Error("Demo Task dates are invalid."); }
  return plan;
}
