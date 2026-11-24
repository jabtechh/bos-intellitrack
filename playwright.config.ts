import { defineConfig } from "@playwright/test";
import { config as loadEnvironment } from "dotenv";
import { gateAProjects, storageStatePath } from "./tests/gatea/matrix";

loadEnvironment({ path: ".env.gatea.local", override: true, quiet: true });

const executionApproved = process.env.GATEA_EXECUTION_APPROVED === "1";

export default defineConfig({
  testDir: "./tests/gatea",
  outputDir: "artifacts/gatea/playwright-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [
    ["list"],
    ["html", { outputFolder: "artifacts/gatea/playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.GATEA_BASE_URL,
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "off",
    video: "off",
  },
  projects: gateAProjects.map((project) => ({
    name: project.name,
    metadata: {
      gateARole: project.role,
      gateAWidth: project.viewport.width,
    },
    use: {
      viewport: project.viewport,
      storageState: executionApproved ? storageStatePath(project.role) : undefined,
    },
  })),
});
