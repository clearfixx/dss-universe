/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web verification infrastructure
 * 📄 File: apps/web/playwright.config.ts
 *
 * 🎯 Purpose:
 * Defines browser smoke execution and retains evidence of the first failure.
 *
 * 🧠 Responsibilities:
 * • configure the Chromium project and local test server;
 * • prohibit retries while preserving failure diagnostics;
 * • keep application behavior outside test infrastructure.
 *
 * 🏗️ Architecture:
 * Test-only Playwright configuration; not imported by application code.
 *
 * ⚠️ Important:
 * Diagnostic recording must not turn a failed attempt into a passing retry.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
