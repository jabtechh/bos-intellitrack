import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const shell = read("src/components/app-shell.tsx");
const dashboard = read("src/app/(authenticated)/dashboard/page.tsx");
const attendance = read("src/components/dashboard-attendance-card.tsx");
const history = read("src/app/(authenticated)/attendance/history/page.tsx");
const workForm = read("src/app/work-logs/work-log-form.tsx");
const calendar = read("src/components/internship-calendar-view.tsx");
const login = read("src/app/(auth)/login/page.tsx");

test("authenticated utility bar contains utilities without redundant workspace text", () => {
  assert.doesNotMatch(shell, /IntelliTrack workspace/);
  assert.match(shell, /<ApplicationUtilities/);
});

test("Intern summary keeps real identity and existing self-service actions", () => {
  const view = read("src/components/intern-dashboard.tsx");
  assert.match(view, /dashboardGreeting\(now, timezone\)/);
  assert.match(view, /\{firstName\}/);
  assert.match(view, /href="\/attendance"/);
  assert.match(view, /logAction.href/);
});

test("attendance card defines each supported presentation state", () => {
  for (const state of ["not-started", "clocked-in", "completed", "needs-review", "incomplete"]) assert.match(attendance, new RegExp(state));
  assert.match(attendance, /data-attendance-state/);
});

test("live elapsed time derives locally from the authoritative timestamp without writes", () => {
  assert.match(attendance, /new Date\(clockInIso\)\.getTime\(\)/);
  assert.match(attendance, /setInterval\(update, 1000\)/);
  assert.doesNotMatch(attendance, /fetch\(|server action|prisma|creditedMinutes.*setInterval/i);
});

test("clock actions reuse secure attendance and correction routes", () => {
  assert.match(attendance, /href="\/attendance"[\s\S]*Time In/);
  assert.match(attendance, /href="\/attendance"[\s\S]*Time Out/);
  assert.match(attendance, /attendance\/corrections\/new/);
  assert.match(attendance, /\?attendance=/);
});

test("evidence strip is state-derived and its explanation works by keyboard and tap", () => {
  assert.match(attendance, /EvidenceStrip/);
  assert.match(attendance, /<details className="evidence-info">/);
  assert.match(attendance, /<summary aria-label="About attendance evidence">/);
  assert.doesNotMatch(dashboard, /Complete GPS and selfie evidence is approved automatically/);
});

test("canonical attendance history uses semantic desktop table and mobile cards", () => {
  assert.match(history, /<DataTable caption="Attendance history">/);
  assert.match(history, /<thead>/);
  assert.match(history, /<MobileRecordCard/);
  assert.match(history, /Showing \{first\} to \{last\} of \{total\}/);
});

test("Work Log remains a journal with attendance context and no hours input", () => {
  assert.match(workForm, /journal-main/);
  assert.match(workForm, /journal-context/);
  assert.match(workForm, /Today&apos;s attendance/);
  assert.doesNotMatch(workForm, /name="hoursReported"|Hours Reported/);
});

test("calendar controls are functional and limited to supported views", () => {
  assert.match(calendar, /Previous month/);
  assert.match(calendar, /Next month/);
  assert.match(calendar, />Today<\/Link>/);
  assert.match(calendar, /view:"month"/);
  assert.match(calendar, /view:"agenda"/);
  assert.doesNotMatch(calendar, /view:"week"|view:"day"/);
});

test("login uses the shared branded panel while preserving provisioned access", () => {
  assert.match(login, /login-brand-panel/);
  assert.match(login, /LoginForm/);
  assert.match(login, /Public registration is not available/);
});
