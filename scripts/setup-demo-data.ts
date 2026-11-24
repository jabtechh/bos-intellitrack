/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { config } from "dotenv";

import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { periodKeyForType } from "@/lib/evaluations/weekly-period";
import { BO_COFFEE_OFFICE_CODE, timeOnReferenceDate } from "@/lib/organization/bo-coffee";
import { selectExactSchool } from "@/lib/demo/setup";
import { assertDemoPlan, createDemoDataPlan, creditedMinutes, demoSeedEnabled, deterministicUuid, DEMO_DATA_ANCHOR, DEMO_DATA_SEED, type DemoIdentity } from "@/lib/demo/data";

config({ path: [".env.local", ".env"], quiet: true });

const credentialsPath = ".demo-data-credentials.local.json";
type Credentials = Record<string, { email: string; password: string }>;
type SeedContext = { stage: string; entity?: string; persona?: string };
let seedContext: SeedContext = { stage: "startup" };

class SanitizedSeedError extends Error {
  constructor(public category: string, public status?: number | string) { super("Sanitized demo seed failure"); }
}

function setSeedContext(stage: string, entity?: string, persona?: string) { seedContext = { stage, entity, persona }; }

async function main() {
  const enabled = demoSeedEnabled(process.env);
  const environmentLabel = sanitizedEnvironmentLabel(process.env.INTELLITRACK_TARGET_ENV);
  if (!enabled) {
    printPreflight({ environmentLabel, officeCount: 0, schoolCount: 0, demoUserCount: 0, enabled });
    return;
  }
  if (environmentLabel === "unidentified") throw new Error("Set INTELLITRACK_TARGET_ENV to development, test, demo, or production before seeding.");
  for (const key of ["SUPABASE_SECRET_KEY", "NEXT_PUBLIC_SUPABASE_URL", "DATABASE_URL"] as const) if (!process.env[key]) throw new Error(`Demo data seed is not configured: ${key} is missing.`);

  setSeedContext("preflight", "organization");
  const plan = assertDemoPlan(createDemoDataPlan());
  const [offices, schools, demoUserCount, adminCount] = await Promise.all([
    prisma.company.findMany({ where: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } }),
    prisma.school.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.user.count({ where: { email: { in: plan.identities.map((identity) => identity.email) } } }),
    prisma.user.count({ where: { role: "ADMIN", isActive: true } }),
  ]);
  printPreflight({ environmentLabel, officeCount: offices.length, schoolCount: schools.length, demoUserCount, enabled });
  if (offices.length !== 1) throw new Error("Expected exactly one active Bo’s Coffee operational office.");
  if (adminCount < 1) throw new Error("Demo data seed requires an existing active System Administrator.");
  const school = selectExactSchool(schools);
  const office = offices[0];

  const supabase = createAdminClient();
  const authUsers = await listAuthUsers(supabase);
  const credentials = await readCredentials();
  let credentialsChanged = false;
  for (const identity of plan.identities) if (!authUsers.some((user) => user.email?.toLowerCase() === identity.email.toLowerCase()) && !credentials[identity.key]) {
    credentials[identity.key] = { email: identity.email, password: `${randomBytes(24).toString("base64url")}Aa1!` };
    credentialsChanged = true;
  }
  if (credentialsChanged) await writeCredentials(credentials);

  const authIds = new Map<string, string>();
  const createdAuthIds: string[] = [];
  try {
    for (const identity of plan.identities) {
      setSeedContext("auth-provisioning", "user", identity.key);
      const found = authUsers.find((user) => user.email?.toLowerCase() === identity.email.toLowerCase());
      if (found) { authIds.set(identity.key, found.id); continue; }
      const credential = credentials[identity.key];
      if (!credential || credential.email !== identity.email) throw new Error("A locally owned demo credential is unavailable.");
      const result = await supabase.auth.admin.createUser({ email: identity.email, password: credential.password, email_confirm: true });
      if (result.error || !result.data.user) throw new SanitizedSeedError(safeToken(result.error?.name ?? result.error?.code ?? "supabase-admin"), result.error?.status);
      authIds.set(identity.key, result.data.user.id);
      createdAuthIds.push(result.data.user.id);
    }

    await prisma.$transaction(async (tx) => {
      const users = new Map<string, any>();
      const profiles = new Map<string, any>();
      for (const identity of plan.identities) {
        setSeedContext("application-provisioning", "user-profile", identity.key);
        const user = await ensureDemoUser(tx, identity, authIds.get(identity.key)!, office.id, school.id);
        users.set(identity.key, user);
        profiles.set(identity.key, user.profile);
      }
      const representative = users.get("representative-01");

      for (const intern of plan.interns) {
        const persona = intern.identity.key;
        setSeedContext("history", "internship", persona);
        const internUser = users.get(intern.identity.key);
        const internProfile = profiles.get(intern.identity.key);
        const supervisor = profiles.get(intern.supervisorKey);
        const coordinator = profiles.get(intern.coordinatorKey);
        const active = await tx.internshipAssignment.findMany({ where: { internProfileId: internProfile.id, status: "ACTIVE" } });
        if (active.length > 1) throw new Error("A demo Intern has more than one active internship.");
        const assignmentData = { companyId: office.id, supervisorProfileId: supervisor.id, coordinatorProfileId: coordinator.id, positionTitle: "Information Technology Intern", department: "Main Office Operations", startDate: intern.startDate, endDate: intern.endDate, requiredHours: 486, requiredHoursConfirmedAt: DEMO_DATA_ANCHOR, scheduleStartTime: timeOnReferenceDate("08:00"), scheduleEndTime: timeOnReferenceDate("17:00"), gracePeriodMinutes: 10, status: "ACTIVE" as const, activatedAt: intern.startDate, notes: `Deterministic IntelliTrack demo dataset ${DEMO_DATA_SEED}.`, createdById: representative.id };
        const assignment = active[0]
          ? await tx.internshipAssignment.update({ where: { id: active[0].id }, data: assignmentData })
          : await tx.internshipAssignment.create({ data: { id: deterministicUuid(`assignment-${intern.identity.key}`), internProfileId: internProfile.id, assignmentCode: `DEMO-${DEMO_DATA_SEED}-${intern.identity.key.toUpperCase()}`, ...assignmentData } });

        const attendanceIds = new Map<string, string>();
        for (const row of intern.attendance) {
          setSeedContext("history", "attendance", persona);
          const id = deterministicUuid(row.key);
          const data = { attendanceDate: row.date, clockIn: row.clockIn, clockOut: row.clockOut, workedMinutes: row.workedMinutes, creditedMinutes: row.creditedMinutes, classification: row.classification, status: row.status, reviewRequired: row.reviewRequired, reviewedById: row.status === "APPROVED" ? users.get(intern.supervisorKey).id : null, reviewedAt: row.status === "APPROVED" ? row.clockOut : null, reviewRemarks: row.status === "APPROVED" ? "Verified demo attendance record." : null, internRemarks: row.status === "INCOMPLETE" ? "Clock-out was not completed." : null, clockInLatitude: null, clockInLongitude: null, clockInAccuracyMeters: null, clockInDistanceMeters: null, clockInInsideGeofence: null, clockInSelfiePath: null, clockOutLatitude: null, clockOutLongitude: null, clockOutAccuracyMeters: null, clockOutDistanceMeters: null, clockOutInsideGeofence: null, clockOutSelfiePath: null };
          const attendance = await tx.attendance.upsert({ where: { assignmentId_attendanceDate: { assignmentId: assignment.id, attendanceDate: row.date } }, create: { id, assignmentId: assignment.id, ...data }, update: data });
          attendanceIds.set(row.key, attendance.id);
        }

        if (intern.correctionAttendanceKey) {
          setSeedContext("history", "attendance-correction", persona);
          const row = intern.attendance.find((item) => item.key === intern.correctionAttendanceKey)!;
          const attendanceId = attendanceIds.get(row.key)!;
          await tx.attendanceCorrection.upsert({ where: { id: deterministicUuid(`correction-${row.key}`) }, create: { id: deterministicUuid(`correction-${row.key}`), attendanceId, requestedById: internUser.id, originalClockIn: row.clockIn ? new Date(row.clockIn.getTime() + 12 * 60000) : null, originalClockOut: row.clockOut, requestedClockIn: row.clockIn, requestedClockOut: row.clockOut, originalCreditedMinutes: Math.max(0, row.creditedMinutes - 12), requestedCreditedMinutes: row.creditedMinutes, reason: "The recorded arrival time was corrected after the office log was checked.", supportingDocumentPath: null, status: "APPROVED", reviewedById: users.get(intern.supervisorKey).id, reviewedAt: row.clockOut, reviewRemarks: "Confirmed against the office time record.", appliedAt: row.clockOut }, update: { status: "APPROVED", supportingDocumentPath: null } });
        }

        for (const log of intern.workLogs) { setSeedContext("history", "work-log", persona); await tx.workLog.upsert({ where: { assignmentId_workDate: { assignmentId: assignment.id, workDate: log.date } }, create: { id: deterministicUuid(log.key), assignmentId: assignment.id, workDate: log.date, title: `Daily Work Log — ${log.date.toISOString().slice(0, 10)}`, description: log.description, skillsApplied: log.skills, challenges: log.challenges, learnings: log.learnings, hoursReported: null, attachmentPath: null, status: log.status, submittedAt: log.status === "SUBMITTED" ? new Date(log.date.getTime() + 10 * 60 * 60000) : null, reviewedById: null, reviewedAt: null, reviewRemarks: null, approvedAt: null }, update: { description: log.description, skillsApplied: log.skills, challenges: log.challenges, learnings: log.learnings, hoursReported: null, attachmentPath: null, status: log.status, submittedAt: log.status === "SUBMITTED" ? new Date(log.date.getTime() + 10 * 60 * 60000) : null, reviewedById: null, reviewedAt: null, reviewRemarks: null, approvedAt: null } }); }

        const taskIds = new Map<string, string>();
        for (const task of intern.tasks) { setSeedContext("history", "task", persona); const id = deterministicUuid(task.key); await tx.task.upsert({ where: { id }, create: { id, assignmentId: assignment.id, assignedById: users.get(intern.supervisorKey).id, title: task.title, description: task.description, priority: task.priority, status: task.status, startAt: task.startAt, dueAt: task.dueAt, progressPercentage: task.progress, completionNotes: task.status === "SUBMITTED" || task.status === "COMPLETED" ? "Completed the assigned activity and checked the output against the requested format." : null, completionEvidencePath: null, submittedAt: task.submittedAt, reviewedById: task.status === "COMPLETED" ? users.get(intern.supervisorKey).id : null, reviewedAt: task.completedAt, reviewRemarks: task.status === "COMPLETED" ? "Output reviewed and recorded as complete." : null, completedAt: task.completedAt }, update: { status: task.status, progressPercentage: task.progress, completionEvidencePath: null, submittedAt: task.submittedAt, reviewedById: task.status === "COMPLETED" ? users.get(intern.supervisorKey).id : null, reviewedAt: task.completedAt, completedAt: task.completedAt } }); taskIds.set(task.key, id); }

        for (const evaluation of intern.evaluations) { setSeedContext("history", "evaluation", persona); await tx.evaluation.upsert({ where: { assignmentId_evaluationType_periodKey: { assignmentId: assignment.id, evaluationType: evaluation.type, periodKey: periodKeyForType(evaluation.type, intern.startDate.toISOString().slice(0, 10)) } }, create: { id: deterministicUuid(evaluation.key), assignmentId: assignment.id, evaluatorId: users.get(intern.supervisorKey).id, evaluationType: evaluation.type, periodKey: periodKeyForType(evaluation.type, intern.startDate.toISOString().slice(0, 10)), evaluationDate: evaluation.date, periodStart: intern.startDate, periodEnd: evaluation.date, criteriaScores: [{ criterion: "Reliability", rating: Math.round(evaluation.score / 20) }, { criterion: "Work quality", rating: Math.round((evaluation.score - 2) / 20) }, { criterion: "Communication", rating: Math.round((evaluation.score + 2) / 20) }], overallScore: evaluation.score, strengths: "Organizes assigned records carefully and communicates progress clearly.", areasForImprovement: "Continue improving prioritization when several routine requests arrive together.", comments: "Performance is progressing appropriately for the current internship stage.", aiSummary: null, status: evaluation.status, submittedAt: evaluation.date, acknowledgedById: evaluation.status === "ACKNOWLEDGED" ? internUser.id : null, acknowledgedAt: evaluation.status === "ACKNOWLEDGED" ? new Date(evaluation.date.getTime() + 86400000) : null }, update: { evaluationDate: evaluation.date, overallScore: evaluation.score, status: evaluation.status, aiSummary: null } }); }

        for (const feedback of intern.feedback) { setSeedContext("history", "feedback", persona); const id = deterministicUuid(feedback.key); await tx.feedback.upsert({ where: { id }, create: { id, assignmentId: assignment.id, authorId: users.get(intern.supervisorKey).id, recipientId: internUser.id, feedbackType: feedback.type, title: feedback.title, content: feedback.content, visibility: "INTERN_AND_STAFF", isRead: true, readAt: new Date(feedback.createdAt.getTime() + 86400000), relatedTaskId: null, createdAt: feedback.createdAt }, update: { title: feedback.title, content: feedback.content, visibility: "INTERN_AND_STAFF" } }); }

        const aggregate = await tx.attendance.aggregate({ where: { assignmentId: assignment.id }, _sum: { creditedMinutes: true } });
        await tx.internshipAssignment.update({ where: { id: assignment.id }, data: { renderedHours: (aggregate._sum.creditedMinutes ?? creditedMinutes(intern)) / 60 } });
      }

      const announcements = [
        ["orientation-reminder", "Internship orientation reminder", "Please review the office guidelines and bring your questions to the scheduled orientation check-in.", "ALL_USERS"],
        ["reporting-deadline", "Weekly reporting reminder", "Submit Daily Work Logs after completing each workday and verify report details before the weekly deadline.", "INTERNS"],
        ["office-schedule", "Main Office schedule notice", "The regular internship schedule remains 8:00 AM to 5:00 PM on valid workdays unless your supervisor confirms a change.", "COMPANY"],
      ] as const;
      for (const [key, title, content, audience] of announcements) { const id = deterministicUuid(`announcement-${key}`); await tx.announcement.upsert({ where: { id }, create: { id, createdById: representative.id, title, content, priority: "NORMAL", audience, companyId: audience === "COMPANY" ? office.id : null, schoolId: null, status: "PUBLISHED", isPinned: key === "orientation-reminder", publishedAt: new Date(DEMO_DATA_ANCHOR.getTime() - 7 * 86400000), scheduledFor: null, expiresAt: null, archivedAt: null }, update: { title, content, audience, status: "PUBLISHED", expiresAt: null, archivedAt: null } }); }
    }, { maxWait: 30_000, timeout: 300_000 });
    console.log("Deterministic demo data is ready; existing demo records were reused where available.");
  } catch (error) {
    for (const authId of createdAuthIds) await supabase.auth.admin.deleteUser(authId);
    throw error;
  }
}

