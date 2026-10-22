/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Full API Verification Tests
 * 📄 File: scripts/full-api-test-processor.integration.test.mjs
 * 🎯 Purpose: Proves actual Jest rejects skipped full-profile tests, not just synthetic result objects.
 * ⚠️ Important: Temporary no-IO fixtures; no database or external AI is contacted.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import policy from "./full-api-test-policy.cjs";

const jest = fileURLToPath(
  new URL("../apps/api/node_modules/jest/bin/jest.js", import.meta.url),
);
const processor = fileURLToPath(
  new URL("./full-api-test-policy.cjs", import.meta.url),
);
const env = policy.createFullTestEnvironment({
  ...process.env,
  DATABASE_URL: "postgresql://dss_test:synthetic@127.0.0.1:5434/dss_test",
  TEST_REDIS_PORT: "6380",
  FORCE_COLOR: "0",
});

for (const skipped of [false, true]) {
  test(`real Jest full profile ${skipped ? "rejects a skipped test" : "accepts complete passing tests"}`, () => {
    const dir = mkdtempSync(join(tmpdir(), "dss-full-test-control-"));
    try {
      writeFileSync(
        join(dir, "control.test.cjs"),
        `test('selected control', () => expect(true).toBe(true));\ntest${skipped ? ".skip" : ""}('mandatory control', () => expect(true).toBe(true));\n`,
      );
      const run = spawnSync(
        process.execPath,
        [
          jest,
          "--runInBand",
          "--no-cache",
          "--config",
          JSON.stringify({
            rootDir: dir,
            testEnvironment: "node",
            testRegex: "control\\.test\\.cjs$",
            testResultsProcessor: processor,
          }),
        ],
        { env, encoding: "utf8", windowsHide: true },
      );
      assert.equal(run.status, skipped ? 1 : 0);
      if (skipped) {
        assert.match(run.stderr, /require successful non-empty results/);
        assert.match(run.stderr, /skipped/);
      }
    } finally {
      // Only this test's newly allocated directory can be removed.
      assert.equal(dirname(resolve(dir)), resolve(tmpdir()));
      assert.ok(basename(dir).startsWith("dss-full-test-control-"));
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
