/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Production Browser Diagnostics
 * 📄 File: apps/web/playwright.production-diagnostic.config.ts
 * 🎯 Purpose: Runs the scoped lifecycle diagnostic against a fresh production build.
 * 🧠 Responsibilities: owns an isolated server port and forbids server reuse/retries.
 * 🏗️ Architecture: Test-only configuration; standard smoke configuration is unchanged.
 * ⚠️ Important: Requires a preceding successful Web build; does not rebuild or reset data.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  retries: 0,
  use: { ...base.use, baseURL: "http://127.0.0.1:3194", trace: "on" },
  webServer: {
    command: "pnpm start --port 3194",
    url: "http://127.0.0.1:3194",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
