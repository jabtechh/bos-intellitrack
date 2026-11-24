import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import pg from "pg";

const { Client } = pg;
const baseURL = process.env.GATEA_BASE_URL?.trim();
const target = process.env.GATEA_TARGET_ENV?.trim();
const verified = process.env.GATEA_ENVIRONMENT_VERIFIED?.trim();
const runId = process.env.GATEA_RUN_ID?.trim();
const databaseUrl = process.env.DIRECT_URL?.trim();

if (target !== "test" || verified !== "1" || !baseURL || !runId || !databaseUrl) {
  throw new Error("Gate A auth setup requires the verified local test environment.");
}
if (new URL(baseURL).hostname !== "127.0.0.1" || new URL(databaseUrl).hostname !== "127.0.0.1") {
  throw new Error("Gate A auth setup is local-only.");
}

const manifest = JSON.parse(readFileSync(".gatea/gatea-credentials.local.json", "utf8")) as {
  gateaRunId: string;
  accounts: Record<string, { email: string; password: string; appUserId: string }>;
};
if (manifest.gateaRunId !== runId) throw new Error("Gate A credential manifest run ID mismatch.");

const roles = [
  ["intern", "intern"],
  ["supervisor", "supervisor"],
  ["coordinator", "coordinator"],
  ["representative", "representative"],
  ["admin", "admin"],
] as const;

mkdirSync(".gatea/auth", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const [storageName, accountKey] of roles) {
    const account = manifest.accounts[accountKey];
    if (!account) throw new Error(`Missing Gate A credential entry for ${accountKey}.`);
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${baseURL}/login`, { waitUntil: "networkidle" });
    await page.getByLabel("Email address").fill(account.email);
    await page.getByLabel("Password").fill(account.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
    await context.storageState({ path: `.gatea/auth/${storageName}.json` });
    await context.close();
    console.log(`storage_state_created=${storageName}`);
  }
} finally {
  await browser.close();
}

const db = new Client({ connectionString: databaseUrl });
try {
  await db.connect();
  const assignment = await db.query(
    "select id from internship_assignments where notes like $1 order by created_at limit 1",
    [`gatea_fixture=true; gatea_run_id=${runId}%; purpose=t105-primary-active%`],
  );
  if (!assignment.rows[0]?.id) throw new Error("Gate A primary assignment target not found.");
  writeFileSync(".gatea/gatea-browser-targets.local.json", JSON.stringify({
    runId,
    internUserId: manifest.accounts.intern.appUserId,
    representativeAssignmentId: assignment.rows[0].id,
  }, null, 2), { encoding: "utf8", mode: 0o600 });
  console.log("browser_targets_created=yes");
} finally {
  await db.end();
}
