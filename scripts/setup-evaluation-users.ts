import { randomBytes } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { internshipAssignmentBaseSelect } from "@/lib/assignments/projection";
import {
  BO_COFFEE_OFFICE_CODE,
  internalInternshipCode,
  timeOnReferenceDate,
} from "@/lib/organization/bo-coffee";

const credentialsPath = ".evaluation-credentials.local.json";

const roles = [
  "intern",
  "supervisor",
  "coordinator",
  "representative",
  "admin",
] as const;

type EvaluationRole = (typeof roles)[number];
type Credential = { email: string; password: string };
type Credentials = Record<EvaluationRole, Credential>;

const emails: Record<EvaluationRole, string> = {
  intern: "intellitrack.eval.intern@example.com",
  supervisor: "intellitrack.eval.supervisor@example.com",
  coordinator: "intellitrack.eval.coordinator@example.com",
  representative: "intellitrack.eval.representative@example.com",
  admin: "intellitrack.eval.admin@example.com",
};

function securePassword() {
  return `${randomBytes(18).toString("base64url")}Aa1!`;
}

function evaluationDates(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 90));
  return { start, end };
}

async function listAuthUsers(client: ReturnType<typeof createAdminClient>) {
  const users = [];
  for (let page = 1; page <= 10; page += 1) {
    const result = await client.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) throw new Error("Unable to inspect Supabase Auth users.");
    users.push(...result.data.users);
    if (result.data.users.length < 100) break;
  }
  return users;
}

async function readCredentials(): Promise<Credentials | null> {
  if (!existsSync(credentialsPath)) return null;
  return JSON.parse(await readFile(credentialsPath, "utf8")) as Credentials;
}

