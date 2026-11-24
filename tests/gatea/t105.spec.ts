import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { expect, test } from "@playwright/test";
import { assertGateAExecutionEnvironment } from "./environment";
import { gateARouteSweeps, type GateARole } from "./matrix";

const executionApproved = process.env.GATEA_EXECUTION_APPROVED === "1";

test.skip(!executionApproved, "Gate E5 is not approved; Gate E1 provides scaffold/list validation only.");

test.beforeAll(() => {
  assertGateAExecutionEnvironment();
});

type BrowserTargets = {
  runId: string;
  internUserId: string;
  representativeAssignmentId: string;
};

function targets(): BrowserTargets {
  return JSON.parse(readFileSync(".gatea/gatea-browser-targets.local.json", "utf8")) as BrowserTargets;
}

function roleRoutes(role: GateARole, browserTargets: BrowserTargets) {
  const base = [...gateARouteSweeps[role]];
  if (role === "intern") {
    base.push("/portfolio", "/feedback", `/reports/intern/${browserTargets.internUserId}`);
  }
  if (role === "representative") {
    base.push(`/admin/assignments/${browserTargets.representativeAssignmentId}`);
  }
  return base;
}

async function waitForRenderedMain(page: import("@playwright/test").Page) {
  let lastUrl = "";
  let stablePasses = 0;

  await expect.poll(async () => {
    try {
      const currentUrl = page.url();
      const visible = await page.locator("#main-content").isVisible();
      stablePasses = visible && currentUrl === lastUrl ? stablePasses + 1 : 0;
      lastUrl = currentUrl;
      return stablePasses >= 2;
    } catch {
      stablePasses = 0;
      return false;
    }
  }, { timeout: 15_000, intervals: [100, 150, 250, 400] }).toBe(true);
}

async function gotoRendered(page: import("@playwright/test").Page, route: string) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  await waitForRenderedMain(page);
  return response;
}

async function verifyShell(page: import("@playwright/test").Page, role: GateARole, width: number) {
  await expect.poll(async () => {
    try {
      return await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  }, { timeout: 10_000, intervals: [100, 200, 300] }).toBeLessThanOrEqual(1);

  await expect.poll(async () => {
    try {
      return (await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toLowerCase().includes("dm");
    } catch {
      return false;
    }
  }, { timeout: 10_000, intervals: [100, 200, 300] }).toBe(true);

  if (width < 1024) {
    await expect(page.locator(".app-sidebar")).toBeHidden();
    await expect(page.locator(".bottom-nav")).toBeVisible();
    await expect(page.locator(".desktop-user-identity")).toBeHidden();
    await expect(page.locator(".bottom-nav")).toContainText("More");
  } else {
    await expect(page.locator(".app-sidebar")).toBeVisible();
    await expect(page.locator(".bottom-nav")).toBeHidden();
    const identity = page.locator(".desktop-user-identity");
    await expect(identity).toBeVisible();
    await expect(identity.locator("strong")).not.toHaveText("");
    await expect(identity.locator("small")).not.toHaveText("");
  }

  const cards = page.locator(".dashboard-kpi-card");
  if (await cards.count() > 1) {
    const styles = await cards.evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, border: style.borderColor };
      }),
    );
    expect(new Set(styles.map((style) => style.background)).size, "KPI card surfaces should stay neutral/uniform").toBe(1);
    expect(new Set(styles.map((style) => style.border)).size, "KPI card borders should stay uniform").toBe(1);
  }
}

