// Creates ONE fresh Intern for testing first login -> password change -> Getting started (face photo) -> Time In selfie.
// The Intern starts with a temporary password that must be changed, an empty profile and no face photo.
// Supervisor Ramon Villanueva and Coordinator Teresita Mendoza (demo cohort, school DEMO-MMPC) are reused.
//
//   Isolated:   npx tsx --env-file=.env.gatea.local scripts/create-test-intern.ts
//   Production: DEMO_COHORT_TARGET=production DEMO_COHORT_CONFIRM=create-demo-accounts-in-production \
//               npx tsx --env-file=.env scripts/create-test-intern.ts
//
// Tagged like the demo cohort, so scripts/cleanup-demo-cohort.ts removes it too. Optional TEST_INTERN_EMAIL overrides
// the address. The temporary password is written only to .gatea/test-intern[.production].local.json (gitignored).
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { BO_COFFEE_OFFICE_CODE, timeOnReferenceDate } from "../src/lib/organization/bo-coffee.ts";
import { COHORT_TAG, resolveDemoTarget } from "./seed-demo-cohort.ts";

const EMAIL = (process.env.TEST_INTERN_EMAIL ?? "sofia.ramirez.intern@gmail.com").trim().toLowerCase();

async function main() {
  const target = resolveDemoTarget();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.connection }) });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  let authId: string | null = null;
  try {
    if (await prisma.user.findFirst({ where: { email: EMAIL }, select: { id: true } })) throw new Error(`An account for ${EMAIL} already exists. Set TEST_INTERN_EMAIL to another address.`);
    const company = await prisma.company.findFirst({ where: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true }, select: { id: true } });
    const school = await prisma.school.findFirst({ where: { schoolCode: "DEMO-MMPC", addressLine: COHORT_TAG }, select: { id: true } });
    const supervisor = await prisma.supervisorProfile.findFirst({ where: { user: { email: "ramon.villanueva.ops@gmail.com", bio: COHORT_TAG } }, select: { id: true } });
    const coordinator = await prisma.coordinatorProfile.findFirst({ where: { user: { email: "teresita.mendoza.ojt@gmail.com", bio: COHORT_TAG } }, select: { id: true } });
    if (!company || !school || !supervisor || !coordinator) throw new Error("The demo cohort (school DEMO-MMPC, Supervisor Ramon Villanueva, Coordinator Teresita Mendoza) must exist first. Run seed-demo-cohort.ts.");

    const temporaryPassword = `Temp-${randomBytes(6).toString("base64url")}-2026!`;
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL, password: temporaryPassword, email_confirm: true,
      user_metadata: { first_name: "Sofia", last_name: "Ramirez", onboarding_orientation_read: [], demo_cohort: true },
      app_metadata: { role: "INTERN", demo_cohort: true, password_change_required: true, welcome_pending: false },
    });
    if (error || !data.user) throw new Error(`Unable to create the Auth user: ${error?.message ?? "unknown error"}`);
    authId = data.user.id;

    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const end = new Date(today); end.setUTCDate(end.getUTCDate() + 7 * 16);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { authId: authId!, email: EMAIL, role: "INTERN", firstName: "Sofia", lastName: "Ramirez", bio: COHORT_TAG }, select: { id: true } });
      const profile = await tx.internProfile.create({ data: { userId: user.id, schoolId: school.id, studentNumber: `2022-${randomBytes(3).readUIntBE(0, 3) % 90000 + 10000}`, course: "BS Hospitality Management", yearLevel: "4th Year" }, select: { id: true } });
      await tx.internshipAssignment.create({ data: {
        internProfileId: profile.id, companyId: company.id, supervisorProfileId: supervisor.id, coordinatorProfileId: coordinator.id,
        assignmentCode: `TEST-${randomBytes(3).toString("hex").toUpperCase()}`, positionTitle: "Operations Intern", department: "Store Operations",
        startDate: today, endDate: end, requiredHours: 486, requiredHoursConfirmedAt: today,
        scheduleStartTime: timeOnReferenceDate("08:00"), scheduleEndTime: timeOnReferenceDate("17:00"), gracePeriodMinutes: 15,
        status: "ACTIVE", activatedAt: today, notes: COHORT_TAG,
      }, select: { id: true } });
    });

    const file = target.production ? ".gatea/test-intern.production.local.json" : ".gatea/test-intern.local.json";
    mkdirSync(".gatea", { recursive: true });
    writeFileSync(file, JSON.stringify({ purpose: "Fresh test Intern (first login must change the password).", name: "Sofia Ramirez", email: EMAIL, temporaryPassword, supervisor: "Ramon Villanueva", coordinator: "Teresita Mendoza" }, null, 2) + "\n", { mode: 0o600 });
    console.log(`Fresh test Intern created: Sofia Ramirez <${EMAIL}>. Temporary password saved in ${file} (not printed).`);
  } catch (error) {
    if (authId) await supabase.auth.admin.deleteUser(authId).catch(() => undefined);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Test intern creation failed."); process.exit(1); });
