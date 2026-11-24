import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const shell = read("src/components/app-shell.tsx");
const mobile = read("src/components/mobile-navigation.tsx");
const insight = read("src/components/insight-detail.tsx");
const insightsLanding = read("src/app/(authenticated)/insights/page.tsx");
const aiSummary = read("src/components/ai-progress-summary.tsx");
const aiActions = read("src/app/ai/actions.ts");
const portfolio = read("src/app/(authenticated)/portfolio/page.tsx");
const edit = read("src/app/(authenticated)/portfolio/edit/page.tsx");
const generator = read("src/components/portfolio-draft-generator.tsx");
const calendar = read("src/app/(authenticated)/calendar/page.tsx");
const dashboard = read("src/components/intern-dashboard.tsx");
const attendance = read("src/app/(authenticated)/attendance/page.tsx");
const attendanceHistory = read("src/app/(authenticated)/attendance/history/page.tsx");
const config = read("src/lib/ai/config.ts");

function nav(name: string) {
  return shell.split(`const ${name}: ShellNavItem[] = [`)[1]?.split("\n];")[0] ?? "";
}

test("Intern essentials are discoverable without changing other-role navigation", () => {
  const intern = nav("internNav");
  const expected = [
    ["/calendar", "Internship Calendar"],
    ["/insights", "Insights"],
    ["/evaluations", "Evaluations & Feedback"],
    ["/portfolio", "Portfolio"],
  ];
  for (const [href, label] of expected) assert(intern.includes(`href: "${href}", label: "${label}"`));
  assert(!intern.includes('label: "Growth"'));
  for (const href of ["/attendance/corrections", "/reports", "/feedback"]) assert(!intern.includes(`href: "${href}"`));
  assert(intern.includes('href: "/dashboard", label: "Dashboard"'));
  assert(mobile.includes('INTERN: ["/dashboard", "/attendance", "/work-logs", "/tasks", "/portfolio"]')); // DEC-2026-020
  assert(mobile.includes("const rest = items.filter"));
  assert(mobile.includes('return intern ? "Development" : "Progress"'));
  for (const role of ["supervisorNav", "coordinatorNav", "representativeNav", "adminNav"]) {
    const block = nav(role);
    assert(!block.includes('href: "/calendar"'));
    assert(!block.includes('href: "/portfolio"'));
  }
});

test("Intern Calendar is read-only reuse, not expanded authoring", () => {
  assert(calendar.includes("getCalendarItems(viewer,from,to)"));
  assert(calendar.includes("requireAnnouncementViewer()"));
  assert(dashboard.includes('href: "/calendar"'));
  assert(!nav("internNav").includes('href: "/calendar/manage"'));
});

test("Insights has visible AI assistance while keeping metrics authoritative", () => {
  assert(insight.includes('title="Internship Insights"'));
  assert(insight.includes("AiProgressSummary"));
  assert(aiSummary.includes("generateProgressSummary"));
  assert(aiSummary.includes('name="internId"'));
  assert(aiSummary.includes('name="from"'));
  assert(aiSummary.includes('name="to"'));
  assert(aiSummary.includes("disabled={!enabled || pending}"));
  assert(aiSummary.includes("Missing evidence / limitations"));
  assert(aiActions.includes("getInternReport(c,internId,period)"));
  assert(insight.includes("insight.hours.creditedHours"));
});

test("Portfolio visibly offers AI and manual paths without auto-save", () => {
  assert(portfolio.includes("Improve writing with AI"));
  assert(portfolio.includes("Add personal sections"));
  assert(portfolio.includes("Automatically compiled from verified records"));
  assert(portfolio.includes("AutomaticPortfolioEvidence data={evidence}"));
  // DEC-2026-020: edit links target the selected internship's own Portfolio.
  assert(portfolio.includes('const editHref = portfolioHref(assignment.id, "/edit")'));
  assert(portfolio.includes("href={`${editHref}#ai-generator`}"));
  assert(portfolio.includes("href={`${editHref}#portfolio-editor`}"));
  assert(edit.includes('id="ai-generator"'));
  assert(edit.includes('id="portfolio-editor"'));
  assert(generator.includes("Generate AI draft"));
  assert(generator.includes("disabled={!enabled || pending}"));
  assert(generator.includes("Apply reviewed draft to editor"));
  assert(generator.includes("reviewed the generated draft"));
  const generationAction = aiActions.split("export async function generatePortfolioDraft")[1].split("export async function generateEvaluationDraft")[0];
  for (const mutator of [".create(", ".update(", ".upsert("]) assert(!generationAction.includes(mutator));
  assert(edit.includes("Save Portfolio"));
});

