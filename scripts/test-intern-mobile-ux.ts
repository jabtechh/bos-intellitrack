import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const mobile=readFileSync("src/components/mobile-navigation.tsx","utf8");
const shell=readFileSync("src/components/app-shell.tsx","utf8");
const dashboard=readFileSync("src/components/intern-dashboard.tsx","utf8");
const css=readFileSync("src/app/globals.css","utf8");

test("Intern mobile primary navigation is Home Attendance Work Logs Tasks Portfolio (DEC-2026-020)",()=>{
  assert(mobile.includes('INTERN: ["/dashboard", "/attendance", "/work-logs", "/tasks", "/portfolio"]'));
  assert(mobile.includes('INTERN: ["Home", "Attendance", "Work Logs", "Tasks", "Portfolio"]'));
});

test("Intern More contains approved Intern completeness destinations",()=>{
  for(const label of["Internship Calendar","Insights","Portfolio","Evaluations & Feedback","Documents","Updates"])assert(shell.includes(label));
  const intern=shell.split("const internNav: ShellNavItem[] = [")[1].split("\n];")[0];
  for(const href of ["/attendance/corrections","/reports","/feedback"])assert(!intern.includes('href: "'+href+'"'));
  assert(mobile.includes('return intern ? "Development" : "Progress"'));
  assert(mobile.includes('role="dialog"'));
  assert(mobile.includes("mobile-sheet-open"));
});

test("More sheet remains keyboard accessible",()=>{
  assert(mobile.includes('event.key === "Escape"'));
  assert(mobile.includes('event.key === "Tab"'));
  assert(mobile.includes("onPointerDown"));
  assert(mobile.includes(".focus()"));
});

test("Intern dashboard retains real Attendance and Work Log actions",()=>{
  assert(dashboard.includes("DashboardAttendanceCard"));
  assert(dashboard.includes("Today's Work Log"));
  assert(dashboard.includes("This Week's Attendance"));
  assert(!dashboard.includes("Upcoming Calendar"));
});

test("mobile surfaces retain safe-area containment",()=>{
  assert(css.includes("safe-area-inset-bottom"));
  assert(css.includes("mobile-sheet-open"));
});
