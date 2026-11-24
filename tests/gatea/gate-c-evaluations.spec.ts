import { expect, test } from "@playwright/test";
import { assertGateAExecutionEnvironment } from "./environment";
import type { GateARole } from "./matrix";

test.beforeAll(() => assertGateAExecutionEnvironment());

test("Gate C Evaluation read and authoring routes respect role and viewport", async ({ page }, testInfo) => {
  const role = String(testInfo.project.metadata.gateARole) as GateARole;
  const width = Number(testInfo.project.metadata.gateAWidth);
  test.setTimeout(90_000);
  const base = new URL(process.env.GATEA_BASE_URL ?? "");
  expect(base.hostname).toBe("127.0.0.1");
  expect(base.port).toBe("3100");
  const visit = async (route: string) => {
    try {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      if (response) expect(response.status()).toBeLessThan(500);
    } catch (error) {
      // A server redirect can cancel the original navigation while it is
      // completing. Only tolerate that specific redirect race.
      if (!(error instanceof Error) || !error.message.includes("net::ERR_ABORTED")) throw error;
    }
    await expect(page.locator("#main-content")).toBeVisible();
    await expect.poll(async () => {
      try {
        return await page.evaluate(() =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth);
      } catch {
        return Number.POSITIVE_INFINITY;
      }
    }, { message: `${role} ${width}px ${route} should not overflow` }).toBeLessThanOrEqual(1);
  };

  await visit("/evaluations");
  if (role === "representative" || role === "admin") {
    await expect(page).not.toHaveURL(/\/evaluations\/?$/);
  } else {
    await expect(page).toHaveURL(/\/evaluations\/?$/);
  }

  await visit("/evaluations/new");
  if (role === "supervisor") {
    await expect(page.getByRole("heading", { name: "Create evaluation" })).toBeVisible();
    const type = page.getByLabel("Evaluation type");
    await type.selectOption("PROGRESS");
    await expect(page.getByLabel("Week to evaluate")).toBeVisible();
    await page.getByLabel("Week to evaluate").fill("2026-10-14");
    await expect(page.getByRole("status")).toContainText("Oct 12");
    await expect(page.getByRole("status")).toContainText("Oct 18");
    expect(await page.locator('[name="periodKey"]').count()).toBe(0);
    await type.selectOption("INITIAL");
    await expect(page.getByLabel("Week to evaluate")).toHaveCount(0);
    await expect(page.getByLabel("Period start (optional)")).toBeVisible();
  } else {
    await expect(page).not.toHaveURL(/\/evaluations\/new\/?$/);
    await expect(page.getByRole("heading", { name: "Create evaluation" })).toHaveCount(0);
  }
});
