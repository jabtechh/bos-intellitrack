import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { branchSchema, branchSelectionError, resolveAttendanceLocation } from "../src/lib/branches/domain";
import { branchOperations } from "../src/lib/branches/operations";
import { canManageCompanyOperations } from "../src/lib/auth/roles";
import { assignmentInputSchema } from "../src/lib/assignments/validation";

const input = { name: " Main Office ", address: "Internal worksite address", isActive: true, latitude: "", longitude: "", geofenceRadiusMeters: "" };
const company = { id: "company-a", timezone: "Asia/Manila", latitude: 14, longitude: 121, geofenceRadiusMeters: 100 };
const read = (path: string) => readFileSync(path, "utf8");

test("coordinates validate pairs, ranges and radius without treating blank as zero", () => {
  const parsed = branchSchema.parse(input);
  assert.equal(parsed.name, "Main Office"); assert.equal(parsed.latitude, null);
  assert.equal(branchSchema.safeParse({ ...input, latitude: 14 }).success, false);
  assert.equal(branchSchema.safeParse({ ...input, latitude: 91, longitude: 121 }).success, false);
  assert.equal(branchSchema.safeParse({ ...input, geofenceRadiusMeters: 100 }).success, false);
  assert.equal(branchSchema.safeParse({ ...input, latitude: 0, longitude: 0, geofenceRadiusMeters: 100 }).success, true);
});

test("Branch service authorizes create, update and retirement; no historical deletion API", async () => {
  const calls: { kind: string; args: unknown }[] = [];
  const store = { branch: {
    create: async (args: unknown) => { calls.push({ kind: "create", args }); return args; },
    update: async (args: unknown) => { calls.push({ kind: "update", args }); return args; },
    findMany: async (args: unknown) => { calls.push({ kind: "list", args }); return []; },
    findFirst: async (args: unknown) => { calls.push({ kind: "get", args }); return null; },
  } } as unknown as Parameters<typeof branchOperations>[0];
  for (const role of ["ADMIN", "REPRESENTATIVE", "SUPERVISOR", "COORDINATOR", "INTERN"] as const) {
    const api = branchOperations(store, async () => { if (!canManageCompanyOperations(role)) throw new Error("Forbidden"); return company; });
    if (role === "ADMIN" || role === "REPRESENTATIVE") {
      await api.save(input); await api.save({ ...input, name: "Renamed" }, "branch-a"); await api.deactivate("branch-a"); await api.list(true); await api.get("branch-a");
    } else {
      const before = calls.length;
      await assert.rejects(api.save(input), /Forbidden/); await assert.rejects(api.save(input, "branch-a"), /Forbidden/); await assert.rejects(api.deactivate("branch-a"), /Forbidden/); await assert.rejects(api.list(), /Forbidden/);
      assert.equal(calls.length, before);
    }
    assert.equal("delete" in api, false);
  }
  assert.deepEqual(calls[0], { kind: "create", args: { data: { ...branchSchema.parse(input), companyId: company.id, timezone: company.timezone } } });
  assert.deepEqual(calls[2], { kind: "update", args: { where: { id: "branch-a", companyId: company.id }, data: { isActive: false } } });
  assert.match(JSON.stringify(calls[3]), /"isActive":true/);
});

test("duplicate protection is enforced by the database and errors propagate from service", async () => {
  const store = { branch: { create: async () => { throw Object.assign(new Error("duplicate"), { code: "P2002" }); } } } as unknown as Parameters<typeof branchOperations>[0];
  await assert.rejects(branchOperations(store, async () => company).save(input), /duplicate/);
  const migration = read("prisma/migrations/20260913090000_restore_branches/migration.sql");
  assert.match(migration, /lower\(trim\("name"\)\)/);
  assert.match(migration, /REFERENCES "branches"\("id"\) ON DELETE RESTRICT/);
  assert.match(migration, /ADD COLUMN "branch_id" UUID;/);
});

test("new assignments require an available Branch and reject inactive or foreign Branches", () => {
  assert.equal(branchSelectionError(undefined, []), null);
  assert.equal(branchSelectionError("active", [{ id: "active" }]), null);
  assert.ok(branchSelectionError(undefined, [{ id: "active" }]));
  assert.ok(branchSelectionError("inactive", [{ id: "active" }]));
  assert.ok(branchSelectionError("foreign", [{ id: "active" }]));
  assert.ok(branchSelectionError("inactive", []));
  const action = read("src/app/admin/users/actions.ts");
  assert.match(action, /validateAssignmentBranch\(office.id, input.branchId, tx\)/);
  assert.match(action, /branchId: input.branchId \?\? null/);
  assert.match(read("src/app/admin/users/new/page.tsx"), /listBranches\(true\)/);
});

test("assignment schema supports Branch while retaining legacy nullable assignments", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const assignment = { assignmentCode: "test", internProfileId: id, companyId: id, supervisorProfileId: id, coordinatorProfileId: id, startDate: "2026-09-01", endDate: "2026-12-01", gracePeriodMinutes: 10 };
  assert.equal(assignmentInputSchema.parse(assignment).branchId, undefined);
  assert.equal(assignmentInputSchema.parse({ ...assignment, branchId: id }).branchId, id);
});

test("attendance prefers assigned Branch, including retired historical Branch, and falls back safely", () => {
  const branch = { name: "Assigned", latitude: 15, longitude: 122, geofenceRadiusMeters: 50, timezone: company.timezone, isActive: false };
  assert.equal(resolveAttendanceLocation({ company, branch }).latitude, 15);
  assert.equal(resolveAttendanceLocation({ company, branch }).geofenceRadiusMeters, 50);
  assert.equal(resolveAttendanceLocation({ company, branch: null }).latitude, 14);
  assert.equal(resolveAttendanceLocation({ company }).geofenceRadiusMeters, 100);
  assert.equal(resolveAttendanceLocation({ company, branch: { ...branch, latitude: null, longitude: null } }).branchName, null);
  assert.equal(resolveAttendanceLocation({ company, branch: { ...branch, geofenceRadiusMeters: null } }).geofenceRadiusMeters, 100);
  const action = read("src/app/attendance/actions.ts");
  assert.match(action, /where: \{ userId: user.id \}/);
  assert.match(action, /internProfileId: profile.id, status: "ACTIVE"/);
  assert.doesNotMatch(action, /formData.get\("branchId"\)/);
  assert.equal((action.match(/distanceFor\(context.location,/g) ?? []).length, 2);
});

test("Branch read context retains existing profile scope and management guards", () => {
  assert.match(read("src/lib/profile/data.ts"), /where:profileTargetWhere\(viewer,targetId\)/);
  assert.match(read("src/lib/profile/data.ts"), /branch: await branchSchemaAvailable\(\)/);
  assert.match(read("src/lib/branches/service.ts"), /await requireCompanyOperationsManager\(\)/);
  assert.match(read("src/lib/auth/require-company-operations-manager.ts"), /userId: user.id, company: \{ companyCode: BO_COFFEE_OFFICE_CODE/);
});

test("backfill is explicit opt-in, preserves existing relationships and logs no credentials", () => {
  const script = read("scripts/backfill-main-office-branch.ts");
  assert.match(script, /if \(!apply\) return;/);
  assert.match(script, /--associate-assignments/);
  assert.match(script, /branchId: null/);
  assert.match(script, /companies.length !== 1/);
  assert.doesNotMatch(script, /console\.(log|error)\((company|error|process.env)/);
});