async function writeCredentials(value: Credentials) {
  await writeFile(credentialsPath, JSON.stringify(value, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  try {
    await chmod(credentialsPath, 0o600);
  } catch {}
}

async function verifySignIns(credentials: Credentials) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase public authentication configuration is missing.");

  for (const role of roles) {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const result = await client.auth.signInWithPassword(credentials[role]);
    if (result.error || !result.data.user) {
      throw new Error(`Evaluation ${role} sign-in verification failed.`);
    }
    await client.auth.signOut();
  }
}

async function main() {
  const existingCredentials = await readCredentials();
  if (existingCredentials) {
    await verifySignIns(existingCredentials);
    console.log("Evaluation accounts already exist and all five sign-ins were verified.");
    return;
  }

  const [school, office, adminCount] = await Promise.all([
    prisma.school.findFirst({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
    prisma.company.findFirst({
      where: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true },
      select: { id: true, name: true },
    }),
    prisma.user.count({ where: { role: "ADMIN", isActive: true } }),
  ]);

  if (!school) throw new Error("No active school is available for evaluation accounts.");
  if (!office) throw new Error("Bo’s Coffee Main Office is not configured.");
  if (adminCount < 1) throw new Error("An existing System Administrator is required before creating evaluation accounts.");

  const supabase = createAdminClient();
  const authUsers = await listAuthUsers(supabase);

  const conflictingAuth = roles.find((role) =>
    authUsers.some((user) => user.email?.toLowerCase() === emails[role]),
  );
  if (conflictingAuth) {
    throw new Error("An evaluation Auth account already exists without its local credential manifest.");
  }

  const existingAppUsers = await prisma.user.findMany({
    where: { email: { in: roles.map((role) => emails[role]) } },
    select: { email: true },
  });
  if (existingAppUsers.length > 0) {
    throw new Error("An evaluation application account already exists without its local credential manifest.");
  }

  const credentials = Object.fromEntries(
    roles.map((role) => [
      role,
      { email: emails[role], password: securePassword() },
    ]),
  ) as Credentials;

  const authIds = {} as Record<EvaluationRole, string>;
  const createdAuthIds: string[] = [];

  try {
    for (const role of roles) {
      const result = await supabase.auth.admin.createUser({
        email: credentials[role].email,
        password: credentials[role].password,
        email_confirm: true,
        app_metadata: { password_change_required: false, evaluation_account: true },
      });

      if (result.error || !result.data.user) {
        throw new Error(`Could not create the evaluation ${role} Auth account.`);
      }

      authIds[role] = result.data.user.id;
      createdAuthIds.push(result.data.user.id);
    }

    await prisma.$transaction(async (tx) => {
      const admin = await tx.user.create({
        data: {
          authId: authIds.admin,
          email: credentials.admin.email,
          role: "ADMIN",
          firstName: "Evaluation",
          lastName: "Administrator",
          isActive: true,
        },
      });
      await tx.adminProfile.create({
        data: {
          userId: admin.id,
          accessLevel: "STANDARD",
          designation: "Evaluation Administrator",
          notes: "Evaluation-only account for role and workflow review.",
        },
      });

      const supervisor = await tx.user.create({
        data: {
          authId: authIds.supervisor,
          email: credentials.supervisor.email,
          role: "SUPERVISOR",
          firstName: "Evaluation",
          lastName: "Supervisor",
          isActive: true,
        },
      });
      const supervisorProfile = await tx.supervisorProfile.create({
        data: {
          userId: supervisor.id,
          companyId: office.id,
          employeeNumber: "EVAL-SUP-001",
          position: "Company Supervisor",
          department: "Main Office Operations",
          officeLocation: "Bo’s Coffee Main Office",
        },
      });

      const coordinator = await tx.user.create({
        data: {
          authId: authIds.coordinator,
          email: credentials.coordinator.email,
          role: "COORDINATOR",
          firstName: "Evaluation",
          lastName: "Coordinator",
          isActive: true,
        },
      });
      const coordinatorProfile = await tx.coordinatorProfile.create({
        data: {
          userId: coordinator.id,
          schoolId: school.id,
          employeeNumber: "EVAL-COORD-001",
          position: "School Coordinator",
          department: "Internship Office",
          office: school.name,
        },
      });

      const representative = await tx.user.create({
        data: {
          authId: authIds.representative,
          email: credentials.representative.email,
          role: "REPRESENTATIVE",
          firstName: "Evaluation",
          lastName: "Representative",
          isActive: true,
        },
      });
      await tx.representativeProfile.create({
        data: {
          userId: representative.id,
          companyId: office.id,
          employeeNumber: "EVAL-REP-001",
          position: "Company Representative",
          department: "Main Office Operations",
        },
      });

      const intern = await tx.user.create({
        data: {
          authId: authIds.intern,
          email: credentials.intern.email,
          role: "INTERN",
          firstName: "Evaluation",
          lastName: "Intern",
          isActive: true,
        },
      });
      const internProfile = await tx.internProfile.create({
        data: {
          userId: intern.id,
          schoolId: school.id,
          studentNumber: "EVAL-INTERN-001",
          course: "Bachelor of Science in Information Technology",
          yearLevel: "4",
        },
      });

      const dates = evaluationDates();
      await tx.internshipAssignment.create({
        select: internshipAssignmentBaseSelect,
        data: {
          internProfileId: internProfile.id,
          companyId: office.id,
          supervisorProfileId: supervisorProfile.id,
          coordinatorProfileId: coordinatorProfile.id,
          assignmentCode: `EVAL-${internalInternshipCode(intern.id)}`,
          positionTitle: "Information Technology Intern",
          department: "Main Office Operations",
          startDate: dates.start,
          endDate: dates.end,
          requiredHours: 486,
          requiredHoursConfirmedAt: new Date(),
          requiredHoursUpdatedById: admin.id,
          scheduleStartTime: timeOnReferenceDate("08:00"),
          scheduleEndTime: timeOnReferenceDate("17:00"),
          gracePeriodMinutes: 10,
          status: "ACTIVE",
          activatedAt: new Date(),
          createdById: admin.id,
          notes: "Evaluation-only internship assignment.",
        },
      });
    });

    await writeCredentials(credentials);
    await verifySignIns(credentials);
    console.log("Five evaluation accounts were created and all sign-ins were verified.");
    console.log(`Credentials saved locally to ${credentialsPath}.`);
  } catch (error) {
    for (const id of createdAuthIds) {
      await supabase.auth.admin.deleteUser(id);
    }
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Evaluation account setup failed.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
