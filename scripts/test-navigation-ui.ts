import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read=(path:string)=>readFileSync(path,"utf8");
const shell=read("src/components/app-shell.tsx");
const navigation=read("src/components/shell-navigation.tsx");
const mobile=read("src/components/mobile-navigation.tsx");
const dashboard=read("src/app/(authenticated)/dashboard/page.tsx")+read("src/components/intern-dashboard.tsx")+read("src/components/intern-dashboard-data.tsx");
const attendance=read("src/app/(authenticated)/attendance/page.tsx");
const workLogs=read("src/app/(authenticated)/work-logs/page.tsx");

test("authenticated routes share one persistent shell",()=>{
  const layout=read("src/app/(authenticated)/layout.tsx");
  assert(layout.includes("<AppShell user={user}"));
  assert(shell.includes("data-persistent-app-shell"));
});

test("internal navigation uses Next Link and accessible active state",()=>{
  assert(navigation.includes('import Link from "next/link"'));
  assert(navigation.includes("aria-current"));
  assert(mobile.includes('aria-label="Mobile application navigation"'));
  assert(shell.includes("Skip to main content"));
  assert(!shell.includes("window.location"));
});

test("approved role navigation is explicit",()=>{
  for(const name of["internNav","supervisorNav","coordinatorNav","representativeNav","adminNav"])assert(shell.includes("const "+name));
  assert(shell.includes('href: "/insights", label: "Insights"'));
  assert(shell.includes('href: "/calendar", label: "Internship Calendar"'));
  assert(shell.includes('href: "/portfolio", label: "Portfolio"'));
  assert(shell.includes('href: "/reviews", label: "Reviews"'));
  assert(shell.includes('href: "/students", label: "Students"'));
  assert(shell.includes('href: "/admin/system", label: "System"'));
  assert(shell.includes('href: "/calendar"'));
});

test("mobile primary paths match approved IA",()=>{
  for(const value of[
    'INTERN: ["/dashboard", "/attendance", "/work-logs", "/tasks", "/portfolio"]', // DEC-2026-020: Portfolio is the fifth Intern primary destination
    'SUPERVISOR: ["/dashboard", "/interns", "/reviews"]',
    'COORDINATOR: ["/dashboard", "/students", "/reports"]',
    'REPRESENTATIVE: ["/admin", "/admin/users", "/announcements"]',
    'ADMIN: ["/admin/system", "/admin/users"]',
  ])assert(mobile.includes(value));
  assert(mobile.includes("More"));
});

test("representative navigation includes all authorized operations and resources across layouts",()=>{
  const adminLayout=read("src/app/admin/layout.tsx");
  const representative=shell.split("export const representativeNav: ShellNavItem[] = [")[1].split("\n];")[0];
  const technicalAdmin=shell.split("export const adminNav: ShellNavItem[] = [")[1].split("\n];")[0];
  for(const href of ["/admin", "/admin/users", "/admin/schools", "/announcements", "/documents", "/reports"]){
    assert(representative.includes('href: "'+href+'"'),"Missing Representative link: "+href);
  }
  for(const duplicate of ["/admin/users?role=INTERN", "/admin/users?role=SUPERVISOR", "/admin/users?role=COORDINATOR"]) {
    assert(!representative.includes('href: "'+duplicate+'"'),"Duplicate Representative navigation link: "+duplicate);
  }
  for(const label of ['label: "Dashboard"','label: "Users"','label: "Company Reports"'])assert(representative.includes(label));
  for(const href of ["/admin/system","/admin/users"])assert(technicalAdmin.includes('href: "'+href+'"'));
  for(const denied of ["/attendance/review","/attendance/corrections/review","/tasks","/evaluations","/documents","/announcements","/reports"])assert(!technicalAdmin.includes('href: "'+denied+'"'));
  for(const denied of ["/attendance/review","/attendance/corrections/review","/admin/assignments"])assert(!representative.includes('href: "'+denied+'"'));
  assert(adminLayout.includes('representativeNav : adminNav'));
  // DEC-2026-020: query-aware active matching lives in the shared helper used by sidebar, bottom bar and More.
  const helper=read("src/lib/navigation/active.ts");
  assert(helper.includes("query?.get(item.activeQuery.key) ?? null) !== item.activeQuery.value"));
  assert(mobile.includes("activeNavHref(items, pathname, searchParams)"));
});

test("five role menu definitions preserve approved primary and secondary boundaries",()=>{
  const block=(name:string) => shell.split("const "+name+": ShellNavItem[] = [")[1]?.split("\n];")[0] ??
    shell.split("export const "+name+": ShellNavItem[] = [")[1]?.split("\n];")[0] ?? "";
  const intern=block("internNav"), supervisor=block("supervisorNav"), coordinator=block("coordinatorNav");
  for(const href of ["/dashboard","/calendar","/attendance","/work-logs","/tasks","/insights","/evaluations","/documents","/portfolio","/announcements"]) assert(intern.includes('href: "'+href+'"'));
  for(const href of ["/attendance/corrections","/reports","/feedback"]) assert(!intern.includes('href: "'+href+'"'));
  assert(intern.includes('href: "/evaluations", label: "Evaluations & Feedback"'));
  for(const href of ["/dashboard","/interns","/reviews","/tasks","/evaluations","/reports","/documents","/announcements"]) assert(supervisor.includes('href: "'+href+'"'));
  for(const href of ["/dashboard","/students","/reports","/documents"]) assert(coordinator.includes('href: "'+href+'"'));
  for(const href of ["/tasks","/feedback","/portfolio","/insights","/announcements"]) assert(!coordinator.includes('href: "'+href+'"'));
  assert(mobile.includes("const rest = items.filter"));
  assert(mobile.includes('aria-label="Mobile application navigation"'));
});

test("role landing routes exist",()=>{
  for(const path of["interns/page.tsx","students/page.tsx","reviews/page.tsx"])assert.equal(existsSync("src/app/(authenticated)/"+path),true);
  assert.equal(existsSync("src/app/admin/system/page.tsx"),true);
});

test("dashboard uses real Attendance-derived progress and primary actions",()=>{
  assert(dashboard.includes("creditedMinutesFromAttendance"));
  assert(dashboard.includes("logAction.href"));
  assert(attendance.includes('label="Time in"'));
  assert(workLogs.includes("Create work log"));
  assert(!/AI productivity score|fake analytics|branch selector/i.test(dashboard));
});

test("Representative and Admin leave shared dashboard for dedicated workspaces",()=>{
  assert(dashboard.includes('user.role === "REPRESENTATIVE"'));
  assert(dashboard.includes('redirect("/admin")'));
  assert(dashboard.includes('redirect("/admin/system")'));
});
