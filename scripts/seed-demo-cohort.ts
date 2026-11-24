// Isolated-only demo cohort: 50 Interns (12 completed, 38 active) with a Company Supervisor, a School
// Coordinator and a Company Representative, all with realistic (fictional) Filipino names and @gmail.com logins.
//
//   npx tsx --env-file=.env.gatea.local scripts/seed-demo-cohort.ts
//   (remove with scripts/cleanup-demo-cohort.ts)
//
// ISOLATED LOCAL ENVIRONMENT ONLY. Local Supabase never delivers e-mail, so these made-up Gmail addresses can
// never reach real people here. Never copy these accounts to Production.
// Completed internships end in the last few weeks and finish through the real completion path (Portfolio
// snapshot + Certificate of Completion when eligible). Active internships have attendance up to yesterday.
// Tagged demo_cohort=2026-11; protected Gate A fixtures are never changed. One shared demo password is written
// only to .gatea/demo-cohort.local.json (gitignored) and never printed. Idempotent: existing accounts are skipped.
import { randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client.ts";
import { completeAssignmentInTransaction } from "../src/lib/assignments/completion.ts";
import { DOCUMENT_REQUIREMENTS } from "../src/lib/onboarding/domain.ts";
import { BO_COFFEE_OFFICE_CODE, timeOnReferenceDate } from "../src/lib/organization/bo-coffee.ts";
import { clockFor, CRITERIA, TASKS, workFor } from "./demo-intern-content.ts";

export const COHORT_TAG = "demo_cohort=2026-11";
const CREDENTIALS = ".gatea/demo-cohort.local.json";
const TODAY = "2026-11-24"; // attendance runs up to the previous weekday
export const SCHOOLS = [
  { name: "Metro Manila Polytechnic College", schoolCode: "DEMO-MMPC" },
  { name: "Quezon City Institute of Technology", schoolCode: "DEMO-QCIT" },
  { name: "Pasig Valley State University", schoolCode: "DEMO-PVSU" },
  { name: "Laguna Bay College of Business", schoolCode: "DEMO-LBCB" },
  { name: "Cavite Southern Colleges", schoolCode: "DEMO-CSC" },
];
const SUPERVISORS = [["Ramon", "Villanueva"], ["Elena", "Marquez"], ["Roberto", "Santiago"], ["Liza", "Fajardo"], ["Dennis", "Alvarez"], ["Grace", "Belmonte"], ["Arnel", "Concepcion"], ["Marivic", "Estrada"], ["Jun", "Gutierrez"], ["Rowena", "Hidalgo"], ["Edgar", "Lacsamana"], ["Cecilia", "Magbanua"], ["Noel", "Quiambao"], ["Leonora", "Salonga"], ["Ferdinand", "Yap"]] as const;
const COORDINATORS = [["Teresita", "Mendoza"], ["Rogelio", "Bautista"], ["Imelda", "Cortez"], ["Danilo", "Evangelista"], ["Josefina", "Francisco"], ["Ernesto", "Gatchalian"], ["Corazon", "Ilagan"], ["Wilfredo", "Jimenez"], ["Lourdes", "Katigbak"], ["Reynaldo", "Ledesma"], ["Milagros", "Medina"], ["Alfredo", "Natividad"], ["Rosario", "Ong"], ["Benjamin", "Perez"], ["Natividad", "Quizon"]] as const;
const REPRESENTATIVES = [["Carmela", "Aquino"], ["Victor", "Buenaventura"], ["Rosalinda", "Chua"], ["Oscar", "Dimaculangan"], ["Jocelyn", "Enriquez"], ["Manuel", "Feliciano"], ["Divina", "Gonzaga"], ["Antonio", "Herrera"], ["Luisa", "Jacinto"], ["Gerardo", "Lualhati"], ["Remedios", "Macapagal"], ["Ricardo", "Nepomuceno"], ["Evelyn", "Olivares"], ["Fernando", "Pacheco"], ["Gloria", "Tan"]] as const;
const SUP_POSITIONS = ["Store Operations Supervisor", "Area Supervisor", "Shift Supervisor", "Inventory Supervisor", "Training Supervisor"];
const REP_POSITIONS = ["HR and Training Manager", "Talent Acquisition Specialist", "HR Business Partner", "Learning and Development Officer", "People Operations Manager"];
const emailFor = (first: string, last: string, suffix: string) => `${first.replace(/[^A-Za-z]/g, "").toLowerCase()}.${last.replace(/[^A-Za-z]/g, "").toLowerCase()}.${suffix}@gmail.com`;

type StaffPerson = { role: "SUPERVISOR" | "COORDINATOR" | "REPRESENTATIVE" | "ADMIN"; firstName: string; lastName: string; email: string; position: string; schoolIndex?: number };
export const STAFF: StaffPerson[] = [
  ...SUPERVISORS.map(([firstName, lastName], index) => ({ role: "SUPERVISOR" as const, firstName, lastName, email: emailFor(firstName, lastName, "ops"), position: SUP_POSITIONS[index % SUP_POSITIONS.length] })),
  ...COORDINATORS.map(([firstName, lastName], index) => ({ role: "COORDINATOR" as const, firstName, lastName, email: emailFor(firstName, lastName, "ojt"), position: index % 3 === 0 ? "OJT Coordinator" : "Practicum Adviser", schoolIndex: Math.floor(index / 3) })),
  ...REPRESENTATIVES.map(([firstName, lastName], index) => ({ role: "REPRESENTATIVE" as const, firstName, lastName, email: emailFor(firstName, lastName, "hr"), position: REP_POSITIONS[index % REP_POSITIONS.length] })),
  { role: "ADMIN", firstName: "Alberto", lastName: "Sarmiento", email: "alberto.sarmiento.sysadmin@gmail.com", position: "System Administrator" },
];
/** Intern i: school i%5, Supervisor i%15, and one of that school's three Coordinators. */
export const internPlacement = (i: number) => ({ school: i % SCHOOLS.length, supervisor: i % SUPERVISORS.length, coordinator: (i % SCHOOLS.length) * 3 + (Math.floor(i / SCHOOLS.length) % 3) });

const NAMES = [
  ["Maria Clara", "Reyes"], ["Juan Miguel", "Santos"], ["Angelica", "Cruz"], ["Paolo", "Bautista"], ["Kristine Joy", "Garcia"],
  ["Mark Anthony", "Villanueva"], ["Jasmine", "Ramos"], ["Carlo", "Mendoza"], ["Patricia Anne", "Torres"], ["John Paul", "Flores"],
  ["Nicole", "Gonzales"], ["Rafael", "Aquino"], ["Bea Marie", "Castillo"], ["Joshua", "Navarro"], ["Camille", "Dela Cruz"],
  ["Ralph", "Fernandez"], ["Trisha Mae", "Lopez"], ["Kevin", "Domingo"], ["Andrea Nicole", "Pascual"], ["Miguel", "Salazar"],
  ["Shaira", "Mercado"], ["Christian", "Valdez"], ["Erika", "Soriano"], ["Gabriel", "Ocampo"], ["Hannah", "Aguilar"],
  ["Lance", "Rivera"], ["Mikaela", "De Guzman"], ["Vincent", "Manalo"], ["Danica", "Tolentino"], ["Jerome", "Padilla"],
  ["Alyssa", "Ignacio"], ["Bryan", "Esguerra"], ["Frances", "Galang"], ["Daniel", "Panganiban"], ["Rhea", "Lim"],
  ["Jericho", "Tan"], ["Kimberly", "Uy"], ["Adrian", "Bernardo"], ["Louise", "Samonte"], ["Ivan", "Macaraeg"],
  ["Stephanie", "Javier"], ["Neil", "Dizon"], ["Clarisse", "Pineda"], ["Jayson", "Cabrera"], ["Princess", "Lacson"],
  ["Renz", "Abad"], ["Joanna", "Robles"], ["Kenneth", "Sison"], ["Mae", "Villareal"], ["Arvin", "Saldana"],
] as const;
const POSITIONS = ["Operations Intern", "Barista Intern", "Inventory Intern", "Marketing Intern", "Store Admin Intern", "Customer Experience Intern"];

export function cohortInterns() {
  return NAMES.map(([firstName, lastName], i) => {
    const handle = `${firstName.split(" ")[0]}.${lastName.replace(/\s+/g, "")}`.toLowerCase();
    return { index: i, firstName, lastName, email: `${handle}${String(21 + i).padStart(2, "0")}@gmail.com`, completed: i < 12, position: POSITIONS[i % POSITIONS.length] };
  });
}

export const PRODUCTION_CONFIRMATION = "create-demo-accounts-in-production";

/**
 * Isolated (default): the verified local environment (.env.gatea.local).
 * Production (owner-approved demo accounts): DEMO_COHORT_TARGET=production plus the exact confirmation phrase in
 * DEMO_COHORT_CONFIRM, using the hosted settings in .env. Returns the connection string and credentials file.
 */
export function resolveDemoTarget() {
  const parse = (value?: string) => { try { return value ? new URL(value) : null; } catch { return null; } };
  const local = (u: URL | null) => Boolean(u && ["127.0.0.1", "localhost"].includes(u.hostname));
  const supabaseUrl = parse(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (process.env.DEMO_COHORT_TARGET === "production") {
    const connection = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    if (process.env.DEMO_COHORT_CONFIRM !== PRODUCTION_CONFIRMATION) throw new Error(`BLOCKED: set DEMO_COHORT_CONFIRM=${PRODUCTION_CONFIRMATION} to write demo accounts to Production.`);
    if (!connection || local(parse(connection)) || local(supabaseUrl) || !supabaseUrl || !process.env.SUPABASE_SECRET_KEY) throw new Error("BLOCKED: Production mode needs the hosted DIRECT_URL/DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from .env.");
    return { production: true, connection, credentials: ".gatea/demo-cohort.production.local.json", schoolSuffix: " (Demo)" };
  }
  if (process.env.GATEA_TARGET_ENV !== "test" || process.env.GATEA_ENVIRONMENT_VERIFIED !== "1" || !local(parse(process.env.DATABASE_URL)) || !local(supabaseUrl) || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error("BLOCKED: without Production mode the demo cohort runs only against the verified isolated local environment (.env.gatea.local).");
  }
  return { production: false, connection: process.env.DATABASE_URL!, credentials: CREDENTIALS, schoolSuffix: "" };
}

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const at = (iso: string, utcHour: number) => new Date(`${iso}T${String(utcHour).padStart(2, "0")}:00:00.000Z`);
const addDays = (iso: string, n: number) => { const d = day(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const isWeekday = (iso: string) => { const w = day(iso).getUTCDay(); return w !== 0 && w !== 6; };
/** The `count` weekdays ending on (and including) `end`, oldest first. */
function weekdaysEnding(end: string, count: number) { const out: string[] = []; for (let d = end; out.length < count; d = addDays(d, -1)) if (isWeekday(d)) out.unshift(d); return out; }
function weekdaysBetween(start: string, end: string) { const out: string[] = []; for (let d = start; d <= end; d = addDays(d, 1)) if (isWeekday(d)) out.push(d); return out; }
const mondayOf = (iso: string) => addDays(iso, -(day(iso).getUTCDay() - 1));

type Staff = { companyId: string; supervisorId: string; supervisorUserId: string; coordinatorId: string; schoolId: string };
type Intern = ReturnType<typeof cohortInterns>[number];

async function createIntern(tx: Prisma.TransactionClient, intern: Intern, staff: Staff, userId: string) {
  const i = intern.index;
  // Completed: 61 weekdays ending 2–16 days ago. Active: started Aug–Oct, attendance up to yesterday.
  const end = intern.completed ? weekdaysEnding(addDays(TODAY, -(3 + (i % 12) * 1.5 | 0)), 1)[0] : null;
  const days = intern.completed ? weekdaysEnding(end!, 61) : weekdaysBetween(addDays("2026-08-17", (i - 12) * 1 + ((i * 7) % 21)), addDays(TODAY, -1));
  const attended = intern.completed ? days : days.filter((_, k) => k % 19 !== 11); // a few absences while active
  const start = days[0];
  const scheduledEnd = intern.completed ? end! : addDays(start, 7 * 18);
  const requiredHours = intern.completed ? 480 : [486, 500, 600][i % 3];

  const profile = await tx.internProfile.create({ data: {
    userId, schoolId: staff.schoolId, studentNumber: `2022-${String(10421 + i * 37)}`, course: i % 4 === 0 ? "BS Hospitality Management" : i % 4 === 1 ? "BS Business Administration" : "BS Information Technology",
    yearLevel: "4th Year", address: `${12 + i} Mabini Street, Quezon City`, emergencyContactName: `Parent of ${intern.firstName.split(" ")[0]}`,
    emergencyContactNumber: `+63 917 555 ${String(1000 + i).slice(-4)}`, emergencyContactRelationship: "Parent",
  }, select: { id: true } });
  const assignment = await tx.internshipAssignment.create({ data: {
    internProfileId: profile.id, companyId: staff.companyId, supervisorProfileId: staff.supervisorId, coordinatorProfileId: staff.coordinatorId,
    assignmentCode: `COH-2026-${String(i + 1).padStart(3, "0")}`, positionTitle: intern.position, department: "Store Operations",
    startDate: day(start), endDate: day(scheduledEnd), requiredHours, requiredHoursConfirmedAt: day(start),
    scheduleStartTime: timeOnReferenceDate("08:00"), scheduleEndTime: timeOnReferenceDate("17:00"), gracePeriodMinutes: 15,
    status: "ACTIVE", activatedAt: day(start), notes: COHORT_TAG,
  }, select: { id: true } });

  // Attendance: varied times; for some active interns the most recent day is still awaiting Supervisor review.
  const pendingLast = !intern.completed && i % 6 === 0;
  await tx.attendance.createMany({ data: attended.map((iso, k) => {
    const clock = clockFor(iso, k + i);
    const pending = pendingLast && k === attended.length - 1;
    return { assignmentId: assignment.id, attendanceDate: day(iso), ...clock, creditedMinutes: pending ? 0 : Math.min(480, clock.workedMinutes), status: pending ? "PENDING_REVIEW" as const : "APPROVED" as const, reviewRequired: pending };
  }) });
  // Work Logs: every attended day for completed interns; active interns may have the latest day still in draft.
  const draftLast = !intern.completed && i % 5 === 1;
  await tx.workLog.createMany({ data: attended.map((iso, k) => {
    const work = workFor(k + i); const draft = draftLast && k === attended.length - 1;
    return { assignmentId: assignment.id, workDate: day(iso), title: work.title, description: work.description, learnings: work.learnings, skillsApplied: [...work.skills], status: draft ? "DRAFT" as const : "SUBMITTED" as const, submittedAt: draft ? null : at(iso, 9) };
  }) });
  // Tasks: all completed for finished internships; a realistic mix for active ones.
  const taskCount = intern.completed ? TASKS.length : Math.min(TASKS.length, 3 + Math.floor(attended.length / 12));
  for (let t = 0; t < taskCount; t++) {
    const task = TASKS[(t + i) % TASKS.length];
    const startDay = attended[Math.min(t * 6 + 1, attended.length - 1)], dueDay = attended[Math.min(t * 6 + 5, attended.length - 1)];
    const open = !intern.completed && t >= taskCount - 2;
    const status = !open ? "COMPLETED" : t === taskCount - 1 ? "IN_PROGRESS" : (i % 2 ? "SUBMITTED" : "TODO");
    await tx.task.create({ data: {
      assignmentId: assignment.id, assignedById: staff.supervisorUserId, title: task.title, description: task.description, priority: task.priority,
      startAt: at(startDay, 0), dueAt: open ? at(addDays(TODAY, 3 + t), 9) : at(dueDay, 9), status: status as "COMPLETED",
      progressPercentage: status === "COMPLETED" ? 100 : status === "SUBMITTED" ? 100 : status === "IN_PROGRESS" ? 50 : 0,
      ...(status === "COMPLETED" ? { completionNotes: "Completed and shared with the Supervisor.", submittedAt: at(dueDay, 8), reviewedById: staff.supervisorUserId, reviewedAt: at(dueDay, 9), completedAt: at(dueDay, 9), reviewRemarks: "Approved. Thank you." } : {}),
      ...(status === "SUBMITTED" ? { submittedAt: at(attended.at(-1)!, 8), completionNotes: "Submitted for review." } : {}),
    } });
  }
  // Evaluations: Initial, weekly Progress, Midterm (after ~6 weeks) and Final (completed internships).
  const evaluation = (type: "INITIAL" | "PROGRESS" | "MIDTERM" | "FINAL", iso: string, score: number, periodKey = "SINGLE", period?: { start: string; end: string }) => tx.evaluation.create({ data: {
    assignmentId: assignment.id, evaluatorId: staff.supervisorUserId, evaluationType: type, periodKey, periodStart: period ? day(period.start) : null, periodEnd: period ? day(period.end) : null,
    evaluationDate: day(iso), overallScore: score, criteriaScores: CRITERIA.map((criterion, k) => ({ criterion, rating: Math.min(5, Math.max(3, Math.round(score / 20) + ((k + score) % 3 === 0 ? -1 : 0))) })),
    strengths: "Organized, dependable and careful with records.", areasForImprovement: "Keep building confidence when leading short team briefings.", comments: "Good progress this period.",
    status: "ACKNOWLEDGED", submittedAt: at(iso, 8), acknowledgedById: userId, acknowledgedAt: at(iso, 10),
  } });
  await evaluation("INITIAL", attended[Math.min(4, attended.length - 1)], 78 + (i % 6));
  const weeks = [...new Set(attended.map(mondayOf))];
  for (const [k, monday] of weeks.slice(1).filter((_, w) => w % 3 === 0).slice(0, 4).entries()) {
    const friday = attended.filter((d) => mondayOf(d) === monday).at(-1)!;
    await evaluation("PROGRESS", friday, 80 + k * 2 + (i % 4), monday, { start: monday, end: friday });
  }
  if (attended.length >= 30) await evaluation("MIDTERM", attended[29], 84 + (i % 8));
  if (intern.completed) await evaluation("FINAL", attended.at(-1)!, 86 + (i % 10));
  await tx.feedback.createMany({ data: [
    { assignmentId: assignment.id, authorId: staff.supervisorUserId, recipientId: userId, feedbackType: "PRAISE" as const, title: "Good work this week", content: "Your records were accurate and on time. Keep it up.", visibility: "INTERN_AND_STAFF" as const, isRead: true, createdAt: at(attended[Math.min(10, attended.length - 1)], 9) },
    { assignmentId: assignment.id, authorId: staff.supervisorUserId, recipientId: userId, feedbackType: "IMPROVEMENT" as const, title: "Speak up in huddles", content: "Share your observations during the morning huddle; the team benefits from them.", visibility: "INTERN_AND_STAFF" as const, isRead: intern.completed, createdAt: at(attended[Math.min(25, attended.length - 1)], 9) },
  ] });
  // Getting started: the required documents (metadata rows only; no files).
  await tx.document.createMany({ data: DOCUMENT_REQUIREMENTS.filter((item) => item.required).map((item) => ({
    assignmentId: assignment.id, uploadedById: userId, fileName: item.title, originalFileName: `${item.key}.pdf`, storagePath: `demo-cohort/${assignment.id}/${item.key}.pdf`,
    mimeType: "application/pdf", fileExtension: "pdf", fileSizeBytes: BigInt(48_000), category: item.category as Prisma.DocumentCreateManyInput["category"], description: "Demo metadata only (no file).",
    status: "APPROVED" as const, reviewedById: staff.supervisorUserId, reviewedAt: at(start, 8), createdAt: at(start, 7),
  })) });
  if (intern.completed) {
    await tx.portfolio.create({ data: { assignmentId: assignment.id, status: "DRAFT", title: `${intern.position} Portfolio`,
      professionalSummary: `${intern.position} who kept store records accurate, supported daily operations and documented routines for the team.`,
      skills: ["Inventory management", "Customer service", "Reporting", "Teamwork"], achievements: ["Maintained the weekly inventory sheet", "Prepared turnover notes for the next intern"],
      selectedWork: ["Weekly inventory reports"], reflection: "I learned how consistent records keep a busy store running smoothly." } });
    // Completed a day after the last attended day, through the real path (snapshot + certificate when eligible).
    return completeAssignmentInTransaction(tx, { assignmentId: assignment.id, companyId: staff.companyId, fromStatus: "ACTIVE", now: at(addDays(end!, 1), 2) }).then((r) => ({ assignmentId: assignment.id, certificate: r.certificate.skipped ? null : r.certificate.certificateNumber }));
  }
  return { assignmentId: assignment.id, certificate: null };
}

async function main() {
  const target = resolveDemoTarget();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.connection }) });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const password = `Demo-${randomBytes(9).toString("base64url")}-2026!`;
  const createdAuth: string[] = [];
  const createAuth = async (email: string, role: string, firstName: string, lastName: string) => {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: firstName, last_name: lastName, demo_cohort: true }, app_metadata: { role, demo_cohort: true, password_change_required: false, welcome_pending: false } });
    if (error || !data.user) throw new Error(`Unable to create the Auth user ${email}: ${error?.message ?? "unknown error"}`);
    createdAuth.push(data.user.id); return data.user.id;
  };
  try {
    if (await prisma.user.findFirst({ where: { bio: COHORT_TAG }, select: { id: true } })) { console.log("Demo cohort already present. Run cleanup-demo-cohort.ts first to recreate it. Nothing changed."); return; }
    const company = await prisma.company.findFirst({ where: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true }, select: { id: true } });
    if (!company) throw new Error("The Bo's Coffee Main Office company is required.");
    const schoolIds: string[] = [];
    for (const school of SCHOOLS) schoolIds.push((await prisma.school.upsert({ where: { schoolCode: school.schoolCode }, create: { ...school, name: `${school.name}${target.schoolSuffix}`, addressLine: COHORT_TAG, city: "Metro Manila" }, update: {}, select: { id: true } })).id);

    const supervisors: { id: string; userId: string }[] = [], coordinators: string[] = [];
    for (const [k, person] of STAFF.entries()) {
      const authId = await createAuth(person.email, person.role, person.firstName, person.lastName);
      const user = await prisma.user.create({ data: { authId, email: person.email, role: person.role, firstName: person.firstName, lastName: person.lastName, phoneNumber: `+63 917 556 ${String(1000 + k).slice(-4)}`, bio: COHORT_TAG }, select: { id: true } });
      if (person.role === "SUPERVISOR") supervisors.push({ id: (await prisma.supervisorProfile.create({ data: { userId: user.id, companyId: company.id, position: person.position, department: "Store Operations" }, select: { id: true } })).id, userId: user.id });
      if (person.role === "COORDINATOR") coordinators.push((await prisma.coordinatorProfile.create({ data: { userId: user.id, schoolId: schoolIds[person.schoolIndex!], position: person.position, department: "College of Business" }, select: { id: true } })).id);
      if (person.role === "REPRESENTATIVE") await prisma.representativeProfile.create({ data: { userId: user.id, companyId: company.id, position: person.position, department: "Human Resources" } });
      if (person.role === "ADMIN") await prisma.adminProfile.create({ data: { userId: user.id, designation: person.position, notes: COHORT_TAG } });
    }
    const staffFor = (i: number): Staff => { const p = internPlacement(i); return { companyId: company.id, supervisorId: supervisors[p.supervisor].id, supervisorUserId: supervisors[p.supervisor].userId, coordinatorId: coordinators[p.coordinator], schoolId: schoolIds[p.school] }; };

    const summary = { completed: 0, active: 0, certificates: 0 };
    for (const intern of cohortInterns()) {
      const authId = await createAuth(intern.email, "INTERN", intern.firstName, intern.lastName);
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { authId, email: intern.email, role: "INTERN", firstName: intern.firstName, lastName: intern.lastName, phoneNumber: `+63 917 555 ${String(2000 + intern.index).slice(-4)}`, bio: COHORT_TAG }, select: { id: true } });
        return createIntern(tx, intern, staffFor(intern.index), user.id);
      }, { timeout: 60_000, maxWait: 20_000 });
      if (intern.completed) summary.completed += 1; else summary.active += 1;
      if (result.certificate) summary.certificates += 1;
    }

    mkdirSync(".gatea", { recursive: true });
    writeFileSync(target.credentials, JSON.stringify({
      purpose: target.production ? "Production demo cohort (fictional people). Remove with cleanup-demo-cohort.ts. Never resend invites to these addresses." : "Isolated demo cohort (fictional people).", tag: COHORT_TAG, sharedPassword: password,
      staff: STAFF.map(({ role, firstName, lastName, email, position, schoolIndex }) => ({ role, name: `${firstName} ${lastName}`, email, position, ...(schoolIndex === undefined ? {} : { school: SCHOOLS[schoolIndex].name }) })),
      interns: cohortInterns().map(({ index, firstName, lastName, email, completed }) => { const p = internPlacement(index); return { name: `${firstName} ${lastName}`, email, status: completed ? "COMPLETED" : "ACTIVE", school: SCHOOLS[p.school].name, supervisor: `${SUPERVISORS[p.supervisor][0]} ${SUPERVISORS[p.supervisor][1]}` }; }),
    }, null, 2) + "\n", { mode: 0o600 });
    try { chmodSync(target.credentials, 0o600); } catch { /* Windows ignores POSIX modes */ }
    console.log(`Demo cohort created: ${STAFF.length} staff (15 Supervisors, 15 Coordinators in 5 schools, 15 Representatives, 1 System Administrator), ${summary.active} active interns, ${summary.completed} completed interns, ${summary.certificates} certificates issued.`);
    console.log(`Accounts and the shared password are in ${target.credentials} (not printed).`);
  } catch (error) {
    // Roll back any Auth users created before the failure (database rows are removed by cleanup-demo-cohort.ts).
    for (const id of createdAuth) await supabase.auth.admin.deleteUser(id).catch(() => undefined);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("seed-demo-cohort.ts")) main().catch((error) => { console.error(error instanceof Error ? error.message : "Demo cohort seed failed."); process.exit(1); });
