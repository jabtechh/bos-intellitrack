import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css=readFileSync("src/app/globals.css","utf8"),shell=readFileSync("src/components/app-shell.tsx","utf8"),navigation=readFileSync("src/components/shell-navigation.tsx","utf8"),ui=readFileSync("src/components/ui.tsx","utf8"),more=readFileSync("src/app/(authenticated)/more/page.tsx","utf8"),confirm=readFileSync("src/components/confirm-button.tsx","utf8"),profile=readFileSync("src/components/profile-view.tsx","utf8");

test("warm Bo's Coffee visual tokens remain canonical",()=>{for(const token of["--brand-900","--brand-700","--canvas","--surface","--text-primary"])assert.match(css,new RegExp(token))});
test("desktop navigation has semantic groups",()=>{for(const label of["Internship work","Development","Resources","Management"])assert.match(navigation,new RegExp(label))});
test("desktop sidebar is persistent and scroll safe",()=>{assert.match(css,/\.app-sidebar > nav[\s\S]*overflow-y:auto/);assert.match(css,/@media \(min-width:1024px\)[\s\S]*\.app-shell/)});
test("desktop sidebar and mobile navigation are mutually exclusive",()=>assert.match(css,/\.mobile-appbar,\.bottom-nav \{ display: none/));
test("Intern bottom navigation remains four destinations",()=>{for(const label of["Dashboard","Attendance","Work Logs","More"])assert.match(shell,new RegExp(`label: "${label}"`))});
test("More hub contains all requested modules",()=>{for(const label of["Tasks","Evaluations","Feedback","Documents","Announcements","Portfolio","Reports","Insights","Profile"])assert.match(more,new RegExp(`label:\"${label}\"`))});
test("account and logout are separated from module navigation",()=>{assert.match(more,/title:\"Account\"/);assert.match(more,/form action=\{logout\}/)});
test("shared UI includes summary and form patterns",()=>{for(const name of["SectionHeader","SummaryStrip","MetricItem","ProgressBar","InlineNotice","FilterBar","FormActions","PriorityBadge"])assert.match(ui,new RegExp(`function ${name}`))});
test("status is not conveyed by color alone",()=>assert.match(ui,/status-dot/));
test("confirmation uses an accessible modal instead of window confirm",()=>{assert.match(confirm,/role=\"alertdialog\"/);assert.match(confirm,/aria-modal=\"true\"/);assert.doesNotMatch(confirm,/window\.confirm/)});
test("confirmation supports Escape and initial focus",()=>{assert.match(confirm,/event\.key===\"Escape\"/);assert.match(confirm,/\.focus\(\)/)});
test("profile has strong structure and shortcuts",()=>{assert.match(profile,/profile-cover/);assert.match(profile,/profile-avatar-lg/);for(const item of["Portfolio","Reports","Insights"])assert.match(profile,new RegExp(item))});
test("mobile records become cards without horizontal overflow",()=>{assert.match(css,/html,body \{ overflow-x:hidden/);assert.match(css,/@media \(max-width:639px\)[\s\S]*\.ui-card\.overflow-hidden[\s\S]*border-radius/)});
test("touch targets are at least 44px",()=>{assert.match(css,/min-height:2\.75rem/);assert.match(css,/\.bottom-nav a[\s\S]*min-height: 3\.25rem/)});
test("sticky form actions clear the Intern bottom navigation",()=>assert.match(css,/\.form-actions\{bottom:5\.45rem/));
test("tablet and desktop breakpoints exist",()=>{assert.match(css,/@media \(min-width:640px\)/);assert.match(css,/@media \(min-width:768px\)/);assert.match(css,/@media \(min-width:1024px\)/)});
test("print layout removes application chrome",()=>assert.match(css,/@media print[\s\S]*\.app-sidebar[\s\S]*display:none/));
test("reduced motion remains respected",()=>assert.match(css,/@media \(prefers-reduced-motion: reduce\)/));
test("visible keyboard focus remains global",()=>assert.match(css,/:focus-visible[\s\S]*outline/));
test("no social-network behavior added",()=>assert.doesNotMatch(`${shell}\n${more}\n${profile}`,/friend request|followers|public feed|like button|comments/i));
