/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web verification policy
 * 📄 File: scripts/web-test-concurrency.test.mjs
 *
 * 🎯 Purpose:
 * Protect bounded no-retry verification and retained first-failure evidence.
 *
 * 🧠 Responsibilities:
 * • resolve actual Playwright and Vitest configuration;
 * • verify the mandatory CI smoke command and artifact upload;
 * • reject retry-dependent diagnostic recording.
 *
 * 🏗️ Architecture:
 * Root tooling policy tests; no application runtime dependencies.
 *
 * ⚠️ Important:
 * Playwright lists tests only; no browser, server or database is started.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

const web = fileURLToPath(new URL("../apps/web/", import.meta.url));
const requireWeb = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const { resolveConfig } = await import(
  pathToFileURL(requireWeb.resolve("vitest/node")).href
);

test("mandatory Web CI smoke forbids retries with bounded workers", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  const webJob = workflow.split("  web-e2e:")[1]?.split("  security:")[0];
  assert.ok(webJob, "expected the actual Web smoke job");
  const commands = [
    ...webJob.matchAll(
      /^      - run: (pnpm --filter @dss\/web test:e2e[^\r\n]*)$/gm,
    ),
  ].map((match) => match[1]);
  assert.deepEqual(commands, [
    "pnpm --filter @dss/web test:e2e --retries=0 --workers=2 --forbid-only",
  ]);
  assert.doesNotMatch(webJob, /continue-on-error:\s*true/);
});

test("real Playwright CI config never retries a failed smoke", () => {
  const result = spawnSync(
    process.execPath,
    [
      requireWeb.resolve("@playwright/test/cli"),
      "test",
      "--list",
      "--reporter=json",
    ],
    {
      cwd: web,
      env: { ...process.env, CI: "1" },
      encoding: "utf8",
      windowsHide: true,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.config.projects.length > 0);
  for (const project of report.config.projects)
    assert.equal(project.retries, 0);
  assert.equal(report.config.forbidOnly, true);
});

test("first failed Web attempt retains diagnostics without requiring a retry", async () => {
  const { default: config } = await import(
    new URL("../apps/web/playwright.config.ts", import.meta.url).href
  );
  assert.equal(config.retries, 0);
  assert.equal(config.use.trace, "retain-on-failure");
  assert.equal(config.use.screenshot, "only-on-failure");
  const workflow = readFileSync(
    new URL("../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  const webJob = workflow.split("  web-e2e:")[1]?.split("  security:")[0];
  assert.ok(webJob);
  assert.match(
    webJob,
    /- name: Upload Web failure evidence\r?\n        if: always\(\)/,
  );
  assert.match(webJob, /uses: actions\/upload-artifact@v4/);
  assert.match(webJob, /name: web-smoke-evidence/);
  assert.match(webJob, /path: apps\/web\/test-results/);
  assert.match(webJob, /retention-days: 3/);
  assert.doesNotMatch(webJob, /continue-on-error:\s*true/);
});

for (const enabled of [false, true]) {
  test(`real Web config bounds workers with coverage=${enabled}`, async () => {
    const { vitestConfig } = await resolveConfig({
      root: web,
      run: true,
      coverage: { enabled },
    });
    assert.equal(vitestConfig.maxWorkers, 2);
    assert.equal(vitestConfig.testTimeout, 5000);
    assert.equal(vitestConfig.retry ?? 0, 0);
    assert.equal(vitestConfig.bail ?? 0, 0);
    assert.equal(vitestConfig.environment, "jsdom");
    assert.equal(vitestConfig.coverage.provider, "v8");
    assert.equal(vitestConfig.coverage.enabled, enabled);
    assert.equal(vitestConfig.fileParallelism ?? true, true);
  });
}
