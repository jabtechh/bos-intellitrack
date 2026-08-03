import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { bootstrapAdminSchema, canBootstrapAdministrator, compensateAuthUser } from "../src/lib/admin/bootstrap.ts";
import { provisionUserSchema } from "../src/lib/admin/provisioning.ts";
import { getAdminGuardDestination } from "../src/lib/auth/admin-guard.ts";
import { getSafeRedirectPath } from "../src/lib/auth/redirects.ts";

const common = { email: "person@example.com", firstName: "Ada", lastName: "Lovelace" };
const schoolId = "11111111-1111-4111-8111-111111111111";
const supervisorProfileId = "33333333-3333-4333-8333-333333333333";
const coordinatorProfileId = "44444444-4444-4444-8444-444444444444";
const internship = { supervisorProfileId, coordinatorProfileId, startDate: "2026-08-01", endDate: "2026-12-01", requiredHours: "500", scheduleStartTime: "08:00", scheduleEndTime: "17:00", gracePeriodMinutes: "10" };

test("bootstrap validation normalizes input and requires a strong password", () => {
  const valid = bootstrapAdminSchema.parse({ email: " ADMIN@EXAMPLE.COM ", password: `Aa1!${"x".repeat(8)}`, firstName: " Ada ", lastName: " Admin " });
  assert.equal(valid.email, "admin@example.com");
  assert.equal(bootstrapAdminSchema.safeParse({ ...valid, password: "weak" }).success, false);
});

test("bootstrap duplicate-admin prevention refuses when an active admin exists", () => {
  assert.equal(canBootstrapAdministrator(0), true);
  assert.equal(canBootstrapAdministrator(1), false);
});

test("admin guard rejects every non-admin role", () => {
  for (const role of ["INTERN", "SUPERVISOR", "COORDINATOR", "REPRESENTATIVE"] as const) assert.equal(getAdminGuardDestination(role), "/dashboard");
  assert.equal(getAdminGuardDestination("ADMIN"), null);
});

test("intern requires school and academic fields", () => {
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "INTERN" }).success, false);
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "INTERN", schoolId, studentNumber: "S-1", course: "BSIT", yearLevel: "4", ...internship }).success, true);
});

test("supervisor is automatically scoped to the office and requires position", () => {
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "SUPERVISOR" }).success, false);
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "SUPERVISOR", position: "Manager" }).success, true);
});

test("coordinator requires school", () => {
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "COORDINATOR", position: "Coordinator" }).success, false);
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "COORDINATOR", schoolId, position: "Coordinator" }).success, true);
});

test("representative is automatically scoped to the office", () => {
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "REPRESENTATIVE" }).success, false);
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "REPRESENTATIVE", position: "HR" }).success, true);
});

test("admin requires neither school nor company", () => {
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "ADMIN", accessLevel: "STANDARD" }).success, true);
});

test("external redirects are rejected", () => {
  assert.equal(getSafeRedirectPath("https://evil.example", "/dashboard"), "/dashboard");
  assert.equal(getSafeRedirectPath("//evil.example", "/dashboard"), "/dashboard");
});

test("compensating cleanup reports success and handles failures safely", async () => {
  assert.equal(await compensateAuthUser("auth-id", async () => ({ error: null })), true);
  assert.equal(await compensateAuthUser("auth-id", async () => ({ error: new Error("safe mock") })), false);
  assert.equal(await compensateAuthUser("auth-id", async () => { throw new Error("safe mock"); }), false);
});

test("there is no public signup route or public role-selection source", () => {
  const appRoot = join(process.cwd(), "src", "app");
  assert.equal(existsSync(join(appRoot, "signup")), false);
  const publicSources = collectSources(appRoot).filter((path) => !path.includes(`${join("app", "admin")}`));
  for (const path of publicSources) assert.doesNotMatch(readFileSync(path, "utf8"), /name=["']role["']/i);
});

function collectSources(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? collectSources(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}
