/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Full Quality Gate Verification
 * 📄 File: scripts/full-quality-policy.test.mjs
 *
 * 🎯 Purpose:
 * Guards disposable endpoints, complete results and browser environment isolation.
 *
 * 🧠 Responsibilities:
 * • rejects incomplete browser reports and unsafe database endpoints;
 * • preserves the safe browser allowlist and ordered verification plan.
 *
 * 🏗️ Architecture:
 * Test-only policy regressions; no service provisioning or runtime changes.
 *
 * ⚠️ Important:
 * Never relax retry/skip handling or expose API credentials to browser tasks.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { getFileInfo } from "prettier";
import FullQualityWebReporter from "./full-quality-web-reporter.mjs";

test("format policy excludes only the generated Next environment declaration", async () => {
  const ignorePath = fileURLToPath(
    new URL("../.prettierignore", import.meta.url),
  );
  for (const [path, ignored] of [
    ["apps/web/next-env.d.ts", true],
    ["apps/web/vitest.config.ts", false],
    ["apps/web/e2e/arrival.spec.ts", false],
  ]) {
    const info = await getFileInfo(
      fileURLToPath(new URL(`../${path}`, import.meta.url)),
      { ignorePath },
    );
    assert.equal(info.ignored, ignored, path);
  }
});
import {
  createBrowserEnvironment,
  createQualityEnvironment,
  qualitySteps,
} from "./full-quality-policy.mjs";

const valid = {
  DATABASE_URL: "postgresql://dss_test:dss_test@127.0.0.1:5435/dss_test",
};

test("browser reporter rejects empty, skipped and retried runs", () => {
  for (const tests of [
    [],
    [{ expectedStatus: "passed", results: [{ status: "skipped" }] }],
    [
      {
        expectedStatus: "passed",
        results: [{ status: "failed" }, { status: "passed" }],
      },
    ],
  ]) {
    const reporter = new FullQualityWebReporter();
    reporter.onBegin({}, { allTests: () => tests });
    assert.deepEqual(reporter.onEnd({ status: "passed" }), {
      status: "failed",
    });
  }
  const reporter = new FullQualityWebReporter();
  reporter.onBegin(
    {},
    {
      allTests: () => [
        { expectedStatus: "passed", results: [{ status: "passed" }] },
      ],
    },
  );
  assert.equal(reporter.onEnd({ status: "passed" }), undefined);
});
test("accepts only prepared local disposable endpoints", () => {
  assert.equal(createQualityEnvironment(valid).REDIS_PORT, "6380");
  for (const port of ["5432", "5433", "6432"]) {
    assert.throws(() =>
      createQualityEnvironment({
        DATABASE_URL: valid.DATABASE_URL.replace("5435", port),
      }),
    );
  }
  for (const overrides of [
    { REDIS_HOST: "remote" },
    { REDIS_PORT: "6379" },
    { TEST_REDIS_PORT: "6379" },
    { DATABASE_URL: `${valid.DATABASE_URL}?schema=public` },
  ])
    assert.throws(() => createQualityEnvironment({ ...valid, ...overrides }));
});
test("browser environment excludes inherited secrets and disables reuse", () => {
  const env = createBrowserEnvironment({
    Path: "runtime",
    DATABASE_URL: "secret",
    JWT_ACCESS_SECRET: "secret",
    NODE_OPTIONS: "injection",
    CI: "",
    NEXT_PUBLIC_SECRET: "unexpected",
  });
  assert.deepEqual(env, {
    Path: "runtime",
    CI: "1",
    NODE_ENV: "development",
    DSS_WEB_TEST_PORT: "3100",
  });
});
test("full plan includes coverage, E2E and generation but never provisioning/reset", () => {
  const steps = qualitySteps("unique.json");
  assert.ok(steps.some((step) => step.includes("--coverage")));
  assert.ok(steps.some((step) => step.includes("--outputFile=unique.json")));
  assert.ok(
    steps.findIndex(([step]) => step === "db:generate") <
      steps.findIndex(([step]) => step === "typecheck"),
  );
  assert.doesNotMatch(JSON.stringify(steps), /reset|install|db:deploy|db:push/);
});