async function ensureDemoUser(tx: any, identity: DemoIdentity, authId: string, companyId: string, schoolId: string) {
  const existing = await tx.user.findUnique({ where: { email: identity.email } });
  if (existing && (existing.authId !== authId || existing.role !== identity.role)) throw new Error("A deterministic demo identity conflicts with an existing application user.");
  const lastLoginAt = new Date(DEMO_DATA_ANCHOR.getTime() - (Number(identity.key.match(/\d+/)?.[0] ?? 1) % 8) * 86400000 - 2 * 3600000);
  const user = existing ? await tx.user.update({ where: { id: existing.id }, data: { firstName: identity.firstName, lastName: identity.lastName, isActive: true, lastLoginAt } }) : await tx.user.create({ data: { id: deterministicUuid(`user-${identity.key}`), authId, email: identity.email, role: identity.role, firstName: identity.firstName, lastName: identity.lastName, isActive: true, lastLoginAt } });
  let profile;
  if (identity.role === "INTERN") profile = await tx.internProfile.upsert({ where: { userId: user.id }, create: { id: deterministicUuid(`profile-${identity.key}`), userId: user.id, schoolId, studentNumber: `DEMO-${DEMO_DATA_SEED}-${identity.key.slice(-2)}`, course: "Bachelor of Science in Information Technology", yearLevel: "4" }, update: { schoolId, course: "Bachelor of Science in Information Technology", yearLevel: "4" } });
  else if (identity.role === "SUPERVISOR") profile = await tx.supervisorProfile.upsert({ where: { userId: user.id }, create: { id: deterministicUuid(`profile-${identity.key}`), userId: user.id, companyId, employeeNumber: `DEMO-${DEMO_DATA_SEED}-${identity.key.toUpperCase()}`, position: "Company Supervisor", department: "Main Office Operations", officeLocation: "Bo’s Coffee Main Office" }, update: { companyId, position: "Company Supervisor", department: "Main Office Operations" } });
  else if (identity.role === "COORDINATOR") profile = await tx.coordinatorProfile.upsert({ where: { userId: user.id }, create: { id: deterministicUuid(`profile-${identity.key}`), userId: user.id, schoolId, employeeNumber: `DEMO-${DEMO_DATA_SEED}-${identity.key.toUpperCase()}`, position: "School Coordinator", department: "Internship Office", office: "Pateros Technological College" }, update: { schoolId, position: "School Coordinator", department: "Internship Office" } });
  else profile = await tx.representativeProfile.upsert({ where: { userId: user.id }, create: { id: deterministicUuid(`profile-${identity.key}`), userId: user.id, companyId, employeeNumber: `DEMO-${DEMO_DATA_SEED}-REP`, position: "Company Representative", department: "Main Office Operations" }, update: { companyId, position: "Company Representative", department: "Main Office Operations" } });
  return { ...user, profile };
}

