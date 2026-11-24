// DEC-2026-021 (Amendment A) / P174 — isolated-only demo interns for reviewing the Certificate of Completion.
//
//   npx tsx --env-file=.env.gatea.local scripts/seed-completed-intern-demo.ts
//   (remove with scripts/cleanup-completed-intern-demo.ts)
//
// 1. Andrea Santos — COMPLETED internship; hours met, a submitted Work Log for every attended day and Getting
//    started complete, so the certificate is issued (through the real completion path).
// 2. Bea Cruz — ACTIVE internship; hours met and Getting started complete, but ONE attended day still has a
//    DRAFT Work Log. She sees the preview and checklist; submitting that Work Log issues her certificate.
// Both are supervised by GateA Supervisor A, coordinated by GateA Coordinator A, in the Main Office, and tagged
// demo_completed_intern=true. Protected Gate A fixtures are never changed. Required-document rows are demo
// metadata only (no files; isolated Storage is not running). Passwords are written only to
// .gatea/completed-intern-demo.local.json (gitignored) and never printed. Idempotent per demo intern.
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client.ts";
import { completeAssignmentInTransaction } from "../src/lib/assignments/completion.ts";
import { issueCertificateInTransaction } from "../src/lib/certificates/issue.ts";
import { DOCUMENT_REQUIREMENTS } from "../src/lib/onboarding/domain.ts";
import { BO_COFFEE_OFFICE_CODE, timeOnReferenceDate } from "../src/lib/organization/bo-coffee.ts";
import { clockFor, CRITERIA, TASKS, workFor } from "./demo-intern-content.ts";

export const DEMO_TAG = "demo_completed_intern=true";
export const DEMOS = [
  { key: "completed", email: "demo.completed.intern@example.test", firstName: "Andrea", lastName: "Santos", code: "DEMO-COMPLETED-2026", position: "Operations Intern", start: "2026-06-01", end: "2026-08-28", completeAt: "2026-08-29T01:00:00.000Z", draftDays: 0 },
  { key: "ready", email: "demo.hours.done.intern@example.test", firstName: "Bea", lastName: "Cruz", code: "DEMO-HOURS-DONE-2026", position: "Barista Intern", start: "2026-08-03", end: "2026-12-18", completeAt: null, draftDays: 1 },
] as const;
const CREDENTIALS = ".gatea/completed-intern-demo.local.json";

