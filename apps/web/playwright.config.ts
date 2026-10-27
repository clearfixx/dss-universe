/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Test Infrastructure
 * 📄 File: apps/web/playwright.config.ts
 *
 * 🎯 Purpose:
 * Configures browser smoke tests against one resolved loopback endpoint.
 *
 * 🧠 Responsibilities:
 * • keeps browser navigation and the isolated server endpoint aligned;
 * • preserves no-retry CI checks and the existing startup deadline.
 * • retains trace and screenshot evidence from the first failed attempt.
 *
 * 🏗️ Architecture:
 * Test-only configuration; imports only the pure endpoint resolver.
 *
 * ⚠️ Important:
 * No application endpoint changes or reuse of another server under CI.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { defineConfig, devices } from "@playwright/test";
import { resolveWebSmokeEndpoint } from "../../scripts/web-smoke-endpoint.mjs";

const endpoint = resolveWebSmokeEndpoint();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: endpoint.baseURL,
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
    command: `pnpm dev --hostname ${endpoint.hostname} --port ${endpoint.port}`,
    url: endpoint.baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
