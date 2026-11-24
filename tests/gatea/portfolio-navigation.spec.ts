// DEC-2026-020 / P167 — real-click navigation and Portfolio archive acceptance on the isolated app.
// NON-MUTATING: only navigation, GET requests and PDF downloads. Protected Gate A / E6 fixtures are read only.
// Viewports: each role's 390 project also sweeps 360 and 430; the matrix supplies 768, 1024 and 1440.
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { assertGateAExecutionEnvironment } from "./environment";
import type { GateARole } from "./matrix";

test.beforeAll(() => assertGateAExecutionEnvironment());

const LANDING: Record<GateARole, string> = { intern: "/dashboard", supervisor: "/dashboard", coordinator: "/dashboard", representative: "/admin", admin: "/admin/system" };
const HOME_LABEL: Record<GateARole, RegExp> = { intern: /^Dashboard$|^Home$/, supervisor: /^Home$/, coordinator: /^Home$/, representative: /^Dashboard$/, admin: /^System$/ };
const REPORTS_LABEL: Partial<Record<GateARole, RegExp>> = { supervisor: /^Reports$/, coordinator: /^Reports$/, representative: /^Company Reports$/ };

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error" && !/404|Failed to load resource|NEXT_HTTP_ERROR_FALLBACK/.test(message.text())) errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
const desktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;
async function noHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}
async function settle(page: Page, url: RegExp) {
  await expect(page).toHaveURL(url, { timeout: 30_000 });
  await page.waitForLoadState("networkidle").catch(() => undefined);
}
/** Visible current navigation entries (sidebar on desktop, bottom bar / More sheet on mobile). */
async function currentLabels(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[aria-current="page"]')]
    .filter((el) => el.offsetParent !== null && (el.closest("aside.app-sidebar") || el.closest(".bottom-nav") || el.closest("[data-more-sheet]")))
    .map((el) => (el.querySelector("span")?.textContent ?? el.textContent ?? "").trim()));
}
async function assertBottomNavLayout(page: Page) {
  const layout = await page.locator("nav.bottom-nav").evaluate((nav) => {
    const items = [...nav.querySelectorAll<HTMLElement>(":scope > a, :scope > button")];
    return {
      tops: items.map((el) => Math.round(el.getBoundingClientRect().top)),
      sizes: items.map((el) => ({ w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height })),
      clipped: items.some((el) => { const label = el.querySelector("span"); return !label || label.scrollWidth > label.clientWidth; }),
      overlaps: items.some((el, i) => i > 0 && el.getBoundingClientRect().left < items[i - 1].getBoundingClientRect().right - 0.5),
      labels: items.map((el) => (el.querySelector("span")?.textContent ?? "").trim()),
    };
  });
  expect(new Set(layout.tops).size, `one row: ${layout.tops}`).toBe(1);
  expect(layout.clipped, `labels fit: ${layout.labels}`).toBe(false);
  expect(layout.overlaps).toBe(false);
  for (const size of layout.sizes) { expect(size.h).toBeGreaterThanOrEqual(44); expect(size.w).toBeGreaterThanOrEqual(44); }
  return layout.labels;
}

async function openMore(page: Page) {
  await page.locator("nav.bottom-nav button", { hasText: "More" }).click();
  await expect(page.locator("[data-more-sheet]")).toBeVisible();
}

async function clickReports(page: Page, role: GateARole) {
  const label = REPORTS_LABEL[role]!;
  if (desktop(page)) { await page.locator("aside.app-sidebar nav a").filter({ hasText: label }).click(); return; }
  const primary = page.locator("nav.bottom-nav > a").filter({ hasText: label });
  if (await primary.count()) { await primary.click(); return; }
  await openMore(page);
  await page.locator("[data-more-sheet] a").filter({ hasText: label }).click();
}