test("Attendance corrections remain reachable inside Attendance, not the sidebar", () => {
  const intern = nav("internNav");
  assert(!intern.includes('href: "/attendance/corrections"'));
  assert(attendance.includes('href="/attendance/corrections"'));
  assert(attendance.includes("Need to correct a recorded time?"));
  assert(attendance.includes("Open the affected Attendance record"));
  assert(attendanceHistory.includes('href="/attendance/corrections"'));
  assert(read("src/app/(authenticated)/attendance/corrections/new/page.tsx").includes("attendance?:string"));
});

test("Insights exposes authorized reports/PDF with the selected period", () => {
  const intern = nav("internNav");
  assert(!intern.includes('href: "/reports"'));
  assert(insight.includes('title="Internship Insights"'));
  assert(insight.includes('new URLSearchParams()'));
  assert(insight.includes('reportPeriod.set("from", values.from)'));
  assert(insight.includes('reportPeriod.set("to", values.to)'));
  assert(insight.includes('href={reportHref}'));
  assert(insight.includes('href={reportPdfHref}'));
  assert(insight.includes("View Internship Report"));
  assert(insight.includes("Download Report PDF"));
  assert(insightsLanding.includes("insightAssignmentWhere(context)"));
  assert(insightsLanding.includes('status: "COMPLETED"'));
  assert(read("src/app/(authenticated)/reports/intern/[internId]/pdf/route.ts").includes("requireReportViewer()"));
});

test("Intern Evaluations and Feedback share accessible tabs, not records or permissions", () => {
  const hub = read("src/app/(authenticated)/evaluations/page.tsx");
  const tabs = read("src/components/intern-development-tabs.tsx");
  const feedbackList = read("src/app/(authenticated)/feedback/page.tsx");
  const authorization = read("src/lib/evaluations/authorization.ts");
  const intern = nav("internNav");
  assert(intern.includes('href: "/evaluations", label: "Evaluations & Feedback"'));
  assert(!intern.includes('href: "/feedback"'));
  assert(hub.includes('context.kind === "INTERN"'));
  assert(hub.includes("evaluationWhere(context)"));
  assert(hub.includes("feedbackWhere(context)"));
  assert(hub.includes('query.tab === "feedback"'));
  assert(hub.includes('href="/feedback/workmate/new"'));
  assert(hub.includes('href={`/evaluations/${row.id}`}') && hub.includes('href={`/feedback/${row.id}`}'));
  assert(feedbackList.includes('if (c.kind === "INTERN") redirect("/evaluations?tab=feedback")'));
  for (const role of ["tablist", "tab", "tabpanel"]) assert(tabs.includes(`role="${role}"`));
  for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) assert(tabs.includes(key));
  assert(tabs.includes('aria-selected={activeTab === "feedback"}'));
  assert(authorization.includes('status: { in: ["SUBMITTED", "ACKNOWLEDGED"] }'));
  assert(authorization.includes('recipientId: c.user.id'));
  assert(authorization.includes('visibility: { in: ["INTERN_AND_STAFF", "INTERN_ONLY"] }'));
  assert(read("src/app/(authenticated)/more/page.tsx").includes('item.href==="/evaluations"'));
});

test("Gemini readiness fails closed when key or model is absent", () => {
  assert(config.includes("GEMINI_API_KEY?.trim()"));
  assert(config.includes("GEMINI_MODEL?.trim()"));
  assert(portfolio.includes("AI writing is unavailable in this environment."));
  assert(aiSummary.includes("AI summaries are not configured"));
  assert(!aiSummary.includes("999 hours"));
  assert(read("docs/product/decisions.md").includes("DEC-2026-015"));
  assert(read("docs/product/decisions.md").includes("DEC-2026-016"));
});