function sanitizedEnvironmentLabel(value: string | undefined) { const label = value?.trim().toLowerCase(); return label && ["development", "test", "demo", "production"].includes(label) ? label : "unidentified"; }
function safeToken(value: unknown) { return String(value ?? "unknown").replace(/[^a-z0-9_-]/gi, "-").slice(0, 60) || "unknown"; }
function sanitizedFailure(error: unknown) { const prismaCode = typeof error === "object" && error !== null && "code" in error ? safeToken((error as { code?: unknown }).code) : null; const category = error instanceof SanitizedSeedError ? safeToken(error.category) : error instanceof Error ? safeToken(error.name) : "unknown"; const status = error instanceof SanitizedSeedError && error.status !== undefined ? ` status=${safeToken(error.status)}` : ""; return `Demo data seed failed at stage=${safeToken(seedContext.stage)}${seedContext.entity ? ` entity=${safeToken(seedContext.entity)}` : ""}${seedContext.persona ? ` persona=${safeToken(seedContext.persona)}` : ""}${prismaCode ? ` prisma=${prismaCode}` : ""} category=${category}${status}.`; }
function printPreflight(value: { environmentLabel: string; officeCount: number; schoolCount: number; demoUserCount: number; enabled: boolean }) { console.log(`Demo seed target: ${value.environmentLabel}`); console.log(`Active office matches: ${value.officeCount}`); console.log(`Active schools: ${value.schoolCount}`); console.log(`Current deterministic demo users: ${value.demoUserCount}`); console.log(`Demo seed enabled: ${value.enabled ? "yes" : "no"}`); }
async function listAuthUsers(client: ReturnType<typeof createAdminClient>) { const users = []; for (let page = 1; page <= 100; page++) { const result = await client.auth.admin.listUsers({ page, perPage: 100 }); if (result.error) throw new Error("Demo Auth preflight failed."); users.push(...result.data.users); if (result.data.users.length < 100) break; } return users; }
async function readCredentials(): Promise<Credentials> { return existsSync(credentialsPath) ? JSON.parse(await readFile(credentialsPath, "utf8")) as Credentials : {}; }
async function writeCredentials(value: Credentials) { await writeFile(credentialsPath, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 }); try { await chmod(credentialsPath, 0o600); } catch {} }

main().catch((error) => { console.error(sanitizedFailure(error)); process.exitCode = 1; }).finally(() => prisma.$disconnect());
