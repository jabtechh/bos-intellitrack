import assert from "node:assert/strict";
import test from "node:test";

import { assignmentInputSchema, canTransition, getEligibilityErrors, type AssignmentEligibility } from "../src/lib/assignments/validation.ts";
import { getAdminGuardDestination } from "../src/lib/auth/admin-guard.ts";

const validInput = {
  assignmentCode: " int-001 ", internProfileId: "11111111-1111-4111-8111-111111111111",
  companyId: "22222222-2222-4222-8222-222222222222", supervisorProfileId: "33333333-3333-4333-8333-333333333333",
  coordinatorProfileId: "44444444-4444-4444-8444-444444444444", startDate: "2026-08-01", endDate: "2026-12-01",
  requiredHours: 480, scheduleStartTime: "08:00", scheduleEndTime: "17:00", gracePeriodMinutes: 10,
};
const eligible: AssignmentEligibility = {
  internExists: true, internActive: true, internSchoolActive: true, companyExists: true, companyActive: true,
  supervisorExists: true, supervisorActive: true, supervisorCompanyMatches: true, coordinatorExists: true,
  coordinatorActive: true, coordinatorSchoolMatches: true, hasConflictingActiveAssignment: false,
};

test("end date before start date is rejected", () => assert.equal(assignmentInputSchema.safeParse({ ...validInput, endDate: "2026-07-31" }).success, false));
test("zero required hours is rejected", () => assert.equal(assignmentInputSchema.safeParse({ ...validInput, requiredHours: 0 }).success, false));
test("negative grace period is rejected", () => assert.equal(assignmentInputSchema.safeParse({ ...validInput, gracePeriodMinutes: -1 }).success, false));
test("daytime schedule must end after it starts", () => assert.equal(assignmentInputSchema.safeParse({ ...validInput, scheduleEndTime: "07:00" }).success, false));
test("supervisor from another company is rejected", () => assert.match(getEligibilityErrors({ ...eligible, supervisorCompanyMatches: false })[0], /supervisor/i));
test("coordinator from another school is rejected", () => assert.match(getEligibilityErrors({ ...eligible, coordinatorSchoolMatches: false })[0], /coordinator/i));
test("inactive intern is rejected", () => assert.match(getEligibilityErrors({ ...eligible, internActive: false })[0], /inactive/i));
test("inactive company is rejected", () => assert.match(getEligibilityErrors({ ...eligible, companyActive: false })[0], /inactive/i));
test("duplicate active assignment is rejected", () => assert.match(getEligibilityErrors({ ...eligible, hasConflictingActiveAssignment: true })[0], /active assignment/i));
test("PENDING can transition to ACTIVE", () => assert.equal(canTransition("PENDING", "ACTIVE"), true));
test("ACTIVE can transition to COMPLETED", () => assert.equal(canTransition("ACTIVE", "COMPLETED"), true));
test("invalid status transition is rejected", () => assert.equal(canTransition("PENDING", "COMPLETED"), false));
test("client-supplied status and creator ID are ignored", () => {
  const parsed = assignmentInputSchema.parse({ ...validInput, status: "ACTIVE", createdById: validInput.companyId });
  assert.equal("status" in parsed, false); assert.equal("createdById" in parsed, false); assert.equal(parsed.assignmentCode, "INT-001");
});
test("non-admin access is rejected", () => {
  for (const role of ["INTERN", "SUPERVISOR", "COORDINATOR", "REPRESENTATIVE"] as const) assert.equal(getAdminGuardDestination(role), "/dashboard");
});
