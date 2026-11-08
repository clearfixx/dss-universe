/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Full Quality Gate
 * 📄 File: scripts/full-quality-policy.mjs
 *
 * 🎯 Purpose:
 * Defines safe service environments and complete verification requirements.
 *
 * 🧠 Responsibilities:
 * • guards disposable endpoints and the explicit browser port;
 * • strips browser secrets and validates complete test reports.
 *
 * 🏗️ Architecture:
 * Test orchestration policy, separate from socket and process side effects.
 *
 * ⚠️ Important:
 * No provisioning, database reset or inherited browser secrets.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import policy from "./full-api-test-policy.cjs";
import { resolveWebSmokeEndpoint } from "./web-smoke-endpoint.mjs";

export function createQualityEnvironment(source) {
  const env = policy.createFullTestEnvironment(source);
  const database = new URL(env.DATABASE_URL);
  if (!["5434", "5435"].includes(database.port) || database.search) {
    throw new Error(
      "Full quality requires disposable DB port 5434/5435 without URL options.",
    );
  }
  if (
    ![undefined, "127.0.0.1", "localhost", "::1"].includes(source.REDIS_HOST) ||
    env.TEST_REDIS_PORT !== "6380" ||
    (source.REDIS_PORT !== undefined && source.REDIS_PORT !== "6380")
  ) {
    throw new Error("Full quality requires loopback test Redis on port 6380.");
  }
  return {
    ...env,
    REDIS_HOST: "127.0.0.1",
    REDIS_PORT: "6380",
    DSS_WEB_TEST_PORT: String(resolveWebSmokeEndpoint(source).port),
  };
}

export function createBrowserEnvironment(source) {
  const allowed = new Set([
    "path",
    "systemroot",
    "windir",
    "comspec",
    "temp",
    "tmp",
    "userprofile",
    "appdata",
    "localappdata",
    "programfiles",
    "home",
    "pnpm_home",
    "corepack_home",
    "npm_execpath",
    "playwright_browsers_path",
  ]);
  return {
    ...Object.fromEntries(
      Object.entries(source).filter(([key]) => allowed.has(key.toLowerCase())),
    ),
    CI: "1",
    NODE_ENV: "development",
    DSS_WEB_TEST_PORT: String(resolveWebSmokeEndpoint(source).port),
  };
}

export function qualitySteps(apiReport) {
  return [
    ["format:check"],
    ["helpers:verify"],
    ["architecture:check"],
    ["db:validate"],
    ["db:generate"],
    ["db:check-drift"],
    ["lint"],
    ["typecheck"],
    ["test:full-policy"],
    ["test:quality-policy"],
    ["test:security-policy"],
    ["security:check"],
    ["--filter", "@dss/storage", "native:verify"],
    ["storage:coordination:verify"],
    ["test:full", "--coverage"],
    ["--filter", "@dss/api", "test:e2e", "--json", `--outputFile=${apiReport}`],
    ["graphql:check"],
    ["build"],
    ["test:api-build-entry"],
  ];
}

export function assertApiReport(report, env) {
  policy.assertFullApiTestResults(report, env);
}
