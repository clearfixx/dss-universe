/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Turbo Test Environment Verification
 * 📄 File: scripts/turbo-test-environment.test.mjs
 * 🎯 Purpose: Proves real strict task env hashing and preserves upstream build ordering.
 * ⚠️ Important: Dry-run only, synthetic endpoints, never prints environment values.
 * ===============================================================
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const baseline = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://dss_test:synthetic@127.0.0.1:5434/dss_test",
  REDIS_HOST: "127.0.0.1",
  REDIS_PORT: "6380",
  TEST_REDIS_PORT: "6380",
  RUN_IAM_DB_TESTS: "0",
  RUN_AUTH_DB_TESTS: "0",
  RUN_RECOVERY_DB_TESTS: "0",
  RUN_AUTH_REDIS_TESTS: "0",
  DSS_REQUIRE_FULL_API_TESTS: "0",
};
function dry(task, env = baseline, workspace = "@dss/api") {
  assert.ok(process.env.npm_execpath, "Invoke through pnpm test:full-policy");
  const run = spawnSync(
    process.execPath,
    [
      process.env.npm_execpath,
      "exec",
      "turbo",
      "run",
      task,
      `--filter=${workspace}`,
      "--dry=json",
      "--env-mode=strict",
    ],
    { cwd: root, env, encoding: "utf8", windowsHide: true },
  );
  assert.equal(run.status, 0, "Turbo dry-run must succeed");
  const result = JSON.parse(run.stdout);
  return result.tasks.find((value) => value.taskId === `${workspace}#${task}`);
}

for (const task of ["test", "test:unit", "test:cov"]) {
  test(`${task}: actual Turbo hash covers every explicit API test env key`, () => {
    const original = dry(task);
    assert.equal(original.envMode, "strict");
    assert.ok(
      original.dependencies.length > 0,
      "Keep upstream workspace builds",
    );
    assert.ok(original.dependencies.every((value) => value.endsWith("#build")));
    assert.ok(
      Object.keys(original.inputs).some((key) =>
        key.endsWith("scripts/full-api-test-policy.cjs"),
      ),
      "Hash the actual result policy outside the API package",
    );
    for (const [key, value] of Object.entries({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://dss_test:synthetic@127.0.0.1:5435/dss_test",
      REDIS_HOST: "localhost",
      REDIS_PORT: "6381",
      TEST_REDIS_PORT: "6381",
      RUN_IAM_DB_TESTS: "1",
      RUN_AUTH_DB_TESTS: "1",
      RUN_RECOVERY_DB_TESTS: "1",
      RUN_AUTH_REDIS_TESTS: "1",
      DSS_REQUIRE_FULL_API_TESTS: "1",
    })) {
      assert.notEqual(
        dry(task, { ...baseline, [key]: value }).hash,
        original.hash,
        `${key} must change the task hash`,
      );
    }
    assert.equal(
      dry(task).hash,
      original.hash,
      "Unchanged env keeps a stable hash",
    );
  });
}
test("API database and integration switches are not forwarded to Web tests", () => {
  const web = dry("test", baseline, "@dss/web");
  for (const key of [
    "DATABASE_URL",
    "TEST_REDIS_PORT",
    "RUN_IAM_DB_TESTS",
    "DSS_REQUIRE_FULL_API_TESTS",
  ]) {
    assert.ok(!web.resolvedTaskDefinition.env.includes(key));
    assert.ok(!(web.resolvedTaskDefinition.passThroughEnv ?? []).includes(key));
  }
});
