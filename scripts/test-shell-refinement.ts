import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const shell = read("src/components/app-shell.tsx");
const nav = read("src/components/shell-navigation.tsx");
const mobile = read("src/components/mobile-navigation.tsx");
const utilities = read("src/components/application-utilities.tsx");
const css = read("src/app/globals.css");
const service = read("src/lib/notifications/service.ts");

test("Notifications are absent from primary sidebar configuration", () => { assert.doesNotMatch(shell, /nav = \[\.\.\.baseNav[\s\S]*\/notifications/); assert.doesNotMatch(nav, /Notifications/); });
test("notification bell and accessible unread label exist", () => { assert.match(utilities, /name="bell"/); assert.match(utilities, /aria-label=\{badge\?/); assert.match(utilities, /utility-badge/); });
test("badge formatter remains real", () => assert.match(shell, /formatNotificationBadge\(unreadCount\)/));
test("preview links to Notification Center", () => assert.match(utilities, /href="\/notifications"/));
test("missing table state is safe", () => { assert.match(utilities, /!preview\.initialized/); assert.match(utilities, /not initialized for this environment/); assert.match(service, /missingNotificationTableFallback/); });
test("sidebar is sticky and viewport persistent", () => assert.match(css, /\.app-sidebar\s*\{[^}]*position:\s*sticky[^}]*height:\s*100dvh/));
test("all desktop role navigation links stay compact and top-aligned", () => {
  assert.match(css, /\.app-sidebar nav \{ display: flex; flex-direction: column; align-items: stretch; justify-content: flex-start; gap: \.25rem; \}/);
  assert.match(css, /\.app-sidebar > nav \{[^}]*overflow-y:auto/);
});
test("top utility bar is sticky", () => assert.match(css, /\.app-utility-bar\{position:sticky;top:0/));
test("mobile top utility bar exists", () => { assert.match(shell, /app-utility-bar/); assert.match(shell, /ApplicationUtilities/); });
test("desktop utility bar exposes signed-in name and role while mobile keeps identity compact", () => { assert.match(utilities, /desktop-user-identity/); assert.match(utilities, /<strong>\{name\}<\/strong><small>\{role\}<\/small>/); assert.match(css, /\.desktop-user-identity\{display:none/); assert.match(css, /@media\(min-width:1024px\)[\s\S]*\.desktop-user-identity\{display:grid/); });
test("mobile primary navigation remains expected", () => assert.match(mobile, /INTERN:\s*\["\/dashboard",\s*"\/attendance",\s*"\/work-logs",\s*"\/tasks",\s*"\/portfolio"\]/)); // DEC-2026-020
test("bottom navigation is fixed and safe-area aware", () => { assert.match(css, /\.bottom-nav \{ position: fixed/); assert.match(css, /safe-area-inset-bottom/); });
test("More sheet is role-aware", () => { assert.match(shell, /MobileNavigation items=\{nav\}/); assert.match(mobile, /groups\.map/); assert.match(mobile, /data-more-sheet/); });
test("account menu contains account actions only", () => { assert.match(utilities, /View profile/); assert.match(utilities, /Edit profile/); assert.match(utilities, /Sign out/); assert.doesNotMatch(utilities, /ShellNavigation|MobileNavigation/); });
test("authenticated hamburger drawer is retired", () => assert.doesNotMatch(shell, /admin-menu|mobile-menu-panel|Open navigation/));
test("notification mobile surface is viewport contained", () => assert.match(css, /\.notification-preview\{position:fixed[\s\S]*max-height:min\(78dvh/));
test("long content clears fixed bottom navigation", () => assert.match(css, /\.app-content \{ padding-bottom: calc\(6\.75rem \+ env\(safe-area-inset-bottom\)\); \}/));
test("desktop authorization remains role aware", () => { for (const name of ["internNav", "supervisorNav", "coordinatorNav", "representativeNav", "adminNav"]) assert.match(shell, new RegExp(`const ${name}`)); });
test("sheets support focus trap Escape and focus restoration", () => { assert.match(mobile, /event\.key\s*===\s*"Escape"/); assert.match(mobile, /event\.key\s*===\s*"Tab"/); assert.match(mobile, /previous\s*\?\?\s*trigger/); });
test("reduced motion is respected", () => assert.match(css, /prefers-reduced-motion:reduce/));
test("shell uses explicit viewport-only lg visibility", () => { assert.match(css, /@media \(max-width: 1023px\) \{[\s\S]*?\.app-sidebar \{ display: none; \}[\s\S]*?\.bottom-nav \{ display: grid; \}/); assert.match(css, /@media \(min-width: 1024px\) \{[\s\S]*?\.app-sidebar \{ display: flex; \}[\s\S]*?\.bottom-nav,[\s\S]*?display: none;/); });
test("shell has no physical-device layout detection", () => { const sources = [shell, mobile, nav, utilities].join("\n"); assert.doesNotMatch(sources, /navigator\.userAgent|matchMedia|innerWidth|pointer:\s*coarse|ontouchstart/i); });
test("required viewport matrix stays mobile below lg and desktop at lg", () => { for (const width of [360, 390, 430, 768, 1023]) assert.ok(width < 1024); for (const width of [1024, 1280, 1440]) assert.ok(width >= 1024); });