async function assertReportsActive(page: Page, role: GateARole) {
  const label = REPORTS_LABEL[role]!;
  if (desktop(page)) {
    expect(await currentLabels(page)).toEqual([expect.stringMatching(label)]);
    return;
  }
  const primary = page.locator("nav.bottom-nav > a").filter({ hasText: label });
  if (await primary.count()) {
    await expect(primary).toHaveAttribute("aria-current", "page");
    await expect(page.locator("nav.bottom-nav button", { hasText: "More" })).not.toHaveClass(/is-active/);
  } else {
    // Secondary destination: More signals the active section, and the open sheet marks Reports as current.
    await expect(page.locator("nav.bottom-nav button", { hasText: "More" })).toHaveClass(/is-active/);
    expect(await currentLabels(page)).toEqual([]);
    await openMore(page);
    await expect(page.locator("[data-more-sheet] a").filter({ hasText: label })).toHaveAttribute("aria-current", "page");
    expect(await currentLabels(page)).toEqual([expect.stringMatching(label)]);
    await page.locator("[data-more-sheet] button", { hasText: "Close" }).click();
  }
  expect((await currentLabels(page)).some((text) => HOME_LABEL[role].test(text))).toBe(false);
}

function widthsFor(page: Page) { return page.viewportSize()?.width === 390 ? [360, 390, 430] : [page.viewportSize()!.width]; }

test("Reports navigation resolves, highlights correctly and never bounces to Dashboard", async ({ page }, testInfo) => {
  const role = String(testInfo.project.metadata.gateARole) as GateARole;
  test.skip(!REPORTS_LABEL[role], "Role has no Reports navigation item");
  test.setTimeout(180_000);
  const errors = watchConsole(page);
  for (const width of widthsFor(page)) {
    await page.setViewportSize({ width, height: page.viewportSize()!.height });
    await page.goto(LANDING[role]); await settle(page, new RegExp(`${LANDING[role]}$`));
    const navigations: string[] = [];
    const onNavigate = (frame: import("@playwright/test").Frame) => { if (frame === page.mainFrame()) navigations.push(new URL(frame.url()).pathname); };
    page.on("framenavigated", onNavigate);
    await clickReports(page, role);
    await settle(page, /\/reports$/);
    page.off("framenavigated", onNavigate);
    expect(navigations, `no redirect away from /reports at ${width}px`).not.toContain("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: role === "representative" ? "Company internship report" : "Internship reports" })).toBeVisible();
    await assertReportsActive(page, role);
    await noHorizontalOverflow(page);

    if (role !== "representative") {
      const nested = page.locator('main a[href^="/reports/intern/"]').first();
      if (await nested.count()) {
        await nested.click(); await settle(page, /\/reports\/intern\/[^/]+$/);
        await assertReportsActive(page, role);
        await noHorizontalOverflow(page);
      } else testInfo.annotations.push({ type: "not-covered", description: `No nested report link available for ${role}` });
    }
  }
  expect(errors).toEqual([]);
});

test("Representative cannot open a per-Intern report even by URL", async ({ page }, testInfo) => {
  test.skip(testInfo.project.metadata.gateARole !== "representative" || page.viewportSize()?.width !== 1440, "once per role");
  const response = await page.request.get("/reports/intern/00000000-0000-4000-8000-000000000000/pdf");
  expect(response.status()).toBe(404);
});

test("accounts outside the Main Office scope see no misleading Reports link and no Dashboard bounce", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.metadata.gateARole !== "supervisor" || testInfo.project.metadata.gateAWidth !== 1440, "once, at desktop");
  test.setTimeout(120_000);
  const accounts = JSON.parse(readFileSync(path.resolve(".gatea/gatea-credentials.local.json"), "utf8")).accounts as Record<string, { email: string; password: string }>;
  for (const key of ["supervisorB", "representativeB"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByLabel("Email address").fill(accounts[key].email);
    await page.getByLabel("Password").fill(accounts[key].password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/(dashboard|admin)$/, { timeout: 60_000 });
    await expect(page.locator("aside.app-sidebar nav a").filter({ hasText: /Reports/ })).toHaveCount(0);
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole("heading", { level: 1, name: "Reports are not available for this account" })).toBeVisible({ timeout: 30_000 });
    await context.close();
  }
});

