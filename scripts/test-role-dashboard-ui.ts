import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const dashboard = read("src/app/(authenticated)/dashboard/page.tsx");
const shell = read("src/components/app-shell.tsx");
const mobile = read("src/components/mobile-navigation.tsx");
const operations = read("src/app/admin/page.tsx");
const users = read("src/app/admin/users/page.tsx");
const usersTable = read("src/components/users-data-table.tsx");
const adminLayout = read("src/app/admin/layout.tsx");

test("shared shell remains role-aware", () => {
  for (const role of ["INTERN", "SUPERVISOR", "COORDINATOR", "REPRESENTATIVE", "ADMIN"]) {
    assert(mobile.includes(role + ":"));
  }
  assert(shell.includes("navigationForRole"));
});

test("Supervisor dashboard is directly scoped and points to Reviews", () => {
  assert(dashboard.includes("supervisorProfile.findUnique"));
  assert(dashboard.includes("Company Supervisor"));
  assert(dashboard.includes("/reviews"));
  assert(dashboard.includes("Assigned Interns"));
  assert(dashboard.includes("Task Submissions"));
  assert(!dashboard.includes("Company Operations"));
});

test("Coordinator dashboard is focused and read-only", () => {
  assert(dashboard.includes("coordinatorProfile.findUnique"));
  assert(dashboard.includes("School Coordinator"));
  assert(dashboard.includes("Student progress"));
  assert(dashboard.includes("/students"));
  assert(!dashboard.includes("Approve"));
  assert(!dashboard.includes("Reject"));
});

test("Representative uses dedicated Stitch-aligned Dashboard", () => {
  assert(dashboard.includes('redirect("/admin")'));
  for (const label of ["Dashboard", "Program attention", "Program snapshot", "Workspace setup"]) {
    assert(operations.includes(label));
  }
  for (const fake of ["Q2 INTERNSHIP COHORT", "Updated real-time", "Review queue", "Active Policy Rules"]) {
    assert(!operations.includes(fake));
  }
  assert(operations.includes("Supervisor review ownership"));
  assert(operations.includes("<DashboardKpiCard"));
  assert(!operations.includes("border-warning/40 ring-1 ring-warning/10"));
  assert(!operations.includes("absolute inset-x-0 top-0 h-1 bg-warning"));
});

test("user directory uses real filters and responsive table/card layouts", () => {
  assert(users.includes("<UsersDataTable"));
  assert(users.includes("Invite user"));
  for (const summary of ["Active Interns", "Active Company Supervisors", "Active School Coordinators"]) assert(users.includes(summary));
  for (const token of ["Search name or email", "All roles", "All statuses", "<table", "xl:hidden", "xl:block", "Rows per page", "Previous", "Next", "onChange", "toggleSort"]) {
    assert(usersTable.includes(token), `Missing directory feature: ${token}`);
  }
  assert(usersTable.includes("setPage(1)"));
  assert(!usersTable.includes("Apply filters"));
  assert(!usersTable.includes("Export CSV"));
});

test("technical Admin navigation is separate from Representative operations", () => {
  assert(adminLayout.includes("representativeNav"));
  assert(adminLayout.includes("adminNav"));
  assert(shell.includes('href: "/admin/system", label: "System"'));
  for (const legacy of ["Attendance Review", "Correction Review", "Work log journals"]) {
    assert(!adminLayout.includes(legacy));
  }
});
