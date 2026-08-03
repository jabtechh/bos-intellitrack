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
const companyId = "22222222-2222-4222-8222-222222222222";

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
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "INTERN", schoolId, studentNumber: "S-1", course: "BSIT", yearLevel: "4" }).success, true);
});

test("supervisor requires company and position", () => {
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "SUPERVISOR", companyId }).success, false);
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "SUPERVISOR", companyId, position: "Manager" }).success, true);
});

test("coordinator requires school", () => {
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "COORDINATOR", position: "Coordinator" }).success, false);
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "COORDINATOR", schoolId, position: "Coordinator" }).success, true);
});

test("representative requires company", () => {
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "REPRESENTATIVE", position: "HR" }).success, false);
  assert.equal(provisionUserSchema.safeParse({ ...common, role: "REPRESENTATIVE", companyId, position: "HR" }).success, true);
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
