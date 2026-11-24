// DEC-2026-019 / REQ-FR-ATT-5 — face photo (identity verification) browser checks.
// NON-MUTATING by design: protected Gate A fixture accounts are never used to
// save a face photo, reset one or record attendance (that would persist identity and
// attendance rows). The mutating workflow is covered by the rollback-only
// scripts/test-identity-integration.ts; the camera/provider flow on a real
// Android device remains a manual acceptance item.
import { expect, test, type Page } from "@playwright/test";
import { assertGateAExecutionEnvironment } from "./environment";
import type { GateARole } from "./matrix";

test.beforeAll(() => assertGateAExecutionEnvironment());
// The app and this spec read the same .env.gatea.local (release switch, DEC-2026-019).
const identityEnabled = process.env.IDENTITY_VERIFICATION_ENABLED?.trim() === "true";

async function visit(page: Page, route: string) {
  try {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    if (response) expect(response.status()).toBeLessThan(500);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("net::ERR_ABORTED")) throw error;
  }
}
async function noHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test("face photo setup in Getting started, Supervisor reset and attendance gating respect role and viewport", async ({ page, context }, testInfo) => {
  const role = String(testInfo.project.metadata.gateARole) as GateARole;
  test.setTimeout(90_000);

  if (role === "intern" && !identityEnabled) {
    // Release switch off (Production default): no face photo step, no consent screen, attendance not gated.
    await visit(page, "/onboarding");
    await expect(page.getByRole("heading", { name: "Face photo", exact: true })).toHaveCount(0);
    await expect(page.getByText("Data Privacy Act of 2012")).toHaveCount(0);
    await visit(page, "/attendance");
    await expect(page.getByRole("heading", { name: /Face photo required/ })).toHaveCount(0);
    await noHorizontalOverflow(page);
    testInfo.annotations.push({ type: "mode", description: "identity verification disabled" });
    return;
  }

  if (role === "intern") {
    // The old standalone route now forwards to the face photo step inside Getting started.
    await visit(page, "/identity/enroll");
    await expect(page).toHaveURL(/\/onboarding#face-photo$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Face photo", exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Data Privacy Act of 2012")).toBeVisible();
    await expect(page.getByText(/Supervisor must verify|Submit for Supervisor approval/)).toHaveCount(0); // no approval step
    await expect(page.locator("input[type=file]")).toHaveCount(0); // camera only, no gallery picker
    await noHorizontalOverflow(page);
    const start = page.getByRole("button", { name: "Start camera" });
    // Fixture interns never have a face photo (this spec never creates one), so setup must be offered.
    await expect(start).toBeVisible();
    await expect(start).toBeDisabled(); // consent first
    await page.getByLabel(/I understand and consent/).check();
    await context.clearPermissions(); // headless Chromium: no camera permission or device
    await start.click();
    await expect(page.getByText(/Camera permission was denied|No front camera was found|camera could not start|cannot open the camera/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save face photo" })).toBeDisabled();
    await visit(page, "/attendance");
    // Fixture interns have no face photo: attendance capture must be blocked with a link back to setup.
    // Without an ACTIVE internship, /attendance redirects to the dashboard, which shows either "No active internship"
    // or (DEC-2026-021) the completed-internship view for an Intern whose internships are COMPLETED, like the Gate A fixture.
    await expect(page.getByRole("heading", { name: /No active internship|Face photo required|^Congratulations, / }).first()).toBeVisible({ timeout: 30_000 });
    if (await page.getByRole("heading", { name: /No active internship|^Congratulations, / }).count()) {
      // The Gate A intern fixture has no ACTIVE assignment, so the identity gate is unreachable here.
      // It is covered by the rollback integration test; record that explicitly instead of passing silently.
      testInfo.annotations.push({ type: "not-covered", description: "Attendance identity gate: fixture intern has no active internship" });
    } else {
      await expect(page.getByRole("link", { name: "Set up face photo" })).toHaveAttribute("href", "/onboarding#face-photo");
      await expect(page.getByRole("button", { name: /^Time (in|out)$/ })).toHaveCount(0);
    }
    await noHorizontalOverflow(page);
    return;
  }

  if (role === "supervisor") {
    await visit(page, "/reviews");
    await expect(page.getByRole("heading", { name: "Reviews", level: 1 })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Identity photos" })).toHaveCount(0); // no approval queue
    await noHorizontalOverflow(page);
    const response = await page.request.get("/identity/references/00000000-0000-4000-8000-000000000000/image");
    expect(response.status()).toBe(404);
  }

  // Non-interns never see face photo setup.
  const onboarding = await page.request.get("/onboarding");
  expect(onboarding.status()).toBeLessThan(500);
  const body = await onboarding.text();
  expect(body).not.toContain("I understand and consent");
  expect(body).not.toContain("Data Privacy Act");
});
