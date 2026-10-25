/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Full Workspace Verification
 * 📄 File: scripts/workspace-coverage-policy.test.mjs
 *
 * 🎯 Purpose: Proves workspace coverage cannot silently omit registered tests.
 * 🧠 Responsibilities:
 * • Reject missing, virtual and malformed task evidence.
 * • Inspect actual Turbo task commands, not merely manifest intentions.
 * • Preserve full runner preflight wiring.
 * 🏗️ Architecture: Repository policy tests; no browser, DB or service changes.
 * ⚠️ Important: Dry-run output remains captured; environment values are not logged.
 * 💡 Notes: Actual test execution is verified separately by the full gate.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { assertWorkspaceCoverage } from "./workspace-coverage-policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const task = (taskId, command) => ({ taskId, command });
const graph = (...tasks) => ({ tasks });
const ordinary = graph(
  task("@dss/editor#test", "vitest run"),
  task("@dss/api#test", "jest --runInBand"),
  task("@dss/jobs#test", "<NONEXISTENT>"),
  task("@dss/editor#build", "tsc"),
);
const complete = graph(
  task("@dss/editor#test:cov", "vitest run --coverage --maxWorkers=2"),
  task("@dss/api#test:cov", "jest --runInBand --coverage"),
);

test("coverage requires all executable tests, ignoring virtual non-test packages", () => {
  assert.deepEqual(assertWorkspaceCoverage(ordinary, complete), [
    "@dss/api#test:cov",
    "@dss/editor#test:cov",
  ]);
});

for (const command of [
  undefined,
  "<NONEXISTENT>",
  " <NONEXISTENT> ",
  "",
  "   ",
]) {
  test(`coverage rejects an omitted Editor command (${String(command)})`, () => {
    const incomplete = graph(task("@dss/api#test:cov", "jest --coverage"));
    if (command !== undefined)
      incomplete.tasks.push(task("@dss/editor#test:cov", command));
    assert.throws(
      () => assertWorkspaceCoverage(ordinary, incomplete),
      /omits workspace tests: @dss\/editor#test:cov/,
    );
  });
}

test("empty, malformed and duplicate graphs fail closed", () => {
  for (const evidence of [null, {}, graph(null), graph(task("x", null))]) {
    assert.throws(() => assertWorkspaceCoverage(evidence, complete));
    assert.throws(() => assertWorkspaceCoverage(ordinary, evidence));
  }
  assert.throws(() => assertWorkspaceCoverage(graph(), complete));
  assert.throws(() =>
    assertWorkspaceCoverage(
      graph(task("x#test", "vitest"), task("x#test", "vitest")),
      complete,
    ),
  );
});

test("actual Turbo coverage plan includes every executable workspace test", () => {
  function dry(taskName) {
    const run = spawnSync(
      process.execPath,
      [
        require.resolve("turbo/bin/turbo"),
        "run",
        taskName,
        "--dry=json",
        "--env-mode=strict",
      ],
      {
        cwd: root,
        encoding: "utf8",
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    assert.equal(run.status, 0, "Actual Turbo dry-run must succeed");
    return JSON.parse(run.stdout);
  }
  const required = assertWorkspaceCoverage(dry("test"), dry("test:cov"));
  assert.ok(required.includes("@dss/editor#test:cov"));
});

for (const mode of ["covered", "missing", "malformed", "error"]) {
  test(`real coverage runner ${mode}: preflight precedes execution`, () => {
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL("./run-full-tests.mjs", import.meta.url)),
        "--coverage",
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          npm_execpath: fileURLToPath(
            new URL("./fixtures/workspace-coverage-pnpm.cjs", import.meta.url),
          ),
          DATABASE_URL:
            "postgresql://dss_test:synthetic@127.0.0.1:5434/dss_test",
          TEST_REDIS_PORT: "6380",
          DEBT082_FIXTURE_MODE: mode,
        },
        encoding: "utf8",
        windowsHide: true,
      },
    );
    if (mode === "covered") {
      assert.equal(result.status, 0);
      assert.match(
        result.stdout,
        /Coverage preflight verified 1 test workspaces/,
      );
      assert.match(result.stdout, /WORKSPACE_TESTS_EXECUTED/);
    } else {
      assert.notEqual(result.status, 0);
      assert.doesNotMatch(result.stdout, /WORKSPACE_TESTS_EXECUTED/);
      assert.doesNotMatch(result.stderr, /SYNTHETIC_PRIVATE_DRY_RUN_PAYLOAD/);
      if (mode === "missing")
        assert.match(result.stderr, /omits workspace tests/);
      if (mode === "malformed")
        assert.match(result.stderr, /invalid Turbo JSON/);
    }
  });
}
