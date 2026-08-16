import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { DEMO_IDENTITIES, DEMO_REQUIRED_HOURS, DEMO_ROLES, demoInternshipDates, selectExactSchool, shouldCompensateDemoAuth, validateDemoEnvironment } from "../src/lib/demo/setup.ts";

const source = readFileSync("scripts/setup-demo-users.ts", "utf8");
const validEnvironment = { SUPABASE_SECRET_KEY: "configured", NEXT_PUBLIC_SUPABASE_URL: "configured", DATABASE_URL: "configured", INTELLITRACK_DEMO_SETUP: "1" };

test("mutation requires explicit confirmation", () => assert.throws(() => validateDemoEnvironment({ ...validEnvironment, INTELLITRACK_DEMO_SETUP: undefined }), /confirmation/));
test("exactly four business identities are configured without an administrator", () => {
  assert.deepEqual(DEMO_ROLES, ["intern", "supervisor", "coordinator", "representative"]);
  assert.equal(Object.keys(DEMO_IDENTITIES).length, 4);
  assert.doesNotMatch(DEMO_ROLES.join(" "), /admin/i);
});
test("role mapping and profiles use deterministic business roles", () => {
  for (const role of DEMO_ROLES) assert.match(source, new RegExp(`ensureUser\\(tx, \\"${role}\\"`));
  assert.match(source, /supervisorProfile\.create/);
  assert.match(source, /coordinatorProfile\.create/);
  assert.match(source, /representativeProfile\.create/);
  assert.match(source, /internProfile\.create/);
  assert.match(source, /firstName !== identity\.firstName/);
});
test("Intern is linked to the selected Supervisor, Coordinator, school, and one internship", () => {
  assert.match(source, /supervisorProfileId: supervisor\.profileId/);
  assert.match(source, /coordinatorProfileId: coordinator\.profileId/);
  assert.match(source, /schoolId: school\.id/);
  assert.match(source, /assignments\.length > 1/);
  assert.match(source, /assignments\.length === 1/);
});
test("school selection is exact and ambiguous matches are rejected", () => {
  assert.equal(selectExactSchool([{ name: "Pateros Technological College", marker: 1 }]).marker, 1);
  assert.throws(() => selectExactSchool([]), /exactly one/);
  assert.throws(() => selectExactSchool([{ name: "Pateros Technological College" }, { name: "Pateros Technological College" }]), /exactly one/);
});
test("office and school creation are absent", () => {
  assert.doesNotMatch(source, /(?:company|school)\.(?:create|upsert)/);
  assert.match(source, /BO_COFFEE_OFFICE_CODE/);
});
test("existing role profiles retain the required school and office scope", () => {
  assert.match(source, /coordinator\.profile\.schoolId !== school\.id/);
  assert.match(source, /supervisor\.profile\.companyId !== office\.id/);
  assert.match(source, /intern\.profile\.schoolId !== school\.id/);
  assert.match(source, /representative\.profile\.companyId !== office\.id/);
});
test("internship setup follows the established 486-hour convention", () => {
  assert.equal(DEMO_REQUIRED_HOURS, 486);
  const now = new Date();
  const dates = demoInternshipDates(now);
  assert.ok(dates.start <= now && dates.end > now);
  assert.match(source, /requiredHoursConfirmedAt/);
});
test("second execution reuses identities and rejects conflicting records", () => {
  assert.match(source, /if \(existing\)/);
  assert.match(source, /no duplicates were created/i);
  assert.match(source, /conflicting internship record/);
});
test("compensation is limited to Auth identities created during this run", () => {
  assert.equal(shouldCompensateDemoAuth(true), true);
  assert.equal(shouldCompensateDemoAuth(false), false);
  assert.match(source, /createdAuthIds\.push/);
  assert.match(source, /for \(const authId of createdAuthIds\)/);
});
test("credentials are ignored and never logged", () => {
  assert.match(readFileSync(".gitignore", "utf8"), /\.demo-credentials\.local\.json/);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^)]*(?:password|email|authId)/i);
  assert.doesNotMatch(source, /password:\s*["'][^"']+["']/);
});
test("no operational history or administrator is created", () => {
  assert.doesNotMatch(source, /(?:attendance|workLog|task|evaluation|feedback|document|adminProfile)\.(?:create|upsert)/);
});