export function assertIsolatedEnvironment() {
  const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
  if (process.env.GATEA_TARGET_ENV !== "test" || process.env.GATEA_ENVIRONMENT_VERIFIED !== "1" || !url || !["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("BLOCKED: the demo interns run only against the verified isolated local environment (.env.gatea.local).");
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
  if (!supabaseUrl || !["127.0.0.1", "localhost"].includes(supabaseUrl.hostname) || !process.env.SUPABASE_SECRET_KEY) throw new Error("BLOCKED: isolated local Supabase Auth is required.");
}

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
function weekdays(from: string, to: string) {
  const out: string[] = [];
  for (let d = day(from); d <= day(to); d = new Date(d.getTime() + 86_400_000)) if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) out.push(d.toISOString().slice(0, 10));
  return out;
}
type Staff = { companyId: string; supervisorId: string; supervisorUserId: string; coordinatorId: string; schoolId: string };
const at = (iso: string, utcHour: number) => new Date(`${iso}T${String(utcHour).padStart(2, "0")}:00:00.000Z`);

async function createEvidence(tx: Prisma.TransactionClient, demo: (typeof DEMOS)[number], staff: Staff, userId: string) {
  const rich = demo.completeAt !== null; // Andrea: the complete package; Bea: the same shape, still in progress
  const profile = await tx.internProfile.create({ data: { userId, schoolId: staff.schoolId, studentNumber: `DEMO-2026-${demo.key.toUpperCase()}`, course: "BS Information Technology", yearLevel: "4th Year", address: "12 Demo Street, Quezon City", emergencyContactName: "Demo Parent", emergencyContactNumber: "+63 900 000 0001", emergencyContactRelationship: "Parent" }, select: { id: true } });
  const assignment = await tx.internshipAssignment.create({
    data: {
      internProfileId: profile.id, companyId: staff.companyId, supervisorProfileId: staff.supervisorId, coordinatorProfileId: staff.coordinatorId,
      assignmentCode: demo.code, positionTitle: demo.position, department: "Store Operations", startDate: day(demo.start), endDate: day(demo.end),
      requiredHours: 480, requiredHoursConfirmedAt: day(demo.start), scheduleStartTime: timeOnReferenceDate("08:00"), scheduleEndTime: timeOnReferenceDate("17:00"),
      gracePeriodMinutes: 15, status: "ACTIVE", activatedAt: day(demo.start), notes: DEMO_TAG,
    },
    select: { id: true },
  });
  // 61 approved weekdays, up to 8 credited hours each (credit never exceeds worked time); a few late arrivals.
  const days = weekdays(demo.start, demo.end).slice(0, 61);
  await tx.attendance.createMany({ data: days.map((iso, i) => { const clock = clockFor(iso, i); return { assignmentId: assignment.id, attendanceDate: day(iso), ...clock, creditedMinutes: Math.min(480, clock.workedMinutes), status: "APPROVED" as const, reviewRequired: false }; }) });
  // A varied Work Log for every attended day; the last `draftDays` stay DRAFT (not submitted yet).
  await tx.workLog.createMany({ data: days.map((iso, i) => {
    const draft = i >= days.length - demo.draftDays; const work = workFor(i);
    return { assignmentId: assignment.id, workDate: day(iso), title: work.title, description: work.description, learnings: work.learnings, skillsApplied: [...work.skills], status: draft ? "DRAFT" as const : "SUBMITTED" as const, submittedAt: draft ? null : at(iso, 9) };
  }) });
  // Tasks with descriptions, due dates and review history (one revised before completion).
  const taskIds: string[] = [];
  for (const [i, task] of TASKS.entries()) {
    const start = days[Math.min(i * 7 + 2, days.length - 4)], due = days[Math.min(i * 7 + 6, days.length - 2)], done = days[Math.min(i * 7 + 5, days.length - 2)];
    const created = await tx.task.create({ data: {
      assignmentId: assignment.id, assignedById: staff.supervisorUserId, title: task.title, description: task.description, priority: task.priority,
      startAt: at(start, 0), dueAt: at(due, 9), status: "COMPLETED", progressPercentage: 100, completionNotes: "Completed and shared with the Supervisor.",
      submittedAt: at(done, 8), reviewedById: staff.supervisorUserId, reviewedAt: at(done, 9), completedAt: at(done, 9),
      reviewRemarks: "revised" in task ? "Revised once: added the weekend breakdown as requested. Approved." : "Approved. Thank you.",
    }, select: { id: true } });
    taskIds.push(created.id);
  }
  // Evaluations: Initial, weekly Progress, Midterm and (completed internship) Final, all acknowledged by the intern.
  const evaluation = async (type: "INITIAL" | "PROGRESS" | "MIDTERM" | "FINAL", iso: string, score: number, periodKey = "SINGLE", period?: { start: string; end: string }) => tx.evaluation.create({ data: {
    assignmentId: assignment.id, evaluatorId: staff.supervisorUserId, evaluationType: type, periodKey, periodStart: period ? day(period.start) : null, periodEnd: period ? day(period.end) : null,
    evaluationDate: day(iso), overallScore: score, criteriaScores: CRITERIA.map((criterion, k) => ({ criterion, rating: Math.min(5, Math.max(3, Math.round(score / 20) + ((k + score) % 3 === 0 ? -1 : 0))) })),
    strengths: "Organized, dependable and careful with records.", areasForImprovement: "Keep building confidence when leading short team briefings.", comments: "Good progress this period.",
    status: "ACKNOWLEDGED", submittedAt: at(iso, 8), acknowledgedById: userId, acknowledgedAt: at(iso, 10),
  } });
  await evaluation("INITIAL", days[4], 80);
  for (const [k, w] of [5, 15, 25, 40].entries()) {
    const monday = days[w - (day(days[w]).getUTCDay() - 1)];
    const friday = days[Math.min(w - (day(days[w]).getUTCDay() - 1) + 4, days.length - 1)];
    await evaluation("PROGRESS", friday, 82 + k * 2, monday, { start: monday, end: friday });
  }
  await evaluation("MIDTERM", days[30], 88);
  if (rich) await evaluation("FINAL", days.at(-1)!, 92);
  // Supervisor feedback (intern-visible), one linked to a Task.
  await tx.feedback.createMany({ data: [
    { assignmentId: assignment.id, authorId: staff.supervisorUserId, recipientId: userId, feedbackType: "PRAISE" as const, title: "Great inventory work", content: "Your stock counts were accurate and on time, and the variance notes were very clear.", visibility: "INTERN_AND_STAFF" as const, isRead: true, readAt: at(days[12], 10), createdAt: at(days[12], 9) },
    { assignmentId: assignment.id, authorId: staff.supervisorUserId, recipientId: userId, feedbackType: "IMPROVEMENT" as const, title: "Speak up in huddles", content: "You know the routines well. Share your observations during the morning huddle.", visibility: "INTERN_AND_STAFF" as const, isRead: true, readAt: at(days[26], 10), createdAt: at(days[26], 9) },
    { assignmentId: assignment.id, authorId: staff.supervisorUserId, recipientId: userId, feedbackType: "TASK_RELATED" as const, title: "Sales comparison", content: "The weekend breakdown made the comparison much more useful for the meeting.", visibility: "INTERN_AND_STAFF" as const, isRead: true, readAt: at(days[37], 10), createdAt: at(days[37], 9), relatedTaskId: taskIds[4] },
  ] });
  // One approved attendance correction (a late Time Out confirmed by the Supervisor).
  const corrected = await tx.attendance.findFirstOrThrow({ where: { assignmentId: assignment.id, attendanceDate: day(days[20]) }, select: { id: true, clockIn: true, clockOut: true } });
  await tx.attendanceCorrection.create({ data: { attendanceId: corrected.id, requestedById: userId, originalClockIn: corrected.clockIn, originalClockOut: corrected.clockOut, requestedClockIn: corrected.clockIn, requestedClockOut: corrected.clockOut, originalCreditedMinutes: 420, requestedCreditedMinutes: 480, reason: "I timed out late after helping close the bar; the Supervisor confirmed the full shift.", status: "APPROVED", reviewedById: staff.supervisorUserId, reviewedAt: at(days[21], 8), reviewRemarks: "Confirmed with the shift lead. Approved.", appliedAt: at(days[21], 8) } });
  // Getting started: required documents, plus the optional Medical Certificate for the complete package (metadata rows only, no files).
  await tx.document.createMany({ data: DOCUMENT_REQUIREMENTS.filter((item) => item.required || rich).map((item) => ({
    assignmentId: assignment.id, uploadedById: userId, fileName: item.title, originalFileName: `${item.key}-demo.pdf`, storagePath: `demo-completed-intern/${assignment.id}/${item.key}.pdf`,
    mimeType: "application/pdf", fileExtension: "pdf", fileSizeBytes: BigInt(48_000), category: item.category as Prisma.DocumentCreateManyInput["category"], description: "Demo metadata only (no file).",
    status: "APPROVED" as const, reviewedById: staff.supervisorUserId, reviewedAt: at(days[2], 8), createdAt: at(days[1], 8),
  })) });
  // The intern's own Portfolio writing (kept when the completion snapshot is saved).
  if (rich) await tx.portfolio.create({ data: { assignmentId: assignment.id, status: "DRAFT", title: "Store Operations Internship at Bo's Coffee",
    professionalSummary: "Operations intern who kept inventory, receiving and end-of-day records accurate, supported the front counter during peak hours, and documented routines for the team.",
    skills: ["Inventory management", "Excel", "Customer service", "POS operations", "Food safety", "Reporting"],
    achievements: ["Built the inventory worksheet the store now uses for weekly counts", "Prepared the audit evidence folder ahead of the internal audit", "Wrote turnover notes for the next intern"],
    selectedWork: ["Weekday vs weekend sales comparison", "Customer feedback themes summary"],
    reflection: "I learned how small, consistent records keep a busy store running. Next, I want to keep improving how I communicate during team huddles." } });
  return assignment.id;
}

async function main() {
  assertIsolatedEnvironment();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const saved: Record<string, unknown> = existsSync(CREDENTIALS) ? JSON.parse(readFileSync(CREDENTIALS, "utf8")) : {};
  const accounts = (saved.accounts ?? {}) as Record<string, { email: string; password: string; assignmentId: string }>;
  try {
    const company = await prisma.company.findFirst({ where: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true }, select: { id: true } });
    const supervisor = await prisma.supervisorProfile.findFirst({ where: { companyId: company?.id, user: { email: { startsWith: "gatea.supervisor.a." } } }, select: { id: true, userId: true } });
    const coordinator = await prisma.coordinatorProfile.findFirst({ where: { user: { email: { startsWith: "gatea.coordinator.a." } } }, select: { id: true, schoolId: true } });
    if (!company || !supervisor || !coordinator) throw new Error("Gate A Main Office, Supervisor A and Coordinator A are required.");
    const staff: Staff = { companyId: company.id, supervisorId: supervisor.id, supervisorUserId: supervisor.userId, coordinatorId: coordinator.id, schoolId: coordinator.schoolId };

    for (const demo of DEMOS) {
      if (await prisma.user.findUnique({ where: { email: demo.email }, select: { id: true } })) { console.log(`${demo.firstName} ${demo.lastName} already present. Nothing changed.`); continue; }
      const password = `${randomBytes(18).toString("base64url")}Aa1!`;
      const { data, error } = await supabase.auth.admin.createUser({ email: demo.email, password, email_confirm: true, user_metadata: { first_name: demo.firstName, last_name: demo.lastName, demo_completed_intern: true }, app_metadata: { role: "INTERN", demo_completed_intern: true, password_change_required: false, welcome_pending: false } });
      if (error || !data.user) throw new Error(`Unable to create the demo Auth user: ${error?.message ?? "unknown error"}`);
      try {
        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({ data: { authId: data.user.id, email: demo.email, role: "INTERN", firstName: demo.firstName, lastName: demo.lastName, phoneNumber: "+63 900 000 0000", bio: DEMO_TAG }, select: { id: true } });
          const assignmentId = await createEvidence(tx, demo, staff, user.id);
          // The real paths: completion (Portfolio snapshot + certificate when eligible) or eligibility-gated issuance.
          const certificate = demo.completeAt
            ? (await completeAssignmentInTransaction(tx, { assignmentId, companyId: company.id, fromStatus: "ACTIVE", now: new Date(demo.completeAt) })).certificate
            : await issueCertificateInTransaction(tx, { assignmentId, now: new Date() });
          return { assignmentId, certificate: certificate.skipped ? `not issued (${certificate.reason})` : certificate.certificateNumber };
        }, { timeout: 60_000, maxWait: 20_000 });
        accounts[demo.key] = { email: demo.email, password, assignmentId: result.assignmentId };
        console.log(`${demo.firstName} ${demo.lastName} created: assignment=${result.assignmentId} certificate=${result.certificate}`);
      } catch (cause) {
        await supabase.auth.admin.deleteUser(data.user.id).catch(() => undefined);
        throw cause;
      }
    }
    const andrea = await prisma.user.findUnique({ where: { email: DEMOS[0].email }, select: { id: true } });
    const bea = await prisma.user.findUnique({ where: { email: DEMOS[1].email }, select: { id: true } });
    const andreaAssignment = await prisma.internshipAssignment.findFirst({ where: { assignmentCode: DEMOS[0].code }, select: { id: true } });
    if (andrea && bea && andreaAssignment && !(await prisma.feedback.count({ where: { assignmentId: andreaAssignment.id, authorId: bea.id } }))) {
      await prisma.feedback.create({ data: { assignmentId: andreaAssignment.id, authorId: bea.id, recipientId: andrea.id, feedbackType: "GENERAL", title: "Workmate feedback", content: "Andrea explained the inventory sheet patiently during my first week and always kept the bar organized.", visibility: "INTERN_AND_STAFF", isRead: true, createdAt: new Date("2026-08-20T09:00:00.000Z") } });
    }
    mkdirSync(".gatea", { recursive: true });
    writeFileSync(CREDENTIALS, JSON.stringify({ purpose: "Isolated demo interns for the Certificate of Completion (DEC-2026-021)", tag: DEMO_TAG, accounts }, null, 2) + "\n", { mode: 0o600 });
    try { chmodSync(CREDENTIALS, 0o600); } catch { /* Windows ignores POSIX modes */ }
    console.log(`Credentials saved to ${CREDENTIALS} (not printed).`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("seed-completed-intern-demo.ts")) main().catch((error) => { console.error(error instanceof Error ? error.message : "Demo seed failed."); process.exit(1); });
