// DEC-2026-021 (Amendment A) / P175 — completed-intern experience and Certificate of Completion, per role and viewport.
// NON-MUTATING: views, GETs and PDF downloads only (no revoke and no Work Log submission). Requires the isolated
// demo interns (scripts/seed-completed-intern-demo.ts). The 390 project also sweeps 360 and 430.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { assertGateAExecutionEnvironment } from "./environment";
import type { GateARole } from "./matrix";

const DEMO = path.resolve(".gatea/completed-intern-demo.local.json");
test.beforeAll(() => assertGateAExecutionEnvironment());
test.skip(!existsSync(DEMO), "Seed the isolated demo interns first (scripts/seed-completed-intern-demo.ts).");
type Account = { email: string; password: string; assignmentId: string };
const accounts = existsSync(DEMO) ? JSON.parse(readFileSync(DEMO, "utf8")).accounts as { completed: Account; ready: Account } : null;
const andrea = accounts?.completed ?? { email: "", password: "", assignmentId: "" };
const bea = accounts?.ready ?? { email: "", password: "", assignmentId: "" };

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource|NEXT_HTTP_ERROR_FALLBACK/.test(m.text())) errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}
async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}
const widths = (page: Page) => page.viewportSize()?.width === 390 ? [360, 390, 430] : [page.viewportSize()!.width];
async function signIn(page: Page, account: Account) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
}
async function expectIssued(page: Page) {
  await page.goto(`/certificates/${andrea.assignmentId}`);
  const sheet = page.locator(".certificate-sheet");
  await expect(sheet).toBeVisible({ timeout: 30_000 });
  await expect(sheet).toHaveAttribute("data-certificate-status", "ISSUED");
  await expect(sheet.getByText("Andrea Santos")).toBeVisible();
  await expect(sheet.getByText(/completing the required 480 hours with [\d.]+ credited hours/)).toBeVisible();
  await expect(sheet.getByText("Issued electronically through IntelliTrack")).toBeVisible();
  await expect(sheet.getByText(/Certificate No\. BOS-\d{4}-[2-9A-HJ-NP-Z]{6}/)).toBeVisible();
  await noOverflow(page);
  const pdf = await page.request.get(`/certificates/${andrea.assignmentId}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect(pdf.headers()["cache-control"]).toContain("no-store");
}
async function expectDenied(page: Page, assignmentId: string) {
  const html = await (await page.request.get(`/certificates/${assignmentId}`)).text();
  expect(html).toContain("NEXT_HTTP_ERROR_FALLBACK;404");
  expect(html).not.toContain("certificate-sheet");
  expect((await page.request.get(`/certificates/${assignmentId}/pdf`)).status()).toBe(404);
}
const tableRow = (page: Page, id: string) => page.locator(`[data-record-row="${id}"]:visible, [data-record-card="${id}"]:visible`);

test("completed intern: full dashboard, issued certificate and Portfolio link", async ({ browser, page }, testInfo) => {
  test.skip(testInfo.project.metadata.gateARole !== "intern", "Intern projects");
  test.setTimeout(240_000);
  await expectDenied(page, andrea.assignmentId); // the Gate A fixture Intern is not the owner
  const context = await browser.newContext({ viewport: page.viewportSize()! });
  const own = await context.newPage();
  const errors = watchConsole(own);
  await signIn(own, andrea);
  for (const width of widths(page)) {
    await own.setViewportSize({ width, height: page.viewportSize()!.height });
    await own.goto("/dashboard");
    const dashboard = own.locator("[data-completed-intern-dashboard]");
    await expect(dashboard).toBeVisible({ timeout: 30_000 });
    await expect(own.getByRole("heading", { level: 1, name: "Congratulations, Andrea!" })).toBeVisible();
    await expect(own.locator("[data-completed-attendance]")).toBeVisible();
    await expect(own.getByRole("button", { name: /^Time In$/i })).toHaveCount(0);
    await expect(own.locator('[data-certificate-card="ISSUED"]')).toBeVisible();
    await expect(own.getByRole("heading", { name: "My Tasks" })).toBeVisible();
    await noOverflow(own);
    await expectIssued(own);
    await own.goto(`/portfolio?assignment=${andrea.assignmentId}`);
    const entry = own.locator(`[data-portfolio-entry="${andrea.assignmentId}"]`);
    await expect(entry).toBeVisible({ timeout: 30_000 });
    await expect(entry.getByRole("link", { name: "Certificate", exact: true })).toHaveAttribute("href", `/certificates/${andrea.assignmentId}`);
    await expect(own.locator("[data-evidence-mode]")).toHaveAttribute("data-evidence-mode", "SNAPSHOT");
    await own.goto("/work-logs");
    await expect(own.locator('[data-records-table="Work Logs"]').getByRole("status")).toContainText("61 of 61");
    await noOverflow(own);
  }
  expect(errors).toEqual([]);
  await context.close();
});

test("intern with hours done but a Work Log missing: preview only, never downloadable", async ({ browser, page }, testInfo) => {
  test.skip(testInfo.project.metadata.gateARole !== "intern", "Intern projects");
  test.setTimeout(180_000);
  const context = await browser.newContext({ viewport: page.viewportSize()! });
  const own = await context.newPage();
  const errors = watchConsole(own);
  await signIn(own, bea);
  await expect(own.locator('[data-certificate-card="PREVIEW"]')).toBeVisible({ timeout: 30_000 });
  await own.goto(`/certificates/${bea.assignmentId}`);
  await expect(own.locator(".certificate-sheet")).toHaveAttribute("data-certificate-status", "PREVIEW");
  const checklist = own.locator("[data-certificate-checklist]");
  await expect(checklist).toHaveAttribute("data-checks-done", "2");
  await expect(checklist.getByText(/60 of 61 attended days have a submitted Work Log/)).toBeVisible();
  await expect(own.getByRole("link", { name: "Download PDF" })).toHaveCount(0);
  expect((await own.request.get(`/certificates/${bea.assignmentId}/pdf`)).status()).toBe(404);
  await noOverflow(own);
  expect(errors).toEqual([]);
  await context.close();
});

test("staff see completed interns and certificates within their scope", async ({ page }, testInfo) => {
  const role = String(testInfo.project.metadata.gateARole) as GateARole;
  test.skip(role === "intern", "Staff projects");
  test.setTimeout(180_000);
  const errors = watchConsole(page);
  if (role === "admin") {
    await expectDenied(page, andrea.assignmentId);
    expect(await (await page.request.get("/certificates")).text()).toContain("NEXT_HTTP_ERROR_FALLBACK;404");
    return;
  }
  for (const width of widths(page)) {
    await page.setViewportSize({ width, height: page.viewportSize()!.height });
    if (role === "supervisor" || role === "coordinator") {
      await page.goto(role === "supervisor" ? "/interns" : "/students");
      const row = tableRow(page, andrea.assignmentId);
      await expect(row).toBeVisible({ timeout: 30_000 });
      await expect(row.getByText("Andrea Santos")).toBeVisible();
      await expect(row.getByRole("link", { name: /^Certificate BOS-/ })).toHaveAttribute("href", `/certificates/${andrea.assignmentId}`);
      await expect(tableRow(page, bea.assignmentId).getByText("Active")).toBeVisible();
      await noOverflow(page);
    }
    if (role === "representative") {
      await page.goto("/certificates");
      await expect(tableRow(page, andrea.assignmentId)).toBeVisible({ timeout: 30_000 });
      await noOverflow(page);
    }
    await expectIssued(page);
    await expect(page.getByText("Revoke this certificate")).toHaveCount(role === "representative" ? 1 : 0); // never submitted here
    await expectDenied(page, bea.assignmentId); // not issued yet: staff see no certificate
  }
  expect(errors).toEqual([]);
});
