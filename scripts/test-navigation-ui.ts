import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const shell = read("src/components/app-shell.tsx");
const navigation = read("src/components/shell-navigation.tsx");
const dashboard = read("src/app/(authenticated)/dashboard/page.tsx");
const attendance = read("src/app/(authenticated)/attendance/page.tsx");
const workLogs = read("src/app/(authenticated)/work-logs/page.tsx");
const mobile = read("src/components/mobile-navigation.tsx");

test("authenticated routes share one persistent shell layout", () => {
  const layout = read("src/app/(authenticated)/layout.tsx");
  assert.match(layout, /<AppShell user=\{user\}>\{children\}<\/AppShell>/);
  assert.match(shell, /data-persistent-app-shell/);
  for (const oldLayout of ["src/app/dashboard/layout.tsx", "src/app/attendance/layout.tsx", "src/app/work-logs/layout.tsx"]) assert.equal(existsSync(oldLayout), false);
});
test("internal shell navigation uses Next Link without hard navigation", () => {
  assert.match(navigation, /import Link from "next\/link"/);
  assert.match(navigation, /prefetch/);
  assert.doesNotMatch(shell + navigation, /window\.location|location\.assign|document\.location/);
});
test("active navigation and mobile persistence are exposed accessibly", () => {
  assert.match(navigation, /usePathname/); assert.match(navigation, /aria-current/);
  assert.match(mobile, /aria-label="Mobile application navigation"/); assert.match(shell, /id="main-content"/); assert.match(shell, /Skip to main content/);
  assert.match(mobile,/"\/dashboard","\/attendance","\/work-logs"[\s\S]*More/);
});
test("shell-preserving destination skeletons exist", () => {
  for (const path of ["dashboard/loading.tsx", "attendance/loading.tsx", "attendance/history/loading.tsx", "attendance/review/loading.tsx", "attendance/corrections/loading.tsx", "work-logs/loading.tsx", "work-logs/review/loading.tsx"]) assert.equal(existsSync(`src/app/(authenticated)/${path}`), true);
  assert.equal(existsSync("src/app/onboarding/internship-hours/loading.tsx"),true);
});
test("dashboard uses real operational data and primary actions", () => {
  assert.match(dashboard, /requiredHours/); assert.match(dashboard, /creditedMinutesFromAttendance/); assert.match(dashboard, /Today’s attendance/); assert.match(dashboard, /Create work log/); assert.match(attendance, /Submit clock-in/); assert.match(workLogs, /Create work log/);
  assert.doesNotMatch(dashboard, /AI productivity score|evaluation score|fake analytics|branch selector/i);
});
test("loading and error UI preserve page-shaped content inside the shell",()=>{const ui=read("src/components/ui.tsx");assert.match(ui,/skeleton-header/);assert.match(ui,/skeleton-summary/);assert.match(ui,/skeleton-row/);assert.equal(existsSync("src/app/(authenticated)/error.tsx"),true)});
test("required-hours and workflow controls remain real and reachable",()=>{assert.match(dashboard,/InternProgressPanel/);assert.doesNotMatch(dashboard,/requiredHours===null[\s\S]{0,500}progress-percent/);const form=read("src/app/work-logs/work-log-form.tsx");assert.match(form,/Save Draft/);assert.match(form,/Submit Work Log/);assert.match(attendance,/Submit clock-in/);assert.match(attendance,/Submit clock-out/)});
test("navigation does not expose multi-organization terminology", () => {
  assert.doesNotMatch(shell + navigation, />\s*(Companies|Branches|Assignments|Placements)\s*</);
});
