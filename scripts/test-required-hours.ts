import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { correctionReasonSchema, progressValues, requiredHoursSchema, validateAgainstCredit } from "../src/lib/required-hours/domain.ts";

const read=(p:string)=>readFileSync(p,"utf8");
const schema=read("prisma/schema.prisma");
const migration=read("prisma/migrations/20260804130000_support_required_hours_onboarding/migration.sql");
const provisioning=read("src/lib/admin/provisioning.ts");
const provisionForm=read("src/app/admin/users/new/provision-user-form.tsx");
const provisionAction=read("src/app/admin/users/actions.ts");
const onboardingAction=read("src/app/onboarding/internship-hours/actions.ts");
const correctionAction=read("src/app/admin/users/required-hours-actions.ts");
const correctionAuth=read("src/lib/required-hours/authorization.ts");
const internDashboard=read("src/components/intern-dashboard-data.tsx");

test("schema keeps honest nullable required-hours state",()=>{
  assert.match(schema,/requiredHours\s+Int\?/);
  assert.match(migration,/required_hours" IS NULL OR "required_hours" > 0/);
  assert.doesNotMatch(migration,/UPDATE\s+"internship_assignments"/i);
});

test("required-hours domain enforces whole-number bounds and truthful progress",()=>{
  assert(!requiredHoursSchema.safeParse(99).success);
  assert(requiredHoursSchema.safeParse(100).success);
  assert(requiredHoursSchema.safeParse(1500).success);
  assert(!requiredHoursSchema.safeParse(1501).success);
  assert(!requiredHoursSchema.safeParse(100.5).success);
  assert.equal(progressValues(null,25),null);
  assert.deepEqual(progressValues(500,125),{required:500,credited:125,remaining:375,percentage:25});
  assert.ok(validateAgainstCredit(100,100.5));
});

test("normal Intern provisioning does not collect or confirm required hours",()=>{
  assert.doesNotMatch(provisioning,/requiredHours:\s*z\./);
  assert.doesNotMatch(provisionForm,/name="requiredHours"/);
  assert.match(provisionAction,/requiredHours: null/);
  assert.match(provisionAction,/requiredHoursConfirmedAt: null/);
  assert.match(provisionAction,/requiredHoursUpdatedById: null/);
});

test("Intern confirms initial required hours once through onboarding",()=>{
  assert.match(onboardingAction,/get\("confirmed"\) !== "on"/);
  assert.match(onboardingAction,/requiredHours: null, requiredHoursConfirmedAt: null/);
  assert.match(onboardingAction,/requiredHoursConfirmedAt: new Date\(\)/);
  assert.match(internDashboard,/requiredHours === null\) redirect\("\/onboarding\/internship-hours"\)/);
});

test("Representative correction requires reason and server-side current value",()=>{
  assert(!correctionReasonSchema.safeParse("").success);
  assert(correctionReasonSchema.safeParse("School document corrected").success);
  assert.match(correctionAction,/requireRequiredHoursManager/);
  assert.match(correctionAction,/requiredHours: assignment\.requiredHours/);
  assert.match(correctionAction,/requiredHoursUpdateReason: reason\.data/);
  assert.match(correctionAction,/updateMany/);
});

test("required-hours manager is Representative routine plus technical Admin emergency only",()=>{
  assert.match(correctionAuth,/role === "REPRESENTATIVE"/);
  assert.match(correctionAuth,/role === "ADMIN"/);
  assert.doesNotMatch(correctionAuth,/SUPERVISOR|COORDINATOR/);
});

test("required-hours verification remains source/domain-only in Production-backed local environment",()=>{
  const source=readFileSync("scripts/test-required-hours.ts","utf8");
  assert.doesNotMatch(source,/prisma\.internshipAssignment\.(?:count|findFirst|update)|prisma\.\$transaction/);
});