async function screenshotRoute(page: import("@playwright/test").Page, role: GateARole, width: number, route: string, runId: string) {
  const slug = route === "/" ? "root" : route.replace(/^\//, "").replaceAll("/", "-").replaceAll("?", "-").replaceAll("=", "-");
  const path = join(process.cwd(), "artifacts", "gatea", "t105", runId, "final-passing", role, String(width), `${slug}.png`);
  mkdirSync(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
}

async function verifyMobileMore(page: import("@playwright/test").Page, role: GateARole) {
  const expected: Record<GateARole, string[]> = {
    // DEC-2026-020: Portfolio is an Intern primary bottom-navigation destination, so it is no longer in More.
    intern: ["/calendar", "/insights", "/evaluations", "/documents", "/announcements"],
    supervisor: ["/tasks", "/evaluations", "/reports", "/documents", "/announcements"],
    coordinator: ["/documents"],
    representative: ["/admin/schools", "/documents", "/reports"],
    admin: [],
  };

  const trigger = page.locator(".bottom-nav").getByRole("button", { name: "More" });
  await trigger.click();
  const sheet = page.locator("[data-more-sheet]");
  await expect(sheet).toBeVisible();
  const hrefs = await sheet.locator("a").evaluateAll((links) =>
    links.map((link) => new URL((link as HTMLAnchorElement).href).pathname),
  );
  expect(hrefs, `${role} mobile More sheet should expose only role-authorized navigation`).toEqual(expected[role]);
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();
}

async function verifyRepresentativeUsers(page: import("@playwright/test").Page, width: number, runId: string) {
  await gotoRendered(page, "/admin/users");
  await expect(page.getByLabel("Filter by role")).toHaveValue("");
  await expect(page.getByText("Active Interns", { exact: true })).toBeVisible();
  await expect(page.getByText("Active Company Supervisors", { exact: true })).toBeVisible();
  await expect(page.getByText("Active School Coordinators", { exact: true })).toBeVisible();

  const search = page.getByLabel("Search users");
  await search.fill("GateA Intern A");
  const results = page.locator('section[aria-label="User directory results"]');
  if (width >= 1280) {
    await expect(results.locator("table").getByText("GateA Intern A", { exact: true })).toBeVisible();
  } else {
    await expect(results.locator("article").getByText("GateA Intern A", { exact: true })).toBeVisible();
  }
  await search.fill("");

  await page.getByLabel("Filter by role").selectOption("INTERN");
  await expect(page.getByLabel("Filter by role")).toHaveValue("INTERN");
  await page.getByLabel("Filter by role").selectOption("");

  await page.getByLabel("Filter by status").selectOption("all");
  await expect(page.getByLabel("Filter by status")).toHaveValue("all");
  await page.getByLabel("Filter by status").selectOption("inactive");
  await expect(page.getByText("No users match the current filters.")).toBeVisible();
  await page.getByLabel("Filter by status").selectOption("active");

  await page.getByLabel("Rows per page").selectOption("25");
  await expect(page.getByLabel("Rows per page")).toHaveValue("25");
  await page.getByLabel("Rows per page").selectOption("50");
  await expect(page.getByLabel("Rows per page")).toHaveValue("50");
  await page.getByLabel("Rows per page").selectOption("10");

  if (width >= 1280) {
    const nameSort = page.getByRole("button", { name: /^Name/ });
    await nameSort.click();
    await expect(page.locator("th").filter({ has: nameSort })).toHaveAttribute("aria-sort", "descending");
    await nameSort.click();
    await expect(page.locator("th").filter({ has: nameSort })).toHaveAttribute("aria-sort", "ascending");
    await expect(page.locator('section[aria-label="User directory results"] table')).toBeVisible();
  } else {
    await expect(page.locator('section[aria-label="User directory results"] table')).toBeHidden();
    await expect(page.locator('section[aria-label="User directory results"] article').first()).toBeVisible();
  }

  await gotoRendered(page, "/admin/users?role=INTERN");
  await expect(page.getByLabel("Filter by role")).toHaveValue("INTERN");
  await screenshotRoute(page, "representative", width, "/admin/users?role=INTERN", runId);
}

async function verifyPartnerSchools(page: import("@playwright/test").Page, width: number) {
  await gotoRendered(page, "/admin/schools");
  await expect(page.locator(".dashboard-kpi-card,.metric-card")).toHaveCount(0);

  const search = page.getByLabel("Search partner schools");
  await search.fill("GateA");
  const results = page.locator('section[aria-label="Partner school directory results"]');
  if (width >= 1280) {
    await expect(results.locator("table").getByText("GateA Partner School A", { exact: true })).toBeVisible();
  } else {
    await expect(results.locator("article").getByText("GateA Partner School A", { exact: true })).toBeVisible();
  }
  await search.fill("");

  await page.getByLabel("Filter schools by status").selectOption("active");
  await expect(page.getByLabel("Filter schools by status")).toHaveValue("active");
  await page.getByLabel("Filter schools by status").selectOption("inactive");
  await expect(page.getByText("No partner schools match the current filters.")).toBeVisible();
  await page.getByLabel("Filter schools by status").selectOption("all");

  await page.getByLabel("Rows per page").selectOption("25");
  await page.getByLabel("Rows per page").selectOption("50");
  await page.getByLabel("Rows per page").selectOption("10");

  if (width >= 1280) {
    const nameSort = page.getByRole("button", { name: /^Name/ });
    await nameSort.click();
    await expect(page.locator("th").filter({ has: nameSort })).toHaveAttribute("aria-sort", "descending");
    await nameSort.click();
    await expect(page.locator("th").filter({ has: nameSort })).toHaveAttribute("aria-sort", "ascending");
    await expect(page.locator('section[aria-label="Partner school directory results"] table')).toBeVisible();
  } else {
    await expect(page.locator('section[aria-label="Partner school directory results"] table')).toBeHidden();
    await expect(page.locator('section[aria-label="Partner school directory results"] article').first()).toBeVisible();
  }
}

test("T105 authenticated role × viewport route sweep", async ({ page }, testInfo) => {
  const role = String(testInfo.project.metadata.gateARole) as GateARole;
  const width = Number(testInfo.project.metadata.gateAWidth);
  const browserTargets = targets();
  test.setTimeout(120_000);
  const routes = roleRoutes(role, browserTargets);
  const browserErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    browserErrors.push(`pageerror: ${error.message}`);
  });

  for (const route of routes) {
    const response = await gotoRendered(page, route);
    expect(response, `${role} ${width}px ${route} should return a response`).not.toBeNull();
    expect(response?.ok(), `${role} ${width}px ${route} should load successfully`).toBeTruthy();
    expect(page.url(), `${role} ${width}px ${route} must remain authenticated`).not.toContain("/login");
    await verifyShell(page, role, width);
    await screenshotRoute(page, role, width, route, browserTargets.runId);
  }

  if (width < 1024) await verifyMobileMore(page, role);

  if (role === "representative") {
    await verifyRepresentativeUsers(page, width, browserTargets.runId);
    await verifyPartnerSchools(page, width);
  }

  if (browserErrors.length) {
    await testInfo.attach("browser-errors.txt", {
      body: browserErrors.join("\n"),
      contentType: "text/plain",
    });
  }
  expect(browserErrors, "No console errors or uncaught page errors are allowed in the route sweep").toEqual([]);
});
