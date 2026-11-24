// DEC-2026-020 / P161 — shared route-to-navigation matching for the sidebar, bottom bar and More sheet.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { activeNavHref, moreSectionActive, navMatchScore, type NavMatchItem } from "../src/lib/navigation/active.ts";

const read = (path: string) => readFileSync(path, "utf8");
const shell = read("src/components/app-shell.tsx");
const mobile = read("src/components/mobile-navigation.tsx");
const sidebar = read("src/components/shell-navigation.tsx");

// Role menus extracted from the real app-shell definitions (hrefs + matching flags), so the tests track the source.
function roleNav(name: string): NavMatchItem[] {
  const block = (shell.split(`const ${name}: ShellNavItem[] = [`)[1] ?? "").split("\n];")[0];
  return [...block.matchAll(/\{ href: "([^"]+)"[^}]*\}/g)].map(([text, href]) => ({
    href, exact: text.includes("exact: true"),
    alsoActiveOn: /alsoActiveOn: \[([^\]]*)\]/.exec(text)?.[1].match(/"([^"]+)"/g)?.map((v) => v.slice(1, -1)),
  }));
}
const intern = roleNav("internNav"), supervisor = roleNav("supervisorNav"), coordinator = roleNav("coordinatorNav"), representative = roleNav("representativeNav"), admin = roleNav("adminNav");
const primary = (role: string) => JSON.parse((new RegExp(`${role}: (\\[[^\\]]*\\])`).exec(mobile.split("const paths")[1]) ?? [])[1] ?? "[]") as string[];

test("Home is active only on the exact role landing route", () => {
  assert.equal(activeNavHref(supervisor, "/dashboard"), "/dashboard");
  assert.equal(activeNavHref(representative, "/admin"), "/admin");
  assert.equal(activeNavHref(admin, "/admin/system"), "/admin/system");
  for (const path of ["/dashboard/x", "/reports", "/interns", "/reviews"]) assert.notEqual(activeNavHref(supervisor, path), "/dashboard", path);
  for (const path of ["/admin/users", "/admin/schools", "/reports"]) assert.notEqual(activeNavHref(representative, path), "/admin", path);
  assert.equal(activeNavHref(admin, "/admin/users"), "/admin/users");
});

test("Reports and nested Reports routes highlight Reports for Supervisor, Coordinator and Representative", () => {
  for (const nav of [supervisor, coordinator, representative]) {
    assert.equal(activeNavHref(nav, "/reports"), "/reports");
    assert.equal(activeNavHref(nav, "/reports/intern/00000000-0000-4000-8000-000000000000"), "/reports");
    assert.equal(activeNavHref(nav, "/reports/intern/x/pdf"), "/reports");
  }
  assert.equal(activeNavHref(supervisor, "/reportsx"), null, "no false prefix match");
});

test("exactly one destination is current for any route", () => {
  const routes = ["/dashboard", "/reports", "/reports/intern/1", "/admin", "/admin/users", "/tasks/abc", "/portfolio", "/portfolio/edit", "/insights", "/unknown"];
  for (const nav of [intern, supervisor, coordinator, representative, admin]) for (const route of routes) {
    const winners = nav.filter((item) => navMatchScore(item, route) >= 0);
    const current = activeNavHref(nav, route);
    if (!winners.length) assert.equal(current, null); else assert(nav.some((item) => item.href === current));
  }
});

test("Intern contextual Reports keep Insights active and never Home; no standalone Intern Reports item", () => {
  assert.equal(activeNavHref(intern, "/reports"), "/insights");
  assert.equal(activeNavHref(intern, "/reports/intern/abc"), "/insights");
  assert(!intern.some((item) => item.href === "/reports"), "DEC-2026-016");
  assert.equal(activeNavHref(intern, "/portfolio/edit"), "/portfolio");
  assert.equal(activeNavHref(intern, "/portfolio/pdf"), "/portfolio");
});

test("mobile More is active for secondary destinations and only then", () => {
  assert.equal(moreSectionActive(supervisor, primary("SUPERVISOR"), "/reports/intern/1"), true, "Supervisor Reports lives in More");
  assert.equal(moreSectionActive(representative, primary("REPRESENTATIVE"), "/reports"), true);
  assert.equal(moreSectionActive(coordinator, primary("COORDINATOR"), "/reports"), false, "Coordinator Reports is primary");
  assert.equal(moreSectionActive(supervisor, primary("SUPERVISOR"), "/dashboard"), false);
  assert.equal(moreSectionActive(intern, primary("INTERN"), "/portfolio"), false, "Portfolio is primary for Interns");
  assert.equal(moreSectionActive(intern, primary("INTERN"), "/reports/intern/1"), true, "Insights (More) owns the contextual report");
});

test("Intern mobile primary is Home, Attendance, Work Logs, Tasks, Portfolio (+More); other roles unchanged", () => {
  assert.deepEqual(primary("INTERN"), ["/dashboard", "/attendance", "/work-logs", "/tasks", "/portfolio"]);
  assert.deepEqual(primary("SUPERVISOR"), ["/dashboard", "/interns", "/reviews"]);
  assert.deepEqual(primary("COORDINATOR"), ["/dashboard", "/students", "/reports"]);
  assert.deepEqual(primary("REPRESENTATIVE"), ["/admin", "/admin/users", "/announcements"]);
  assert.deepEqual(primary("ADMIN"), ["/admin/system", "/admin/users"]);
  assert(intern.some((item) => item.href === "/portfolio"), "desktop sidebar keeps a direct Portfolio link");
});

test("desktop, mobile bar and More sheet share one matcher and set aria-current only on it", () => {
  assert(sidebar.includes("const current = activeNavHref(items, pathname, searchParams);"));
  assert(sidebar.includes('aria-current={active ? "page" : undefined}') && sidebar.includes("const active = item.href === current;"));
  assert(mobile.includes("const current = activeNavHref(items, pathname, searchParams);"));
  assert(mobile.includes("active={item.href === current}"));
  assert(mobile.includes('className={more || moreActive ? "is-active" : undefined}'));
  assert(!/startsWith\(`\$\{target\}\/`\)/.test(sidebar + mobile), "no per-component prefix matching remains");
});

test("bottom navigation grid follows the real item count", () => {
  const css = read("src/app/globals.css");
  assert(css.includes("grid-template-columns: repeat(var(--bottom-nav-items, 4), minmax(0, 1fr));"));
  assert(mobile.includes('"--bottom-nav-items": primary.length + 1'));
});

test("Reports link is shown only when the account resolves to a report scope (no Dashboard bounce)", () => {
  const authorization = read("src/lib/reports/authorization.ts");
  assert(!authorization.includes('redirect("/dashboard")'));
  assert(authorization.includes("if (!context) notFound();"));
  assert(shell.includes("!(await resolveReportViewer(user))"));
  assert(read("src/app/(authenticated)/reports/page.tsx").includes("Reports are not available for this account"));
});