test("Intern Portfolio is a primary destination with a per-internship archive and PDF", async ({ page }, testInfo) => {
  const role = String(testInfo.project.metadata.gateARole) as GateARole;
  test.skip(role !== "intern", "Intern only");
  test.setTimeout(240_000);
  const errors = watchConsole(page);
  for (const width of widthsFor(page)) {
    await page.setViewportSize({ width, height: page.viewportSize()!.height });
    await page.goto("/dashboard"); await settle(page, /\/dashboard$/);
    if (desktop(page)) {
      const link = page.locator("aside.app-sidebar nav a").filter({ hasText: /^Portfolio$/ });
      await expect(link).toBeVisible();
      await link.click();
    } else {
      const labels = await assertBottomNavLayout(page);
      expect(labels).toEqual(["Home", "Attendance", "Work Logs", "Tasks", "Portfolio", "More"]);
      await page.locator("nav.bottom-nav > a").filter({ hasText: "Portfolio" }).click();
    }
    await settle(page, /\/portfolio$/);
    expect(await currentLabels(page)).toEqual(["Portfolio"]);
    if (!desktop(page)) {
      await assertBottomNavLayout(page);
      await openMore(page); // More remains available and functional
      await expect(page.locator("[data-more-sheet] a").filter({ hasText: "Insights" })).toBeVisible();
      await page.locator("[data-more-sheet] button", { hasText: "Close" }).click();
    }
    await noHorizontalOverflow(page);
  }

  // Archive: every active/completed internship is a separate entry with Open and Download actions.
  const entries = page.locator("[data-portfolio-entry]");
  await expect(entries.first()).toBeVisible({ timeout: 30_000 }); // streamed after the loading boundary
  const count = await entries.count();
  expect(count, "the fixture Intern has completed internships").toBeGreaterThan(0);
  const ids = await entries.evaluateAll((els) => els.map((el) => el.getAttribute("data-portfolio-entry")!));
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ids) {
    const entry = page.locator(`[data-portfolio-entry="${id}"]`);
    await expect(entry.getByRole("link", { name: /Open Portfolio|Viewing Portfolio/ })).toHaveAttribute("href", `/portfolio?assignment=${id}`);
    await expect(entry.getByRole("link", { name: "Download PDF" })).toHaveAttribute("href", `/portfolio/pdf?assignment=${id}`);
  }

  // Opening one internship shows only that internship, and its PDF is that internship's.
  const target = ids.at(-1)!;
  const dates = (await page.locator(`[data-portfolio-entry="${target}"] dd`).first().textContent())!.split("–").map((part) => part.trim());
  await page.locator(`[data-portfolio-entry="${target}"]`).getByRole("link", { name: /Open Portfolio|Viewing Portfolio/ }).click();
  await settle(page, new RegExp(`/portfolio\\?assignment=${target}$`));
  await expect(page.locator(`[data-portfolio-entry="${target}"] a[aria-current="page"]`)).toHaveCount(1);
  await expect(page.locator('[data-portfolio-entry] a[aria-current="page"]')).toHaveCount(1);
  await expect(page.locator("[data-evidence-mode]")).toHaveAttribute("data-evidence-mode", /^(LIVE|SNAPSHOT|LEGACY_ON_DEMAND)$/);
  await expect(page.getByText(`Internship period: ${dates[0]}`, { exact: false })).toBeVisible();
  expect(await currentLabels(page)).toEqual(["Portfolio"]);

  const pdf = await page.request.get(`/portfolio/pdf?assignment=${target}`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect(pdf.headers()["cache-control"]).toContain("no-store");
  const body = (await pdf.body()).toString("latin1");
  expect(body).toContain("INTERNSHIP PORTFOLIO");
  expect(body).toContain(`Internship period: ${dates[0]}`);
  expect(body).toContain("Evidence source:");

  // Changing the assignment ID cannot reach anything else.
  const foreign = "00000000-0000-4000-8000-000000000000";
  expect((await page.request.get(`/portfolio/pdf?assignment=${foreign}`)).status()).toBe(404);
  expect((await page.request.get("/portfolio/pdf?assignment=not-a-uuid")).status()).toBe(404);
  const opened = await page.request.get(`/portfolio?assignment=${foreign}`);
  const html = await opened.text();
  expect(html).toContain("NEXT_HTTP_ERROR_FALLBACK;404");
  expect(html).not.toContain("data-portfolio-entry");

  // Intern contextual report: Insights stays current, Home never.
  await page.goto("/reports"); await settle(page, /\/reports$/);
  if (desktop(page)) expect(await currentLabels(page)).toEqual(["Insights"]);
  else await expect(page.locator("nav.bottom-nav button", { hasText: "More" })).toHaveClass(/is-active/);
  expect((await currentLabels(page)).some((text) => /^(Dashboard|Home)$/.test(text))).toBe(false);
  expect(errors).toEqual([]);
});
