/* eslint-disable @typescript-eslint/no-explicit-any */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { chmod, readFile, writeFile } from "node:fs/promises";

import { BO_COFFEE_OFFICE_CODE, internalInternshipCode, timeOnReferenceDate } from "@/lib/organization/bo-coffee";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import {
  DEMO_IDENTITIES,
  DEMO_REQUIRED_HOURS,
  DEMO_ROLES,
  demoInternshipDates,
  secureDemoPassword,
  selectExactSchool,
  validateDemoEnvironment,
  type DemoRole,
} from "@/lib/demo/setup";

config({ path: [".env.local", ".env"], quiet: true });

const credentialsPath = ".demo-credentials.local.json";
type Credential = { email: string; password: string };
type Credentials = Record<DemoRole, Credential>;

async function main() {
  validateDemoEnvironment(process.env);
  const [offices, schools] = await Promise.all([
    prisma.company.findMany({ where: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } }),
    prisma.school.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);
  if (offices.length !== 1) throw new Error("Expected exactly one active Bo’s Coffee operational office.");
  const office = offices[0];
  const school = selectExactSchool(schools);
  const stored = await readCredentials();
  const supabase = createAdminClient();
  const authUsers = await listAuthUsers(supabase);
  const hasExistingDemoAuth = DEMO_ROLES.some((role) => authUsers.some((user) => user.email?.toLowerCase() === DEMO_IDENTITIES[role].email));
  if (hasExistingDemoAuth && !stored) throw new Error("A demo Auth identity exists without its locally owned credential manifest; setup stopped safely.");
  const credentials = stored ?? createCredentials();
  validateCredentials(credentials);
  if (!stored) await writeCredentials(credentials);
  const authIds = {} as Record<DemoRole, string>;
  const createdAuthIds: string[] = [];
  let createdAnyAuth = false;

  try {
    for (const role of DEMO_ROLES) {
      const identity = DEMO_IDENTITIES[role];
      const existing = authUsers.find((user) => user.email?.toLowerCase() === identity.email);
      if (existing) {
        authIds[role] = existing.id;
        continue;
      }
      const result = await supabase.auth.admin.createUser({
        email: identity.email,
        password: credentials[role].password,
        email_confirm: true,
      });
      if (result.error || !result.data.user) throw new Error(`Demo ${roleLabel(role)} Auth setup failed.`);
      authIds[role] = result.data.user.id;
      createdAuthIds.push(result.data.user.id);
      createdAnyAuth = true;
    }

    await prisma.$transaction(async (tx) => {
      const coordinator = await ensureUser(tx, "coordinator", authIds.coordinator, async (userId) =>
        tx.coordinatorProfile.create({ data: { userId, schoolId: school.id, employeeNumber: "DEMO-COORD", position: "School Coordinator", department: "Internship Office", office: "Pateros Technological College" } }),
      );
      const supervisor = await ensureUser(tx, "supervisor", authIds.supervisor, async (userId) =>
        tx.supervisorProfile.create({ data: { userId, companyId: office.id, employeeNumber: "DEMO-SUP", position: "Company Supervisor", department: "Main Office", officeLocation: "Bo’s Coffee Main Office" } }),
      );
      const representative = await ensureUser(tx, "representative", authIds.representative, async (userId) =>
        tx.representativeProfile.create({ data: { userId, companyId: office.id, employeeNumber: "DEMO-REP", position: "Company Representative", department: "Main Office" } }),
      );
      const intern = await ensureUser(tx, "intern", authIds.intern, async (userId) =>
        tx.internProfile.create({ data: { userId, schoolId: school.id, studentNumber: "DEMO-INTERN", course: "Bachelor of Science in Information Technology", yearLevel: "4" } }),
      );
      if (coordinator.profile.schoolId !== school.id || supervisor.profile.companyId !== office.id || representative.profile.companyId !== office.id || intern.profile.schoolId !== school.id) {
        throw new Error("Demo business profile scope conflicts with the expected school or office.");
      }
      const internProfile = await tx.internProfile.findUniqueOrThrow({ where: { userId: intern.id } });
      const assignments = await tx.internshipAssignment.findMany({ where: { internProfileId: internProfile.id } });
      if (assignments.length > 1) throw new Error("Demo Intern has conflicting internship records.");
      if (assignments.length === 1) {
        const assignment = assignments[0];
        if (assignment.status !== "ACTIVE" || assignment.companyId !== office.id || assignment.supervisorProfileId !== supervisor.profileId || assignment.coordinatorProfileId !== coordinator.profileId || assignment.requiredHours !== DEMO_REQUIRED_HOURS) {
          throw new Error("Demo Intern has a conflicting internship record.");
        }
      } else {
        const dates = demoInternshipDates();
        await tx.internshipAssignment.create({ data: {
          internProfileId: internProfile.id,
          companyId: office.id,
          supervisorProfileId: supervisor.profileId,
          coordinatorProfileId: coordinator.profileId,
          assignmentCode: `DEMO-${internalInternshipCode(intern.id)}`,
          positionTitle: "Information Technology Intern",
          department: "Main Office",
          startDate: dates.start,
          endDate: dates.end,
          requiredHours: DEMO_REQUIRED_HOURS,
          requiredHoursConfirmedAt: new Date(),
          scheduleStartTime: timeOnReferenceDate("08:00"),
          scheduleEndTime: timeOnReferenceDate("17:00"),
          gracePeriodMinutes: 10,
          status: "ACTIVE",
          activatedAt: new Date(),
        } });
      }
      const demoUserCount = await tx.user.count({ where: { email: { in: DEMO_ROLES.map((role) => DEMO_IDENTITIES[role].email) } } });
      if (demoUserCount !== 4) throw new Error("Expected exactly four demo business users.");
    });
    console.log(createdAnyAuth ? "Four demo business roles were provisioned safely." : "Four demo business roles were already provisioned; no duplicates were created.");
  } catch (error) {
    for (const authId of createdAuthIds) await supabase.auth.admin.deleteUser(authId);
    throw error;
  }
}

async function ensureUser(tx: any, role: DemoRole, authId: string, createProfile: (userId: string) => Promise<{ id: string }>) {
  const identity = DEMO_IDENTITIES[role];
  const expectedRole = role.toUpperCase();
  const existing = await tx.user.findUnique({ where: { email: identity.email } });
  if (existing) {
    if (existing.authId !== authId || existing.role !== expectedRole || !existing.isActive) throw new Error(`Demo ${roleLabel(role)} application identity conflicts with existing data.`);
    const profile = await findProfile(tx, role, existing.id);
    if (!profile) throw new Error(`Demo ${roleLabel(role)} profile is incomplete.`);
    if (existing.firstName !== identity.firstName || existing.lastName !== identity.lastName) throw new Error(`Demo ${roleLabel(role)} name conflicts with existing data.`);
    return { ...existing, profileId: profile.id, profile };
  }
  const user = await tx.user.create({ data: { authId, email: identity.email, role: expectedRole, firstName: identity.firstName, lastName: identity.lastName, isActive: true } });
  const profile = await createProfile(user.id);
  return { ...user, profileId: profile.id, profile };
}

function findProfile(tx: any, role: DemoRole, userId: string) {
  if (role === "intern") return tx.internProfile.findUnique({ where: { userId } });
  if (role === "supervisor") return tx.supervisorProfile.findUnique({ where: { userId } });
  if (role === "coordinator") return tx.coordinatorProfile.findUnique({ where: { userId } });
  return tx.representativeProfile.findUnique({ where: { userId } });
}

function createCredentials(): Credentials {
  return Object.fromEntries(DEMO_ROLES.map((role) => [role, { email: DEMO_IDENTITIES[role].email, password: secureDemoPassword() }])) as Credentials;
}

function validateCredentials(value: Credentials) {
  for (const role of DEMO_ROLES) {
    if (value?.[role]?.email !== DEMO_IDENTITIES[role].email || typeof value[role].password !== "string" || value[role].password.length < 20) {
      throw new Error("The local demo credential manifest is invalid.");
    }
  }
}

async function listAuthUsers(client: ReturnType<typeof createAdminClient>) {
  const users = [];
  for (let page = 1; page <= 100; page++) {
    const result = await client.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) throw new Error("Demo Auth preflight failed.");
    users.push(...result.data.users);
    if (result.data.users.length < 100) break;
  }
  return users;
}

async function readCredentials() {
  return existsSync(credentialsPath) ? JSON.parse(await readFile(credentialsPath, "utf8")) as Credentials : null;
}

async function writeCredentials(value: Credentials) {
  await writeFile(credentialsPath, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
  try { await chmod(credentialsPath, 0o600); } catch {}
}

function roleLabel(role: DemoRole) {
  return ({ intern: "Intern", supervisor: "Company Supervisor", coordinator: "School Coordinator", representative: "Company Representative" })[role];
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Demo setup failed safely.");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
